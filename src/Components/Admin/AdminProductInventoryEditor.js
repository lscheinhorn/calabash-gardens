import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSave,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { collection, getDocs } from "firebase/firestore";

import {
  InventoryConflictError,
  updateInventoryDraftValue,
} from "./inventoryAdminModel";
import {
  productInventoryDraftChanged,
  productInventoryDraftRowsFor,
  productInventoryRowsFromSnapshot,
  validateProductInventoryChanges,
} from "./inventoryAdminRows";
import { saveInventoryRowsTransaction } from "./inventoryAdminTransactions";
import AdminQuantityStepper from "./AdminQuantityStepper";

const abandonMessage = "Discard this unsaved inventory change?";

export default function AdminProductInventoryEditor({
  db,
  onCancel,
  onSaved,
  productId,
  productLabel,
}) {
  const [allProductRows, setAllProductRows] = useState([]);
  const [draftRows, setDraftRows] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState([]);

  const loadInventory = useCallback(async ({ preserveCurrent = false } = {}) => {
    setIsLoading(true);
    setMessage("");

    try {
      const productsSnapshot = await getDocs(collection(db, "products"));
      const nextAllProductRows = productInventoryRowsFromSnapshot(productsSnapshot).map((row) => (
        row.productId === productId
          && (row.inventorySetupRequired === true || row.storedInventoryTracked !== true)
          ? {
            ...row,
            confirmSetupValuesOnSave: true,
            inventorySetupRequired: true,
            requireTrackedOnSave: row.storedInventoryTracked !== true,
          }
          : row
      ));
      const nextRows = nextAllProductRows.filter((row) => row.productId === productId);

      if (!nextRows.length) {
        setAllProductRows([]);
        setDraftRows({});
        setRows([]);
        setMessage("Inventory options could not be found for this product.");
        return "missing";
      }

      setAllProductRows(nextAllProductRows);
      setRows(nextRows);
      setDraftRows(productInventoryDraftRowsFor(nextRows, { blankUnconfirmed: true }));
      return "loaded";
    } catch (error) {
      if (!preserveCurrent) {
        setAllProductRows([]);
        setDraftRows({});
        setRows([]);
      }
      setMessage("Inventory could not be loaded.");
      return "failed";
    } finally {
      setIsLoading(false);
    }
  }, [db, productId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const dirtyRows = useMemo(() => rows.filter((row) => (
    productInventoryDraftChanged(row, draftRows[row.id])
  )), [draftRows, rows]);
  const hasUnsavedChanges = dirtyRows.length > 0;
  const setupIncomplete = rows.some((row) => (
    row.inventorySetupRequired === true
    && draftRows[row.id]?.stockConfirmed !== true
  ));

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const handlePreviewNavigation = (event) => {
      const clickedElement = event.target instanceof Element ? event.target : null;
      const anchor = clickedElement?.closest("a[href]");

      if (!anchor || window.confirm(abandonMessage)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("click", handlePreviewNavigation, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("click", handlePreviewNavigation, true);
    };
  }, [hasUnsavedChanges]);

  const updateQuantity = (row, value) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    setMessage("");
    setDraftRows((currentDraftRows) => ({
      ...currentDraftRows,
      [row.id]: updateInventoryDraftValue({
        draft: currentDraftRows[row.id],
        field: "stockOnHand",
        row,
        value,
      }),
    }));
  };

  const discardAndClose = () => {
    if (hasUnsavedChanges && !window.confirm(abandonMessage)) {
      return;
    }

    onCancel();
  };

  const saveInventory = async (event) => {
    event.preventDefault();

    if (!dirtyRows.length) {
      setMessage("No inventory changes to save.");
      return;
    }

    const validationMessage = validateProductInventoryChanges({
      dirtyRows,
      draftRows,
      rows: allProductRows,
    });

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await saveInventoryRowsTransaction({
        db,
        dirtyRows,
        draftRows,
      });
      await loadInventory();
      setMessage("Inventory saved.");
      await onSaved();
    } catch (error) {
      if (error instanceof InventoryConflictError) {
        const refreshResult = await loadInventory({ preserveCurrent: true });

        if (refreshResult === "loaded") {
          await onSaved();
          setMessage(error.message);
        } else if (refreshResult === "missing") {
          await onSaved();
          setMessage("This product or its inventory options were removed while you were editing. Nothing was saved.");
        } else {
          const conflictMessage = error.message.replace(
            / Inventory was refreshed; review it and save again\.$/,
            "",
          );
          setMessage(
            `${conflictMessage} Nothing was saved. The latest inventory could not be reloaded; your entered values are still shown. Close and reopen this editor when the connection is restored.`,
          );
        }
      } else {
        setMessage("Inventory could not be saved. Check the values and Firestore permissions, then try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      aria-label={`Adjust inventory for ${productLabel}`}
      className="admin_preview_inventory_editor"
      onSubmit={saveInventory}
    >
      <div className="admin_preview_inventory_editor_header">
        <strong>{rows.some((row) => row.inventorySetupRequired) ? "Set up inventory" : "Adjust inventory"}</strong>
        <button
          aria-label={`Close inventory editor for ${productLabel}`}
          className="admin_preview_inventory_icon_button"
          disabled={isSaving}
          onClick={discardAndClose}
          title="Close inventory editor"
          type="button"
        >
          <FontAwesomeIcon aria-hidden="true" icon={faTimes} />
        </button>
      </div>

      {isLoading ? <p className="admin_preview_inventory_message">Loading inventory...</p> : null}
      {!isLoading && rows.length ? (
        <div className="admin_preview_inventory_editor_rows">
          {rows.map((row) => {
            const value = draftRows[row.id]?.stockOnHand ?? "";
            const optionLabel = row.secondary || "Default";

            return (
              <div className="admin_preview_inventory_editor_row" key={row.id}>
                <span>{optionLabel}</span>
                <AdminQuantityStepper
                  ariaLabel={`${optionLabel} ${productLabel} stock`}
                  decrementLabel={`Decrease ${optionLabel} ${productLabel} stock by one`}
                  disabled={isSaving}
                  incrementLabel={`Increase ${optionLabel} ${productLabel} stock by one`}
                  onChange={(nextValue) => updateQuantity(row, nextValue)}
                  placeholder={row.inventorySetupRequired ? "Enter" : "0"}
                  value={value}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {setupIncomplete && !isLoading ? (
        <p className="admin_preview_inventory_message">Enter a quantity for every option to finish inventory setup.</p>
      ) : null}
      {hasUnsavedChanges ? (
        <p className="admin_preview_inventory_unsaved">Unsaved inventory change</p>
      ) : null}
      {message ? <p className="admin_preview_inventory_message" role="status">{message}</p> : null}

      {!isLoading && rows.length ? (
        <div className="admin_preview_inventory_actions">
          <button
            className="admin_primary_button"
            disabled={isSaving || !hasUnsavedChanges || setupIncomplete}
            type="submit"
          >
            <FontAwesomeIcon aria-hidden="true" icon={faSave} />
            {isSaving ? "Saving..." : "Save Inventory"}
          </button>
          <button
            className="admin_secondary_button"
            disabled={isSaving || !hasUnsavedChanges}
            onClick={() => {
              setDraftRows(productInventoryDraftRowsFor(rows, { blankUnconfirmed: true }));
              setMessage("");
            }}
            type="button"
          >
            Discard
          </button>
        </div>
      ) : null}
    </form>
  );
}
