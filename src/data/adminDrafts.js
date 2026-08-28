import {
  collection,
  deleteField,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import {
  contentFingerprintForTarget,
  contentRevisionFor,
  DraftPublishConflictError,
  mergeDraftWithLiveOperationalData,
  operationalSnapshotForTarget,
  parseOperationalSnapshot,
  serializeOperationalSnapshot,
} from "./adminDraftPublishModel";
import {
  productSkuClaimHasOwner,
  productSkuClaimsForProduct,
  ProductSkuRegistryError,
} from "./productSkuRegistry";

const draftCollectionsByTarget = {
  events: "eventDrafts",
  products: "productDrafts",
  siteContent: "siteContentDrafts",
};

const draftMetadataKeys = new Set([
  "draftBaseContentFingerprint",
  "draftBaseContentRevision",
  "draftBaseOperationalJson",
  "draftBaseTargetExists",
  "draftDeletedFields",
  "draftDiscardedAt",
  "draftDiscardedBy",
  "draftPublishedAt",
  "draftPublishedBy",
  "draftPublishedContentRevision",
  "draftRevision",
  "draftStatus",
  "draftTargetCollection",
  "draftTargetId",
  "draftUpdatedAt",
  "draftUpdatedBy",
]);

const deletableFieldsByTarget = {
  events: new Set([
    "capacity",
    "eventType",
    "link",
    "manualSeatsReserved",
    "sortOrder",
  ]),
  products: new Set(["sortOrder"]),
  siteContent: new Set(),
};

const obsoleteDraftFieldsByTarget = {
  events: new Set(["eventType", "sortOrder"]),
  products: new Set(),
  siteContent: new Set(),
};

export const draftCollectionForTarget = (targetCollection) => (
  draftCollectionsByTarget[targetCollection] || ""
);

const assertDraftTarget = (targetCollection, targetId) => {
  if (!draftCollectionForTarget(targetCollection)) {
    throw new Error(`Unsupported draft target collection: ${targetCollection}`);
  }

  if (!targetId || String(targetId).includes("/")) {
    throw new Error("Draft target ID must be a non-empty Firestore document ID.");
  }
};

export const stripDraftMetadata = (draftData) => (
  Object.fromEntries(Object.entries(draftData || {})
    .filter(([key]) => !draftMetadataKeys.has(key)))
);

export const adminDraftErrorMessage = (error, fallback) => (
  error?.name === "DraftPublishConflictError" && error.message
    ? error.message
    : fallback
);

const normalizedDeletedFields = (targetCollection, deletedFields = []) => {
  const allowedFields = deletableFieldsByTarget[targetCollection] || new Set();

  return Array.from(new Set(deletedFields.filter((field) => (
    typeof field === "string" && allowedFields.has(field)
  )))).sort();
};

const validDraftBaseline = (draft = {}) => (
  Number.isInteger(draft.draftBaseContentRevision)
    && draft.draftBaseContentRevision >= 0
    && typeof draft.draftBaseContentFingerprint === "string"
    && typeof draft.draftBaseOperationalJson === "string"
    && typeof draft.draftBaseTargetExists === "boolean"
    && Number.isInteger(draft.draftRevision)
    && draft.draftRevision >= 1
);

const baselineFor = ({ targetCollection, targetSnapshot }) => {
  const targetData = targetSnapshot.exists() ? targetSnapshot.data() : {};

  return {
    draftBaseContentFingerprint: contentFingerprintForTarget(targetCollection, targetData),
    draftBaseContentRevision: contentRevisionFor(targetData),
    draftBaseOperationalJson: serializeOperationalSnapshot(
      operationalSnapshotForTarget(targetCollection, targetData),
    ),
    draftBaseTargetExists: targetSnapshot.exists(),
  };
};

const draftConflict = (message) => {
  throw new DraftPublishConflictError(message);
};

const prepareProductSkuRegistryChanges = async ({
  db,
  liveData,
  productId,
  targetPayload,
  transaction,
}) => {
  let currentClaims;
  let nextClaims;

  try {
    currentClaims = productSkuClaimsForProduct({
      productId,
      strict: false,
      variants: liveData.variants,
    });
    nextClaims = productSkuClaimsForProduct({
      productId,
      variants: targetPayload.variants,
    });
  } catch (error) {
    if (error instanceof ProductSkuRegistryError) {
      draftConflict(error.message);
    }
    throw error;
  }

  const currentClaimsById = new Map(currentClaims.map((claim) => [claim.registryId, claim]));
  const nextClaimsById = new Map(nextClaims.map((claim) => [claim.registryId, claim]));
  const registryIds = Array.from(new Set([
    ...currentClaimsById.keys(),
    ...nextClaimsById.keys(),
  ])).sort();
  const registryRefs = new Map(registryIds.map((registryId) => [
    registryId,
    doc(db, "productSkus", registryId),
  ]));
  const registrySnapshots = await Promise.all(registryIds.map(async (registryId) => [
    registryId,
    await transaction.get(registryRefs.get(registryId)),
  ]));
  const registrySnapshotsById = new Map(registrySnapshots);

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
      draftConflict(
        `SKU ${claim.sku} is already assigned to another product option. Choose a different SKU.`,
      );
    }
  });

  return {
    claimsToDelete: currentClaims.filter((claim) => {
      const registrySnapshot = registrySnapshotsById.get(claim.registryId);

      return !nextClaimsById.has(claim.registryId)
        && registrySnapshot?.exists()
        && productSkuClaimHasOwner(claim, registrySnapshot.data());
    }),
    claimsToSet: nextClaims,
    registryRefs,
  };
};

