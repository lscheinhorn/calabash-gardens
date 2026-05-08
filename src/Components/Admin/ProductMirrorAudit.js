import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import { buildProductSeed } from "../../data/adminProductSeed";

const CollapseIcon = ({ isExpanded }) => (
  <FontAwesomeIcon
    aria-hidden="true"
    className="admin_collapse_icon"
    icon={isExpanded ? faChevronDown : faChevronRight}
  />
);

const normalizeString = (value) => String(value ?? "").trim();

const normalizeBoolean = (value) => value === true;

const normalizePriceOptions = (priceOptions) => (
  Array.isArray(priceOptions) ? priceOptions : []
).map((priceOption) => ({
  option: normalizeString(priceOption?.option),
  price: normalizeString(priceOption?.price),
}));

const normalizePhotos = (photos) => (Array.isArray(photos) ? photos : []).filter(Boolean);

const countStaticPhotos = (productSource) => (
  Array.isArray(productSource?.photos) ? productSource.photos : []
).filter((photoPath) => !String(photoPath || "").includes("large_logo_no_purple_square")).length;

const formatFieldLabel = (field) => ({
  category: "Category",
  info: "Info",
  info1: "Info 1",
  info2: "Info 2",
  inStock: "In Stock",
  isActive: "Active",
  isHighlighted: "Highlighted",
  priceOptions: "Prices",
  published: "Published",
  shipping: "Shipping",
  title: "Title",
}[field] || field);

const valuesMatch = (expectedValue, actualValue) => (
  JSON.stringify(expectedValue) === JSON.stringify(actualValue)
);

const compareProduct = (expectedProduct, firestoreProduct) => {
  const expected = expectedProduct.data;
  const actualPhotos = normalizePhotos(firestoreProduct.photos);
  const staticPhotoCount = countStaticPhotos(expectedProduct.source);
  const differences = [];
  const warnings = [];

  [
    "title",
    "category",
    "info",
    "info1",
    "info2",
    "shipping",
  ].forEach((field) => {
    if (!valuesMatch(normalizeString(expected[field]), normalizeString(firestoreProduct[field]))) {
      differences.push({
        field,
        expected: normalizeString(expected[field]),
        actual: normalizeString(firestoreProduct[field]),
      });
    }
  });

  [
    "published",
    "isActive",
    "inStock",
    "isHighlighted",
  ].forEach((field) => {
    if (!valuesMatch(normalizeBoolean(expected[field]), normalizeBoolean(firestoreProduct[field]))) {
      differences.push({
        field,
        expected: normalizeBoolean(expected[field]) ? "true" : "false",
        actual: normalizeBoolean(firestoreProduct[field]) ? "true" : "false",
      });
    }
  });

  if (!valuesMatch(normalizePriceOptions(expected.priceOptions), normalizePriceOptions(firestoreProduct.priceOptions))) {
    differences.push({
      field: "priceOptions",
      expected: JSON.stringify(normalizePriceOptions(expected.priceOptions)),
      actual: JSON.stringify(normalizePriceOptions(firestoreProduct.priceOptions)),
    });
  }

  if (staticPhotoCount > 0 && actualPhotos.length === 0) {
    warnings.push(`Static product has ${staticPhotoCount} non-placeholder photo(s), but Firestore has none attached.`);
  }

  const photosWithoutStoragePath = actualPhotos.filter((photo) => (
    typeof photo === "string" ? !photo : !photo?.path
  ));

  if (photosWithoutStoragePath.length) {
    warnings.push(`${photosWithoutStoragePath.length} Firestore photo reference(s) are missing a Storage path.`);
  }

  const photosWithoutAlt = actualPhotos.filter((photo) => (
    typeof photo === "object" && photo?.path && !normalizeString(photo.alt)
  ));

  if (photosWithoutAlt.length) {
    warnings.push(`${photosWithoutAlt.length} Firestore photo reference(s) are missing alt text.`);
  }

  return {
    differences,
    firestorePhotoCount: actualPhotos.length,
    staticPhotoCount,
    warnings,
  };
};

