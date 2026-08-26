import { events } from "../resources/events";

const seedIdForTitle = (title) => String(title || "")
  .trim()
  .toLowerCase()
  .replace(/['‘’]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const cloneStringArray = (values) => (
  Array.isArray(values)
    ? values.map((value) => String(value || ""))
    : []
);

const normalizeDate = (date) => (
  date instanceof Date && !Number.isNaN(date.getTime())
    ? date
    : new Date(0)
);

const buildEventDoc = (event) => {
  const title = String(event.title || "");
  const id = event.slug || event.id || seedIdForTitle(title);
  const isActive = event.isActive === true;

  return {
    id,
    data: {
      category: String(event.category || "Experience"),
      date: normalizeDate(event.date),
      eventDates: cloneStringArray(event.eventDates),
      info: cloneStringArray(event.info),
      inStock: event.inStock === true,
      isActive,
      link: "",
      photos: [],
      priceOptions: cloneStringArray(event.priceOptions),
      published: isActive,
      shipping: String(event.shipping || "0.00"),
      title,
    },
    title,
  };
};

const duplicateIds = (eventDocs) => {
  const counts = eventDocs.reduce((idCounts, eventDoc) => ({
    ...idCounts,
    [eventDoc.id]: (idCounts[eventDoc.id] || 0) + 1,
  }), {});

  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
};

export const buildEventSeed = () => {
  const eventDocs = events.map(buildEventDoc);
  const duplicateEventIds = duplicateIds(eventDocs);

  return {
    errors: duplicateEventIds.map((id) => `Duplicate event seed ID: ${id}`),
    eventDocs,
    warnings: [
      "Event photos and menu links are intentionally not seeded from bundled static require values.",
      "Event inventory remains static and is not connected to Firestore in this phase.",
    ],
  };
};