export const loadAdminDrafts = async ({ db, targetCollection = "" }) => {
  const targetCollections = targetCollection
    ? [targetCollection]
    : Object.keys(draftCollectionsByTarget);
  const snapshots = await Promise.all(targetCollections.map(async (collectionName) => {
    assertDraftTarget(collectionName, "placeholder");

    let snapshot;

    try {
      snapshot = await getDocs(collection(db, draftCollectionForTarget(collectionName)));
    } catch (error) {
      return [];
    }

    return snapshot.docs.map((draftDoc) => ({
      data: stripDraftMetadata(draftDoc.data()),
      id: draftDoc.id,
      targetCollection: collectionName,
      targetId: draftDoc.id,
      ...draftDoc.data(),
    }));
  }));

  return snapshots.flat();
};

export const activeAdminDrafts = (drafts, targetCollection = "") => (
  drafts.filter((draft) => (
    draft.draftStatus === "draft"
      && (!targetCollection || draft.targetCollection === targetCollection)
      && draft.targetId
      && draft.data
      && typeof draft.data === "object"
      && !Array.isArray(draft.data)
  ))
);

export const adminDraftByTarget = (drafts, targetCollection) => (
  activeAdminDrafts(drafts, targetCollection).reduce((draftsByTarget, draft) => {
    draftsByTarget.set(draft.targetId, draft);
    return draftsByTarget;
  }, new Map())
);

const draftPreviewConflictMessage = ({
  draft,
  liveData = {},
  targetCollection,
  targetExists,
}) => {
  if (!validDraftBaseline(draft)) {
    return "This draft predates safe publishing. Discard it and save a new draft before publishing.";
  }

  if (draft.draftBaseTargetExists !== targetExists) {
    return "The live record was created or removed after this draft started.";
  }

  if (
    targetExists
    && (
      contentRevisionFor(liveData) !== draft.draftBaseContentRevision
      || contentFingerprintForTarget(targetCollection, liveData)
        !== draft.draftBaseContentFingerprint
    )
  ) {
    return "Live content changed after this draft started.";
  }

  return "";
};

