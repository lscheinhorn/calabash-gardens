import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import {
  activeAdminDrafts,
  applyAdminDrafts,
  discardAdminDraft,
  loadAdminDrafts,
  publishAdminDraft,
  saveAdminDraft,
} from "../../data/adminDrafts";
import AdminPublishReview from "./AdminPublishReview";

const emptyEvent = {
  slug: "",
  title: "",
  category: "Experience",
  date: "",
  eventDatesText: "",
  infoText: "",
  priceOptionsText: "",
  shipping: "0.00",
  published: false,
  isActive: false,
  inStock: false,
  sortOrder: "",
  link: "",
  eventType: "",
  capacity: "",
  photos: [],
};

const decimalPattern = /^\d+\.\d{2}$/;
const allowedEventKeys = new Set([
  "capacity",
  "category",
  "childTicket",
  "createdAt",
  "date",
  "dietaryOptions",
  "eventDates",
  "eventType",
  "info",
  "inStock",
  "isActive",
  "link",
  "photos",
  "priceOptions",
  "published",
  "shipping",
  "slug",
  "sortOrder",
  "title",
  "updatedAt",
]);
const optionalEventPublishKeys = [
  "capacity",
  "eventType",
  "link",
  "sortOrder",
];

const CollapseIcon = ({ isExpanded }) => (
  <FontAwesomeIcon
    aria-hidden="true"
    className="admin_collapse_icon"
    icon={isExpanded ? faChevronDown : faChevronRight}
  />
);

const slugify = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/['‘’]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const toDateInputValue = (value) => {
  const date = value?.toDate ? value.toDate() : value;

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const dateFromInputValue = (value) => {
  const [year, month, day] = String(value || "").split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day, 12, 0, 0);
};

const listToText = (values, separator = "\n") => (
  Array.isArray(values)
    ? values.map((value) => String(value || "")).join(separator)
    : ""
);

const linesFromText = (value) => String(value || "")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const paragraphsFromText = (value) => String(value || "")
  .split(/\n\s*\n/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean);

const normalizePhotos = (photos) => (
  Array.isArray(photos)
    ? photos.filter((photo) => typeof photo === "string" || (photo && typeof photo === "object" && photo.path))
    : []
);

const buildFormFromEvent = (eventDoc) => ({
  slug: eventDoc.id,
  title: String(eventDoc.title || ""),
  category: String(eventDoc.category || "Experience"),
  date: toDateInputValue(eventDoc.date),
  eventDatesText: listToText(eventDoc.eventDates),
  infoText: listToText(eventDoc.info, "\n\n"),
  priceOptionsText: listToText(eventDoc.priceOptions),
  shipping: String(eventDoc.shipping || "0.00"),
  published: eventDoc.published === true,
  isActive: eventDoc.isActive === true,
  inStock: eventDoc.inStock === true,
  sortOrder: Number.isFinite(eventDoc.sortOrder) ? String(eventDoc.sortOrder) : "",
  link: String(eventDoc.link || ""),
  eventType: String(eventDoc.eventType || ""),
  capacity: Number.isFinite(eventDoc.capacity) ? String(eventDoc.capacity) : "",
  photos: normalizePhotos(eventDoc.photos),
  unsupportedFields: Object.keys(eventDoc).filter((key) => key !== "id" && !allowedEventKeys.has(key)),
});

const validateEventForm = (form, isNewEvent) => {
  const eventDate = dateFromInputValue(form.date);
  const eventDates = linesFromText(form.eventDatesText);
  const info = paragraphsFromText(form.infoText);
  const priceOptions = linesFromText(form.priceOptionsText);

  if (isNewEvent && !form.slug) {
    return "Event ID is required.";
  }

  if (!form.title.trim()) {
    return "Event title is required.";
  }

  if (!form.category.trim()) {
    return "Event category is required.";
  }

  if (!eventDate) {
    return "Event date is required.";
  }

  if (!eventDates.length) {
    return "At least one event display date is required.";
  }

  if (!info.length) {
    return "At least one event description paragraph is required.";
  }

  if (!priceOptions.length || priceOptions.some((price) => !decimalPattern.test(price))) {
    return "Each event price must use dollars and cents, like 60.00.";
  }

  if (!decimalPattern.test(form.shipping)) {
    return "Shipping must use dollars and cents, like 0.00.";
  }

  if (form.capacity !== "" && (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 0)) {
    return "Capacity must be a whole number when provided.";
  }

  if (form.sortOrder !== "" && !Number.isFinite(Number(form.sortOrder))) {
    return "Sort order must be a number when provided.";
  }

  return "";
};

