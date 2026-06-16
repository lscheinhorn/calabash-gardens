import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";

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
  const storagePhotos = photoRefs
    .map((photo) => storageUrlByPath[photo.path] || "")
    .filter(Boolean);

  return {
    category: String(firestoreEvent.category || "Experience"),
    date: normalizeDate(firestoreEvent.date),
    eventDates: normalizeStringList(firestoreEvent.eventDates),
    id: firestoreEvent.id || firestoreEvent.slug || "",
    info: normalizeStringList(firestoreEvent.info),
    inStock: firestoreEvent.inStock === true,
    isActive: firestoreEvent.published === true && firestoreEvent.isActive === true,
    key: createKey(title),
    link: String(firestoreEvent.link || ""),
    photos: storagePhotos.length ? storagePhotos : [defaultEventPhoto],
    priceOptions: normalizeStringList(firestoreEvent.priceOptions),
    shipping: String(firestoreEvent.shipping || "0.00"),
    sortOrder: Number.isFinite(firestoreEvent.sortOrder) ? firestoreEvent.sortOrder : 999,
    title,
  };
};

export const normalizeFirestoreEventsForPublic = (firestoreEvents, options = {}) => (
  firestoreEvents
    .map((firestoreEvent) => normalizeFirestoreEventForPublic(firestoreEvent, options))
    .sort((firstEvent, secondEvent) => firstEvent.date - secondEvent.date || firstEvent.title.localeCompare(secondEvent.title))
);

export const loadFirestoreEventsForPublic = async ({ db, storage }) => {
  const eventsQuery = query(collection(db, "events"), orderBy("date"));
  const snapshot = await getDocs(eventsQuery);
  const firestoreEvents = snapshot.docs.map((eventDoc) => ({
    id: eventDoc.id,
    ...eventDoc.data(),
  }));
  const storageUrlByPath = await buildStorageUrlMap(storage, firestoreEvents);

  return normalizeFirestoreEventsForPublic(firestoreEvents, { storageUrlByPath });
};