export const buildAdminDraftPublishPreview = ({
  draft,
  liveData = null,
  targetCollection,
}) => {
  if (!draft?.data) {
    draftConflict("The saved draft no longer exists. Reload before reviewing publish changes.");
  }

  const targetExists = Boolean(liveData);
  const previewConflict = draftPreviewConflictMessage({
    draft,
    liveData: liveData || {},
    targetCollection,
    targetExists,
  });

  if (previewConflict) {
    draftConflict(previewConflict);
  }

  const merged = mergeDraftWithLiveOperationalData({
    baseOperational: parseOperationalSnapshot(draft.draftBaseOperationalJson),
    deletedFields: draft.draftDeletedFields,
    draftData: draft.data,
    liveData: liveData || {},
    targetCollection,
    targetExists,
  });
  const payload = { ...merged.payload };

  merged.fieldsToDelete.forEach((field) => {
    if (targetExists && Object.prototype.hasOwnProperty.call(liveData, field)) {
      payload[field] = deleteField();
    } else {
      delete payload[field];
    }
  });

  return payload;
};

export const applyAdminDrafts = (liveDocs, drafts, targetCollection) => {
  const draftsByTarget = adminDraftByTarget(drafts, targetCollection);
  const seenIds = new Set();
  const overlaidDocs = liveDocs.map((liveDoc) => {
    const draft = draftsByTarget.get(liveDoc.id);

    seenIds.add(liveDoc.id);

    if (!draft) {
      return liveDoc;
    }

    let previewConflict = draftPreviewConflictMessage({
      draft,
      liveData: liveDoc,
      targetCollection,
      targetExists: true,
    });
    let overlaidData = liveDoc;

    if (!previewConflict) {
      try {
        overlaidData = mergeDraftWithLiveOperationalData({
          baseOperational: parseOperationalSnapshot(draft.draftBaseOperationalJson),
          deletedFields: draft.draftDeletedFields,
          draftData: draft.data,
          liveData: liveDoc,
          targetCollection,
          targetExists: true,
        }).payload;
      } catch (error) {
        previewConflict = error?.message || "This draft conflicts with current live inventory.";
      }
    }

    const overlaidDoc = {
      ...liveDoc,
      ...overlaidData,
      _draft: draft,
      ...(previewConflict ? { _draftConflict: previewConflict } : {}),
      id: liveDoc.id,
    };

    if (!previewConflict) {
      normalizedDeletedFields(targetCollection, draft.draftDeletedFields)
        .forEach((field) => delete overlaidDoc[field]);
    }

    return overlaidDoc;
  });
  const draftOnlyDocs = Array.from(draftsByTarget.values())
    .filter((draft) => !seenIds.has(draft.targetId))
    .map((draft) => {
      const previewConflict = draftPreviewConflictMessage({
        draft,
        targetCollection,
        targetExists: false,
      });
      const draftOnlyDoc = {
        ...draft.data,
        _draft: draft,
        ...(previewConflict ? { _draftConflict: previewConflict } : {}),
        _draftOnly: true,
        id: draft.targetId,
      };

      normalizedDeletedFields(targetCollection, draft.draftDeletedFields)
        .forEach((field) => delete draftOnlyDoc[field]);

      return draftOnlyDoc;
    });

  return [...overlaidDocs, ...draftOnlyDocs];
};

