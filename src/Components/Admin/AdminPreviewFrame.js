import "./Admin.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import About from "../About/About";
import Banner from "../Banner/Banner";
import Events from "../Events/Events";
import Experience from "../Experience/Experience";
import Footer from "../Footer/Footer";
import Header from "../Header/Header";
import HighlightedProducts from "../HighlightedProducts/HighlightedProducts";
import Media from "../Media/Media";
import Parallax from "../Parallax/Parallax";
import ProductPage from "../ProductPage/ProductPage";
import Shop from "../Shop/Shop";
import Team from "../Team/Team";
import { db, isFirebaseConfigured, storage } from "../../firebase-config";
import { loadAdminDrafts } from "../../data/adminDrafts";
import { loadFirestoreSiteContentForPublic } from "../../data/publicContentAdapter";
import { loadFirestoreEventsForPublic } from "../../data/publicEventAdapter";
import { loadFirestoreProductsForPublic } from "../../data/publicProductAdapter";

const previewTabs = ["home", "shop", "events", "contact", "cart"];

const previewRouteForPublicPath = (publicPath) => {
  if (!publicPath || publicPath === "/") {
    return "/admin/preview/home";
  }

  if (publicPath === "/shop") {
    return "/admin/preview/shop";
  }

  if (publicPath === "/events") {
    return "/admin/preview/events";
  }

  if (publicPath === "/contact" || publicPath.endsWith("/contact")) {
    return "/admin/preview/contact";
  }

  if (publicPath === "/cart") {
    return "/admin/preview/cart";
  }

  if (publicPath.startsWith("/products/")) {
    return publicPath.replace("/products/", "/admin/preview/products/");
  }

  if (publicPath.startsWith("/admin/preview")) {
    return publicPath;
  }

  return "/admin/preview/home";
};

const EditablePreviewText = ({
  children,
  contentId,
  fieldPath,
  label,
  onEdit,
}) => {
  const requestEdit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onEdit({ contentId, fieldPath, label });
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    requestEdit(event);
  };

  return (
    <span
      className="admin_preview_edit_marker"
      onClick={requestEdit}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      title={`Edit ${label}`}
    >
      {children}
      <span aria-hidden="true" className="admin_preview_edit_badge">
        Edit
      </span>
    </span>
  );
};