const buildEventPayload = (form, { clearBlankOptionalFields = false } = {}) => {
  const payload = {
    category: form.category.trim(),
    date: dateFromInputValue(form.date),
    eventDates: linesFromText(form.eventDatesText),
    info: paragraphsFromText(form.infoText),
    inStock: form.inStock === true,
    isActive: form.isActive === true,
    photos: normalizePhotos(form.photos),
    priceOptions: linesFromText(form.priceOptionsText),
    published: form.published === true,
    shipping: form.shipping,
    title: form.title.trim(),
    updatedAt: serverTimestamp(),
  };

  if (form.link.trim()) {
    payload.link = form.link.trim();
  } else if (clearBlankOptionalFields) {
    payload.link = deleteField();
  }

  if (form.eventType.trim()) {
    payload.eventType = form.eventType.trim();
  } else if (clearBlankOptionalFields) {
    payload.eventType = deleteField();
  }

  if (form.capacity !== "") {
    payload.capacity = Number(form.capacity);
  } else if (clearBlankOptionalFields) {
    payload.capacity = deleteField();
  }

  if (form.sortOrder !== "") {
    payload.sortOrder = Number(form.sortOrder);
  } else if (clearBlankOptionalFields) {
    payload.sortOrder = deleteField();
  }

  return payload;
};

const buildEventPublishPayload = (draftData, liveData) => {
  const payload = { ...draftData };

  optionalEventPublishKeys.forEach((key) => {
    if (!(key in payload) && liveData && key in liveData) {
      payload[key] = deleteField();
    }
  });

  return payload;
};

