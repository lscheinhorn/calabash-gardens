const draftStatusLabel = {
  conflict: "Draft conflict: saved draft cannot be previewed; live version shown",
  live: "Live only",
  saved: "Saved draft",
  unavailable: "Draft status unavailable",
};

const inventoryOptionStatus = (option) => (
  option.active
    ? `${option.stockOnHand} on hand`
    : `${option.stockOnHand} on hand, not offered`
);

export default function AdminProductPreviewStatus({ product }) {
  const previewState = product.adminPreview || {
    draft: { savedAt: "", state: "unavailable" },
    inventory: { isConfigured: false, options: [] },
  };
  const draftState = previewState.draft?.state || "unavailable";
  const savedAt = previewState.draft?.savedAt;
  const savedDate = savedAt ? new Date(savedAt) : null;
  const validSavedDate = savedDate && !Number.isNaN(savedDate.getTime());
  const productLabel = product.title || product.id || "product";

  return (
    <aside
      aria-label={`Admin preview status for ${productLabel}`}
      className="admin_preview_product_status"
    >
      <div className="admin_preview_product_status_header">
        <strong className={`admin_preview_product_draft_status admin_preview_product_draft_status_${draftState}`}>
          {draftStatusLabel[draftState] || draftStatusLabel.unavailable}
        </strong>
        {draftState === "saved" && validSavedDate ? (
          <time dateTime={savedAt} title={savedDate.toLocaleString()}>
            {savedDate.toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
          </time>
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
    </aside>
  );
}