export default function AdminPreviewFrame() {
  const { previewTab, productKey } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = productKey
    ? "product"
    : previewTabs.includes(previewTab)
      ? previewTab
      : "home";
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [previewData, setPreviewData] = useState({
    content: null,
    events: [],
    experienceBlurb: [],
    products: [],
  });
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isContentEditMode = queryParams.get("edit") === "content";

  const loadPreview = useCallback(async () => {
    if (!isFirebaseConfigured || !db || !storage) {
      setMessage("Firebase is not configured for this preview.");
      setIsLoading(false);
      return;
    }

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
    } catch (error) {
      setMessage("Preview could not be loaded from Firestore.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview, location.search]);

  useEffect(() => {
    const handlePreviewLinkClick = (event) => {
      const clickedElement = event.target instanceof Element ? event.target : null;
      const anchor = clickedElement?.closest("a[href]");

      if (!anchor) {
        return;
      }

      const linkUrl = new URL(anchor.href);

      if (linkUrl.origin !== window.location.origin) {
        return;
      }

      if (!linkUrl.hash.startsWith("#/")) {
        return;
      }

      const publicPath = linkUrl.hash.replace(/^#/, "");
      const previewRoute = previewRouteForPublicPath(publicPath);
      const nextPreviewRoute = isContentEditMode
        ? `${previewRoute}?edit=content`
        : previewRoute;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      navigate(nextPreviewRoute);
    };

    document.addEventListener("click", handlePreviewLinkClick, true);

    return () => {
      document.removeEventListener("click", handlePreviewLinkClick, true);
    };
  }, [isContentEditMode, navigate]);

  const requestContentEdit = useCallback((request) => {
    const message = {
      type: "calabash-admin-edit-content",
      contentId: request.contentId,
      fieldPath: request.fieldPath,
      label: request.label,
    };

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, window.location.origin);
      return;
    }

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(message, window.location.origin);
      window.opener.focus();
      return;
    }

    const adminQueryParams = new URLSearchParams({
      editContent: request.contentId,
    });

    if (request.fieldPath) {
      adminQueryParams.set("fieldPath", request.fieldPath);
    }

    if (request.label) {
      adminQueryParams.set("label", request.label);
    }

    navigate(`/admin?${adminQueryParams.toString()}`);
  }, [navigate]);

  const createContentRenderer = useCallback((contentId) => (
    (fieldPath, label, children) => (
      isContentEditMode ? (
        <EditablePreviewText
          contentId={contentId}
          fieldPath={fieldPath}
          label={label}
          onEdit={requestContentEdit}
        >
          {children}
        </EditablePreviewText>
      ) : children
    )
  ), [isContentEditMode, requestContentEdit]);

  const activeProducts = useMemo(() => (
    previewData.products.filter((product) => product.isActive === true)
  ), [previewData.products]);
  const highlightedProducts = useMemo(() => (
    activeProducts.filter((product) => product.isHighlighted === true)
  ), [activeProducts]);
  const previewProduct = useMemo(() => (
    previewData.products.find((product) => product.key === productKey) || null
  ), [previewData.products, productKey]);
  const homeContent = previewData.content?.home;
  const renderHeaderContent = useMemo(() => createContentRenderer("home"), [createContentRenderer]);
  const renderBannerContent = useMemo(() => createContentRenderer("banner"), [createContentRenderer]);
  const renderAboutContent = useMemo(() => createContentRenderer("about"), [createContentRenderer]);
  const renderTeamContent = useMemo(() => createContentRenderer("team"), [createContentRenderer]);
  const renderExperienceBlurbContent = useMemo(() => createContentRenderer("experienceBlurb"), [createContentRenderer]);

  const renderPreviewPage = () => {
    if (activeTab === "product") {
      return previewProduct ? (
        <ProductPage
          continueShoppingTo="/admin/preview/shop"
          productOverride={previewProduct}
        />
      ) : (
        <main className="admin_preview_frame_status">
          <p>This product is not available in the Firestore preview.</p>
        </main>
      );
    }

    if (activeTab === "shop") {
      return <Shop productsOverride={previewData.products} />;
    }

    if (activeTab === "events") {
      return (
        <Events
          eventsOverride={previewData.events}
          experienceBlurbOverride={previewData.experienceBlurb}
          renderExperienceBlurbContent={renderExperienceBlurbContent}
        />
      );
    }

    if (activeTab === "contact" || activeTab === "cart") {
      return (
        <main className="admin_preview_frame_status">
          <p>
            {activeTab === "contact" ? "Contact" : "Cart"} preview is not connected to
            Firestore content yet.
          </p>
        </main>
      );
    }

    return (
      <div className="main">
        <Banner
          bannerContent={homeContent?.banner}
          renderEditableContent={renderBannerContent}
        />
        <div>
          <HighlightedProducts productsOverride={highlightedProducts} />
          <Experience />
          <Media />
          <Parallax />
          <About
            aboutContent={homeContent?.about}
            renderEditableContent={renderAboutContent}
          />
          <Team
            renderEditableContent={renderTeamContent}
            teamContent={homeContent?.team}
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <main className="admin_preview_frame_status">
        <p>Loading Firestore preview...</p>
      </main>
    );
  }

  if (message) {
    return (
      <main className="admin_preview_frame_status">
        <p>{message}</p>
      </main>
    );
  }

  return (
    <div className="admin_preview_frame_site">
      <Header
        headerContent={homeContent?.header}
        renderEditableContent={renderHeaderContent}
      />
      {renderPreviewPage()}
      <Footer
        footerContent={homeContent?.header}
        renderEditableContent={renderHeaderContent}
      />
    </div>
  );
}
