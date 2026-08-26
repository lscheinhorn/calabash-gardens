import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
  faPlus,
  faTrash,
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
    if (key === "contentBlocks") {
      return;
    }

    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenSections(value[key], nextPrefix, output);
  });

  return output;
};

const contentBlockTypeLabels = {
  paragraph: "Paragraph",
  subtitle: "Subtitle",
  title: "Title",
};

const contentBlockTypes = Object.keys(contentBlockTypeLabels);
const emptyNewBlockForm = () => ({ text: "", type: "paragraph" });

const createContentBlockId = () => (
  `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
);

const contentBlockPathForDoc = (contentId) => (
  contentId === "home" ? ["header", "contentBlocks"] : ["contentBlocks"]
);

const getNestedValue = (value, pathParts) => (
  pathParts.reduce((currentValue, pathPart) => (
    currentValue && typeof currentValue === "object" ? currentValue[pathPart] : undefined
  ), value)
);

const setNestedValue = (value, pathParts, nestedValue) => {
  const nextValue = { ...(value || {}) };
  let target = nextValue;

  pathParts.slice(0, -1).forEach((pathPart) => {
    if (!target[pathPart] || typeof target[pathPart] !== "object" || Array.isArray(target[pathPart])) {
      target[pathPart] = {};
    }

    target = target[pathPart];
  });

  const finalPart = pathParts[pathParts.length - 1];

  if (nestedValue && Object.keys(nestedValue).length) {
    target[finalPart] = nestedValue;
  } else {
    delete target[finalPart];
  }

  return nextValue;
};

const normalizeContentBlocks = (sections, contentId) => {
  const rawBlocks = getNestedValue(sections, contentBlockPathForDoc(contentId));

  if (!rawBlocks || typeof rawBlocks !== "object") {
    return [];
  }

  const entries = Array.isArray(rawBlocks)
    ? rawBlocks.map((block, index) => [block?.id || `block_${index + 1}`, block])
    : Object.entries(rawBlocks);

  return entries
    .map(([id, block], index) => ({
      id,
      sortOrder: Number.isFinite(block?.sortOrder) ? block.sortOrder : index,
      text: String(block?.text || ""),
      type: contentBlockTypeLabels[block?.type] ? block.type : "paragraph",
    }))
    .sort((firstBlock, secondBlock) => (
      firstBlock.sortOrder - secondBlock.sortOrder || firstBlock.id.localeCompare(secondBlock.id)
    ));
};

const serializeContentBlocks = (blocks) => Object.fromEntries(
  (Array.isArray(blocks) ? blocks : [])
    .map((block, index) => [
      block.id || `block_${index + 1}`,
      {
        sortOrder: index,
        text: String(block.text || ""),
        type: contentBlockTypeLabels[block.type] ? block.type : "paragraph",
      },
    ])
);

const parseContentBlockFieldPath = (fieldPath = "") => {
  const pathParts = fieldPath.split(".");
  const contentBlocksIndex = pathParts.indexOf("contentBlocks");

  if (contentBlocksIndex === -1 || pathParts[contentBlocksIndex + 2] !== "text") {
    return null;
  }

  return {
    blockId: pathParts[contentBlocksIndex + 1],
  };
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

const fieldRefKey = (contentId, path) => `${contentId}:${path}`;

const fieldLabelForRequest = (request) => (
  request?.label || (request?.fieldPath ? titleForPath(request.fieldPath) : "Selected content")
);

export default function ContentAdmin({
  db,
  defaultExpanded = false,
  focusRequest = null,
  onDraftChange = () => {},
  userId = "",
  variant = "full",
}) {
  const isDrawerMode = variant === "drawer";
  const [contentDocs, setContentDocs] = useState([]);
  const [draftsById, setDraftsById] = useState({});
  const [expandedDocId, setExpandedDocId] = useState("");
  const [formsById, setFormsById] = useState({});
  const [newBlockFormsById, setNewBlockFormsById] = useState({});
  const [liveContentById, setLiveContentById] = useState({});
  const [publishReview, setPublishReview] = useState(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fieldRefs = useRef({});
  const sectionRef = useRef(null);

  const expectedMeta = useMemo(buildExpectedMeta, []);
  const expectedContentIds = useMemo(() => new Set(expectedMeta.keys()), [expectedMeta]);
  const buildFocusMessage = useCallback((request) => {
    const sectionTitle = expectedMeta.get(request.contentId)?.title || request.contentId;
    const fieldTitle = request.label || (request.fieldPath ? titleForPath(request.fieldPath) : "");

    return `Opened ${sectionTitle}${fieldTitle ? ` / ${fieldTitle}` : ""} from preview. Save Draft keeps changes out of the live site.`;
  }, [expectedMeta]);

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
        contentBlocks: normalizeContentBlocks(contentDoc.sections, contentDoc.id),
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
    if (isExpanded || isDrawerMode) {
      loadContentDocs();
    }
  }, [isDrawerMode, isExpanded, loadContentDocs]);

  useEffect(() => {
    if (!focusRequest?.contentId) {
      return;
    }

    setIsExpanded(true);
    setExpandedDocId(focusRequest.contentId);
    setPublishReview(null);
    setMessage(buildFocusMessage(focusRequest));
  }, [buildFocusMessage, focusRequest]);

  useEffect(() => {
    if (!focusRequest?.contentId || !isExpanded || expandedDocId !== focusRequest.contentId) {
      return undefined;
    }

    setMessage(buildFocusMessage(focusRequest));

    const animationFrame = window.requestAnimationFrame(() => {
      const focusedField = focusRequest.fieldPath
        ? fieldRefs.current[fieldRefKey(focusRequest.contentId, focusRequest.fieldPath)]
        : null;
      const targetElement = focusedField || sectionRef.current;

      if (!targetElement) {
        return;
      }

      if (!isDrawerMode) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      if (focusedField && typeof focusedField.focus === "function") {
        focusedField.focus({
          preventScroll: true,
        });
      }
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [buildFocusMessage, expandedDocId, focusRequest, formsById, isDrawerMode, isExpanded]);

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

  const updateContentBlock = (contentId, blockId, field, value) => {
    setFormsById((currentForms) => {
      const currentForm = currentForms[contentId];

      if (!currentForm) {
        return currentForms;
      }

      return {
        ...currentForms,
        [contentId]: {
          ...currentForm,
          contentBlocks: (currentForm.contentBlocks || []).map((block) => (
            block.id === blockId ? { ...block, [field]: value } : block
          )),
        },
      };
    });
  };

  const removeContentBlock = (contentId, blockId) => {
    setFormsById((currentForms) => {
      const currentForm = currentForms[contentId];

      if (!currentForm) {
        return currentForms;
      }

      return {
        ...currentForms,
        [contentId]: {
          ...currentForm,
          contentBlocks: (currentForm.contentBlocks || []).filter((block) => block.id !== blockId),
        },
      };
    });
  };

  const toggleNewContentBlockForm = (contentId) => {
    setNewBlockFormsById((currentForms) => {
      if (currentForms[contentId]) {
        const nextForms = { ...currentForms };
        delete nextForms[contentId];
        return nextForms;
      }

      return {
        ...currentForms,
        [contentId]: emptyNewBlockForm(),
      };
    });
  };

  const updateNewContentBlockForm = (contentId, field, value) => {
    setNewBlockFormsById((currentForms) => ({
      ...currentForms,
      [contentId]: {
        ...(currentForms[contentId] || emptyNewBlockForm()),
        [field]: value,
      },
    }));
  };

  const addContentBlock = (contentId) => {
    const newBlockForm = newBlockFormsById[contentId] || emptyNewBlockForm();
    const text = String(newBlockForm.text || "").trim();

    if (!text) {
      setMessage("Add text before adding a content block.");
      return;
    }

    setFormsById((currentForms) => {
      const currentForm = currentForms[contentId];

      if (!currentForm) {
        return currentForms;
      }

      return {
        ...currentForms,
        [contentId]: {
          ...currentForm,
          contentBlocks: [
            ...(currentForm.contentBlocks || []),
            {
              id: createContentBlockId(),
              sortOrder: currentForm.contentBlocks?.length || 0,
              text,
              type: contentBlockTypeLabels[newBlockForm.type] ? newBlockForm.type : "paragraph",
            },
          ],
        },
      };
    });

    setNewBlockFormsById((currentForms) => {
      const nextForms = { ...currentForms };
      delete nextForms[contentId];
      return nextForms;
    });
    setMessage("Content block added. Save Draft to preview it.");
  };

  const updateFocusedContentValue = (contentId, fieldPath, value) => {
    const parsedBlockPath = parseContentBlockFieldPath(fieldPath);

    if (parsedBlockPath) {
      updateContentBlock(contentId, parsedBlockPath.blockId, "text", value);
      return;
    }

    updateField(contentId, fieldPath, value);
  };

  const buildContentPayload = (contentDoc) => {
    if (!expectedContentIds.has(contentDoc.id)) {
      return null;
    }

    const form = formsById[contentDoc.id];

    if (!form) {
      return null;
    }

    const serializedBlocks = serializeContentBlocks(form.contentBlocks);
    const sections = setNestedValue(
      unflattenSections(form.flatSections),
      contentBlockPathForDoc(contentDoc.id),
      serializedBlocks
    );

    return {
      published: form.published,
      sections,
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
      onDraftChange();
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
      onDraftChange();
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
      onDraftChange();
    } catch (error) {
      setMessage("Site content draft could not be discarded.");
    } finally {
      setIsSaving(false);
    }
  };

  const publishSavedContentDraft = async (contentDoc) => {
    const draft = draftsById[contentDoc.id];
    const title = expectedMeta.get(contentDoc.id)?.title || contentDoc.id;

    if (!draft?.data) {
      setMessage("Save a draft before publishing.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await publishAdminDraft({
        data: draft.data,
        db,
        targetCollection: "siteContent",
        targetId: contentDoc.id,
        userId,
      });

      setMessage(`${title} published to live Firestore content.`);
      setPublishReview(null);
      await loadContentDocs();
      onDraftChange();
    } catch (error) {
      setMessage("Site content could not be published.");
    } finally {
      setIsSaving(false);
    }
  };

  const visibleContentDocs = isDrawerMode && focusRequest?.contentId
    ? contentDocs.filter((contentDoc) => contentDoc.id === focusRequest.contentId)
    : contentDocs;
  const showEditorBody = isExpanded || isDrawerMode;

  if (isDrawerMode && focusRequest?.fieldPath) {
    const contentDoc = visibleContentDocs[0] || null;
    const form = contentDoc ? formsById[contentDoc.id] : null;
    const selectedBlockPath = parseContentBlockFieldPath(focusRequest.fieldPath);
    const selectedBlock = selectedBlockPath
      ? (form?.contentBlocks || []).find((block) => block.id === selectedBlockPath.blockId) || null
      : null;
    const selectedValue = selectedBlock
      ? String(selectedBlock.text || "")
      : String(form?.flatSections?.[focusRequest.fieldPath] ?? "");
    const selectedLabel = fieldLabelForRequest(focusRequest);
    const hasDraft = Boolean(contentDoc && draftsById[contentDoc.id]);

    return (
      <section className="admin_drawer_editor_inner" ref={sectionRef}>
        {isLoading ? <p className="admin_status">Loading selected content...</p> : null}
        {!isLoading && !contentDoc ? (
          <p className="admin_status">The selected content field was not found.</p>
        ) : null}

        {contentDoc && form ? (
          <div className="admin_focused_preview_editor">
            <label className="admin_focused_field">
              {selectedLabel}
              {shouldUseTextarea(focusRequest.fieldPath, selectedValue) ? (
                <textarea
                  disabled={isSaving}
                  onChange={(event) => updateFocusedContentValue(contentDoc.id, focusRequest.fieldPath, event.target.value)}
                  ref={(field) => {
                    if (field) {
                      fieldRefs.current[fieldRefKey(contentDoc.id, focusRequest.fieldPath)] = field;
                      return;
                    }

                    delete fieldRefs.current[fieldRefKey(contentDoc.id, focusRequest.fieldPath)];
                  }}
                  rows={6}
                  value={selectedValue}
                />
              ) : (
                <input
                  disabled={isSaving}
                  onChange={(event) => updateFocusedContentValue(contentDoc.id, focusRequest.fieldPath, event.target.value)}
                  ref={(field) => {
                    if (field) {
                      fieldRefs.current[fieldRefKey(contentDoc.id, focusRequest.fieldPath)] = field;
                      return;
                    }

                    delete fieldRefs.current[fieldRefKey(contentDoc.id, focusRequest.fieldPath)];
                  }}
                  value={selectedValue}
                />
              )}
            </label>

            {selectedBlock ? (
              <div className="admin_content_block_tools">
                <label>
                  Block type
                  <select
                    disabled={isSaving}
                    onChange={(event) => updateContentBlock(contentDoc.id, selectedBlock.id, "type", event.target.value)}
                    value={selectedBlock.type}
                  >
                    {contentBlockTypes.map((blockType) => (
                      <option key={blockType} value={blockType}>{contentBlockTypeLabels[blockType]}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="admin_danger_button"
                  disabled={isSaving}
                  onClick={() => removeContentBlock(contentDoc.id, selectedBlock.id)}
                  type="button"
                >
                  <FontAwesomeIcon aria-hidden="true" icon={faTrash} />
                  Remove section
                </button>
              </div>
            ) : null}

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
                onClick={() => publishSavedContentDraft(contentDoc)}
                type="button"
              >
                {isSaving ? "Publishing..." : "Publish"}
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
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className={isDrawerMode ? "admin_drawer_editor_inner" : "admin_panel"} ref={sectionRef}>
      <div className="admin_form_header">
        <div>
          {isDrawerMode ? <h4>Site Content Editor</h4> : <h3>Site Content Editor</h3>}
          <p className="admin_status">
            Saves site content edits as drafts first. Publish Changes updates live Firestore content.
          </p>
        </div>
        <div className="admin_button_row">
          <button
            className="admin_secondary_button"
            disabled={isLoading || isSaving || !showEditorBody}
            onClick={loadContentDocs}
            type="button"
          >
            Refresh
          </button>
          {!isDrawerMode ? (
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
          ) : null}
        </div>
      </div>

      {showEditorBody ? (
        <>
          {message ? <p className="admin_message">{message}</p> : null}
          {isLoading ? <p className="admin_status">Loading site content...</p> : null}
          {!isLoading && !visibleContentDocs.length ? (
            <p className="admin_status">
              {isDrawerMode ? "The selected content section was not found." : "No Firestore site content found. Seed missing content first."}
            </p>
          ) : null}

          <div className="admin_content_list">
            {visibleContentDocs.map((contentDoc) => {
              const isDocExpanded = expandedDocId === contentDoc.id;
              const form = formsById[contentDoc.id];
              const fields = Object.entries(form?.flatSections || {});
              const title = expectedMeta.get(contentDoc.id)?.title || contentDoc.id;
              const hasDraft = Boolean(draftsById[contentDoc.id]);
              const isPublishReviewOpen = publishReview?.id === contentDoc.id;
              const contentBlocks = form?.contentBlocks || [];
              const newBlockForm = newBlockFormsById[contentDoc.id] || null;

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

                      {fields.map(([path, value]) => {
                        const isFocusedField = focusRequest?.contentId === contentDoc.id
                          && focusRequest?.fieldPath === path;

                        return (
                        <label
                          className={isFocusedField ? "admin_focused_field" : undefined}
                          key={path}
                        >
                          {titleForPath(path)}
                          {shouldUseTextarea(path, value) ? (
                            <textarea
                              disabled={isSaving}
                              onChange={(event) => updateField(contentDoc.id, path, event.target.value)}
                              ref={(field) => {
                                if (field) {
                                  fieldRefs.current[fieldRefKey(contentDoc.id, path)] = field;
                                  return;
                                }

                                delete fieldRefs.current[fieldRefKey(contentDoc.id, path)];
                              }}
                              rows={4}
                              value={value}
                            />
                          ) : (
                            <input
                              disabled={isSaving}
                              onChange={(event) => updateField(contentDoc.id, path, event.target.value)}
                              ref={(field) => {
                                if (field) {
                                  fieldRefs.current[fieldRefKey(contentDoc.id, path)] = field;
                                  return;
                                }

                                delete fieldRefs.current[fieldRefKey(contentDoc.id, path)];
                              }}
                              value={value}
                            />
                          )}
                        </label>
                      );
                      })}

                      <div className="admin_content_blocks_editor">
                        <div className="admin_description_blocks_header admin_form_header">
                          <div>
                            <h4>Added content sections</h4>
                            <p className="admin_status admin_inline_status">
                              Optional title, subtitle, or paragraph sections that render after the current content.
                            </p>
                          </div>
                          <button
                            className="admin_icon_button"
                            disabled={isSaving}
                            onClick={() => toggleNewContentBlockForm(contentDoc.id)}
                            title={newBlockForm ? "Cancel adding content" : "Add content section"}
                            type="button"
                          >
                            <FontAwesomeIcon aria-hidden="true" icon={faPlus} />
                          </button>
                        </div>

                        {newBlockForm ? (
                          <div className="admin_content_block_card">
                            <label>
                              Section type
                              <select
                                disabled={isSaving}
                                onChange={(event) => updateNewContentBlockForm(contentDoc.id, "type", event.target.value)}
                                value={newBlockForm.type}
                              >
                                {contentBlockTypes.map((blockType) => (
                                  <option key={blockType} value={blockType}>{contentBlockTypeLabels[blockType]}</option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Text
                              <textarea
                                disabled={isSaving}
                                onChange={(event) => updateNewContentBlockForm(contentDoc.id, "text", event.target.value)}
                                rows={4}
                                value={newBlockForm.text}
                              />
                            </label>
                            <div className="admin_button_row">
                              <button
                                className="admin_primary_button"
                                disabled={isSaving}
                                onClick={() => addContentBlock(contentDoc.id)}
                                type="button"
                              >
                                Add Section
                              </button>
                              <button
                                className="admin_secondary_button"
                                disabled={isSaving}
                                onClick={() => toggleNewContentBlockForm(contentDoc.id)}
                                type="button"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {contentBlocks.length ? (
                          <div className="admin_content_block_list">
                            {contentBlocks.map((block, index) => {
                              const blockFieldPath = `${contentBlockPathForDoc(contentDoc.id).join(".")}.${block.id}.text`;
                              const isFocusedBlock = focusRequest?.contentId === contentDoc.id
                                && focusRequest?.fieldPath === blockFieldPath;

                              return (
                                <div
                                  className={isFocusedBlock ? "admin_content_block_card admin_focused_field" : "admin_content_block_card"}
                                  key={block.id}
                                >
                                  <div className="admin_content_block_card_header">
                                    <strong>Section {index + 1}</strong>
                                    <button
                                      aria-label={`Remove section ${index + 1}`}
                                      className="admin_icon_button"
                                      disabled={isSaving}
                                      onClick={() => removeContentBlock(contentDoc.id, block.id)}
                                      title="Remove section"
                                      type="button"
                                    >
                                      <FontAwesomeIcon aria-hidden="true" icon={faTrash} />
                                    </button>
                                  </div>
                                  <label>
                                    Section type
                                    <select
                                      disabled={isSaving}
                                      onChange={(event) => updateContentBlock(contentDoc.id, block.id, "type", event.target.value)}
                                      value={block.type}
                                    >
                                      {contentBlockTypes.map((blockType) => (
                                        <option key={blockType} value={blockType}>{contentBlockTypeLabels[blockType]}</option>
                                      ))}
                                    </select>
                                  </label>
                                  <label>
                                    Text
                                    <textarea
                                      disabled={isSaving}
                                      onChange={(event) => updateContentBlock(contentDoc.id, block.id, "text", event.target.value)}
                                      ref={(field) => {
                                        if (field) {
                                          fieldRefs.current[fieldRefKey(contentDoc.id, blockFieldPath)] = field;
                                          return;
                                        }

                                        delete fieldRefs.current[fieldRefKey(contentDoc.id, blockFieldPath)];
                                      }}
                                      rows={4}
                                      value={block.text}
                                    />
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="admin_status admin_inline_status">No added content sections yet.</p>
                        )}
                      </div>

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
