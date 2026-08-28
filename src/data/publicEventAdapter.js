import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";

import { applyAdminDrafts } from "./adminDrafts";
import defaultEventPhoto from "../resources/images/large_logo_no_purple_square.png";
import { createKey } from "./siteData";

const normalizeDate = (value) => {
  if (!value) {
    return new Date(0);
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
};

const normalizeStringList = (values) => (
  Array.isArray(values)
    ? values.map((value) => String(value || "")).filter(Boolean)
    : []
);

const normalizeDescriptionBlocks = (eventDoc) => {
  if (!Array.isArray(eventDoc.descriptionBlocks)) {
    return [];
  }

  return eventDoc.descriptionBlocks
    .map((block) => ({
      body: String(block?.body || "").trim(),
      subtitle: String(block?.subtitle || "").trim(),
    }))
    .filter((block) => block.body || block.subtitle);
};

const infoFromDescriptionBlocks = (descriptionBlocks) => (
  descriptionBlocks
    .flatMap((block) => [block.subtitle, block.body])
    .filter(Boolean)
);

const normalizePhotoRefs = (photos) => {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos
    .map((photo, index) => {
      if (typeof photo === "string") {
        return {
          path: photo,
          sortOrder: index,
        };
      }

      if (!photo || typeof photo !== "object" || !photo.path) {
        return null;
      }

      return {
        path: photo.path,
        sortOrder: Number.isInteger(photo.sortOrder) ? photo.sortOrder : index,
      };
    })
    .filter(Boolean)
    .sort((firstPhoto, secondPhoto) => firstPhoto.sortOrder - secondPhoto.sortOrder);
};

const buildStorageUrlMap = async (storage, firestoreEvents) => {
  if (!storage) {
    return {};
  }

  const storagePaths = Array.from(new Set(firestoreEvents
    .flatMap((event) => normalizePhotoRefs(event.photos))
    .map((photo) => photo.path)
    .filter(Boolean)));
  const entries = await Promise.all(storagePaths.map(async (storagePath) => {
    try {
      return [storagePath, await getDownloadURL(ref(storage, storagePath))];
    } catch (error) {
      return [storagePath, ""];
    }
  }));

  return Object.fromEntries(entries);
};

export const normalizeFirestoreEventForPublic = (firestoreEvent, options = {}) => {
  const storageUrlByPath = options.storageUrlByPath || {};
  const title = String(firestoreEvent.title || "");
  const photoRefs = normalizePhotoRefs(firestoreEvent.photos);
  const descriptionBlocks = normalizeDescriptionBlocks(firestoreEvent);
  const info = normalizeStringList(firestoreEvent.info);
  const storagePhotos = photoRefs
    .map((photo) => storageUrlByPath[photo.path] || "")
    .filter(Boolean);

  return {
    capacity: Number.isFinite(firestoreEvent.capacity) ? firestoreEvent.capacity : null,
    category: String(firestoreEvent.category || "Experience"),
    date: normalizeDate(firestoreEvent.date),
    descriptionBlocks,
    draftConflict: String(firestoreEvent._draftConflict || ""),
    eventDates: normalizeStringList(firestoreEvent.eventDates),
    id: firestoreEvent.id || firestoreEvent.slug || "",
    info: info.length ? info : infoFromDescriptionBlocks(descriptionBlocks),
    inStock: firestoreEvent.inStock === true,
    isActive: firestoreEvent.published === true && firestoreEvent.isActive === true,
    key: createKey(title),
    link: String(firestoreEvent.link || ""),
    manualSeatsReserved: Number.isFinite(firestoreEvent.manualSeatsReserved) ? firestoreEvent.manualSeatsReserved : 0,
    photos: storagePhotos.length ? storagePhotos : [defaultEventPhoto],
    priceOptions: normalizeStringList(firestoreEvent.priceOptions),
    shipping: String(firestoreEvent.shipping || "0.00"),
    ticketsSold: Number.isFinite(firestoreEvent.ticketsSold) ? firestoreEvent.ticketsSold : 0,
    title,
    waitlistEnabled: firestoreEvent.waitlistEnabled === true,
  };
};

export const normalizeFirestoreEventsForPublic = (firestoreEvents, options = {}) => (
  firestoreEvents
    .map((firestoreEvent) => normalizeFirestoreEventForPublic(firestoreEvent, options))
    .sort((firstEvent, secondEvent) => firstEvent.date - secondEvent.date || firstEvent.title.localeCompare(secondEvent.title))
);

export const loadFirestoreEventsForPublic = async ({ db, storage, drafts = [] }) => {
  const eventsQuery = query(collection(db, "events"), orderBy("date"));
  const snapshot = await getDocs(eventsQuery);
  const liveFirestoreEvents = snapshot.docs.map((eventDoc) => ({
    id: eventDoc.id,
    ...eventDoc.data(),
  }));
  const firestoreEvents = drafts.length
    ? applyAdminDrafts(liveFirestoreEvents, drafts, "events")
    : liveFirestoreEvents;
  const storageUrlByPath = await buildStorageUrlMap(storage, firestoreEvents);

  return normalizeFirestoreEventsForPublic(firestoreEvents, { storageUrlByPath });
};
