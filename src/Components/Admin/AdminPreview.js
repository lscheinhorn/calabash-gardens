import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import About from "../About/About";
import Banner from "../Banner/Banner";
import Events from "../Events/Events";
import Experience from "../Experience/Experience";
import Header from "../Header/Header";
import HighlightedProducts from "../HighlightedProducts/HighlightedProducts";
import Shop from "../Shop/Shop";
import Team from "../Team/Team";
import { loadFirestoreSiteContentForPublic } from "../../data/publicContentAdapter";
import { loadFirestoreEventsForPublic } from "../../data/publicEventAdapter";
import { loadFirestoreProductsForPublic } from "../../data/publicProductAdapter";

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
  const [previewData, setPreviewData] = useState({
    content: null,
    events: [],
    experienceBlurb: [],
    products: [],
  });

  const loadPreview = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const [products, siteContent, events] = await Promise.all([
        loadFirestoreProductsForPublic({ db, storage }),
        loadFirestoreSiteContentForPublic({ db }),
        loadFirestoreEventsForPublic({ db, storage }),
      ]);

      setPreviewData({
        content: siteContent.content,
        events,
        experienceBlurb: siteContent.experienceBlurb,
        products,
      });
      setMessage("Preview loaded from published Firestore content.");
    } catch (error) {
      setMessage("Preview could not be loaded from Firestore.");
    } finally {
      setIsLoading(false);
    }
  }, [db, storage]);

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
  const homeContent = previewData.content?.home;

  const renderPreviewTab = () => {
    if (!homeContent) {
      return <p className="admin_status">Load the preview to view Firestore-rendered pages.</p>;
    }

    if (previewTab === "shop") {
      return <Shop productsOverride={previewData.products} />;
    }

    if (previewTab === "events") {
      return (
        <Events
          eventsOverride={previewData.events}
          experienceBlurbOverride={previewData.experienceBlurb}
        />
      );
    }

    return (
      <div className="main">
        <Header headerContent={homeContent.header} showNav={false} />
        <Banner bannerContent={homeContent.banner} />
        <HighlightedProducts productsOverride={highlightedProducts} />
        <Experience />
        <About aboutContent={homeContent.about} />
        <Team teamContent={homeContent.team} />
      </div>
    );
  };

  return (
    <section className="admin_panel">
      <div className="admin_form_header">
        <div>
          <h3>Firestore Site Preview</h3>
          <p className="admin_status">
            Admin-only preview using the public components with published Firestore data.
          </p>
        </div>
        <div className="admin_button_row">
          <button
            className="admin_secondary_button"
            disabled={isLoading || !isExpanded}
            onClick={loadPreview}
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
          </div>

          <div className="admin_site_preview">
            {renderPreviewTab()}
          </div>
        </>
      ) : null}
    </section>
  );
}
