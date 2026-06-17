import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
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
import { buildContentSeed } from "../../data/adminContentSeed";
import AdminPublishReview from "./AdminPublishReview";

const CollapseIcon = ({ isExpanded }) => (
  <FontAwesomeIcon
    aria-hidden="true"
    className="admin_collapse_icon"
    icon={isExpanded ? faChevronDown : faChevronRight}
  />
);

const flattenSections = (value, prefix = "", output = {}) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    output[prefix || "value"] = String(value ?? "");
    return output;
  }

  Object.keys(value).sort().forEach((key) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenSections(value[key], nextPrefix, output);
  });

  return output;
};

const unflattenSections = (flatSections) => {
  const sections = {};

  Object.entries(flatSections).forEach(([path, value]) => {
    const parts = path.split(".");
    let target = sections;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        target[part] = value;
        return;
      }

      if (!target[part] || typeof target[part] !== "object") {
        target[part] = {};
      }

      target = target[part];
    });
  });

  return sections;
};

const titleForPath = (path) => path
  .split(".")
  .map((part) => part
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()))
  .join(" / ");

const shouldUseTextarea = (path, value) => (
  value.length > 80
  || path.includes("paragraph")
  || path.includes("bio")
  || path.includes("subtitle")
);

const buildExpectedMeta = () => {
  const seed = buildContentSeed();

  return new Map(seed.contentDocs.map((contentDoc) => [contentDoc.id, {
    sortOrder: contentDoc.data.sortOrder,
    title: contentDoc.title,
  }]));
};

