import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import {
  InventoryConflictError,
  mergeEventInventoryDraft,
  mergeProductInventoryDrafts,
} from "./inventoryAdminModel";
import {
  productSkuClaimHasOwner,
  productSkuClaimsForProduct,
  ProductSkuRegistryError,
} from "../../data/productSkuRegistry";

const text = (value, fallback = "") => String(value || fallback).trim();

export const saveInventoryRowsTransaction = async ({ db, dirtyRows, draftRows }) => {
  const changedProductRows = dirtyRows.filter((row) => row.type === "product");
  const changedEventRows = dirtyRows.filter((row) => row.type === "event");
  const productRowsById = changedProductRows.reduce((rowsById, row) => {
    rowsById.set(row.productId, [...(rowsById.get(row.productId) || []), row]);
    return rowsById;
  }, new Map());
  const productRefs = new Map(Array.from(productRowsById.keys()).map((productId) => [
    productId,
    doc(db, "products", productId),
  ]));
  const eventRefs = new Map(changedEventRows.map((row) => [
    row.productId,
    doc(db, "events", row.productId),
  ]));
  const movementRefs = new Map(dirtyRows.map((row) => [
    row.id,
    doc(collection(db, "inventoryMovements")),
  ]));

  await runTransaction(db, async (transaction) => {
    const productSnapshots = await Promise.all(Array.from(productRefs.entries())
      .map(async ([productId, productRef]) => [productId, await transaction.get(productRef)]));
    const eventSnapshots = await Promise.all(Array.from(eventRefs.entries())
      .map(async ([eventId, eventRef]) => [eventId, await transaction.get(eventRef)]));
    const productSnapshotsById = new Map(productSnapshots);
    const eventSnapshotsById = new Map(eventSnapshots);
    const preparedProductUpdates = [];
    const preparedEventUpdates = [];

    productRowsById.forEach((productRows, productId) => {
      const productSnapshot = productSnapshotsById.get(productId);
      const firstRow = productRows[0];

      if (!productSnapshot?.exists()) {
        throw new InventoryConflictError(
          `${firstRow.primary} no longer exists in Firestore. Inventory was refreshed; review it and save again.`,
          productRows.map((row) => row.id),
        );
      }

      const { inStock, movements, variants } = mergeProductInventoryDrafts({
        changes: productRows.map((row) => ({
          draft: draftRows[row.id] || {},
          row,
        })),
        product: productSnapshot.data(),
      });
      let currentClaims;
      let nextClaims;

      try {
        currentClaims = productSkuClaimsForProduct({
          productId,
          strict: false,
          variants: productSnapshot.data().variants,
        });
        nextClaims = productSkuClaimsForProduct({ productId, variants });
      } catch (error) {
        if (error instanceof ProductSkuRegistryError) {
          throw new InventoryConflictError(error.message, productRows.map((row) => row.id));
        }
        throw error;
      }

      preparedProductUpdates.push({
        currentClaims,
        inStock,
        movements,
        nextClaims,
        productId,
        productRows,
        variants,
      });
    });

    changedEventRows.forEach((row) => {
      const eventSnapshot = eventSnapshotsById.get(row.productId);

      if (!eventSnapshot?.exists()) {
        throw new InventoryConflictError(
          `${row.primary} no longer exists in Firestore. Inventory was refreshed; review it and save again.`,
          [row.id],
        );
      }

      const { movementDelta, update } = mergeEventInventoryDraft({
        draft: draftRows[row.id] || {},
        event: eventSnapshot.data(),
        row,
      });

      preparedEventUpdates.push({ movementDelta, row, update });
    });

    const desiredClaimsById = new Map();

    preparedProductUpdates.forEach(({ nextClaims, productRows }) => {
      nextClaims.forEach((claim) => {
        const existing = desiredClaimsById.get(claim.registryId);

        if (existing && !productSkuClaimHasOwner(claim, existing.claim)) {
          throw new InventoryConflictError(
            `SKU ${claim.sku} is assigned to more than one product option. Choose a unique SKU.`,
            [...existing.rowIds, ...productRows.map((row) => row.id)],
          );
        }

        desiredClaimsById.set(claim.registryId, {
          claim,
          rowIds: productRows.map((row) => row.id),
        });
      });
    });

    const registryIds = Array.from(new Set(preparedProductUpdates.flatMap((update) => [
      ...update.currentClaims.map((claim) => claim.registryId),
      ...update.nextClaims.map((claim) => claim.registryId),
    ]))).sort();
    const registryRefs = new Map(registryIds.map((registryId) => [
      registryId,
      doc(db, "productSkus", registryId),
    ]));
    const registrySnapshots = await Promise.all(registryIds.map(async (registryId) => [
      registryId,
      await transaction.get(registryRefs.get(registryId)),
    ]));
    const registrySnapshotsById = new Map(registrySnapshots);

    preparedProductUpdates.forEach(({ currentClaims, nextClaims, productRows }) => {
      const currentClaimsById = new Map(currentClaims.map((claim) => [claim.registryId, claim]));

      nextClaims.forEach((claim) => {
        const registrySnapshot = registrySnapshotsById.get(claim.registryId);

        if (!registrySnapshot?.exists()) {
          return;
        }

        const registryData = registrySnapshot.data();
        const currentClaim = currentClaimsById.get(claim.registryId);
        const ownedByCurrentVariant = currentClaim
          && productSkuClaimHasOwner(currentClaim, registryData);

        if (!productSkuClaimHasOwner(claim, registryData) && !ownedByCurrentVariant) {
          throw new InventoryConflictError(
            `SKU ${claim.sku} is already assigned to another product option. Choose a different SKU.`,
            productRows.map((row) => row.id),
          );
        }
      });
    });

    preparedProductUpdates.forEach(({
      currentClaims,
      inStock,
      movements,
      nextClaims,
      productId,
      variants,
    }) => {
      transaction.update(productRefs.get(productId), {
        inStock,
        updatedAt: serverTimestamp(),
        variants,
      });

      movements.forEach(({ quantityDelta, row, variant }) => {
        transaction.set(movementRefs.get(row.id), {
          capacityGroupKey: "",
          createdAt: serverTimestamp(),
          createdBy: "admin_inventory",
          lineItemId: "",
          linkedId: row.productId,
          linkedType: "product",
          orderId: "",
          quantityDelta,
          reason: "manual_adjustment",
          sku: text(variant.sku),
          source: "manual",
          sourcePaymentId: "",
          title: `${row.primary}${row.secondary ? ` ${row.secondary}` : ""}`,
          variantId: text(variant.id),
        });
      });

      const nextClaimIds = new Set(nextClaims.map((claim) => claim.registryId));

      currentClaims.forEach((claim) => {
        const registrySnapshot = registrySnapshotsById.get(claim.registryId);

        if (
          !nextClaimIds.has(claim.registryId)
          && registrySnapshot?.exists()
          && productSkuClaimHasOwner(claim, registrySnapshot.data())
        ) {
          transaction.delete(registryRefs.get(claim.registryId));
        }
      });
      nextClaims.forEach((claim) => {
        transaction.set(registryRefs.get(claim.registryId), {
          productId: claim.productId,
          sku: claim.sku,
          updatedAt: serverTimestamp(),
          updatedBy: "admin_inventory",
          variantId: claim.variantId,
        });
      });
    });

    preparedEventUpdates.forEach(({ movementDelta, row, update }) => {

      transaction.update(eventRefs.get(row.productId), {
        ...update,
        updatedAt: serverTimestamp(),
      });

      if (movementDelta !== 0) {
        transaction.set(movementRefs.get(row.id), {
          capacityGroupKey: row.productId,
          createdAt: serverTimestamp(),
          createdBy: "admin_inventory",
          lineItemId: "",
          linkedId: row.productId,
          linkedType: "event",
          orderId: "",
          quantityDelta: movementDelta,
          reason: "manual_adjustment",
          sku: "",
          source: "manual",
          sourcePaymentId: "",
          title: row.primary,
          variantId: "",
        });
      }
    });
  });
};
