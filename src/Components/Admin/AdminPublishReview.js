const ignoredReviewKeys = new Set([
  "_draft",
  "_draftOnly",
  "createdAt",
  "id",
  "updatedAt",
]);

const isPlainObject = (value) => (
  value
    && typeof value === "object"
    && !Array.isArray(value)
    && !(value instanceof Date)
    && !value.toDate
);

const firestoreSentinelName = (value) => {
  if (!value || typeof value !== "object") {
    return "";
  }

  return value._methodName || value._delegate?._methodName || "";
};

const normalizeReviewValue = (value) => {
  const sentinelName = firestoreSentinelName(value);

  if (sentinelName === "deleteField") {
    return "__DELETE_FIELD__";
  }

  if (sentinelName === "serverTimestamp") {
    return "__SERVER_TIMESTAMP__";
  }

  if (value?.toDate) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeReviewValue);
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((normalizedValue, key) => {
        if (!ignoredReviewKeys.has(key)) {
          normalizedValue[key] = normalizeReviewValue(value[key]);
        }
        return normalizedValue;
      }, {});
  }

  return value ?? "";
};

const formatReviewValue = (value) => {
  const normalizedValue = normalizeReviewValue(value);

  if (normalizedValue === "__DELETE_FIELD__") {
    return "Will be removed";
  }

  if (normalizedValue === "__SERVER_TIMESTAMP__") {
    return "Will update automatically";
  }

  if (normalizedValue === "") {
    return "Empty";
  }

  if (typeof normalizedValue === "boolean") {
    return normalizedValue ? "Yes" : "No";
  }

  if (Array.isArray(normalizedValue)) {
    if (!normalizedValue.length) {
      return "Empty list";
    }

    return normalizedValue.map((item) => formatReviewValue(item)).join("\n");
  }

  if (isPlainObject(normalizedValue)) {
    const entries = Object.entries(normalizedValue);

    if (!entries.length) {
      return "Empty";
    }

    return entries
      .map(([key, entryValue]) => `${key}: ${formatReviewValue(entryValue)}`)
      .join("\n");
  }

  return String(normalizedValue);
};

const flattenReviewValues = (value, prefix = "", output = {}) => {
  const normalizedValue = normalizeReviewValue(value);

  if (!isPlainObject(normalizedValue)) {
    if (prefix && !ignoredReviewKeys.has(prefix)) {
      output[prefix] = normalizedValue;
    }
    return output;
  }

  Object.entries(normalizedValue).forEach(([key, entryValue]) => {
    if (ignoredReviewKeys.has(key)) {
      return;
    }

    const path = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(entryValue)) {
      flattenReviewValues(entryValue, path, output);
    } else {
      output[path] = entryValue;
    }
  });

  return output;
};

const valuesMatch = (firstValue, secondValue) => (
  JSON.stringify(normalizeReviewValue(firstValue)) === JSON.stringify(normalizeReviewValue(secondValue))
);

const titleForPath = (path) => path
  .split(".")
  .map((part) => part
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()))
  .join(" / ");

export const buildAdminPublishChanges = ({ draftData, liveData }) => {
  const draftValues = flattenReviewValues(draftData);
  const liveValues = flattenReviewValues(liveData || {});
  const paths = Array.from(new Set([
    ...Object.keys(draftValues),
    ...Object.keys(liveValues),
  ])).sort();

  return paths
    .filter((path) => !valuesMatch(liveValues[path], draftValues[path]))
    .map((path) => ({
      draftValue: formatReviewValue(draftValues[path]),
      field: titleForPath(path),
      liveValue: formatReviewValue(liveValues[path]),
      path,
    }));
};

export default function AdminPublishReview({
  draftData,
  isSaving,
  liveData,
  onCancel,
  onConfirm,
  title,
  typeLabel,
}) {
  const changes = buildAdminPublishChanges({ draftData, liveData });
  const isNewRecord = !liveData;

  return (
    <div className="admin_publish_review" role="region" aria-label={`Publish review for ${title}`}>
      <div className="admin_form_header">
        <div>
          <h4>Review Publish</h4>
          <p className="admin_status">
            {isNewRecord
              ? `This will create a live ${typeLabel}.`
              : `This will update the live ${typeLabel}.`}
          </p>
        </div>
      </div>

      <div className="admin_publish_review_summary">
        <span>{typeLabel}</span>
        <strong>{title}</strong>
      </div>

      {changes.length ? (
        <div className="admin_publish_diff" aria-label="Live and draft differences">
          <div className="admin_publish_diff_header">
            <span>Field</span>
            <span>Live Now</span>
            <span>After Publish</span>
          </div>
          {changes.map((change) => (
            <div className="admin_publish_diff_row" key={change.path}>
              <strong>{change.field}</strong>
              <pre>{change.liveValue}</pre>
              <pre>{change.draftValue}</pre>
            </div>
          ))}
        </div>
      ) : (
        <p className="admin_status">No visible field differences were found. Publishing would only refresh metadata.</p>
      )}

      <div className="admin_button_row">
        <button
          className="admin_primary_button"
          disabled={isSaving}
          onClick={onConfirm}
          type="button"
        >
          {isSaving ? "Publishing..." : "Confirm Publish Changes"}
        </button>
        <button
          className="admin_secondary_button"
          disabled={isSaving}
          onClick={onCancel}
          type="button"
        >
          Cancel Review
        </button>
      </div>
    </div>
  );
}
