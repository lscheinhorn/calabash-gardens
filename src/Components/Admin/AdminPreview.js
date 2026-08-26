import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
  faDesktop,
  faExpand,
  faEye,
  faMobileAlt,
  faPencilAlt,
  faQuestionCircle,
  faTabletAlt,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

import ContentAdmin from "./ContentAdmin";
import EventAdmin from "./EventAdmin";
import ProductAdmin from "./ProductAdmin";

const previewViewports = {
  desktop: {
    height: 760,
    icon: faDesktop,
    label: "Desktop",
    width: 1200,
  },
  tablet: {
    height: 820,
    icon: faTabletAlt,
    label: "Tablet",
    width: 768,
  },
  mobile: {
    height: 780,
    icon: faMobileAlt,
    label: "Mobile",
    width: 390,
  },
};

const editableContentIds = new Set([
  "about",
  "banner",
  "experienceBlurb",
  "home",
  "team",
]);

const CollapseIcon = ({ isExpanded }) => (
  <FontAwesomeIcon
    aria-hidden="true"
    className="admin_collapse_icon"
    icon={isExpanded ? faChevronDown : faChevronRight}
  />
);

const previewPathForTab = (tab) => `/admin/preview/${tab}`;
const previewTabForPath = (path) => {
  if (path.startsWith("/admin/preview/shop") || path.startsWith("/admin/preview/products")) {
    return "shop";
  }

  if (path.startsWith("/admin/preview/events")) {
    return "events";
  }

  return "home";
};

