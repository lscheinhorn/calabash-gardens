import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";

import {
  InventoryConflictError,
  mergePreservedInventoryDrafts,
  updateInventoryDraftValue,
} from "./inventoryAdminModel";
import {
  inventoryNumberOrNull,
  inventoryStatusLabel,
  inventoryText,
  inventoryWholeNumber,
  productInventoryDraftChanged,
  productInventoryDraftForRow,
  productInventoryRowsFromSnapshot,
  validateProductInventoryChanges,
} from "./inventoryAdminRows";
import { saveInventoryRowsTransaction } from "./inventoryAdminTransactions";
import AdminQuantityStepper from "./AdminQuantityStepper";

const defaultFilters = {
  search: "",
  status: "all",
  type: "all",
};

const eventRows = (snapshot) => snapshot.docs.map((docSnapshot) => {
  const event = docSnapshot.data();
  const eventId = docSnapshot.id;
  const capacity = inventoryNumberOrNull(event.capacity);
  const ticketsSold = inventoryNumberOrNull(event.ticketsSold) || 0;
  const manualSeatsReserved = inventoryNumberOrNull(event.manualSeatsReserved) || 0;
  const visible = event.isActive !== false && event.published !== false;
  const remainingSeats = capacity === null
    ? null
    : Math.max(0, capacity - ticketsSold - manualSeatsReserved);
  const status = !visible
    ? "inactive"
    : capacity === null
      ? "untracked"
      : remainingSeats <= 0
        ? "out"
        : "available";

  return {
    capacity,
    id: `event-${eventId}`,
    manualSeatsReserved,
    primary: inventoryText(event.title, eventId),
    productId: eventId,
    remainingSeats,
    secondary: Array.isArray(event.eventDates) ? event.eventDates.join(", ") : "",
    status,
    ticketsSold,
    type: "event",
    value: capacity === null ? "Capacity not set" : `${remainingSeats} of ${capacity} available`,
    waitlistEnabled: event.waitlistEnabled === true,
  };
});

const draftForRow = (row) => (row.type === "product" ? {
  ...productInventoryDraftForRow(row),
} : {
  capacity: row.capacity === null ? "" : String(row.capacity),
  manualSeatsReserved: String(row.manualSeatsReserved || 0),
  waitlistEnabled: row.waitlistEnabled === true,
});

const draftRowsFor = (rows) => rows.reduce((drafts, row) => ({
  ...drafts,
  [row.id]: draftForRow(row),
}), {});

const eventDraftChanged = (row, draft) => (
  draft
  && (
    String(row.capacity === null ? "" : row.capacity) !== String(draft.capacity)
    || String(row.manualSeatsReserved || 0) !== String(draft.manualSeatsReserved)
    || row.waitlistEnabled !== draft.waitlistEnabled
  )
);

const rowDraftChanged = (row, draft) => (
  row.type === "product"
    ? productInventoryDraftChanged(row, draft)
    : eventDraftChanged(row, draft)
);

