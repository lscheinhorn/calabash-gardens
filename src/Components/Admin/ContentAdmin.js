import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import { buildContentSeed } from "../../data/adminContentSeed";

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

export default function ContentAdmin({ db }) {
  const [contentDocs, setContentDocs] = useState([]);
  const [expandedDocId, setExpandedDocId] = useState("");
  const [formsById, setFormsById] = useState({});
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
      const snapshot = await getDocs(collection(db, "siteContent"));
      const docs = snapshot.docs
        .map((contentDoc) => ({
          id: contentDoc.id,
          ...contentDoc.data(),
        }))
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

  const saveContentDoc = async (contentDoc) => {
    if (!expectedContentIds.has(contentDoc.id)) {
      setMessage("This site content document is not part of the approved editor set.");
      return;
    }

    const form = formsById[contentDoc.id];

    if (!form) {
      setMessage("Open a content section before saving.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await setDoc(doc(db, "siteContent", contentDoc.id), {
        published: form.published,
        sections: unflattenSections(form.flatSections),
        sortOrder: form.sortOrder,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setMessage(`${expectedMeta.get(contentDoc.id)?.title || contentDoc.id} saved to Firestore.`);
      await loadContentDocs();
    } catch (error) {
      setMessage("Site content could not be saved.");
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
            Edits Firestore site content only. Public pages still use static copy.
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

                      <button
                        className="admin_primary_button"
                        disabled={isSaving}
                        onClick={() => saveContentDoc(contentDoc)}
                        type="button"
                      >
                        {isSaving ? "Saving..." : "Save Content"}
                      </button>
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