const buildAuditReport = (firestoreProducts) => {
  const seed = buildProductSeed();
  const expectedProducts = seed.products;
  const expectedById = new Map(expectedProducts.map((product) => [product.id, product]));
  const firestoreById = new Map(firestoreProducts.map((product) => [product.id, product]));
  const matched = [];
  const missing = [];
  const changed = [];
  const warnings = [];

  expectedProducts.forEach((expectedProduct) => {
    const firestoreProduct = firestoreById.get(expectedProduct.id);

    if (!firestoreProduct) {
      missing.push(expectedProduct);
      return;
    }

    const comparison = compareProduct(expectedProduct, firestoreProduct);
    const row = {
      ...comparison,
      id: expectedProduct.id,
      title: expectedProduct.data.title,
    };

    if (comparison.differences.length || comparison.warnings.length) {
      changed.push(row);
      return;
    }

    matched.push(row);
  });

  const extra = firestoreProducts.filter((product) => !expectedById.has(product.id));

  seed.errors.forEach((error) => warnings.push(error));
  seed.warnings.forEach((warning) => warnings.push(warning));

  return {
    changed,
    extra,
    matched,
    missing,
    seedWarnings: warnings,
    totalExpected: expectedProducts.length,
    totalFirestore: firestoreProducts.length,
  };
};

export default function ProductMirrorAudit({ db }) {
  const [firestoreProducts, setFirestoreProducts] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadFirestoreProducts = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const productsQuery = query(collection(db, "products"), orderBy("title"));
      const snapshot = await getDocs(productsQuery);
      setFirestoreProducts(snapshot.docs.map((productDoc) => ({
        id: productDoc.id,
        ...productDoc.data(),
      })));
    } catch (error) {
      setMessage("Product mirror audit could not load Firestore products.");
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isExpanded) {
      loadFirestoreProducts();
    }
  }, [isExpanded, loadFirestoreProducts]);

  const report = useMemo(() => buildAuditReport(firestoreProducts), [firestoreProducts]);
  const issueCount = report.changed.length + report.extra.length + report.missing.length + report.seedWarnings.length;

  return (
    <section className="admin_panel">
      <div className="admin_form_header">
        <div>
          <h3>Product Mirror Audit</h3>
          <p className="admin_status">
            Read-only comparison between static products and Firestore products.
          </p>
        </div>
        <div className="admin_button_row">
          <button
            aria-label="Refresh product mirror audit"
            className="admin_secondary_button"
            disabled={isLoading || !isExpanded}
            onClick={loadFirestoreProducts}
            type="button"
          >
            Refresh
          </button>
          <button
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} product mirror audit`}
            className="admin_icon_button"
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
            title={`${isExpanded ? "Collapse" : "Expand"} product mirror audit`}
            type="button"
          >
            <CollapseIcon isExpanded={isExpanded} />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          {message ? <p className="admin_message">{message}</p> : null}
          {isLoading ? <p className="admin_status">Loading product audit...</p> : null}

          <div className="admin_audit_summary" aria-label="Product mirror audit summary">
            <div>
              <span>Static Products</span>
              <strong>{report.totalExpected}</strong>
            </div>
            <div>
              <span>Firestore Products</span>
              <strong>{report.totalFirestore}</strong>
            </div>
            <div>
              <span>Exact Matches</span>
              <strong>{report.matched.length}</strong>
            </div>
            <div>
              <span>Needs Review</span>
              <strong>{issueCount}</strong>
            </div>
          </div>

          {issueCount === 0 ? (
            <p className="admin_message">Firestore products match the static product seed expectations.</p>
          ) : null}

          {report.seedWarnings.length ? (
            <AuditSection title="Seed Warnings">
              {report.seedWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </AuditSection>
          ) : null}

          {report.missing.length ? (
            <AuditSection title={`Missing From Firestore (${report.missing.length})`}>
              {report.missing.map((product) => (
                <li key={product.id}>
                  <strong>{product.data.title}</strong>
                  <small>{product.id}</small>
                </li>
              ))}
            </AuditSection>
          ) : null}

          {report.extra.length ? (
            <AuditSection title={`Extra In Firestore (${report.extra.length})`}>
              {report.extra.map((product) => (
                <li key={product.id}>
                  <strong>{product.title || product.id}</strong>
                  <small>{product.id}</small>
                </li>
              ))}
            </AuditSection>
          ) : null}

          {report.changed.length ? (
            <AuditSection title={`Different Or Needs Review (${report.changed.length})`}>
              {report.changed.map((product) => (
                <li key={product.id}>
                  <strong>{product.title}</strong>
                  <small>{product.id}</small>
                  {product.differences.length ? (
                    <ul>
                      {product.differences.map((difference) => (
                        <li key={`${product.id}-${difference.field}`}>
                          {formatFieldLabel(difference.field)} expected <code>{difference.expected || "(blank)"}</code>, found <code>{difference.actual || "(blank)"}</code>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {product.warnings.length ? (
                    <ul>
                      {product.warnings.map((warning) => (
                        <li key={`${product.id}-${warning}`}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </AuditSection>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function AuditSection({ children, title }) {
  return (
    <div className="admin_audit_section">
      <h4>{title}</h4>
      <ul>{children}</ul>
    </div>
  );
}
