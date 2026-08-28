import "./Admin.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import About from "../About/About";
import Banner from "../Banner/Banner";
import Contact from "../Contact/Contact";
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

const contentRootForId = (content, contentId) => {
  if (contentId === "home") {
    return content?.home;
  }

  if (contentId === "banner") {
    return content?.home?.banner;
  }

  if (contentId === "offerings") {
    return content?.home?.offerings;
  }

  if (contentId === "about") {
    return content?.home?.about;
  }

  if (contentId === "team") {
    return content?.home?.team;
  }

  return null;
};

const getNestedContentValue = (value, fieldPath) => {
  if (!value || !fieldPath) {
    return "";
  }

  return fieldPath.split(".").reduce((currentValue, pathPart) => (
    currentValue && typeof currentValue === "object" ? currentValue[pathPart] : ""
  ), value);
};

const getPreviewContentValue = ({ content, contentId, experienceBlurb, experienceBlurbBlocks, fieldPath }) => {
  if (contentId === "experienceBlurb") {
    if (fieldPath?.startsWith("contentBlocks.")) {
      return getNestedContentValue({ contentBlocks: experienceBlurbBlocks }, fieldPath);
    }

    const paragraphMatch = fieldPath.match(/^paragraphs\.paragraph_(\d+)$/);
    const paragraphIndex = paragraphMatch ? Number(paragraphMatch[1]) - 1 : -1;
    return paragraphIndex >= 0 ? experienceBlurb?.[paragraphIndex] || "" : "";
  }

  return getNestedContentValue(contentRootForId(content, contentId), fieldPath);
};

const normalizePreviewText = (value) => String(value ?? "");

const previewTextFromChildren = (children) => {
  if (Array.isArray(children)) {
    return children.map(previewTextFromChildren).join("");
  }

  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  return "";
};

const tokenizePreviewText = (value) => normalizePreviewText(value).match(/\s+|[^\s]+/g) || [];

const buildTokenDiffParts = (liveValue, draftValue) => {
  const liveTokens = tokenizePreviewText(liveValue);
  const draftTokens = tokenizePreviewText(draftValue);

  if (!liveTokens.length || !draftTokens.length) {
    return draftTokens.length ? [{ isAdded: true, text: draftTokens.join("") }] : [];
  }

  const lcsLengths = Array.from({ length: liveTokens.length + 1 }, () => (
    Array(draftTokens.length + 1).fill(0)
  ));

  for (let liveIndex = liveTokens.length - 1; liveIndex >= 0; liveIndex -= 1) {
    for (let draftIndex = draftTokens.length - 1; draftIndex >= 0; draftIndex -= 1) {
      lcsLengths[liveIndex][draftIndex] = liveTokens[liveIndex] === draftTokens[draftIndex]
        ? lcsLengths[liveIndex + 1][draftIndex + 1] + 1
        : Math.max(lcsLengths[liveIndex + 1][draftIndex], lcsLengths[liveIndex][draftIndex + 1]);
    }
  }

  const sharedTokens = [];
  let liveIndex = 0;
  let draftIndex = 0;

  while (liveIndex < liveTokens.length && draftIndex < draftTokens.length) {
    if (liveTokens[liveIndex] === draftTokens[draftIndex]) {
      sharedTokens.push(draftTokens[draftIndex]);
      liveIndex += 1;
      draftIndex += 1;
      continue;
    }

    if (lcsLengths[liveIndex + 1][draftIndex] >= lcsLengths[liveIndex][draftIndex + 1]) {
      liveIndex += 1;
    } else {
      draftIndex += 1;
    }
  }

  const diffParts = [];
  let sharedIndex = 0;

  draftTokens.forEach((token) => {
    const isAdded = token !== sharedTokens[sharedIndex];

    if (!isAdded) {
      sharedIndex += 1;
    }

    const previousPart = diffParts[diffParts.length - 1];
    if (previousPart && previousPart.isAdded === isAdded) {
      previousPart.text += token;
      return;
    }

    diffParts.push({ isAdded, text: token });
  });

  return diffParts;
};

const renderPreviewDiffText = ({ draftValue, liveValue }) => {
  if (normalizePreviewText(liveValue) === normalizePreviewText(draftValue)) {
    return draftValue;
  }

  return buildTokenDiffParts(liveValue, draftValue).map((part, index) => (
    part.isAdded ? (
      <mark className="admin_preview_diff_added" key={`${index}-${part.text}`}>
        {part.text}
      </mark>
    ) : (
      <span key={`${index}-${part.text}`}>{part.text}</span>
    )
  ));
};

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
  draftValue,
  fieldPath,
  hasDraftChange,
  isSelected,
  label,
  liveValue,
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
      className={[
        "admin_preview_edit_marker",
        hasDraftChange ? "admin_preview_edit_marker_changed" : "",
        isSelected ? "admin_preview_edit_marker_selected" : "",
      ].filter(Boolean).join(" ")}
      onClick={requestEdit}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      title={`Edit ${label}`}
    >
      {hasDraftChange
        ? renderPreviewDiffText({ draftValue, liveValue })
        : children}
      <span aria-hidden="true" className="admin_preview_edit_badge">
        Edit
      </span>
    </span>
  );
};

