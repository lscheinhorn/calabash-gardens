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
  setDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
  faGripVertical,
  faXmark,
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
  descriptionBlocks: [{ subtitle: "", body: "" }],
  eventDatesText: "",
  priceOptionsText: "",
  shipping: "0.00",
  published: false,
  isActive: false,
  inStock: false,
  link: "",
  capacity: "",
  manualSeatsReserved: "",
  ticketsSold: 0,
  waitlistEnabled: true,
  photos: [],
};

const decimalPattern = /^\d+\.\d{2}$/;
const recommendedImageSize = 10 * 1024 * 1024;
const maxOriginalImageSize = 25 * 1024 * 1024;
const optimizedImageMaxWidth = 1800;
const optimizedImageQuality = 0.82;
const deprecatedEventKeys = ["eventType", "sortOrder"];
const allowedEventKeys = new Set([
  "capacity",
  "category",
  "childTicket",
  "createdAt",
  "date",
  "dietaryOptions",
  "descriptionBlocks",
  "eventDates",
  "info",
  "inStock",
  "isActive",
  "link",
  "manualSeatsReserved",
  "photos",
  "priceOptions",
  "published",
  "shipping",
  "slug",
  "ticketsSold",
  "title",
  "updatedAt",
  "waitlistEnabled",
  ...deprecatedEventKeys,
]);
const optionalEventPublishKeys = [
  "capacity",
  "link",
  "manualSeatsReserved",
  ...deprecatedEventKeys,
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

const rawLinesFromText = (value) => String(value || "")
  .split(/\r?\n/);

const paragraphsFromText = (value) => String(value || "")
  .split(/\n\s*\n/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean);

const emptyDescriptionBlock = () => ({
  body: "",
  subtitle: "",
});

const normalizeDescriptionBlocks = (eventDoc) => {
  if (Array.isArray(eventDoc?.descriptionBlocks)) {
    const blocks = eventDoc.descriptionBlocks
      .map((block) => ({
        body: String(block?.body || ""),
        subtitle: String(block?.subtitle || ""),
      }))
      .filter((block) => block.body.trim() || block.subtitle.trim());

    return blocks.length ? blocks : [emptyDescriptionBlock()];
  }

  const infoParagraphs = Array.isArray(eventDoc?.info)
    ? eventDoc.info.map((paragraph) => String(paragraph || "")).filter(Boolean)
    : paragraphsFromText(eventDoc?.infoText);

  return infoParagraphs.length
    ? infoParagraphs.map((paragraph) => ({
      body: paragraph,
      subtitle: "",
    }))
    : [emptyDescriptionBlock()];
};

const eventInfoFromDescriptionBlocks = (descriptionBlocks) => (
  (Array.isArray(descriptionBlocks) ? descriptionBlocks : [])
    .flatMap((block) => [
      String(block?.subtitle || "").trim(),
      String(block?.body || "").trim(),
    ])
    .filter(Boolean)
);

const todayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const eventIsPast = (form) => {
  const eventDate = dateFromInputValue(form.date);

  return eventDate ? eventDate < todayStart() : false;
};

const numberFromOptionalField = (value) => (
  value === "" || value === null || value === undefined ? null : Number(value)
);

const eventRemainingCapacity = (form) => {
  const capacity = numberFromOptionalField(form.capacity);
  const ticketsSold = numberFromOptionalField(form.ticketsSold) || 0;
  const reservedSeats = numberFromOptionalField(form.manualSeatsReserved) || 0;

  if (!Number.isFinite(capacity)) {
    return null;
  }

  return Math.max(0, capacity - ticketsSold - reservedSeats);
};

const eventHasTicketAvailability = (form) => {
  if (!form.isActive || eventIsPast(form)) {
    return false;
  }

  const remainingCapacity = eventRemainingCapacity(form);

  return remainingCapacity === null || remainingCapacity > 0;
};

const eventAvailabilityLabel = (form) => {
  if (!form.isActive) {
    return "Hidden from site";
  }

  if (eventIsPast(form)) {
    return "Past event";
  }

  const remainingCapacity = eventRemainingCapacity(form);
  const capacity = numberFromOptionalField(form.capacity);

  if (remainingCapacity === null) {
    return "Tickets available";
  }

  if (remainingCapacity > 0) {
    return `${remainingCapacity} of ${capacity} available`;
  }

  return form.waitlistEnabled ? "Waitlist open" : "Sold out";
};

const normalizePhotos = (photos) => (
  Array.isArray(photos)
    ? photos
      .map((photo, index) => {
        if (typeof photo === "string") {
          return {
            alt: "",
            mediaAssetId: "",
            path: photo,
            sortOrder: index,
          };
        }

        if (!photo || typeof photo !== "object" || !photo.path) {
          return null;
        }

        return {
          alt: String(photo.alt || ""),
          mediaAssetId: String(photo.mediaAssetId || ""),
          path: String(photo.path || ""),
          sortOrder: Number.isInteger(photo.sortOrder) ? photo.sortOrder : index,
        };
      })
      .filter(Boolean)
      .sort((firstPhoto, secondPhoto) => firstPhoto.sortOrder - secondPhoto.sortOrder)
    : []
);

const normalizeMediaAsset = (snapshot) => {
  const data = snapshot.data();

  return {
    alt: String(data.alt || ""),
    bin: String(data.bin || "other"),
    id: snapshot.id,
    linkedId: String(data.linkedId || ""),
    linkedType: String(data.linkedType || "none"),
    status: String(data.status || "active"),
    storagePath: String(data.storagePath || ""),
    tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag || "").trim()).filter(Boolean) : [],
    title: String(data.title || snapshot.id),
  };
};

const normalizeWaitlistEntry = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    createdAt: data.createdAt,
    email: String(data.email || ""),
    eventDate: String(data.eventDate || ""),
    eventId: String(data.eventId || ""),
    eventTitle: String(data.eventTitle || ""),
    message: String(data.message || ""),
    name: String(data.name || ""),
    phone: String(data.phone || ""),
    status: String(data.status || "new"),
  };
};

