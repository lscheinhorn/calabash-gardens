import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";

import AdminProductInventoryEditor from "./AdminProductInventoryEditor";

const draftStatusLabel = {
  conflict: "Draft conflict: saved draft cannot be previewed; live version shown",
  live: "No draft changes",
  saved: "Saved draft",
  unavailable: "Draft status unavailable",
};

const inventoryOptionStatus = (option) => (
  option.active
    ? `${option.stockOnHand} on hand`
    : `${option.stockOnHand} on hand, not offered`
);

export default function AdminProductPreviewStatus({
  canEditInventory = false,
  db = null,
  onInventorySaved = async () => {},
  product,
}) {
  const [isInventoryEditorOpen, setIsInventoryEditorOpen] = useState(false);
  const previewState = product.adminPreview || {
    draft: { savedAt: "", state: "unavailable" },
    inventory: { isConfigured: false, options: [] },
  };
  const draftState = previewState.draft?.state || "unavailable";
  const savedAt = previewState.draft?.savedAt;
  const savedDate = savedAt ? new Date(savedAt) : null;
  const validSavedDate = savedDate && !Number.isNaN(savedDate.getTime());
  const productLabel = product.title || product.id || "product";
  const inventoryEditBlocked = draftState === "conflict"
    || draftState === "unavailable"
    || previewState.draft?.inventoryEdited === true;
  const inventoryEditBlockedMessage = previewState.draft?.inventoryEdited === true
    ? "Finish or discard this product draft's inventory changes before adjusting inventory here."
    : "Resolve the product draft status before adjusting inventory here.";
  const inventoryEditorAllowed = Boolean(canEditInventory && db && !inventoryEditBlocked);

  useEffect(() => {
    if (!inventoryEditorAllowed) {
      setIsInventoryEditorOpen(false);
    }
  }, [inventoryEditorAllowed]);

  return (
    <aside
      aria-label={`Admin preview status for ${productLabel}`}
      className="admin_preview_product_status"
    >
      <div className="admin_preview_product_status_header">
        <div className="admin_preview_product_status_heading">
          <strong className={`admin_preview_product_draft_status admin_preview_product_draft_status_${draftState}`}>
            {draftStatusLabel[draftState] || draftStatusLabel.unavailable}
          </strong>
          {draftState === "saved" && validSavedDate ? (
            <time dateTime={savedAt} title={savedDate.toLocaleString()}>
              {savedDate.toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
            </time>
          ) : null}
        </div>
        {canEditInventory && db && !isInventoryEditorOpen ? (
          <button
            aria-expanded="false"
            aria-label={`Adjust inventory for ${productLabel}`}
            className="admin_preview_inventory_edit_button"
            disabled={inventoryEditBlocked}
            onClick={() => setIsInventoryEditorOpen(true)}
            title={inventoryEditBlocked ? inventoryEditBlockedMessage : "Adjust inventory"}
            type="button"
          >
            <FontAwesomeIcon aria-hidden="true" icon={faPencilAlt} />
          </button>
        ) : null}
      </div>
      {previewState.inventory?.isConfigured ? (
        <ul
          aria-label={`Inventory for ${productLabel}`}
          className="admin_preview_product_inventory"
        >
          {previewState.inventory.options.map((option, index) => (
            <li
              aria-label={`${option.label}, ${inventoryOptionStatus(option)}`}
              key={`${product.id}-preview-inventory-${option.label}-${index}`}
            >
              <span>{option.label}</span>
              <strong>{inventoryOptionStatus(option)}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin_preview_product_inventory_unset">Inventory not set up</p>
      )}
      {canEditInventory && inventoryEditBlocked ? (
        <p className="admin_preview_inventory_message">{inventoryEditBlockedMessage}</p>
      ) : null}
      {isInventoryEditorOpen && inventoryEditorAllowed ? (
        <AdminProductInventoryEditor
          db={db}
          onCancel={() => setIsInventoryEditorOpen(false)}
          onSaved={onInventorySaved}
          productId={product.id}
          productLabel={productLabel}
        />
      ) : null}
    </aside>
  );
}
