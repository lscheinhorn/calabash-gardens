import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import { activeAdminDrafts, loadAdminDrafts } from "../../data/adminDrafts";
import { loadFirestoreSiteContentForPublic } from "../../data/publicContentAdapter";
import { loadFirestoreEventsForPublic } from "../../data/publicEventAdapter";
import { loadFirestoreProductsForPublic } from "../../data/publicProductAdapter";

const previewViewports = {
  desktop: {
    height: 760,
    label: "Desktop",
    width: 1200,
  },
  tablet: {
    height: 820,
    label: "Tablet",
    width: 768,
  },
  mobile: {
    height: 780,
    label: "Mobile",
    width: 390,
  },
};

const CollapseIcon = ({ isExpanded }) => (
  <FontAwesomeIcon
    aria-hidden="true"
    className="admin_collapse_icon"
    icon={isExpanded ? faChevronDown : faChevronRight}
  />
);

export default function AdminPreview({ db, storage }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewTab, setPreviewTab] = useState("home");
  const [previewViewport, setPreviewViewport] = useState("desktop");
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [previewData, setPreviewData] = useState({
    content: null,
    events: [],
    experienceBlurb: [],
    products: [],
  });
  const [draftCount, setDraftCount] = useState(0);

  const loadPreview = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const drafts = await loadAdminDrafts({ db });
      const [products, siteContent, events] = await Promise.all([
        loadFirestoreProductsForPublic({ db, drafts, storage }),
        loadFirestoreSiteContentForPublic({ db, drafts }),
        loadFirestoreEventsForPublic({ db, drafts, storage }),
      ]);

      setPreviewData({
        content: siteContent.content,
        events,
        experienceBlurb: siteContent.experienceBlurb,
        products,
      });
      setDraftCount(activeAdminDrafts(drafts).length);
      setMessage("Preview loaded with draft changes over live Firestore content.");
    } catch (error) {
      setMessage("Preview could not be loaded from Firestore.");
    } finally {
      setIsLoading(false);
    }
  }, [db, storage]);

  const refreshPreview = useCallback(() => {
    setPreviewRefreshKey((currentValue) => currentValue + 1);
    loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    if (isExpanded) {
      loadPreview();
    }
  }, [isExpanded, loadPreview]);

  const activeProducts = useMemo(() => (
    previewData.products.filter((product) => product.isActive === true)
  ), [previewData.products]);
  const highlightedProducts = useMemo(() => (
    activeProducts.filter((product) => product.isHighlighted === true)
  ), [activeProducts]);
  const selectedViewport = previewViewports[previewViewport];
  const previewSrc = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const baseUrl = window.location.href.split("#")[0];
    return `${baseUrl}#/admin/preview/${previewTab}?refresh=${previewRefreshKey}`;
  }, [previewRefreshKey, previewTab]);

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
            className="admin_secondary_button"
            disabled={isLoading || !isExpanded}
            onClick={refreshPreview}
            type="button"
          >
            Refresh Preview
          </button>
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
          {message ? <p className="admin_message">{message}</p> : null}
          {isLoading ? <p className="admin_status">Loading Firestore preview...</p> : null}

          <div className="admin_preview_tabs" aria-label="Preview sections">
            {["home", "shop", "events"].map((tab) => (
              <button
                className={previewTab === tab ? "admin_primary_button" : "admin_secondary_button"}
                key={tab}
                onClick={() => setPreviewTab(tab)}
                type="button"
              >
                {tab === "home" ? "Home" : tab === "shop" ? "Shop" : "Events"}
              </button>
            ))}
          </div>

          <div className="admin_preview_viewports" aria-label="Preview viewport sizes">
            {Object.entries(previewViewports).map(([viewportKey, viewport]) => (
              <button
                className={previewViewport === viewportKey ? "admin_primary_button" : "admin_secondary_button"}
                key={viewportKey}
                onClick={() => setPreviewViewport(viewportKey)}
                type="button"
              >
                {viewport.label}
              </button>
            ))}
          </div>

          <div className="admin_audit_summary" aria-label="Preview data summary">
            <div>
              <span>Products</span>
              <strong>{activeProducts.length}</strong>
            </div>
            <div>
              <span>Highlighted</span>
              <strong>{highlightedProducts.length}</strong>
            </div>
            <div>
              <span>Events</span>
              <strong>{previewData.events.filter((event) => event.isActive).length}</strong>
            </div>
            <div>
              <span>Blurb Paragraphs</span>
              <strong>{previewData.experienceBlurb.length}</strong>
            </div>
            <div>
              <span>Drafts</span>
              <strong>{draftCount}</strong>
            </div>
          </div>

          <div
            className="admin_site_preview"
            style={{
              "--admin-preview-height": `${selectedViewport.height}px`,
              "--admin-preview-width": `${selectedViewport.width}px`,
            }}
          >
            <div className="admin_site_preview_toolbar">
              <span>
                {selectedViewport.label}: {selectedViewport.width}px
              </span>
              <a
                className="admin_secondary_button"
                href={previewSrc}
                rel="noreferrer"
                target="_blank"
              >
                Open Full Preview
              </a>
            </div>
            <div className="admin_site_preview_stage">
              {previewSrc ? (
                <iframe
                  className="admin_site_preview_frame"
                  key={previewSrc}
                  src={previewSrc}
                  title={`Firestore ${previewTab} ${selectedViewport.label} preview`}
                />
              ) : (
                <p className="admin_status">Preview is unavailable in this environment.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
