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

import {
  buildProductPublicParityReport,
} from "../../data/publicProductAdapter";
import { products as staticProducts } from "../../resources/products";

const CollapseIcon = ({ isExpanded }) => (
  <FontAwesomeIcon
    aria-hidden="true"
    className="admin_collapse_icon"
    icon={isExpanded ? faChevronDown : faChevronRight}
  />
);

const publicStaticProducts = staticProducts.filter((product) => product.isActive === true);

const buildCategoryNameMap = (categoryDocs) => Object.fromEntries(categoryDocs.map((categoryDoc) => [
  categoryDoc.id,
  String(categoryDoc.name || categoryDoc.id),
]));

const compareFields = (staticProduct, firestoreProduct) => {
  const fields = [
    "title",
    "category",
    "info",
    "info1",
    "info2",
    "shipping",
    "inStock",
    "isActive",
    "isHighlighted",
    "key",
  ];
  const differences = fields.filter((field) => (
    JSON.stringify(staticProduct[field] ?? "") !== JSON.stringify(firestoreProduct[field] ?? "")
  )).map((field) => ({
    actual: String(firestoreProduct[field] ?? ""),
    expected: String(staticProduct[field] ?? ""),
    field,
  }));

  if (JSON.stringify(staticProduct.priceOptions || []) !== JSON.stringify(firestoreProduct.priceOptions || [])) {
    differences.push({
      actual: JSON.stringify(firestoreProduct.priceOptions || []),
      expected: JSON.stringify(staticProduct.priceOptions || []),
      field: "priceOptions",
    });
  }

  const staticPhotoCount = Array.isArray(staticProduct.photos) ? staticProduct.photos.length : 0;
  const firestorePhotoCount = Array.isArray(firestoreProduct.photos) ? firestoreProduct.photos.length : 0;

  if (staticPhotoCount !== firestorePhotoCount) {
    differences.push({
      actual: String(firestorePhotoCount),
      expected: String(staticPhotoCount),
      field: "photoCount",
    });
  }

  return differences;
};

export default function ProductPublicParityAudit({ db }) {
  const [categoryDocs, setCategoryDocs] = useState([]);
  const [firestoreProducts, setFirestoreProducts] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadParityInputs = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const [productsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "products"), orderBy("title"))),
        getDocs(collection(db, "productCategories")),
      ]);

      setFirestoreProducts(productsSnapshot.docs.map((productDoc) => ({
        id: productDoc.id,
        ...productDoc.data(),
      })));
      setCategoryDocs(categoriesSnapshot.docs.map((categoryDoc) => ({
        id: categoryDoc.id,
        ...categoryDoc.data(),
      })));
    } catch (error) {
      setMessage("Public product parity could not load Firestore products.");
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isExpanded) {
      loadParityInputs();
    }
  }, [isExpanded, loadParityInputs]);

  const publicFirestoreProducts = useMemo(() => firestoreProducts.filter((product) => (
    product.published === true && product.isActive === true
  )), [firestoreProducts]);
  const report = useMemo(() => buildProductPublicParityReport(publicFirestoreProducts, {
    categoryNameById: buildCategoryNameMap(categoryDocs),
    staticProducts: publicStaticProducts,
  }), [categoryDocs, publicFirestoreProducts]);
  const differenceRows = report.different.map(({ firestoreProduct, staticProduct }) => ({
    differences: compareFields(staticProduct, firestoreProduct),
    firestoreProduct,
    staticProduct,
  })).filter((row) => row.differences.length);
  const issueCount = report.missing.length + report.extra.length + differenceRows.length;

  return (
    <section className="admin_panel">
      <div className="admin_form_header">
        <div>
          <h3>Public Product Parity</h3>
          <p className="admin_status">
            Read-only check for future Firestore product reads. Public shop still uses static products.
          </p>
        </div>
        <div className="admin_button_row">
          <button
            aria-label="Refresh public product parity"
            className="admin_secondary_button"
            disabled={isLoading || !isExpanded}
            onClick={loadParityInputs}
            type="button"
          >
            Refresh
          </button>
          <button
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} public product parity`}
            className="admin_icon_button"
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
            title={`${isExpanded ? "Collapse" : "Expand"} public product parity`}
            type="button"
          >
            <CollapseIcon isExpanded={isExpanded} />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          {message ? <p className="admin_message">{message}</p> : null}
          {isLoading ? <p className="admin_status">Loading public product parity...</p> : null}

          <div className="admin_audit_summary" aria-label="Public product parity summary">
            <div>
              <span>Static Visible</span>
              <strong>{publicStaticProducts.length}</strong>
            </div>
            <div>
              <span>Firestore Normalized</span>
              <strong>{report.normalizedFirestoreProducts.filter((product) => product.isActive).length}</strong>
            </div>
            <div>
              <span>Exact Matches</span>
              <strong>{report.matching.length}</strong>
            </div>
            <div>
              <span>Needs Review</span>
              <strong>{issueCount}</strong>
            </div>
          </div>

          {issueCount === 0 ? (
            <p className="admin_message">Firestore-normalized products match the visible static shop products.</p>
          ) : null}

          {report.missing.length ? (
            <AuditSection title={`Missing From Firestore Public Shape (${report.missing.length})`}>
              {report.missing.map((product) => (
                <li key={product.key}>
                  <strong>{product.title}</strong>
                  <small>{product.key}</small>
                </li>
              ))}
            </AuditSection>
          ) : null}

          {report.extra.length ? (
            <AuditSection title={`Extra In Firestore Public Shape (${report.extra.length})`}>
              {report.extra.map((product) => (
                <li key={product.key}>
                  <strong>{product.title}</strong>
                  <small>{product.key}</small>
                </li>
              ))}
            </AuditSection>
          ) : null}

          {differenceRows.length ? (
            <AuditSection title={`Different Public Shape (${differenceRows.length})`}>
              {differenceRows.map(({ differences, staticProduct }) => (
                <li key={staticProduct.key}>
                  <strong>{staticProduct.title}</strong>
                  <small>{staticProduct.key}</small>
                  <ul>
                    {differences.map((difference) => (
                      <li key={`${staticProduct.key}-${difference.field}`}>
                        {difference.field} expected <code>{difference.expected || "(blank)"}</code>, found <code>{difference.actual || "(blank)"}</code>
                      </li>
                    ))}
                  </ul>
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
