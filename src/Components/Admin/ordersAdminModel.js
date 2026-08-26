export const fulfillmentStatuses = [
  "new",
  "in_progress",
  "fulfilled",
  "picked_up",
  "shipped",
  "cancelled",
  "needs_review",
];

export const MAX_FULFILLMENT_NOTES_LENGTH = 2000;

export class FulfillmentConflictError extends Error {
  constructor(message = "Fulfillment was changed by another admin.") {
    super(message);
    this.name = "FulfillmentConflictError";
  }
}

const normalizedStatus = (value) => String(value || "new");
const normalizedNotes = (value) => String(value || "").replace(/\r\n?/g, "\n");
const normalizedRevision = (value) => (
  Number.isInteger(value) && value >= 0 ? value : 0
);

export const fulfillmentFor = (order = {}) => ({
  notes: normalizedNotes(order.fulfillmentNotes),
  revision: normalizedRevision(order.fulfillmentRevision),
  status: normalizedStatus(order.fulfillmentStatus),
});

export const validatedFulfillmentDraft = (draft = {}) => {
  const fulfillment = {
    notes: normalizedNotes(draft.notes),
    status: normalizedStatus(draft.status),
  };

  if (!fulfillmentStatuses.includes(fulfillment.status)) {
    throw new Error("Choose a valid fulfillment status.");
  }

  if (fulfillment.notes.length > MAX_FULFILLMENT_NOTES_LENGTH) {
    throw new Error(`Fulfillment notes must be ${MAX_FULFILLMENT_NOTES_LENGTH} characters or fewer.`);
  }

  return fulfillment;
};

export const fulfillmentHasChanges = (order, draft) => {
  const current = fulfillmentFor(order);
  const next = validatedFulfillmentDraft(draft);

  return current.status !== next.status || current.notes !== next.notes;
};

export const assertFulfillmentUnchanged = ({ baseline, current }) => {
  const loaded = {
    notes: normalizedNotes(baseline?.notes),
    revision: normalizedRevision(baseline?.revision),
    status: normalizedStatus(baseline?.status),
  };
  const stored = fulfillmentFor(current);

  if (
    loaded.revision !== stored.revision
    || loaded.status !== stored.status
    || loaded.notes !== stored.notes
  ) {
    throw new FulfillmentConflictError();
  }
};

const dateValue = (value) => {
  if (!value) {
    return "";
  }

  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const spreadsheetSafeText = (value) => {
  const text = String(value ?? "").replace(/\r\n?/g, "\n");
  return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
};

const csvCell = (value, userControlled = false) => {
  const text = userControlled ? spreadsheetSafeText(value) : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};

const shippingAddressFor = (shipping = {}) => {
  const address = shipping.address || {};
  return [
    address.address_line_1,
    address.address_line_2,
    address.admin_area_2,
    address.admin_area_1,
    address.postal_code,
    address.country_code,
  ].filter(Boolean).join(", ");
};

const itemSummaryFor = (items = []) => items.map((item) => {
  const quantity = Number(item.quantity || 0);
  const seats = Number(item.seatCount || 0);
  return `${item.title || "Untitled item"} x${quantity}${seats ? ` (${seats} seats)` : ""}`;
}).join("; ");

const csvColumns = [
  ["Order ID", (order) => order.id, true],
  ["Source Order ID", (order) => order.sourceOrderId, true],
  ["Payment ID", (order) => order.sourcePaymentId, true],
  ["Created At", (order) => dateValue(order.createdAt)],
  ["Paid At", (order) => dateValue(order.paidAt)],
  ["Customer Name", (order) => order.customer?.name, true],
  ["Customer Email", (order) => order.customer?.email, true],
  ["Customer Phone", (order) => order.customer?.phone, true],
  ["Source", (order) => order.source],
  ["Payment Status", (order) => order.paymentStatus],
  ["Fulfillment Status", (order) => order.fulfillmentStatus],
  ["Fulfillment Notes", (order) => order.fulfillmentNotes, true],
  ["Currency", (order) => order.totals?.currency],
  ["Subtotal", (order) => Number(order.totals?.subtotal || 0)],
  ["Shipping", (order) => Number(order.totals?.shipping || 0)],
  ["Tax", (order) => Number(order.totals?.tax || 0)],
  ["Discount", (order) => Number(order.totals?.discount || 0)],
  ["Total", (order) => Number(order.totals?.total || 0)],
  ["Items", (order) => itemSummaryFor(order.items), true],
  ["Ship To", (order) => shippingAddressFor(order.shipping), true],
];

export const ordersToCsv = (orders = []) => {
  const header = csvColumns.map(([label]) => csvCell(label)).join(",");
  const rows = orders.map((order) => csvColumns.map(([, valueFor, userControlled]) => (
    csvCell(valueFor(order), userControlled)
  )).join(","));

  return [header, ...rows].join("\r\n");
};