export default function AdminPreview({
  db,
  defaultExpanded = false,
  storage = null,
  userId = "",
}) {
  const iframeRef = useRef(null);
  const fullPreviewIframeRef = useRef(null);
  const fullPreviewCloseButtonRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isContentEditMode, setIsContentEditMode] = useState(false);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [isDrawerHelpOpen, setIsDrawerHelpOpen] = useState(false);
  const [isViewportMenuOpen, setIsViewportMenuOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [previewPath, setPreviewPath] = useState(previewPathForTab("home"));
  const [previewTab, setPreviewTab] = useState("home");
  const [previewViewport, setPreviewViewport] = useState("desktop");
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  const postToPreviewFrames = useCallback((message) => {
    if (typeof window !== "undefined") {
      [iframeRef, fullPreviewIframeRef].forEach((previewRef) => {
        if (!previewRef.current?.contentWindow) {
          return;
        }

        previewRef.current.contentWindow.postMessage(message, window.location.origin);
      });
    }
  }, []);

  const refreshPreview = useCallback(() => {
    postToPreviewFrames({
      type: "calabash-admin-refresh-preview-data",
    });
    setPreviewRefreshKey((currentValue) => currentValue + 1);
  }, [postToPreviewFrames]);

  const sendActiveEditTarget = useCallback(() => {
    postToPreviewFrames({
      contentId: editTarget?.type === "content" ? editTarget.id : "",
      fieldPath: editTarget?.type === "content" ? editTarget.fieldPath : "",
      targetId: editTarget?.id || "",
      targetType: editTarget?.type || "",
      type: "calabash-admin-preview-active-edit-target",
    });
  }, [editTarget, postToPreviewFrames]);

  useEffect(() => {
    const handlePreviewMessage = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === "calabash-admin-preview-route") {
        const nextPath = String(event.data.path || "");

        if (nextPath.startsWith("/admin/preview")) {
          setPreviewPath(nextPath);
          setPreviewTab(previewTabForPath(nextPath));
        }

        return;
      }

      if (event.data?.type === "calabash-admin-edit-product") {
        const productId = String(event.data.id || "");

        if (!productId) {
          return;
        }

        setEditTarget({
          id: productId,
          label: String(event.data.label || productId),
          requestId: Date.now(),
          type: "product",
        });
        return;
      }

      if (event.data?.type === "calabash-admin-edit-event") {
        const eventId = String(event.data.id || "");

        if (!eventId) {
          return;
        }

        setEditTarget({
          id: eventId,
          label: String(event.data.label || eventId),
          requestId: Date.now(),
          type: "event",
        });
        return;
      }

      if (event.data?.type !== "calabash-admin-edit-content") {
        return;
      }

      const contentId = String(event.data.contentId || "");

      if (!editableContentIds.has(contentId)) {
        return;
      }

      setEditTarget({
        fieldPath: String(event.data.fieldPath || ""),
        id: contentId,
        label: String(event.data.label || contentId),
        requestId: Date.now(),
        type: "content",
      });
    };

    window.addEventListener("message", handlePreviewMessage);

    return () => {
      window.removeEventListener("message", handlePreviewMessage);
    };
  }, []);

  useEffect(() => {
    if (!isContentEditMode) {
      setEditTarget(null);
    }
  }, [isContentEditMode]);

  useEffect(() => {
    setIsDrawerHelpOpen(false);
  }, [editTarget?.requestId]);

  useEffect(() => {
    sendActiveEditTarget();
  }, [sendActiveEditTarget]);

  useEffect(() => {
    if (!isFullPreviewOpen) {
      return undefined;
    }

    fullPreviewCloseButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsFullPreviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullPreviewOpen]);

  const renderEditDrawer = () => {
    if (!editTarget) {
      return null;
    }

    const title = editTarget.label || editTarget.id;

    return (
      <aside className="admin_preview_edit_drawer" aria-label="Preview edit drawer">
        <div className="admin_form_header">
          <div>
            <h4>{title}</h4>
          </div>
          <div className="admin_button_row">
            <div className="admin_drawer_help">
              <button
                aria-expanded={isDrawerHelpOpen}
                aria-label="Show preview editing notes"
                className="admin_icon_button admin_icon_button_small"
                onClick={() => setIsDrawerHelpOpen((currentValue) => !currentValue)}
                title="Preview editing notes"
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faQuestionCircle} />
              </button>
              {isDrawerHelpOpen ? (
                <p className="admin_drawer_help_popover">
                  Save Draft updates the preview only. Publish makes the saved draft live.
                </p>
              ) : null}
            </div>
            <button
              aria-label="Close preview editor"
              className="admin_icon_button admin_icon_button_small"
              onClick={() => setEditTarget(null)}
              title="Close preview editor"
              type="button"
            >
              <FontAwesomeIcon aria-hidden="true" icon={faTimes} />
            </button>
          </div>
        </div>

        {editTarget.type === "content" ? (
          <ContentAdmin
            db={db}
            focusRequest={{
              contentId: editTarget.id,
              fieldPath: editTarget.fieldPath || "",
              label: editTarget.label || "",
              requestId: editTarget.requestId,
            }}
            onDraftChange={refreshPreview}
            userId={userId}
            variant="drawer"
          />
        ) : null}
        {editTarget.type === "product" ? (
          <ProductAdmin
            db={db}
            focusRequest={{
              productId: editTarget.id,
              requestId: editTarget.requestId,
            }}
            onDraftChange={refreshPreview}
            storage={storage}
            userId={userId}
            variant="drawer"
          />
        ) : null}
        {editTarget.type === "event" ? (
          <EventAdmin
            db={db}
            focusRequest={{
              eventId: editTarget.id,
              requestId: editTarget.requestId,
            }}
            onDraftChange={refreshPreview}
            storage={storage}
            userId={userId}
            variant="drawer"
          />
        ) : null}

      </aside>
    );
  };

  const selectedViewport = previewViewports[previewViewport];
  const previewSrc = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const baseUrl = window.location.href.split("#")[0];
    const queryParams = new URLSearchParams({
      refresh: String(previewRefreshKey),
    });

    if (isContentEditMode) {
      queryParams.set("edit", "content");
    }

    return `${baseUrl}#${previewPath}?${queryParams.toString()}`;
  }, [isContentEditMode, previewPath, previewRefreshKey]);
  const previewWorkspaceClassName = editTarget
    ? "admin_preview_workspace admin_preview_workspace_with_drawer"
    : "admin_preview_workspace";
  const renderPreviewIframe = ({ className = "admin_site_preview_frame", previewRef, title }) => (
    previewSrc ? (
      <iframe
        className={className}
        key={previewSrc}
        onLoad={sendActiveEditTarget}
        ref={previewRef}
        src={previewSrc}
        title={title}
      />
    ) : (
      <p className="admin_status">Preview is unavailable in this environment.</p>
    )
  );

  return (
    <section className="admin_panel">
      <div className="admin_form_header">
        <div>
          <h3>Firestore Site Preview</h3>
          <p className="admin_status">
            Admin-only preview using public components with draft changes over live Firestore data.
          </p>
        </div>
        <div className="admin_button_row">
          <button
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} Firestore site preview`}
            className="admin_icon_button"
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
            title={`${isExpanded ? "Collapse" : "Expand"} Firestore site preview`}
            type="button"
          >
            <CollapseIcon isExpanded={isExpanded} />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          <div className="admin_preview_toolbar" aria-label="Preview controls">
            <div className="admin_preview_control_group">
              <button
                aria-expanded={isViewportMenuOpen}
                aria-label="Choose preview viewport"
                className="admin_icon_button"
                onClick={() => setIsViewportMenuOpen((currentValue) => !currentValue)}
                title="Choose preview viewport"
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faEye} />
              </button>
              {isViewportMenuOpen ? (
                <div className="admin_preview_viewport_menu" aria-label="Preview viewport sizes">
                  {Object.entries(previewViewports).map(([viewportKey, viewport]) => (
                    <button
                      aria-pressed={previewViewport === viewportKey}
                      className={previewViewport === viewportKey ? "admin_icon_button admin_icon_button_active" : "admin_icon_button"}
                      key={viewportKey}
                      onClick={() => {
                        setPreviewViewport(viewportKey);
                        setIsViewportMenuOpen(false);
                      }}
                      title={viewport.label}
                      type="button"
                    >
                      <FontAwesomeIcon aria-hidden="true" icon={viewport.icon} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              aria-pressed={isContentEditMode}
              aria-label={isContentEditMode ? "Turn preview edit mode off" : "Turn preview edit mode on"}
              className={isContentEditMode ? "admin_icon_button admin_icon_button_active" : "admin_icon_button"}
              onClick={() => setIsContentEditMode((currentValue) => !currentValue)}
              title={isContentEditMode ? "Turn preview edit mode off" : "Turn preview edit mode on"}
              type="button"
            >
              <FontAwesomeIcon aria-hidden="true" icon={faPencilAlt} />
            </button>
            <button
              aria-label="Open full preview"
              className="admin_icon_button"
              onClick={() => {
                setIsExpanded(true);
                setIsFullPreviewOpen(true);
              }}
              title="Open full preview"
              type="button"
            >
              <FontAwesomeIcon aria-hidden="true" icon={faExpand} />
            </button>
          </div>

          <div className={previewWorkspaceClassName}>
            <div
              className="admin_site_preview"
              style={{
                "--admin-preview-height": `${selectedViewport.height}px`,
                "--admin-preview-width": `${selectedViewport.width}px`,
              }}
            >
              <div className="admin_site_preview_stage">
                {renderPreviewIframe({
                  previewRef: iframeRef,
                  title: `Firestore ${previewTab} ${selectedViewport.label} preview`,
                })}
              </div>
            </div>
            {!isFullPreviewOpen ? renderEditDrawer() : null}
          </div>

          {isFullPreviewOpen ? (
            <div
              aria-label="Full Firestore site preview"
              aria-modal="true"
              className="admin_full_preview_overlay"
              role="dialog"
            >
              <div className="admin_full_preview_header">
                <div>
                  <h3>Firestore Site Preview</h3>
                  <p className="admin_status">
                    Navigate and edit draft content without leaving the preview.
                  </p>
                </div>
                <div className="admin_button_row">
                  <button
                    aria-pressed={isContentEditMode}
                    aria-label={isContentEditMode ? "Turn full preview edit mode off" : "Turn full preview edit mode on"}
                    className={isContentEditMode ? "admin_icon_button admin_icon_button_active" : "admin_icon_button"}
                    onClick={() => setIsContentEditMode((currentValue) => !currentValue)}
                    title={isContentEditMode ? "Turn full preview edit mode off" : "Turn full preview edit mode on"}
                    type="button"
                  >
                    <FontAwesomeIcon aria-hidden="true" icon={faPencilAlt} />
                  </button>
                  <button
                    aria-label="Close full preview"
                    className="admin_icon_button"
                    onClick={() => setIsFullPreviewOpen(false)}
                    ref={fullPreviewCloseButtonRef}
                    title="Close full preview"
                    type="button"
                  >
                    <FontAwesomeIcon aria-hidden="true" icon={faTimes} />
                  </button>
                </div>
              </div>
              <div className={previewWorkspaceClassName}>
                <div className="admin_full_preview_frame_shell">
                  {renderPreviewIframe({
                    className: "admin_full_preview_frame",
                    previewRef: fullPreviewIframeRef,
                    title: `Full Firestore ${previewTab} preview`,
                  })}
                </div>
                {renderEditDrawer()}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