export default function EventAdmin({ db, userId = "" }) {
  const [events, setEvents] = useState([]);
  const [draftsById, setDraftsById] = useState({});
  const [liveEventsById, setLiveEventsById] = useState({});
  const [publishReview, setPublishReview] = useState(null);
  const [form, setForm] = useState(emptyEvent);
  const [editingFormsById, setEditingFormsById] = useState({});
  const [expandedEventId, setExpandedEventId] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewEventIdEdited, setIsNewEventIdEdited] = useState(false);
  const [isNewEventExpanded, setIsNewEventExpanded] = useState(false);
  const [message, setMessage] = useState("");

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const eventsQuery = query(collection(db, "events"), orderBy("date"));
      const [snapshot, drafts] = await Promise.all([
        getDocs(eventsQuery),
        loadAdminDrafts({ db, targetCollection: "events" }),
      ]);
      const liveEventDocs = snapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
      }));
      setLiveEventsById(Object.fromEntries(liveEventDocs.map((eventDoc) => [
        eventDoc.id,
        eventDoc,
      ])));
      const eventDocs = applyAdminDrafts(liveEventDocs, drafts, "events")
        .sort((firstEvent, secondEvent) => {
          const firstDate = firstEvent.date?.toDate ? firstEvent.date.toDate() : firstEvent.date;
          const secondDate = secondEvent.date?.toDate ? secondEvent.date.toDate() : secondEvent.date;
          const firstTime = firstDate instanceof Date ? firstDate.getTime() : 0;
          const secondTime = secondDate instanceof Date ? secondDate.getTime() : 0;

          return firstTime - secondTime || String(firstEvent.title || "").localeCompare(String(secondEvent.title || ""));
        });

      setEvents(eventDocs);
      setDraftsById(Object.fromEntries(activeAdminDrafts(drafts, "events").map((draft) => [
        draft.targetId,
        draft,
      ])));
      setEditingFormsById(Object.fromEntries(eventDocs.map((eventDoc) => [
        eventDoc.id,
        buildFormFromEvent(eventDoc),
      ])));
    } catch (error) {
      setMessage("Firestore events could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isExpanded) {
      loadEvents();
    }
  }, [isExpanded, loadEvents]);

  const updateNewForm = (field, value) => {
    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        [field]: value,
      };

      if (field === "title" && !isNewEventIdEdited) {
        nextForm.slug = slugify(value);
      }

      return nextForm;
    });
  };

  const updateEditingForm = (eventId, field, value) => {
    setEditingFormsById((currentForms) => ({
      ...currentForms,
      [eventId]: {
        ...currentForms[eventId],
        [field]: value,
      },
    }));
  };

  const saveNewEvent = async (event) => {
    event.preventDefault();

    const validationMessage = validateEventForm(form, true);

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const eventRef = doc(db, "events", form.slug);
      const existingEvent = await getDoc(eventRef);

      if (existingEvent.exists()) {
        setMessage("That event ID already exists. Choose a different ID or edit the existing event.");
        return;
      }

      await saveAdminDraft({
        data: buildEventPayload(form),
        db,
        targetCollection: "events",
        targetId: form.slug,
        userId,
      });
      setMessage(`${form.title} saved as a preview draft.`);
      setPublishReview(null);
      setForm(emptyEvent);
      setIsNewEventIdEdited(false);
      setIsNewEventExpanded(false);
      await loadEvents();
    } catch (error) {
      setMessage("Event could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveExistingEvent = async (eventId) => {
    const editingForm = editingFormsById[eventId];

    if (!editingForm) {
      setMessage("Open an event before saving.");
      return;
    }

    const validationMessage = validateEventForm(editingForm, false);

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await saveAdminDraft({
        data: buildEventPayload(editingForm, { clearBlankOptionalFields: true }),
        db,
        targetCollection: "events",
        targetId: eventId,
        userId,
      });
      setMessage(`${editingForm.title} saved as a preview draft.`);
      setPublishReview(null);
      await loadEvents();
    } catch (error) {
      setMessage("Event draft could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const requestPublishExistingEvent = (eventDoc) => {
    const draft = draftsById[eventDoc.id];

    if (!draft?.data) {
      setMessage("Save a draft before reviewing publish changes.");
      return;
    }

    setMessage("");
    const liveData = liveEventsById[eventDoc.id] || null;

    setPublishReview({
      data: buildEventPublishPayload(draft.data, liveData),
      id: eventDoc.id,
      liveData,
      title: eventDoc.title || eventDoc.id,
    });
  };

  const confirmPublishExistingEvent = async () => {
    if (!publishReview) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await publishAdminDraft({
        data: publishReview.data,
        db,
        targetCollection: "events",
        targetId: publishReview.id,
        userId,
      });
      setMessage(`${publishReview.title} published to live Firestore events.`);
      setPublishReview(null);
      await loadEvents();
    } catch (error) {
      setMessage("Event could not be published.");
    } finally {
      setIsSaving(false);
    }
  };

  const discardExistingEventDraft = async (eventId) => {
    const editingForm = editingFormsById[eventId];

    setIsSaving(true);
    setMessage("");

    try {
      await discardAdminDraft({
        db,
        targetCollection: "events",
        targetId: eventId,
        userId,
      });
      setMessage(`${editingForm?.title || eventId} draft discarded.`);
      setPublishReview(null);
      await loadEvents();
    } catch (error) {
      setMessage("Event draft could not be discarded.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin_panel">
      <div className="admin_form_header">
        <div>
          <h3>Event Editor</h3>
          <p className="admin_status">
            Saves event edits as drafts first. Publish Changes updates live Firestore events.
          </p>
        </div>
        <div className="admin_button_row">
          <button
            className="admin_secondary_button"
            disabled={isLoading || isSaving || !isExpanded}
            onClick={loadEvents}
            type="button"
          >
            Refresh
          </button>
          <button
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} event editor`}
            className="admin_icon_button"
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
            title={`${isExpanded ? "Collapse" : "Expand"} event editor`}
            type="button"
          >
            <CollapseIcon isExpanded={isExpanded} />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          {message ? <p className="admin_message">{message}</p> : null}
          {publishReview ? (
            <AdminPublishReview
              draftData={publishReview.data}
              isSaving={isSaving}
              liveData={publishReview.liveData}
              onCancel={() => setPublishReview(null)}
              onConfirm={confirmPublishExistingEvent}
              title={publishReview.title}
              typeLabel="event"
            />
          ) : null}
          {isLoading ? <p className="admin_status">Loading events...</p> : null}

          <article className="admin_product_card">
            <button
              aria-expanded={isNewEventExpanded}
              aria-label={`${isNewEventExpanded ? "Collapse" : "Expand"} new event form`}
              className="admin_product_card_header"
              onClick={() => setIsNewEventExpanded((currentValue) => !currentValue)}
              title={`${isNewEventExpanded ? "Collapse" : "Expand"} new event form`}
              type="button"
            >
              <span>New Event</span>
              <small aria-hidden="true">
                <CollapseIcon isExpanded={isNewEventExpanded} />
              </small>
            </button>

            {isNewEventExpanded ? (
              <EventForm
                form={form}
                isExistingEvent={false}
                isSaving={isSaving}
                onSubmit={saveNewEvent}
                onUpdate={(field, value) => {
                  if (field === "slug") {
                    setIsNewEventIdEdited(true);
                  }
                  updateNewForm(field, value);
                }}
                submitLabel="Save Draft"
              />
            ) : null}
          </article>

          <div className="admin_content_list">
            {events.map((eventDoc) => {
              const isEventExpanded = expandedEventId === eventDoc.id;
              const editingForm = editingFormsById[eventDoc.id];
              const hasDraft = Boolean(draftsById[eventDoc.id]);

              return (
                <article className="admin_product_card" key={eventDoc.id}>
                  <button
                    aria-expanded={isEventExpanded}
                    aria-label={`${isEventExpanded ? "Collapse" : "Expand"} ${eventDoc.title || eventDoc.id}`}
                    className="admin_product_card_header"
                    onClick={() => setExpandedEventId(isEventExpanded ? "" : eventDoc.id)}
                    title={`${isEventExpanded ? "Collapse" : "Expand"} ${eventDoc.title || eventDoc.id}`}
                    type="button"
                  >
                    <span>{eventDoc.title || eventDoc.id}</span>
                    <small aria-hidden="true">
                      <CollapseIcon isExpanded={isEventExpanded} />
                    </small>
                  </button>
                  <div className="admin_product_meta">
                    <span>{hasDraft ? "Draft changes pending" : "Live event"}</span>
                    {eventDoc._draftOnly ? <span>Draft-only new event</span> : null}
                    <span>{eventDoc.published ? "Published" : "Draft"}</span>
                    <span>{eventDoc.isActive ? "Active" : "Inactive"}</span>
                    <span>{eventDoc.inStock ? "In Stock" : "Out of Stock"}</span>
                    <span>{eventDoc.id}</span>
                    {editingForm.unsupportedFields.length ? (
                      <span>Unsupported Fields: {editingForm.unsupportedFields.join(", ")}</span>
                    ) : null}
                  </div>

                  {isEventExpanded && editingForm ? (
                    <div className="admin_product_card_body">
                      <EventForm
                        form={editingForm}
                        isExistingEvent
                        isSaving={isSaving}
                        onSubmit={(event) => {
                          event.preventDefault();
                          saveExistingEvent(eventDoc.id);
                        }}
                        onUpdate={(field, value) => updateEditingForm(eventDoc.id, field, value)}
                        submitLabel="Save Draft"
                      />
                      <div className="admin_button_row">
                        <button
                          className="admin_secondary_button"
                          disabled={isSaving || !hasDraft}
                          onClick={() => requestPublishExistingEvent(eventDoc)}
                          type="button"
                        >
                          Review Publish
                        </button>
                        <button
                          className="admin_secondary_button"
                          disabled={isSaving || !hasDraft}
                          onClick={() => discardExistingEventDraft(eventDoc.id)}
                          type="button"
                        >
                          Discard Draft
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

function EventForm({
  form,
  isExistingEvent,
  isSaving,
  onSubmit,
  onUpdate,
  submitLabel = "Save Draft",
}) {
  return (
    <form className="admin_embedded_form" onSubmit={onSubmit}>
      <label>
        Event ID
        <input
          disabled={isSaving || isExistingEvent}
          onChange={(event) => onUpdate("slug", slugify(event.target.value))}
          value={form.slug}
        />
        <span className="admin_help_text">
          Suggested from the title. Locked after saving.
        </span>
      </label>

      <label>
        Title
        <input
          disabled={isSaving}
          onChange={(event) => onUpdate("title", event.target.value)}
          required
          value={form.title}
        />
      </label>

      <div className="admin_split_fields">
        <label>
          Category
          <input
            disabled={isSaving}
            onChange={(event) => onUpdate("category", event.target.value)}
            required
            value={form.category}
          />
        </label>
        <label>
          Date
          <input
            disabled={isSaving}
            onChange={(event) => onUpdate("date", event.target.value)}
            required
            type="date"
            value={form.date}
          />
        </label>
        <label>
          Sort Order
          <input
            disabled={isSaving}
            onChange={(event) => onUpdate("sortOrder", event.target.value)}
            type="number"
            value={form.sortOrder}
          />
        </label>
      </div>

      <label>
        Event Display Dates
        <textarea
          disabled={isSaving}
          onChange={(event) => onUpdate("eventDatesText", event.target.value)}
          placeholder="One date label per line"
          required
          rows={3}
          value={form.eventDatesText}
        />
      </label>

      <label>
        Description Paragraphs
        <textarea
          disabled={isSaving}
          onChange={(event) => onUpdate("infoText", event.target.value)}
          placeholder="Separate paragraphs with a blank line"
          required
          rows={8}
          value={form.infoText}
        />
      </label>

      <div className="admin_split_fields">
        <label>
          Prices
          <textarea
            disabled={isSaving}
            onChange={(event) => onUpdate("priceOptionsText", event.target.value)}
            placeholder="One price per line, like 60.00"
            required
            rows={3}
            value={form.priceOptionsText}
          />
        </label>
        <label>
          Shipping
          <input
            disabled={isSaving}
            onChange={(event) => onUpdate("shipping", event.target.value)}
            required
            value={form.shipping}
          />
        </label>
        <label>
          Capacity
          <input
            disabled={isSaving}
            onChange={(event) => onUpdate("capacity", event.target.value)}
            type="number"
            value={form.capacity}
          />
        </label>
      </div>

      <div className="admin_split_fields">
        <label>
          Event Type
          <input
            disabled={isSaving}
            onChange={(event) => onUpdate("eventType", event.target.value)}
            placeholder="dining, music, etc."
            value={form.eventType}
          />
        </label>
        <label>
          Menu/Link
          <input
            disabled={isSaving}
            onChange={(event) => onUpdate("link", event.target.value)}
            placeholder="Optional URL or Storage path"
            value={form.link}
          />
        </label>
      </div>

      <div className="admin_checkbox_grid">
        <label>
          <input
            checked={form.published}
            disabled={isSaving}
            onChange={(event) => onUpdate("published", event.target.checked)}
            type="checkbox"
          />
          Published
        </label>
        <label>
          <input
            checked={form.isActive}
            disabled={isSaving}
            onChange={(event) => onUpdate("isActive", event.target.checked)}
            type="checkbox"
          />
          Active
        </label>
        <label>
          <input
            checked={form.inStock}
            disabled={isSaving}
            onChange={(event) => onUpdate("inStock", event.target.checked)}
            type="checkbox"
          />
          In Stock
        </label>
      </div>

      <button className="admin_primary_button" disabled={isSaving} type="submit">
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