const formatWaitlistDate = (value) => {
  const date = value?.toDate ? value.toDate() : null;

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatFileSize = (size) => {
  if (!size) {
    return "0 MB";
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const fileExtensionFor = (fileName, contentType) => {
  if (contentType === "image/jpeg") {
    return ".jpg";
  }

  if (contentType === "image/png") {
    return ".png";
  }

  if (contentType === "image/webp") {
    return ".webp";
  }

  const extensionMatch = fileName.match(/\.([a-z0-9]+)$/i);

  return extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : "";
};

const buildEventImagePath = (eventId, fileName, contentType) => {
  const safeName = slugify(fileName.replace(/\.[^.]+$/, "")) || "event-image";
  const extension = fileExtensionFor(fileName, contentType);

  return `event-images/${eventId}-${Date.now()}-${safeName}${extension}`;
};

const photoKeyFor = (eventId, photoPath) => `${eventId}:${photoPath}`;

const loadImage = (file) => new Promise((resolve, reject) => {
  const image = new Image();
  const imageUrl = URL.createObjectURL(file);

  image.onload = () => {
    URL.revokeObjectURL(imageUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    reject(new Error("Image could not be read."));
  };
  image.src = imageUrl;
});

const canvasToBlob = (canvas, contentType, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) {
      resolve(blob);
      return;
    }

    reject(new Error("Image could not be optimized."));
  }, contentType, quality);
});

const optimizeImageFile = async (file) => {
  const image = await loadImage(file);
  const scale = Math.min(1, optimizedImageMaxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return canvasToBlob(canvas, "image/jpeg", optimizedImageQuality);
};

const buildFormFromEvent = (eventDoc) => ({
  slug: eventDoc.id,
  title: String(eventDoc.title || ""),
  category: String(eventDoc.category || "Experience"),
  date: toDateInputValue(eventDoc.date),
  descriptionBlocks: normalizeDescriptionBlocks(eventDoc),
  eventDatesText: listToText(eventDoc.eventDates),
  priceOptionsText: listToText(eventDoc.priceOptions),
  shipping: String(eventDoc.shipping || "0.00"),
  published: eventDoc.published === true,
  isActive: eventDoc.isActive === true,
  inStock: eventDoc.inStock === true,
  link: String(eventDoc.link || ""),
  capacity: Number.isFinite(eventDoc.capacity) ? String(eventDoc.capacity) : "",
  manualSeatsReserved: Number.isFinite(eventDoc.manualSeatsReserved) ? String(eventDoc.manualSeatsReserved) : "",
  ticketsSold: Number.isFinite(eventDoc.ticketsSold) ? eventDoc.ticketsSold : 0,
  photos: normalizePhotos(eventDoc.photos),
  waitlistEnabled: eventDoc.waitlistEnabled !== false,
  unsupportedFields: Object.keys(eventDoc).filter((key) => (
    key !== "id"
      && !key.startsWith("_")
      && !allowedEventKeys.has(key)
  )),
});

const validateEventForm = (form, isNewEvent) => {
  const eventDate = dateFromInputValue(form.date);
  const eventDates = linesFromText(form.eventDatesText);
  const info = eventInfoFromDescriptionBlocks(form.descriptionBlocks);
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
    return "At least one event description block is required.";
  }

  if (!priceOptions.length || priceOptions.some((price) => !decimalPattern.test(price))) {
    return "Each event price must use dollars and cents, like 60.00.";
  }

  if (form.capacity !== "" && (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 0)) {
    return "Capacity must be a whole number when provided.";
  }

  if (form.manualSeatsReserved !== "" && (!Number.isInteger(Number(form.manualSeatsReserved)) || Number(form.manualSeatsReserved) < 0)) {
    return "Manual holds must be a whole number when provided.";
  }

  if (form.manualSeatsReserved !== "" && form.capacity === "") {
    return "Set a capacity before entering manual holds.";
  }

  if (form.capacity !== "" && form.manualSeatsReserved !== "" && Number(form.manualSeatsReserved) > Number(form.capacity)) {
    return "Manual holds cannot be greater than capacity.";
  }

  return "";
};