export const saveAdminDraft = async ({
  data,
  db,
  deletedFields = [],
  expectedTargetExists = null,
  targetCollection,
  targetId,
  userId = "",
}) => {
  assertDraftTarget(targetCollection, targetId);

  const targetRef = doc(db, targetCollection, targetId);
  const draftRef = doc(db, draftCollectionForTarget(targetCollection), targetId);

  return runTransaction(db, async (transaction) => {
    const [targetSnapshot, draftSnapshot] = await Promise.all([
      transaction.get(targetRef),
      transaction.get(draftRef),
    ]);
    const currentDraft = draftSnapshot.exists() ? draftSnapshot.data() : {};
    const isActiveDraft = currentDraft.draftStatus === "draft";

    if (
      typeof expectedTargetExists === "boolean"
      && expectedTargetExists !== targetSnapshot.exists()
    ) {
      draftConflict(
        expectedTargetExists
          ? "The live record no longer exists. Reload before saving."
          : "That record was created while you were editing. Reload before saving.",
      );
    }

    if (isActiveDraft && !validDraftBaseline(currentDraft) && targetSnapshot.exists()) {
      draftConflict(
        "This draft predates safe publishing. Discard it, reopen the live record, and save a new draft.",
      );
    }

    const baseline = isActiveDraft && validDraftBaseline(currentDraft)
      ? {
        draftBaseContentFingerprint: currentDraft.draftBaseContentFingerprint,
        draftBaseContentRevision: currentDraft.draftBaseContentRevision,
        draftBaseOperationalJson: currentDraft.draftBaseOperationalJson,
        draftBaseTargetExists: currentDraft.draftBaseTargetExists,
      }
      : baselineFor({ targetCollection, targetSnapshot });
    const draftRevision = Number.isInteger(currentDraft.draftRevision)
      ? currentDraft.draftRevision + 1
      : 1;

    transaction.set(draftRef, {
      ...data,
      ...baseline,
      draftDeletedFields: normalizedDeletedFields(targetCollection, deletedFields),
      draftRevision,
      draftStatus: "draft",
      draftTargetCollection: targetCollection,
      draftTargetId: targetId,
      draftUpdatedAt: serverTimestamp(),
      draftUpdatedBy: userId,
    });

    return { draftRevision };
  });
};

export const publishAdminDraft = async ({
  db,
  expectedDraftRevision,
  targetCollection,
  targetId,
  userId = "",
}) => {
  assertDraftTarget(targetCollection, targetId);

  const targetRef = doc(db, targetCollection, targetId);
  const draftRef = doc(db, draftCollectionForTarget(targetCollection), targetId);

  return runTransaction(db, async (transaction) => {
    const [targetSnapshot, draftSnapshot] = await Promise.all([
      transaction.get(targetRef),
      transaction.get(draftRef),
    ]);

    if (!draftSnapshot.exists()) {
      draftConflict("The saved draft no longer exists. Reload before publishing.");
    }

    const storedDraft = draftSnapshot.data();

    if (storedDraft.draftStatus !== "draft") {
      draftConflict("This draft is no longer awaiting publication. Reload before publishing.");
    }

    if (!validDraftBaseline(storedDraft)) {
      draftConflict(
        "This draft predates safe publishing. Discard it, reopen the live record, and save a new draft.",
      );
    }

    if (
      !Number.isInteger(expectedDraftRevision)
      || expectedDraftRevision !== storedDraft.draftRevision
    ) {
      draftConflict("This draft changed after review. Reload and review the latest draft before publishing.");
    }

    if (storedDraft.draftBaseTargetExists !== targetSnapshot.exists()) {
      draftConflict("The live record was created or removed after this draft started. Reload before publishing.");
    }

    const liveData = targetSnapshot.exists() ? targetSnapshot.data() : {};

    if (
      contentRevisionFor(liveData) !== storedDraft.draftBaseContentRevision
      || contentFingerprintForTarget(targetCollection, liveData)
        !== storedDraft.draftBaseContentFingerprint
    ) {
      draftConflict("Live content changed after this draft started. Reload and review before publishing.");
    }

    const draftData = stripDraftMetadata(storedDraft);
    const merged = mergeDraftWithLiveOperationalData({
      baseOperational: parseOperationalSnapshot(storedDraft.draftBaseOperationalJson),
      deletedFields: storedDraft.draftDeletedFields,
      draftData,
      liveData,
      targetCollection,
      targetExists: targetSnapshot.exists(),
    });
    const nextContentRevision = contentRevisionFor(liveData) + 1;
    const targetPayload = {
      ...merged.payload,
      contentRevision: nextContentRevision,
      updatedAt: serverTimestamp(),
    };

    if (!targetSnapshot.exists()) {
      targetPayload.createdAt = serverTimestamp();
    }

    merged.fieldsToDelete.forEach((field) => {
      if (targetSnapshot.exists()) {
        targetPayload[field] = deleteField();
      } else {
        delete targetPayload[field];
      }
    });

    const skuRegistryChanges = targetCollection === "products"
      ? await prepareProductSkuRegistryChanges({
        db,
        liveData,
        productId: targetId,
        targetPayload,
        transaction,
      })
      : null;

    transaction.set(targetRef, targetPayload, { merge: true });
    transaction.set(draftRef, {
      draftPublishedAt: serverTimestamp(),
      draftPublishedBy: userId,
      draftPublishedContentRevision: nextContentRevision,
      draftRevision: storedDraft.draftRevision + 1,
      draftStatus: "published",
      draftTargetCollection: targetCollection,
      draftTargetId: targetId,
      draftUpdatedAt: serverTimestamp(),
      draftUpdatedBy: userId,
    }, { merge: true });

    skuRegistryChanges?.claimsToDelete.forEach((claim) => {
      transaction.delete(skuRegistryChanges.registryRefs.get(claim.registryId));
    });
    skuRegistryChanges?.claimsToSet.forEach((claim) => {
      transaction.set(skuRegistryChanges.registryRefs.get(claim.registryId), {
        productId: claim.productId,
        sku: claim.sku,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
        variantId: claim.variantId,
      });
    });

    return {
      contentRevision: nextContentRevision,
      draftRevision: storedDraft.draftRevision + 1,
    };
  });
};