export default function InventoryAdmin({ db }) {
  const [draftRows, setDraftRows] = useState({});
  const [filters, setFilters] = useState(defaultFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState([]);

  const loadInventory = useCallback(async ({
    preserveDraftRows = null,
    preserveRowIds = [],
    resetRowIds = [],
  } = {}) => {
    setIsLoading(true);
    setMessage("");

    try {
      const [productsSnapshot, eventsSnapshot] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "events")),
      ]);

      const nextRows = [
        ...productInventoryRowsFromSnapshot(productsSnapshot),
        ...eventRows(eventsSnapshot),
      ].sort((first, second) => (
        first.type.localeCompare(second.type)
        || first.primary.localeCompare(second.primary)
        || first.secondary.localeCompare(second.secondary)
      ));

      setRows(nextRows);
      setDraftRows(mergePreservedInventoryDrafts({
        freshDraftRows: draftRowsFor(nextRows),
        preserveDraftRows,
        preserveRowIds,
        resetRowIds,
      }));
      return true;
    } catch (error) {
      setMessage("Inventory could not be loaded.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return rows.filter((row) => {
      const searchableText = [
        row.primary,
        row.secondary,
        row.productId,
        row.sku,
        row.category,
      ].join(" ").toLowerCase();

      return (!search || searchableText.includes(search))
        && (filters.type === "all" || row.type === filters.type)
        && (filters.status === "all" || row.status === filters.status);
    });
  }, [filters, rows]);

  const dirtyRows = useMemo(() => (
    rows.filter((row) => rowDraftChanged(row, draftRows[row.id]))
  ), [draftRows, rows]);
  const dirtyCount = dirtyRows.length;

  const updateFilter = (field, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const updateDraft = (rowId, field, value) => {
    setMessage("");
    const row = rows.find((candidate) => candidate.id === rowId);

    setDraftRows((currentDraftRows) => ({
      ...currentDraftRows,
      [rowId]: updateInventoryDraftValue({
        draft: currentDraftRows[rowId],
        field,
        row,
        value,
      }),
    }));
  };

  const discardChanges = () => {
    setDraftRows(draftRowsFor(rows));
    setMessage("");
  };

  const validateDirtyRows = () => {
    const productValidationMessage = validateProductInventoryChanges({
      dirtyRows,
      draftRows,
      rows,
    });

    if (productValidationMessage) {
      return productValidationMessage;
    }

    for (const row of dirtyRows.filter((candidate) => candidate.type === "event")) {
      const draft = draftRows[row.id] || {};

      if (!inventoryWholeNumber(draft.capacity)) {
        return "Every changed event capacity must be a whole number.";
      }

      if (!inventoryWholeNumber(draft.manualSeatsReserved)) {
        return "Every changed event hold value must be a whole number.";
      }

      if (row.ticketsSold + Number(draft.manualSeatsReserved) > Number(draft.capacity)) {
        return "Event capacity cannot be lower than sold tickets plus manual holds.";
      }
    }

    return "";
  };

  const saveInventoryChanges = async () => {
    if (!dirtyRows.length) {
      setMessage("No inventory changes to save.");
      return;
    }

    const validationMessage = validateDirtyRows();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setMessage("");
    const savingDirtyRows = dirtyRows;
    const savingDraftRows = draftRows;

    try {
      await saveInventoryRowsTransaction({
        db,
        dirtyRows: savingDirtyRows,
        draftRows: savingDraftRows,
      });

      await loadInventory();
      setMessage("Inventory changes saved.");
    } catch (error) {
      if (error instanceof InventoryConflictError) {
        const refreshed = await loadInventory({
          preserveDraftRows: savingDraftRows,
          preserveRowIds: savingDirtyRows.map((row) => row.id),
          resetRowIds: error.rowIds,
        });
        setMessage(refreshed
          ? error.message
          : `${error.message.replace(" Inventory was refreshed; review it and save again.", "")} Inventory could not be refreshed. Your other unsaved changes were kept; refresh before saving again.`);
      } else {
        const changedNames = Array.from(new Set(savingDirtyRows.map((row) => row.primary)));
        const affectedLabel = changedNames.length > 3
          ? `${changedNames.slice(0, 3).join(", ")} and ${changedNames.length - 3} more`
          : changedNames.join(", ");

        setMessage(`Inventory could not be saved for ${affectedLabel}. Check the values and Firestore permissions, then try again.`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin_panel admin_full_width admin_inventory_panel">
      <div className="admin_inventory_toolbar">
        <button className="admin_primary_button" disabled={isSaving || dirtyCount === 0} onClick={saveInventoryChanges} type="button">
          {isSaving ? "Saving..." : `Save Changes${dirtyCount ? ` (${dirtyCount})` : ""}`}
        </button>
        <button className="admin_secondary_button" disabled={isSaving || dirtyCount === 0} onClick={discardChanges} type="button">
          Discard Changes
        </button>
        <button className="admin_secondary_button" disabled={isLoading || isSaving} onClick={() => loadInventory()} type="button">
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="admin_filter_grid admin_inventory_filters">
        <label>
          Search
          <input
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Product, event, SKU, category"
            value={filters.search}
          />
        </label>
        <label>
          Type
          <select onChange={(event) => updateFilter("type", event.target.value)} value={filters.type}>
            <option value="all">All</option>
            <option value="product">Products</option>
            <option value="event">Events</option>
          </select>
        </label>
        <label>
          Status
          <select onChange={(event) => updateFilter("status", event.target.value)} value={filters.status}>
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="low">Low Stock</option>
            <option value="out">Out / Full</option>
            <option value="untracked">Untracked</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      {message ? <p className="admin_message">{message}</p> : null}
      {isLoading ? <p className="admin_status">Loading inventory...</p> : null}

      <div className="admin_inventory_table" role="table" aria-label="Inventory rows">
        <div className="admin_inventory_header" role="row">
          <span>Name</span>
          <span>Type</span>
          <span>Status</span>
          <span>Inventory</span>
          <span>Update</span>
        </div>
        {filteredRows.map((row) => {
          const draft = draftRows[row.id] || draftForRow(row);
          const isDirty = rowDraftChanged(row, draft);

          return (
            <div className={isDirty ? "admin_inventory_row admin_inventory_row_dirty" : "admin_inventory_row"} key={row.id} role="row">
              <span>
                <strong>{row.primary}</strong>
                <small>{row.secondary || row.productId}</small>
                {row.sku ? <small>{row.sku}</small> : null}
              </span>
              <span>{inventoryStatusLabel(row.type)}</span>
              <span>
                <mark className={`admin_inventory_status admin_inventory_status_${row.status}`}>
                  {inventoryStatusLabel(row.status)}
                </mark>
                {isDirty ? <small>Unsaved</small> : null}
              </span>
              <span>
                <strong>{row.value}</strong>
                {row.type === "event" ? (
                  <small>{row.ticketsSold || 0} sold / {row.manualSeatsReserved || 0} held</small>
                ) : (
                  <small>{row.lowStockThreshold === null ? "No low-stock threshold" : `Low at ${row.lowStockThreshold}`}</small>
                )}
              </span>
              <span className={`admin_inventory_controls admin_inventory_controls_${row.type}`}>
                {row.type === "product" ? (
                  <>
                    <div className="admin_inventory_control_group">
                      <span>Stock</span>
                      <AdminQuantityStepper
                        ariaLabel={`${row.secondary || "Default"} ${row.primary} stock`}
                        decrementLabel={`Decrease ${row.secondary || "Default"} ${row.primary} stock by one`}
                        disabled={isSaving}
                        incrementLabel={`Increase ${row.secondary || "Default"} ${row.primary} stock by one`}
                        onChange={(value) => updateDraft(row.id, "stockOnHand", value)}
                        value={draft.stockOnHand || ""}
                      />
                    </div>
                    <label>
                      Low
                      <input
                        inputMode="numeric"
                        disabled={isSaving}
                        onChange={(event) => updateDraft(row.id, "lowStockThreshold", event.target.value)}
                        placeholder="Optional"
                        value={draft.lowStockThreshold || ""}
                      />
                    </label>
                    <label className="admin_inline_checkbox">
                      <input
                        checked={draft.inventoryTracked === true}
                        disabled={isSaving}
                        onChange={(event) => updateDraft(row.id, "inventoryTracked", event.target.checked)}
                        type="checkbox"
                      />
                      Track
                    </label>
                    <label className="admin_inline_checkbox">
                      <input
                        checked={draft.active === true}
                        disabled={isSaving}
                        onChange={(event) => updateDraft(row.id, "active", event.target.checked)}
                        type="checkbox"
                      />
                      Sell
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      Capacity
                      <input
                        inputMode="numeric"
                        disabled={isSaving}
                        onChange={(event) => updateDraft(row.id, "capacity", event.target.value)}
                        placeholder="Set capacity"
                        value={draft.capacity || ""}
                      />
                    </label>
                    <div className="admin_inventory_control_group">
                      <span>Holds</span>
                      <AdminQuantityStepper
                        ariaLabel={`${row.primary} manual holds`}
                        decrementLabel={`Decrease ${row.primary} manual holds by one`}
                        disabled={isSaving}
                        incrementLabel={`Increase ${row.primary} manual holds by one`}
                        onChange={(value) => updateDraft(row.id, "manualSeatsReserved", value)}
                        value={draft.manualSeatsReserved || "0"}
                      />
                    </div>
                    <label className="admin_inline_checkbox">
                      <input
                        checked={draft.waitlistEnabled === true}
                        disabled={isSaving}
                        onChange={(event) => updateDraft(row.id, "waitlistEnabled", event.target.checked)}
                        type="checkbox"
                      />
                      Waitlist
                    </label>
                  </>
                )}
              </span>
            </div>
          );
        })}
        {!filteredRows.length && !isLoading ? (
          <p className="admin_status">No inventory rows match these filters.</p>
        ) : null}
      </div>
    </section>
  );
}
