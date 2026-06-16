import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const draftCollectionsByTarget = {
  events: "eventDrafts",
  products: "productDrafts",
  siteContent: "siteContentDrafts",
};

const draftMetadataKeys = new Set([
  "draftDiscardedAt",
  "draftDiscardedBy",
  "draftPublishedAt",
  "draftPublishedBy",
  "draftStatus",
  "draftTargetCollection",
  "draftTargetId",
  "draftUpdatedAt",
  "draftUpdatedBy",
]);

export const draftCollectionForTarget = (targetCollection) => (
  draftCollectionsByTarget[targetCollection] || ""
);

const assertDraftTarget = (targetCollection, targetId) => {
  if (!draftCollectionForTarget(targetCollection)) {
    throw new Error(`Unsupported draft target collection: ${targetCollection}`);
  }

  if (!targetId || String(targetId).includes("/")) {
    throw new Error("Draft target ID must be a non-empty Firestore document ID.");
  }
};

export const stripDraftMetadata = (draftData) => (
  Object.fromEntries(Object.entries(draftData || {})
    .filter(([key]) => !draftMetadataKeys.has(key)))
);

export const loadAdminDrafts = async ({ db, targetCollection = "" }) => {
  const targetCollections = targetCollection
    ? [targetCollection]
    : Object.keys(draftCollectionsByTarget);
  const snapshots = await Promise.all(targetCollections.map(async (collectionName) => {
    assertDraftTarget(collectionName, "placeholder");

    let snapshot;

    try {
      snapshot = await getDocs(collection(db, draftCollectionForTarget(collectionName)));
    } catch (error) {
      return [];
    }

    return snapshot.docs.map((draftDoc) => ({
      data: stripDraftMetadata(draftDoc.data()),
      id: draftDoc.id,
      targetCollection: collectionName,
      targetId: draftDoc.id,
      ...draftDoc.data(),
    }));
  }));

  return snapshots.flat();
};

export const activeAdminDrafts = (drafts, targetCollection = "") => (
  drafts.filter((draft) => (
    draft.draftStatus === "draft"
      && (!targetCollection || draft.targetCollection === targetCollection)
      && draft.targetId
      && draft.data
      && typeof draft.data === "object"
      && !Array.isArray(draft.data)
  ))
);

export const adminDraftByTarget = (drafts, targetCollection) => (
  activeAdminDrafts(drafts, targetCollection).reduce((draftsByTarget, draft) => {
    draftsByTarget.set(draft.targetId, draft);
    return draftsByTarget;
  }, new Map())
);

export const applyAdminDrafts = (liveDocs, drafts, targetCollection) => {
  const draftsByTarget = adminDraftByTarget(drafts, targetCollection);
  const seenIds = new Set();
  const overlaidDocs = liveDocs.map((liveDoc) => {
    const draft = draftsByTarget.get(liveDoc.id);

    seenIds.add(liveDoc.id);

    if (!draft) {
      return liveDoc;
    }

    return {
      ...liveDoc,
      ...draft.data,
      _draft: draft,
      id: liveDoc.id,
    };
  });
  const draftOnlyDocs = Array.from(draftsByTarget.values())
    .filter((draft) => !seenIds.has(draft.targetId))
    .map((draft) => ({
      ...draft.data,
      _draft: draft,
      _draftOnly: true,
      id: draft.targetId,
    }));

  return [...overlaidDocs, ...draftOnlyDocs];
};

export const saveAdminDraft = async ({
  data,
  db,
  targetCollection,
  targetId,
  userId = "",
}) => {
  assertDraftTarget(targetCollection, targetId);

  await setDoc(doc(db, draftCollectionForTarget(targetCollection), targetId), {
    ...data,
    draftStatus: "draft",
    draftTargetCollection: targetCollection,
    draftTargetId: targetId,
    draftUpdatedAt: serverTimestamp(),
    draftUpdatedBy: userId,
  }, { merge: true });
};

export const publishAdminDraft = async ({
  data,
  db,
  targetCollection,
  targetId,
  userId = "",
}) => {
  assertDraftTarget(targetCollection, targetId);

  const targetRef = doc(db, targetCollection, targetId);
  const targetSnapshot = await getDoc(targetRef);
  const targetPayload = {
    ...stripDraftMetadata(data),
    updatedAt: serverTimestamp(),
  };

  if (!targetSnapshot.exists()) {
    targetPayload.createdAt = serverTimestamp();
  }

  await setDoc(targetRef, targetPayload, { merge: true });
  await setDoc(doc(db, draftCollectionForTarget(targetCollection), targetId), {
    ...targetPayload,
    draftPublishedAt: serverTimestamp(),
    draftPublishedBy: userId,
    draftStatus: "published",
    draftTargetCollection: targetCollection,
    draftTargetId: targetId,
    draftUpdatedAt: serverTimestamp(),
    draftUpdatedBy: userId,
  }, { merge: true });
};

export const discardAdminDraft = async ({
  db,
  targetCollection,
  targetId,
  userId = "",
}) => {
  assertDraftTarget(targetCollection, targetId);

  await setDoc(doc(db, draftCollectionForTarget(targetCollection), targetId), {
    draftDiscardedAt: serverTimestamp(),
    draftDiscardedBy: userId,
    draftStatus: "discarded",
    draftTargetCollection: targetCollection,
    draftTargetId: targetId,
    draftUpdatedAt: serverTimestamp(),
    draftUpdatedBy: userId,
  }, { merge: true });
};