export const discardAdminDraft = async ({
  db,
  targetCollection,
  targetId,
  userId = "",
}) => {
  assertDraftTarget(targetCollection, targetId);

  const targetRef = doc(db, targetCollection, targetId);
  const draftRef = doc(db, draftCollectionForTarget(targetCollection), targetId);

  return runTransaction(db, async (transaction) => {
    const [targetSnapshot, draftSnapshot] = await Promise.all([
      transaction.get(targetRef),
      transaction.get(draftRef),
    ]);

    if (!draftSnapshot.exists()) {
      draftConflict("The draft no longer exists. Reload before discarding.");
    }

    const currentDraft = draftSnapshot.data();
    const baseline = validDraftBaseline(currentDraft)
      ? {
        draftBaseContentFingerprint: currentDraft.draftBaseContentFingerprint,
        draftBaseContentRevision: currentDraft.draftBaseContentRevision,
        draftBaseOperationalJson: currentDraft.draftBaseOperationalJson,
        draftBaseTargetExists: currentDraft.draftBaseTargetExists,
      }
      : baselineFor({ targetCollection, targetSnapshot });
    const draftRevision = Number.isInteger(currentDraft.draftRevision)
      ? currentDraft.draftRevision + 1
      : 1;
    const discardedData = stripDraftMetadata(currentDraft);

    (obsoleteDraftFieldsByTarget[targetCollection] || new Set()).forEach((field) => {
      delete discardedData[field];
    });

    transaction.set(draftRef, {
      ...discardedData,
      ...baseline,
      draftDeletedFields: normalizedDeletedFields(
        targetCollection,
        currentDraft.draftDeletedFields,
      ),
      draftDiscardedAt: serverTimestamp(),
      draftDiscardedBy: userId,
      draftRevision,
      draftStatus: "discarded",
      draftTargetCollection: targetCollection,
      draftTargetId: targetId,
      draftUpdatedAt: serverTimestamp(),
      draftUpdatedBy: userId,
    });

    return { draftRevision };
  });
};

export { DraftPublishConflictError };
