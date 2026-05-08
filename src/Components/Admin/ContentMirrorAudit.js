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

import { buildContentSeed } from "../../data/adminContentSeed";

const CollapseIcon = ({ isExpanded }) => (
  <FontAwesomeIcon
    aria-hidden="true"
    className="admin_collapse_icon"
    icon={isExpanded ? faChevronDown : faChevronRight}
  />
);

const stableStringify = (value) => JSON.stringify(value ?? null, Object.keys(flattenObject(value)).sort());

const flattenObject = (value, prefix = "", output = {}) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    output[prefix || "value"] = value;
    return output;
  }

  Object.keys(value).sort().forEach((key) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenObject(value[key], nextPrefix, output);
  });

  return output;
};

const diffSections = (expectedSections, actualSections) => {
  const expectedFlat = flattenObject(expectedSections);
  const actualFlat = flattenObject(actualSections);
  const keys = Array.from(new Set([
    ...Object.keys(expectedFlat),
    ...Object.keys(actualFlat),
  ])).sort();

  return keys
    .filter((key) => stableStringify(expectedFlat[key]) !== stableStringify(actualFlat[key]))
    .map((key) => ({
      actual: String(actualFlat[key] ?? ""),
      expected: String(expectedFlat[key] ?? ""),
      field: key,
    }));
};

const buildAuditReport = (firestoreContentDocs) => {
  const seed = buildContentSeed();
  const expectedById = new Map(seed.contentDocs.map((contentDoc) => [contentDoc.id, contentDoc]));
  const firestoreById = new Map(firestoreContentDocs.map((contentDoc) => [contentDoc.id, contentDoc]));
  const matched = [];
  const missing = [];
  const changed = [];
  const seedWarnings = [...seed.errors, ...seed.warnings];

  seed.contentDocs.forEach((expectedDoc) => {
    const firestoreDoc = firestoreById.get(expectedDoc.id);

    if (!firestoreDoc) {
      missing.push(expectedDoc);
      return;
    }

    const sectionDifferences = diffSections(expectedDoc.data.sections, firestoreDoc.sections);
    const differences = [...sectionDifferences];

    if (firestoreDoc.published !== true) {
      differences.push({
        actual: firestoreDoc.published === false ? "false" : "(missing)",
        expected: "true",
        field: "published",
      });
    }

    const row = {
      differences,
      id: expectedDoc.id,
      title: expectedDoc.title,
    };

    if (differences.length) {
      changed.push(row);
      return;
    }

    matched.push(row);
  });

  const extra = firestoreContentDocs.filter((contentDoc) => !expectedById.has(contentDoc.id));

  return {
    changed,
    extra,
    matched,
    missing,
    seedWarnings,
    totalExpected: seed.contentDocs.length,
    totalFirestore: firestoreContentDocs.length,
  };
};

export default function ContentMirrorAudit({ db }) {
  const [firestoreContentDocs, setFirestoreContentDocs] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadFirestoreContent = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const snapshot = await getDocs(collection(db, "siteContent"));
      setFirestoreContentDocs(snapshot.docs.map((contentDoc) => ({
        id: contentDoc.id,
        ...contentDoc.data(),
      })));
    } catch (error) {
      setMessage("Content mirror audit could not load Firestore site content.");
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isExpanded) {
      loadFirestoreContent();
    }
  }, [isExpanded, loadFirestoreContent]);

  const report = useMemo(() => buildAuditReport(firestoreContentDocs), [firestoreContentDocs]);
  const issueCount = report.changed.length + report.extra.length + report.missing.length + report.seedWarnings.length;

  return (
    <section className="admin_panel">
      <div className="admin_form_header">
        <div>
          <h3>Content Mirror Audit</h3>
          <p className="admin_status">
            Read-only comparison between static site copy and Firestore site content.
          </p>
        </div>
        <div className="admin_button_row">
          <button
            aria-label="Refresh content mirror audit"
            className="admin_secondary_button"
            disabled={isLoading || !isExpanded}
            onClick={loadFirestoreContent}
            type="button"
          >
            Refresh
          </button>
          <button
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} content mirror audit`}
            className="admin_icon_button"
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
            title={`${isExpanded ? "Collapse" : "Expand"} content mirror audit`}
            type="button"
          >
            <CollapseIcon isExpanded={isExpanded} />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          {message ? <p className="admin_message">{message}</p> : null}
          {isLoading ? <p className="admin_status">Loading content audit...</p> : null}

          <div className="admin_audit_summary" aria-label="Content mirror audit summary">
            <div>
              <span>Static Sections</span>
              <strong>{report.totalExpected}</strong>
            </div>
            <div>
              <span>Firestore Docs</span>
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
            <p className="admin_message">Firestore site content matches the static content expectations.</p>
          ) : null}

          {report.seedWarnings.length ? (
            <AuditSection title="Content Warnings">
              {report.seedWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </AuditSection>
          ) : null}

          {report.missing.length ? (
            <AuditSection title={`Missing From Firestore (${report.missing.length})`}>
              {report.missing.map((contentDoc) => (
                <li key={contentDoc.id}>
                  <strong>{contentDoc.title}</strong>
                  <small>{contentDoc.id}</small>
                </li>
              ))}
            </AuditSection>
          ) : null}

          {report.extra.length ? (
            <AuditSection title={`Extra In Firestore (${report.extra.length})`}>
              {report.extra.map((contentDoc) => (
                <li key={contentDoc.id}>
                  <strong>{contentDoc.id}</strong>
                </li>
              ))}
            </AuditSection>
          ) : null}

          {report.changed.length ? (
            <AuditSection title={`Different Or Needs Review (${report.changed.length})`}>
              {report.changed.map((contentDoc) => (
                <li key={contentDoc.id}>
                  <strong>{contentDoc.title}</strong>
                  <small>{contentDoc.id}</small>
                  <ul>
                    {contentDoc.differences.map((difference) => (
                      <li key={`${contentDoc.id}-${difference.field}`}>
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