const buildEventPayload = (form, { clearBlankOptionalFields = false } = {}) => {
  const payload = {
    category: form.category.trim(),
    date: dateFromInputValue(form.date),
    descriptionBlocks: normalizeDescriptionBlocks(form),
    eventDates: linesFromText(form.eventDatesText),
    info: eventInfoFromDescriptionBlocks(form.descriptionBlocks),
    inStock: eventHasTicketAvailability(form),
    isActive: form.isActive === true,
    photos: normalizePhotos(form.photos),
    priceOptions: linesFromText(form.priceOptionsText),
    published: form.isActive === true,
    shipping: "0.00",
    title: form.title.trim(),
    updatedAt: serverTimestamp(),
    waitlistEnabled: form.waitlistEnabled === true,
  };

  if (form.link.trim()) {
    payload.link = form.link.trim();
  } else if (clearBlankOptionalFields) {
    payload.link = deleteField();
  }

  if (clearBlankOptionalFields) {
    deprecatedEventKeys.forEach((key) => {
      payload[key] = deleteField();
    });
  }

  if (form.capacity !== "") {
    payload.capacity = Number(form.capacity);
  } else if (clearBlankOptionalFields) {
    payload.capacity = deleteField();
  }

  if (form.manualSeatsReserved !== "") {
    payload.manualSeatsReserved = Number(form.manualSeatsReserved);
  } else if (clearBlankOptionalFields) {
    payload.manualSeatsReserved = deleteField();
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

export default function EventAdmin({
  db,
  defaultExpanded = false,
  focusRequest = null,
  onDraftChange = () => {},
  storage = null,
  userId = "",
  variant = "full",
}) {
  const isDrawerMode = variant === "drawer";
  const [events, setEvents] = useState([]);
  const [draftsById, setDraftsById] = useState({});
  const [liveEventsById, setLiveEventsById] = useState({});
  const [mediaAssets, setMediaAssets] = useState([]);
  const [photoUrlsByPath, setPhotoUrlsByPath] = useState({});
  const [publishReview, setPublishReview] = useState(null);
  const [form, setForm] = useState(emptyEvent);
  const [editingFormsById, setEditingFormsById] = useState({});
  const [expandedEventId, setExpandedEventId] = useState("");
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isAttachingPhoto, setIsAttachingPhoto] = useState(false);
  const [isUpdatingEventPhoto, setIsUpdatingEventPhoto] = useState(false);
  const [isNewEventIdEdited, setIsNewEventIdEdited] = useState(false);
  const [isNewEventExpanded, setIsNewEventExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoAlt, setPhotoAlt] = useState("");
  const [photoAltDrafts, setPhotoAltDrafts] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [photoUploadChoice, setPhotoUploadChoice] = useState("optimize");
  const [selectedPhoto, setSelectedPhoto] = useState({ eventId: "", path: "" });
  const [addPhotoEventId, setAddPhotoEventId] = useState("");
  const [photoAddMode, setPhotoAddMode] = useState("");
  const [selectedExistingMediaId, setSelectedExistingMediaId] = useState("");
  const [draggedPhoto, setDraggedPhoto] = useState({ eventId: "", path: "" });
  const [waitlistEntriesByEventId, setWaitlistEntriesByEventId] = useState({});

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

  const loadMediaAssets = useCallback(async () => {
    try {
      const mediaQuery = query(collection(db, "mediaAssets"), orderBy("title"));
      const snapshot = await getDocs(mediaQuery);
      setMediaAssets(snapshot.docs.map(normalizeMediaAsset));
    } catch (error) {
      setPhotoMessage("Media assets could not be loaded.");
    }
  }, [db]);

  const loadWaitlistEntries = useCallback(async () => {
    try {
      const waitlistQuery = query(collection(db, "eventWaitlist"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(waitlistQuery);
      const entriesByEventId = snapshot.docs
        .map(normalizeWaitlistEntry)
        .reduce((entriesByEvent, entry) => {
          if (!entry.eventId) {
            return entriesByEvent;
          }

          return {
            ...entriesByEvent,
            [entry.eventId]: [
              ...(entriesByEvent[entry.eventId] || []),
              entry,
            ],
          };
        }, {});

      setWaitlistEntriesByEventId(entriesByEventId);
    } catch (error) {
      setWaitlistEntriesByEventId({});
    }
  }, [db]);

  useEffect(() => {
    if (isExpanded || isDrawerMode) {
      loadEvents();
      loadMediaAssets();
      loadWaitlistEntries();
    }
  }, [isDrawerMode, isExpanded, loadEvents, loadMediaAssets, loadWaitlistEntries]);

  useEffect(() => {
    let isCurrentLoad = true;

    const loadPhotoUrls = async () => {
      if (!storage) {
        setPhotoUrlsByPath({});
        return;
      }

      const eventPhotoPaths = events
        .flatMap((eventDoc) => normalizePhotos(eventDoc.photos))
        .map((photo) => photo.path)
        .filter(Boolean);
      const libraryPhotoPaths = mediaAssets
        .map((asset) => asset.storagePath)
        .filter(Boolean);
      const photoPaths = Array.from(new Set([
        ...eventPhotoPaths,
        ...libraryPhotoPaths,
      ]));

      const photoUrlEntries = await Promise.all(photoPaths.map(async (photoPath) => {
        try {
          return [photoPath, await getDownloadURL(ref(storage, photoPath))];
        } catch (error) {
          return [photoPath, ""];
        }
      }));

      if (isCurrentLoad) {
        setPhotoUrlsByPath(Object.fromEntries(photoUrlEntries));
      }
    };

    loadPhotoUrls();

    return () => {
      isCurrentLoad = false;
    };
  }, [events, mediaAssets, storage]);

  const reloadEventsAfterMutation = useCallback(async () => {
    await loadEvents();
    await loadWaitlistEntries();
    onDraftChange();
  }, [loadEvents, loadWaitlistEntries, onDraftChange]);

  const updateNewForm = (field, value) => {
    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        [field]: value,
      };

      if (field === "title" && !isNewEventIdEdited) {
        nextForm.slug = slugify(value);
      }

      if (field === "isActive") {
        nextForm.published = value;
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
        ...(field === "isActive" ? { published: value } : {}),
      },
    }));
  };

  const updatePhotoAltDraft = (eventId, photoPath, value) => {
    setPhotoAltDrafts((currentDrafts) => ({
      ...currentDrafts,
      [photoKeyFor(eventId, photoPath)]: value,
    }));
  };

  const updatePhotoFile = (file) => {
    setPhotoFile(file);
    setPhotoMessage("");
    setPhotoUploadChoice(file && file.size >= recommendedImageSize ? "optimize" : "original");
  };

  const selectEventPhoto = (eventId, photoPath) => {
    setSelectedPhoto({ eventId, path: photoPath });
    setAddPhotoEventId("");
    setPhotoAddMode("");
    setPhotoMessage("");
  };

  const toggleAddPhotoTools = (eventId) => {
    const isAddingToEvent = addPhotoEventId === eventId;

    setSelectedPhoto({ eventId: "", path: "" });
    setAddPhotoEventId(isAddingToEvent ? "" : eventId);
    setPhotoAddMode("");
    setSelectedExistingMediaId("");
    setPhotoMessage("");
  };

  const choosePhotoAddMode = (eventId, mode) => {
    setSelectedPhoto({ eventId: "", path: "" });
    setAddPhotoEventId(eventId);
    setPhotoAddMode(mode);
    setSelectedExistingMediaId("");
    setPhotoFile(null);
    setPhotoAlt("");
    setPhotoUploadChoice("optimize");
    setPhotoMessage("");
  };

  useEffect(() => {
    if (!isDrawerMode || !focusRequest?.eventId) {
      return;
    }

    if (events.some((eventDoc) => eventDoc.id === focusRequest.eventId)) {
      setExpandedEventId(focusRequest.eventId);
      setPublishReview(null);
    }
  }, [events, focusRequest?.eventId, isDrawerMode]);

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
      await reloadEventsAfterMutation();
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
      await reloadEventsAfterMutation();
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
      await reloadEventsAfterMutation();
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
      await reloadEventsAfterMutation();
    } catch (error) {
      setMessage("Event draft could not be discarded.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveEventPhotoDraft = async (eventId, nextForm, successMessage, savingStateSetter = setIsUpdatingEventPhoto) => {
    const validationMessage = validateEventForm(nextForm, false);

    if (validationMessage) {
      setPhotoMessage(`Fix required event fields before changing photos. ${validationMessage}`);
      return null;
    }

    savingStateSetter(true);
    setPhotoMessage("");

    try {
      const payload = buildEventPayload(nextForm, { clearBlankOptionalFields: true });

      await saveAdminDraft({
        data: payload,
        db,
        targetCollection: "events",
        targetId: eventId,
        userId,
      });
      setPublishReview(null);
      setEditingFormsById((currentForms) => ({
        ...currentForms,
        [eventId]: nextForm,
      }));
      setPhotoMessage(successMessage);
      await reloadEventsAfterMutation();
      return nextForm.photos;
    } catch (error) {
      setPhotoMessage("Event photo changes could not be saved.");
      return null;
    } finally {
      savingStateSetter(false);
    }
  };

  const updateEventPhotoList = async (eventDoc, changePhotos, successMessage) => {
    const editingForm = editingFormsById[eventDoc.id];

    if (!editingForm) {
      setPhotoMessage("Open an event before changing photos.");
      return null;
    }

    const latestPhotos = normalizePhotos(editingForm.photos);
    const updatedPhotos = changePhotos(latestPhotos)
      .filter(Boolean)
      .map((photo, index) => ({
        ...photo,
        sortOrder: index,
      }));
    const nextForm = {
      ...editingForm,
      photos: updatedPhotos,
    };

    return saveEventPhotoDraft(eventDoc.id, nextForm, successMessage);
  };

  const handlePhotoUpload = async (event, eventDoc) => {
    event.preventDefault();

    const editingForm = editingFormsById[eventDoc.id];

    if (!editingForm) {
      setPhotoMessage("Open an event before uploading photos.");
      return;
    }

    if (!storage) {
      setPhotoMessage("Firebase Storage is not configured.");
      return;
    }

    if (!photoFile) {
      setPhotoMessage("Choose an image to upload.");
      return;
    }

    if (!photoFile.type.startsWith("image/")) {
      setPhotoMessage("Event photos must be image files.");
      return;
    }

    if (photoUploadChoice === "original" && photoFile.size >= maxOriginalImageSize) {
      setPhotoMessage("Original photos must be smaller than 25 MB. Choose optimize for website.");
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoMessage("");

    try {
      const currentPhotos = normalizePhotos(editingForm.photos);
      const shouldOptimize = photoUploadChoice === "optimize" && photoFile.size >= recommendedImageSize;
      const uploadBlob = shouldOptimize ? await optimizeImageFile(photoFile) : photoFile;
      const uploadContentType = uploadBlob.type || photoFile.type;

      if (shouldOptimize && uploadBlob.size >= recommendedImageSize) {
        setPhotoMessage("Optimized photo is still over 10 MB. Try a smaller image.");
        return;
      }

      const photoPath = buildEventImagePath(eventDoc.id, photoFile.name, uploadContentType);
      const photoRef = ref(storage, photoPath);
      const mediaAssetId = slugify(photoPath.replace(/^event-images\//, "").replace(/\.[^.]+$/, ""))
        || slugify(`event-${eventDoc.id}-${Date.now()}`);
      const mediaTitle = photoAlt.trim() || photoFile.name.replace(/\.[^.]+$/, "");

      await uploadBytes(photoRef, uploadBlob, {
        contentType: uploadContentType,
        customMetadata: {
          optimizedForWeb: shouldOptimize ? "true" : "false",
          originalFileName: photoFile.name,
          originalSize: String(photoFile.size),
          uploadSize: String(uploadBlob.size),
        },
      });
      await setDoc(doc(db, "mediaAssets", mediaAssetId), {
        alt: photoAlt.trim(),
        bin: "events",
        contentType: uploadContentType,
        createdAt: serverTimestamp(),
        linkedId: eventDoc.id,
        linkedType: "event",
        size: uploadBlob.size,
        status: "active",
        storagePath: photoPath,
        tags: ["events"],
        title: mediaTitle,
        updatedAt: serverTimestamp(),
        uploadedBy: userId,
      }, { merge: true });

      const nextPhoto = {
        alt: photoAlt.trim(),
        mediaAssetId,
        path: photoPath,
        sortOrder: currentPhotos.length,
      };
      const nextForm = {
        ...editingForm,
        photos: [...currentPhotos, nextPhoto],
      };

      const savedPhotos = await saveEventPhotoDraft(
        eventDoc.id,
        nextForm,
        shouldOptimize ? "Photo optimized, uploaded, and attached to the event draft." : "Photo uploaded and attached to the event draft.",
        setIsUploadingPhoto
      );

      if (savedPhotos) {
        setSelectedPhoto({ eventId: eventDoc.id, path: photoPath });
        setAddPhotoEventId("");
        setPhotoAddMode("");
        setPhotoAlt("");
        setPhotoFile(null);
        setPhotoUploadChoice("optimize");
        setPhotoInputKey((currentKey) => currentKey + 1);
        await loadMediaAssets();
      }
    } catch (error) {
      setPhotoMessage("Photo could not be uploaded.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const attachExistingPhoto = async (eventDoc) => {
    const editingForm = editingFormsById[eventDoc.id];

    if (!editingForm) {
      setPhotoMessage("Open an event before attaching photos.");
      return;
    }

    const mediaAsset = mediaAssets.find((asset) => asset.id === selectedExistingMediaId);

    if (!mediaAsset) {
      setPhotoMessage("Choose an existing photo to attach.");
      return;
    }

    const latestPhotos = normalizePhotos(editingForm.photos);

    if (latestPhotos.some((photo) => photo.mediaAssetId === mediaAsset.id || photo.path === mediaAsset.storagePath)) {
      setPhotoMessage("That photo is already attached to this event.");
      return;
    }

    const nextPhoto = {
      alt: mediaAsset.alt,
      mediaAssetId: mediaAsset.id,
      path: mediaAsset.storagePath,
      sortOrder: latestPhotos.length,
    };
    const nextForm = {
      ...editingForm,
      photos: [...latestPhotos, nextPhoto],
    };

    const savedPhotos = await saveEventPhotoDraft(
      eventDoc.id,
      nextForm,
      "Existing photo attached to the event draft.",
      setIsAttachingPhoto
    );

    if (savedPhotos) {
      setSelectedExistingMediaId("");
      setSelectedPhoto({ eventId: eventDoc.id, path: mediaAsset.storagePath });
      setAddPhotoEventId("");
      setPhotoAddMode("");
    }
  };

  const saveEventPhotoAlt = async (eventDoc, photo) => {
    const draftKey = photoKeyFor(eventDoc.id, photo.path);
    const nextAlt = (photoAltDrafts[draftKey] ?? photo.alt).trim();
    const updatedPhotos = await updateEventPhotoList(eventDoc, (latestPhotos) => latestPhotos.map((latestPhoto) => (
      latestPhoto.path === photo.path
        ? { ...latestPhoto, alt: nextAlt }
        : latestPhoto
    )), "Photo alt text saved.");

    if (!updatedPhotos) {
      return;
    }

    setPhotoAltDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[draftKey];
      return nextDrafts;
    });
  };

  const reorderEventPhoto = async (eventDoc, sourcePhotoPath, targetPhotoPath) => {
    if (!sourcePhotoPath || !targetPhotoPath || sourcePhotoPath === targetPhotoPath) {
      return;
    }

    await updateEventPhotoList(eventDoc, (latestPhotos) => {
      const sourceIndex = latestPhotos.findIndex((latestPhoto) => latestPhoto.path === sourcePhotoPath);
      const targetIndex = latestPhotos.findIndex((latestPhoto) => latestPhoto.path === targetPhotoPath);

      if (sourceIndex < 0 || targetIndex < 0) {
        return latestPhotos;
      }

      const nextPhotos = [...latestPhotos];
      const [movedPhoto] = nextPhotos.splice(sourceIndex, 1);
      nextPhotos.splice(targetIndex, 0, movedPhoto);
      return nextPhotos;
    }, "Photo order saved.");
  };

  const startPhotoDrag = (event, eventDoc, photo) => {
    setDraggedPhoto({ eventId: eventDoc.id, path: photo.path });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", photo.path);
  };

  const dropEventPhoto = async (event, eventDoc, targetPhoto) => {
    event.preventDefault();

    const draggedPath = draggedPhoto.eventId === eventDoc.id
      ? draggedPhoto.path
      : event.dataTransfer.getData("text/plain");

    setDraggedPhoto({ eventId: "", path: "" });
    await reorderEventPhoto(eventDoc, draggedPath, targetPhoto.path);
  };

  const reorderEventPhotoFromKeyboard = async (event, eventDoc, photo, direction) => {
    const editingForm = editingFormsById[eventDoc.id];
    const latestPhotos = normalizePhotos(editingForm?.photos);
    const photoIndex = latestPhotos.findIndex((latestPhoto) => latestPhoto.path === photo.path);
    const targetPhoto = latestPhotos[photoIndex + direction];

    if (!targetPhoto) {
      return;
    }

    event.preventDefault();
    await reorderEventPhoto(eventDoc, photo.path, targetPhoto.path);
  };

  const detachEventPhoto = async (eventDoc, photo) => {
    const updatedPhotos = await updateEventPhotoList(eventDoc, (latestPhotos) => (
      latestPhotos.filter((latestPhoto) => latestPhoto.path !== photo.path)
    ), "Photo detached from this event.");

    if (updatedPhotos && selectedPhoto.eventId === eventDoc.id && selectedPhoto.path === photo.path) {
      setSelectedPhoto({ eventId: "", path: "" });
    }
  };

  const visibleEvents = isDrawerMode && focusRequest?.eventId
    ? events.filter((eventDoc) => eventDoc.id === focusRequest.eventId)
    : events;

  return (
    <section className={isDrawerMode ? "admin_drawer_editor_inner" : "admin_panel"}>
      {!isDrawerMode ? (
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
      ) : null}

      {isExpanded || isDrawerMode ? (
        <>
          {message ? <p className="admin_message">{message}</p> : null}
          {isLoading ? <p className="admin_status">Loading events...</p> : null}
          {isDrawerMode && !isLoading && !visibleEvents.length ? (
            <p className="admin_status">The selected event was not found.</p>
          ) : null}

          {!isDrawerMode ? (
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
          ) : null}

          <div className="admin_content_list">
            {visibleEvents.map((eventDoc) => {
              const isEventExpanded = expandedEventId === eventDoc.id;
              const editingForm = editingFormsById[eventDoc.id];
              const hasDraft = Boolean(draftsById[eventDoc.id]);
              const isPublishReviewOpen = publishReview?.id === eventDoc.id;
              const eventPhotos = normalizePhotos(editingForm?.photos || eventDoc.photos);
              const eventAttachedPhotoPaths = new Set(eventPhotos.map((photo) => photo.path));
              const eventAttachedMediaAssetIds = new Set(eventPhotos
                .map((photo) => photo.mediaAssetId)
                .filter(Boolean));
              const isPhotoTarget = selectedPhoto.eventId === eventDoc.id || addPhotoEventId === eventDoc.id;
              const isAddingPhoto = addPhotoEventId === eventDoc.id;
              const isUploadMode = isAddingPhoto && photoAddMode === "upload";
              const isLibraryMode = isAddingPhoto && photoAddMode === "library";
              const selectedEventPhotoPath = selectedPhoto.eventId === eventDoc.id ? selectedPhoto.path : "";
              const photoLibraryAssets = mediaAssets.filter((asset) => asset.status === "active" && asset.storagePath);
              const waitlistEntries = waitlistEntriesByEventId[eventDoc.id] || [];

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
                  {!isEventExpanded ? (
                    <div className="admin_product_meta">
                      <span>{hasDraft ? "Draft changes pending" : "Live event"}</span>
                      {eventDoc._draftOnly ? <span>Draft-only new event</span> : null}
                      <span>{eventDoc.isActive ? "Visible on site" : "Hidden from site"}</span>
                      <span>{eventAvailabilityLabel(editingFormsById[eventDoc.id] || buildFormFromEvent(eventDoc))}</span>
                      <span>{eventDoc.id}</span>
                    </div>
                  ) : null}

                  {isEventExpanded && editingForm ? (
                    <div className="admin_product_card_body">
                      {editingForm.unsupportedFields.length ? (
                        <p className="admin_status">Unsupported fields retained: {editingForm.unsupportedFields.join(", ")}</p>
                      ) : null}
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
                      <div className="admin_embedded_form admin_waitlist_summary">
                        <div className="admin_form_header">
                          <h4>Waitlist</h4>
                          <span className="admin_status">{waitlistEntries.length} request{waitlistEntries.length === 1 ? "" : "s"}</span>
                        </div>
                        {waitlistEntries.length ? (
                          <div className="admin_waitlist_entries">
                            {waitlistEntries.map((entry) => (
                              <div className="admin_waitlist_entry" key={entry.id}>
                                <div>
                                  <strong>{entry.name}</strong>
                                  {entry.eventDate ? <span>{entry.eventDate}</span> : null}
                                  {formatWaitlistDate(entry.createdAt) ? <span>{formatWaitlistDate(entry.createdAt)}</span> : null}
                                </div>
                                <div>
                                  <a href={`mailto:${entry.email}`}>{entry.email}</a>
                                  {entry.phone ? <a href={`tel:${entry.phone}`}>{entry.phone}</a> : null}
                                </div>
                                {entry.message ? <p>{entry.message}</p> : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="admin_status">No waitlist requests yet.</p>
                        )}
                      </div>
                      <div className="admin_embedded_form admin_card_photo_form">
                        <div className="admin_form_header">
                          <h4>Photos</h4>
                          <span className="admin_status">{eventPhotos.length} attached</span>
                        </div>

                        <div className="admin_photo_list">
                          {eventPhotos.length ? eventPhotos.map((photo, photoIndex) => {
                            const draftKey = photoKeyFor(eventDoc.id, photo.path);
                            const draftAlt = photoAltDrafts[draftKey] ?? photo.alt;
                            const isSelectedPhoto = selectedEventPhotoPath === photo.path;
                            const isDraggedPhoto = draggedPhoto.eventId === eventDoc.id && draggedPhoto.path === photo.path;

                            return (
                              <div
                                className={`admin_photo_row${isSelectedPhoto ? " admin_photo_row_selected" : ""}${isDraggedPhoto ? " admin_photo_row_dragging" : ""}`}
                                key={photo.path}
                                onClick={() => selectEventPhoto(eventDoc.id, photo.path)}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(event) => dropEventPhoto(event, eventDoc, photo)}
                              >
                                <button
                                  aria-label={`Drag ${photo.alt || eventDoc.title || `photo ${photoIndex + 1}`} to reorder`}
                                  aria-describedby={`event-photo-reorder-help-${eventDoc.id}-${photoIndex}`}
                                  className="admin_photo_drag_handle"
                                  disabled={isUpdatingEventPhoto}
                                  draggable={!isUpdatingEventPhoto}
                                  onClick={(event) => event.stopPropagation()}
                                  onDragEnd={() => setDraggedPhoto({ eventId: "", path: "" })}
                                  onDragStart={(event) => startPhotoDrag(event, eventDoc, photo)}
                                  onKeyDown={(event) => {
                                    event.stopPropagation();

                                    if (event.key === "ArrowUp") {
                                      reorderEventPhotoFromKeyboard(event, eventDoc, photo, -1);
                                    }

                                    if (event.key === "ArrowDown") {
                                      reorderEventPhotoFromKeyboard(event, eventDoc, photo, 1);
                                    }
                                  }}
                                  title="Drag to reorder"
                                  type="button"
                                >
                                  <FontAwesomeIcon icon={faGripVertical} />
                                </button>
                                <span className="admin_sr_only" id={`event-photo-reorder-help-${eventDoc.id}-${photoIndex}`}>
                                  Use arrow up or arrow down to reorder this photo.
                                </span>
                                <div className="admin_photo_thumbnail_wrap">
                                  {photoUrlsByPath[photo.path] ? (
                                    <img alt={photo.alt || eventDoc.title || photo.path} src={photoUrlsByPath[photo.path]} />
                                  ) : (
                                    <span>No preview</span>
                                  )}
                                  <button
                                    aria-label={`Remove ${photo.alt || eventDoc.title || `photo ${photoIndex + 1}`} from event`}
                                    className="admin_photo_remove_button"
                                    disabled={isUpdatingEventPhoto}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      detachEventPhoto(eventDoc, photo);
                                    }}
                                    title="Remove from event"
                                    type="button"
                                  >
                                    <FontAwesomeIcon icon={faXmark} />
                                  </button>
                                </div>
                                <button
                                  aria-pressed={isSelectedPhoto}
                                  className="admin_photo_summary admin_photo_select_button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    selectEventPhoto(eventDoc.id, photo.path);
                                  }}
                                  type="button"
                                >
                                  <span>{photo.alt || `Photo ${photoIndex + 1}`}</span>
                                  <small>{isSelectedPhoto ? photo.path : "Select to edit alt text"}</small>
                                </button>
                                {isSelectedPhoto ? (
                                  <div className="admin_photo_selected_tools" onClick={(event) => event.stopPropagation()}>
                                    <label className="admin_photo_alt_field">
                                      Alt Text
                                      <div className="admin_inline_save">
                                        <input
                                          disabled={isUpdatingEventPhoto}
                                          onChange={(event) => updatePhotoAltDraft(eventDoc.id, photo.path, event.target.value)}
                                          value={draftAlt}
                                        />
                                        <button
                                          className="admin_secondary_button"
                                          disabled={isUpdatingEventPhoto || draftAlt.trim() === photo.alt}
                                          onClick={() => saveEventPhotoAlt(eventDoc, photo)}
                                          type="button"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </label>
                                  </div>
                                ) : null}
                              </div>
                            );
                          }) : (
                            <p className="admin_status">No photos attached yet.</p>
                          )}
                        </div>

                        <button
                          className="admin_secondary_button admin_add_photo_button"
                          onClick={() => toggleAddPhotoTools(eventDoc.id)}
                          type="button"
                        >
                          {isAddingPhoto ? "Close Add Photo" : "Add Photo"}
                        </button>

                        {isAddingPhoto ? (
                          <div className="admin_add_photo_panel">
                            <div className="admin_button_row">
                              <button
                                className={isUploadMode ? "admin_secondary_button admin_toggle_button_active" : "admin_secondary_button"}
                                onClick={() => choosePhotoAddMode(eventDoc.id, "upload")}
                                type="button"
                              >
                                Upload New Photo
                              </button>
                              <button
                                className={isLibraryMode ? "admin_secondary_button admin_toggle_button_active" : "admin_secondary_button"}
                                onClick={() => choosePhotoAddMode(eventDoc.id, "library")}
                                type="button"
                              >
                                Choose from Photo Library
                              </button>
                            </div>

                            {isUploadMode ? (
                              <form className="admin_photo_upload_form" onSubmit={(event) => handlePhotoUpload(event, eventDoc)}>
                                <label>
                                  Image File
                                  <input
                                    accept="image/*"
                                    disabled={isUploadingPhoto}
                                    key={`${eventDoc.id}-${photoInputKey}`}
                                    onChange={(event) => updatePhotoFile(event.target.files?.[0] || null)}
                                    type="file"
                                  />
                                </label>
                                {photoFile && isPhotoTarget ? (
                                  <div className="admin_upload_notice">
                                    <span>{photoFile.name}</span>
                                    <small>{formatFileSize(photoFile.size)}</small>
                                    {photoFile.size >= recommendedImageSize ? (
                                      <div className="admin_upload_options">
                                        <label>
                                          <input
                                            checked={photoUploadChoice === "optimize"}
                                            disabled={isUploadingPhoto}
                                            name={`event-photo-upload-choice-${eventDoc.id}`}
                                            onChange={() => setPhotoUploadChoice("optimize")}
                                            type="radio"
                                          />
                                          Optimize for website
                                        </label>
                                        <label>
                                          <input
                                            checked={photoUploadChoice === "original"}
                                            disabled={isUploadingPhoto}
                                            name={`event-photo-upload-choice-${eventDoc.id}`}
                                            onChange={() => setPhotoUploadChoice("original")}
                                            type="radio"
                                          />
                                          Upload original
                                        </label>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                                <label>
                                  Alt Text
                                  <input
                                    disabled={isUploadingPhoto}
                                    onChange={(event) => setPhotoAlt(event.target.value)}
                                    placeholder="Chef standing at the Calabash table"
                                    value={photoAlt}
                                  />
                                </label>
                                <button className="admin_primary_button" disabled={isUploadingPhoto} type="submit">
                                  {isUploadingPhoto && isPhotoTarget ? "Uploading..." : "Upload Photo"}
                                </button>
                              </form>
                            ) : null}

                            {isLibraryMode ? (
                              <div className="admin_photo_library_picker">
                                <div className="admin_form_header">
                                  <h4>Photo Library</h4>
                                  <span className="admin_status">{photoLibraryAssets.length} available</span>
                                </div>
                                {photoLibraryAssets.length ? (
                                  <div className="admin_photo_library_grid">
                                    {photoLibraryAssets.map((asset) => {
                                      const isSelectedAsset = selectedExistingMediaId === asset.id;
                                      const isAlreadyAttached = eventAttachedPhotoPaths.has(asset.storagePath)
                                        || eventAttachedMediaAssetIds.has(asset.id);

                                      return (
                                        <button
                                          aria-pressed={isSelectedAsset}
                                          className={`admin_photo_library_card${isSelectedAsset ? " admin_photo_library_card_selected" : ""}`}
                                          disabled={isAttachingPhoto || isAlreadyAttached}
                                          key={asset.id}
                                          onClick={() => setSelectedExistingMediaId(asset.id)}
                                          type="button"
                                        >
                                          <span className="admin_photo_library_thumb">
                                            {photoUrlsByPath[asset.storagePath] ? (
                                              <img alt={asset.alt || asset.title} src={photoUrlsByPath[asset.storagePath]} />
                                            ) : (
                                              <span>No preview</span>
                                            )}
                                          </span>
                                          <span className="admin_photo_library_title">{asset.title}</span>
                                          <small>{isAlreadyAttached ? "Already attached" : asset.bin}</small>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="admin_status">No active photos are available in the Photo Library.</p>
                                )}
                                <button
                                  className="admin_secondary_button"
                                  disabled={isAttachingPhoto || !isPhotoTarget || !selectedExistingMediaId}
                                  onClick={() => attachExistingPhoto(eventDoc)}
                                  type="button"
                                >
                                  {isAttachingPhoto && isPhotoTarget ? "Attaching..." : "Attach Photo"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {isPhotoTarget && photoMessage ? <p className="admin_message">{photoMessage}</p> : null}
                      </div>
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
                      {isPublishReviewOpen ? (
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
  const descriptionBlocks = Array.isArray(form.descriptionBlocks) && form.descriptionBlocks.length
    ? form.descriptionBlocks
    : [emptyDescriptionBlock()];
  const updateDescriptionBlock = (index, field, value) => {
    onUpdate("descriptionBlocks", descriptionBlocks.map((block, blockIndex) => (
      blockIndex === index
        ? { ...block, [field]: value }
        : block
    )));
  };
  const addDescriptionBlock = () => {
    onUpdate("descriptionBlocks", [
      ...descriptionBlocks,
      emptyDescriptionBlock(),
    ]);
  };
  const removeDescriptionBlock = (index) => {
    const nextBlocks = descriptionBlocks.filter((block, blockIndex) => blockIndex !== index);

    onUpdate("descriptionBlocks", nextBlocks.length ? nextBlocks : [emptyDescriptionBlock()]);
  };
  const moveDescriptionBlock = (index, direction) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= descriptionBlocks.length) {
      return;
    }

    const nextBlocks = [...descriptionBlocks];
    const [movedBlock] = nextBlocks.splice(index, 1);
    nextBlocks.splice(targetIndex, 0, movedBlock);
    onUpdate("descriptionBlocks", nextBlocks);
  };
  const priceOptions = rawLinesFromText(form.priceOptionsText);
  const priceFields = priceOptions.length ? priceOptions : [""];
  const updatePriceOption = (index, value) => {
    const nextPrices = [...priceFields];
    nextPrices[index] = value;
    onUpdate("priceOptionsText", nextPrices.join("\n"));
  };
  const addPriceOption = () => {
    onUpdate("priceOptionsText", [...priceFields, ""].join("\n"));
  };
  const removePriceOption = (index) => {
    const nextPrices = priceFields.filter((priceOption, priceIndex) => priceIndex !== index);
    onUpdate("priceOptionsText", (nextPrices.length ? nextPrices : [""]).join("\n"));
  };

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

      <div className="admin_description_blocks">
        <div className="admin_form_header admin_description_blocks_header">
          <h4>Description Sections</h4>
          <button
            className="admin_secondary_button"
            disabled={isSaving}
            onClick={addDescriptionBlock}
            type="button"
          >
            Add Section
          </button>
        </div>
        {descriptionBlocks.map((block, index) => (
          <div className="admin_description_block" key={`event-description-block-${index}`}>
            <div className="admin_form_header admin_description_block_header">
              <h5>Section {index + 1}</h5>
              <div className="admin_button_row">
                <button
                  className="admin_secondary_button"
                  disabled={isSaving || index === 0}
                  onClick={() => moveDescriptionBlock(index, -1)}
                  type="button"
                >
                  Move Up
                </button>
                <button
                  className="admin_secondary_button"
                  disabled={isSaving || index === descriptionBlocks.length - 1}
                  onClick={() => moveDescriptionBlock(index, 1)}
                  type="button"
                >
                  Move Down
                </button>
                <button
                  className="admin_secondary_button"
                  disabled={isSaving || descriptionBlocks.length === 1}
                  onClick={() => removeDescriptionBlock(index)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
            <label>
              Subtitle
              <input
                disabled={isSaving}
                onChange={(event) => updateDescriptionBlock(index, "subtitle", event.target.value)}
                placeholder="Optional subtitle"
                value={block.subtitle}
              />
            </label>
            <label>
              Paragraph
              <textarea
                disabled={isSaving}
                onChange={(event) => updateDescriptionBlock(index, "body", event.target.value)}
                placeholder="Event description paragraph"
                rows={5}
                value={block.body}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="admin_description_blocks">
        <div className="admin_form_header admin_description_blocks_header">
          <div>
            <h4>Tickets</h4>
            <p className="admin_status admin_inline_status">{eventAvailabilityLabel(form)}</p>
          </div>
          <button
            className="admin_secondary_button"
            disabled={isSaving}
            onClick={addPriceOption}
            type="button"
          >
            Add Price
          </button>
        </div>
        <div className="admin_event_price_list">
          {priceFields.map((priceOption, index) => (
            <div className="admin_event_price_row" key={`event-price-${index}`}>
              <label>
                Price {index + 1}
                <input
                  disabled={isSaving}
                  inputMode="decimal"
                  onChange={(event) => updatePriceOption(index, event.target.value)}
                  placeholder="60.00"
                  required
                  value={priceOption}
                />
              </label>
              <button
                className="admin_secondary_button"
                disabled={isSaving || priceFields.length === 1}
                onClick={() => removePriceOption(index)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="admin_event_availability_fields">
          <label>
            Capacity
            <input
              disabled={isSaving}
              min="0"
              onChange={(event) => onUpdate("capacity", event.target.value)}
              placeholder="30"
              type="number"
              value={form.capacity}
            />
          </label>
          <label>
            Manual holds
            <input
              disabled={isSaving}
              min="0"
              onChange={(event) => onUpdate("manualSeatsReserved", event.target.value)}
              placeholder="0"
              type="number"
              value={form.manualSeatsReserved}
            />
            <span className="admin_help_text">
              Use only for seats held outside the website until order tracking is connected.
            </span>
          </label>
          <label className="admin_checkbox_label">
            <input
              checked={form.waitlistEnabled}
              disabled={isSaving}
              onChange={(event) => onUpdate("waitlistEnabled", event.target.checked)}
              type="checkbox"
            />
            Open waitlist when full
          </label>
        </div>
      </div>

      <div className="admin_split_fields">
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
            checked={form.isActive}
            disabled={isSaving}
            onChange={(event) => onUpdate("isActive", event.target.checked)}
            type="checkbox"
          />
          Visible on site
        </label>
      </div>

      <button className="admin_primary_button" disabled={isSaving} type="submit">
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