export default function ContentAdmin({ db, userId = "" }) {
  const [contentDocs, setContentDocs] = useState([]);
  const [draftsById, setDraftsById] = useState({});
  const [expandedDocId, setExpandedDocId] = useState("");
  const [formsById, setFormsById] = useState({});
  const [liveContentById, setLiveContentById] = useState({});
  const [publishReview, setPublishReview] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const expectedMeta = useMemo(buildExpectedMeta, []);
  const expectedContentIds = useMemo(() => new Set(expectedMeta.keys()), [expectedMeta]);

  const loadContentDocs = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const [snapshot, drafts] = await Promise.all([
        getDocs(collection(db, "siteContent")),
        loadAdminDrafts({ db, targetCollection: "siteContent" }),
      ]);
      const liveDocs = snapshot.docs
        .map((contentDoc) => ({
          id: contentDoc.id,
          ...contentDoc.data(),
        }));
      setLiveContentById(Object.fromEntries(liveDocs.map((contentDoc) => [
        contentDoc.id,
        contentDoc,
      ])));
      const docs = applyAdminDrafts(liveDocs, drafts, "siteContent")
        .filter((contentDoc) => expectedContentIds.has(contentDoc.id))
        .sort((firstDoc, secondDoc) => {
          const firstOrder = Number.isFinite(firstDoc.sortOrder) ? firstDoc.sortOrder : expectedMeta.get(firstDoc.id)?.sortOrder ?? 999;
          const secondOrder = Number.isFinite(secondDoc.sortOrder) ? secondDoc.sortOrder : expectedMeta.get(secondDoc.id)?.sortOrder ?? 999;
          return firstOrder - secondOrder || firstDoc.id.localeCompare(secondDoc.id);
        });

      setContentDocs(docs);
      setFormsById(Object.fromEntries(docs.map((contentDoc) => [contentDoc.id, {
        flatSections: flattenSections(contentDoc.sections),
        published: contentDoc.published === true,
        sortOrder: Number.isFinite(contentDoc.sortOrder) ? contentDoc.sortOrder : expectedMeta.get(contentDoc.id)?.sortOrder ?? null,
      }])));
      setDraftsById(Object.fromEntries(activeAdminDrafts(drafts, "siteContent").map((draft) => [
        draft.targetId,
        draft,
      ])));
    } catch (error) {
      setMessage("Site content could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [db, expectedContentIds, expectedMeta]);

  useEffect(() => {
    if (isExpanded) {
      loadContentDocs();
    }
  }, [isExpanded, loadContentDocs]);

  const updatePublished = (contentId, value) => {
    setFormsById((currentForms) => ({
      ...currentForms,
      [contentId]: {
        ...currentForms[contentId],
        published: value,
      },
    }));
  };

  const updateField = (contentId, path, value) => {
    setFormsById((currentForms) => ({
      ...currentForms,
      [contentId]: {
        ...currentForms[contentId],
        flatSections: {
          ...currentForms[contentId]?.flatSections,
          [path]: value,
        },
      },
    }));
  };

  const buildContentPayload = (contentDoc) => {
    if (!expectedContentIds.has(contentDoc.id)) {
      return null;
    }

    const form = formsById[contentDoc.id];

    if (!form) {
      return null;
    }

    return {
      published: form.published,
      sections: unflattenSections(form.flatSections),
      sortOrder: Number.isFinite(Number(form.sortOrder)) ? Number(form.sortOrder) : null,
    };
  };

  const saveContentDraft = async (contentDoc) => {
    const payload = buildContentPayload(contentDoc);

    if (!payload) {
      setMessage("Open an approved content section before saving.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await saveAdminDraft({
        data: payload,
        db,
        targetCollection: "siteContent",
        targetId: contentDoc.id,
        userId,
      });

      setMessage(`${expectedMeta.get(contentDoc.id)?.title || contentDoc.id} draft saved for preview.`);
      setPublishReview(null);
      await loadContentDocs();
    } catch (error) {
      setMessage("Site content draft could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const requestPublishContentDoc = (contentDoc) => {
    const draft = draftsById[contentDoc.id];

    if (!draft?.data) {
      setMessage("Save a draft before reviewing publish changes.");
      return;
    }

    setMessage("");
    setPublishReview({
      data: draft.data,
      id: contentDoc.id,
      liveData: liveContentById[contentDoc.id] || null,
      title: expectedMeta.get(contentDoc.id)?.title || contentDoc.id,
    });
  };

  const confirmPublishContentDoc = async () => {
    if (!publishReview) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await publishAdminDraft({
        data: publishReview.data,
        db,
        targetCollection: "siteContent",
        targetId: publishReview.id,
        userId,
      });

      setMessage(`${publishReview.title} published to live Firestore content.`);
      setPublishReview(null);
      await loadContentDocs();
    } catch (error) {
      setMessage("Site content could not be published.");
    } finally {
      setIsSaving(false);
    }
  };

  const discardContentDraft = async (contentDoc) => {
    setIsSaving(true);
    setMessage("");

    try {
      await discardAdminDraft({
        db,
        targetCollection: "siteContent",
        targetId: contentDoc.id,
        userId,
      });

      setMessage(`${expectedMeta.get(contentDoc.id)?.title || contentDoc.id} draft discarded.`);
      setPublishReview(null);
      await loadContentDocs();
    } catch (error) {
      setMessage("Site content draft could not be discarded.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin_panel">
      <div className="admin_form_header">
        <div>
          <h3>Site Content Editor</h3>
          <p className="admin_status">
            Saves site content edits as drafts first. Publish Changes updates live Firestore content.
          </p>
        </div>
        <div className="admin_button_row">
          <button
            className="admin_secondary_button"
            disabled={isLoading || isSaving || !isExpanded}
            onClick={loadContentDocs}
            type="button"
          >
            Refresh
          </button>
          <button
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} site content editor`}
            className="admin_icon_button"
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
            title={`${isExpanded ? "Collapse" : "Expand"} site content editor`}
            type="button"
          >
            <CollapseIcon isExpanded={isExpanded} />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          {message ? <p className="admin_message">{message}</p> : null}
          {isLoading ? <p className="admin_status">Loading site content...</p> : null}
          {!isLoading && !contentDocs.length ? (
            <p className="admin_status">No Firestore site content found. Seed missing content first.</p>
          ) : null}

          <div className="admin_content_list">
            {contentDocs.map((contentDoc) => {
              const isDocExpanded = expandedDocId === contentDoc.id;
              const form = formsById[contentDoc.id];
              const fields = Object.entries(form?.flatSections || {});
              const title = expectedMeta.get(contentDoc.id)?.title || contentDoc.id;
              const hasDraft = Boolean(draftsById[contentDoc.id]);
              const isPublishReviewOpen = publishReview?.id === contentDoc.id;

              return (
                <article className="admin_content_card" key={contentDoc.id}>
                  <button
                    aria-expanded={isDocExpanded}
                    aria-label={`${isDocExpanded ? "Collapse" : "Expand"} ${title}`}
                    className="admin_product_card_header"
                    onClick={() => setExpandedDocId(isDocExpanded ? "" : contentDoc.id)}
                    title={`${isDocExpanded ? "Collapse" : "Expand"} ${title}`}
                    type="button"
                  >
                    <span>{title}</span>
                    <small aria-hidden="true">
                      <CollapseIcon isExpanded={isDocExpanded} />
                    </small>
                  </button>
                  <div className="admin_product_meta">
                    <span>{hasDraft ? "Draft changes pending" : "Live content"}</span>
                    <span>{form?.published ? "Published when live" : "Hidden when live"}</span>
                  </div>

                  {isDocExpanded ? (
                    <div className="admin_embedded_form">
                      <label className="admin_checkbox_label">
                        <input
                          checked={form?.published === true}
                          disabled={isSaving}
                          onChange={(event) => updatePublished(contentDoc.id, event.target.checked)}
                          type="checkbox"
                        />
                        Published
                      </label>

                      {fields.map(([path, value]) => (
                        <label key={path}>
                          {titleForPath(path)}
                          {shouldUseTextarea(path, value) ? (
                            <textarea
                              disabled={isSaving}
                              onChange={(event) => updateField(contentDoc.id, path, event.target.value)}
                              rows={4}
                              value={value}
                            />
                          ) : (
                            <input
                              disabled={isSaving}
                              onChange={(event) => updateField(contentDoc.id, path, event.target.value)}
                              value={value}
                            />
                          )}
                        </label>
                      ))}

                      <div className="admin_button_row">
                        <button
                          className="admin_primary_button"
                          disabled={isSaving}
                          onClick={() => saveContentDraft(contentDoc)}
                          type="button"
                        >
                          {isSaving ? "Saving..." : "Save Draft"}
                        </button>
                        <button
                          className="admin_secondary_button"
                          disabled={isSaving || !hasDraft}
                          onClick={() => requestPublishContentDoc(contentDoc)}
                          type="button"
                        >
                          Review Publish
                        </button>
                        <button
                          className="admin_secondary_button"
                          disabled={isSaving || !hasDraft}
                          onClick={() => discardContentDraft(contentDoc)}
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
                          onConfirm={confirmPublishContentDoc}
                          title={publishReview.title}
                          typeLabel="site content section"
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