const EditablePreviewRecord = ({
  children,
  isSelected,
  label,
  onEdit,
}) => {
  const requestEdit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onEdit();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    requestEdit(event);
  };

  return (
    <div
      className={isSelected ? "admin_preview_record_edit_marker admin_preview_record_edit_marker_selected" : "admin_preview_record_edit_marker"}
      data-admin-preview-record-edit="true"
      onClickCapture={requestEdit}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      title={`Edit ${label}`}
    >
      <span aria-hidden="true" className="admin_preview_record_edit_badge">
        Edit
      </span>
      {children}
    </div>
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
  const [activeEditTarget, setActiveEditTarget] = useState({
    contentId: "",
    fieldPath: "",
    id: "",
    type: "",
  });
  const [previewData, setPreviewData] = useState({
    content: null,
    draftConflicts: [],
    events: [],
    experienceBlurb: [],
    experienceBlurbBlocks: {},
    liveContent: null,
    liveExperienceBlurb: [],
    liveExperienceBlurbBlocks: {},
    products: [],
  });
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isContentEditMode = queryParams.get("edit") === "content";
  const isEmbeddedPreview = typeof window !== "undefined" && window.parent !== window;

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
      const [products, siteContent, liveSiteContent, events] = await Promise.all([
        loadFirestoreProductsForPublic({ db, drafts, storage }),
        loadFirestoreSiteContentForPublic({ db, drafts }),
        loadFirestoreSiteContentForPublic({ db }),
        loadFirestoreEventsForPublic({ db, drafts, storage }),
      ]);

      setPreviewData({
        content: siteContent.content,
        draftConflicts: [
          ...products
            .filter((product) => product.draftConflict)
            .map((product) => ({
              id: product.id,
              label: product.title || product.id,
              message: product.draftConflict,
              type: "Product",
            })),
          ...events
            .filter((event) => event.draftConflict)
            .map((event) => ({
              id: event.id,
              label: event.title || event.id,
              message: event.draftConflict,
              type: "Event",
            })),
          ...(siteContent.draftConflicts || []).map((conflict) => ({
            ...conflict,
            label: conflict.id,
            type: "Site content",
          })),
        ],
        events,
        experienceBlurb: siteContent.experienceBlurb,
        experienceBlurbBlocks: siteContent.experienceBlurbBlocks,
        liveContent: liveSiteContent.content,
        liveExperienceBlurb: liveSiteContent.experienceBlurb,
        liveExperienceBlurbBlocks: liveSiteContent.experienceBlurbBlocks,
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
    const previewRouteMessage = {
      path: location.pathname,
      type: "calabash-admin-preview-route",
    };

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(previewRouteMessage, window.location.origin);
    }

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(previewRouteMessage, window.location.origin);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handlePreviewRefresh = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === "calabash-admin-preview-active-edit-target") {
        setActiveEditTarget({
          contentId: String(event.data.contentId || ""),
          fieldPath: String(event.data.fieldPath || ""),
          id: String(event.data.targetId || ""),
          type: String(event.data.targetType || ""),
        });
        return;
      }

      if (event.data?.type !== "calabash-admin-refresh-preview-data") {
        return;
      }

      loadPreview();
    };

    window.addEventListener("message", handlePreviewRefresh);

    return () => {
      window.removeEventListener("message", handlePreviewRefresh);
    };
  }, [loadPreview]);

  useEffect(() => {
    const handlePreviewLinkClick = (event) => {
      const clickedElement = event.target instanceof Element ? event.target : null;
      const anchor = clickedElement?.closest("a[href]");

      if (!anchor) {
        return;
      }

      if (isContentEditMode && clickedElement?.closest("[data-admin-preview-record-edit]")) {
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
    setActiveEditTarget({
      contentId: request.contentId,
      fieldPath: request.fieldPath,
      id: request.contentId,
      type: "content",
    });

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
  }, []);

  const requestRecordEdit = useCallback((recordType, record) => {
    const recordId = String(record?.id || "");

    if (!recordId) {
      return;
    }

    setActiveEditTarget({
      contentId: "",
      fieldPath: "",
      id: recordId,
      type: recordType,
    });

    const messageType = recordType === "product"
      ? "calabash-admin-edit-product"
      : "calabash-admin-edit-event";
    const message = {
      id: recordId,
      label: String(record?.title || recordId),
      type: messageType,
    };

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, window.location.origin);
      return;
    }

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(message, window.location.origin);
      window.opener.focus();
    }
  }, []);

  const toggleContentEditMode = useCallback(() => {
    const nextQueryParams = new URLSearchParams(location.search);

    if (isContentEditMode) {
      nextQueryParams.delete("edit");
    } else {
      nextQueryParams.set("edit", "content");
    }

    const nextQuery = nextQueryParams.toString();
    navigate(`${location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
  }, [isContentEditMode, location.pathname, location.search, navigate]);

  const createContentRenderer = useCallback((contentId) => (
    (fieldPath, label, children) => {
      if (!isContentEditMode) {
        return children;
      }

      const draftValue = previewTextFromChildren(children);
      const liveValue = getPreviewContentValue({
        content: previewData.liveContent,
        contentId,
        experienceBlurb: previewData.liveExperienceBlurb,
        experienceBlurbBlocks: previewData.liveExperienceBlurbBlocks,
        fieldPath,
      });
      const hasDraftChange = normalizePreviewText(liveValue) !== normalizePreviewText(draftValue);

      return (
        <EditablePreviewText
          contentId={contentId}
          draftValue={draftValue}
          fieldPath={fieldPath}
          hasDraftChange={hasDraftChange}
          isSelected={activeEditTarget.contentId === contentId && activeEditTarget.fieldPath === fieldPath}
          label={label}
          liveValue={liveValue}
          onEdit={requestContentEdit}
        >
          {children}
        </EditablePreviewText>
      );
    }
  ), [activeEditTarget, isContentEditMode, previewData.liveContent, previewData.liveExperienceBlurb, previewData.liveExperienceBlurbBlocks, requestContentEdit]);

  const renderProductPreviewItem = useCallback((product, children) => {
    if (!isContentEditMode) {
      return children;
    }

    return (
      <EditablePreviewRecord
        isSelected={activeEditTarget.type === "product" && activeEditTarget.id === product.id}
        key={product.id || product.key}
        label={`product ${product.title || product.id}`}
        onEdit={() => requestRecordEdit("product", product)}
      >
        {children}
      </EditablePreviewRecord>
    );
  }, [activeEditTarget, isContentEditMode, requestRecordEdit]);

  const renderEventPreviewItem = useCallback((event, children) => {
    if (!isContentEditMode) {
      return children;
    }

    return (
      <EditablePreviewRecord
        isSelected={activeEditTarget.type === "event" && activeEditTarget.id === event.id}
        key={event.id || event.key}
        label={`event ${event.title || event.id}`}
        onEdit={() => requestRecordEdit("event", event)}
      >
        {children}
      </EditablePreviewRecord>
    );
  }, [activeEditTarget, isContentEditMode, requestRecordEdit]);

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
          renderProductPreviewItem={renderProductPreviewItem}
        />
      ) : (
        <main className="admin_preview_frame_status">
          <p>This product is not available in the Firestore preview.</p>
        </main>
      );
    }

    if (activeTab === "shop") {
      return (
        <Shop
          productsOverride={previewData.products}
          renderProductPreviewItem={renderProductPreviewItem}
        />
      );
    }

    if (activeTab === "events") {
      return (
        <Events
          eventsOverride={previewData.events}
          experienceBlurbBlocksOverride={previewData.experienceBlurbBlocks}
          experienceBlurbOverride={previewData.experienceBlurb}
          renderEventPreviewItem={renderEventPreviewItem}
          renderExperienceBlurbContent={renderExperienceBlurbContent}
        />
      );
    }

    if (activeTab === "contact") {
      return <Contact isPreview />;
    }

    if (activeTab === "cart") {
      return (
        <main className="admin_preview_frame_status">
          <p>Cart preview is not connected to Firestore content yet.</p>
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
      {!isEmbeddedPreview ? (
        <button
          aria-label={isContentEditMode ? "Turn full preview edit mode off" : "Turn full preview edit mode on"}
          aria-pressed={isContentEditMode}
          className={isContentEditMode ? "admin_full_preview_edit_toggle admin_full_preview_edit_toggle_active" : "admin_full_preview_edit_toggle"}
          onClick={toggleContentEditMode}
          title={isContentEditMode ? "Turn edit mode off" : "Turn edit mode on"}
          type="button"
        >
          <FontAwesomeIcon aria-hidden="true" icon={faPencilAlt} />
        </button>
      ) : null}
      {previewData.draftConflicts.length ? (
        <section className="admin_preview_conflict_banner" role="alert">
          <strong>Draft conflict. Preview is showing current live data for:</strong>
          <ul>
            {previewData.draftConflicts.map((conflict) => (
              <li key={`${conflict.type}-${conflict.id}`}>
                {conflict.type}: {conflict.label}. {conflict.message}
              </li>
            ))}
          </ul>
          <span>Discard and resave the affected draft before publishing.</span>
        </section>
      ) : null}
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
