import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import { buildEventSeed } from "../../data/adminEventSeed";

const CollapseIcon = ({ isExpanded }) => (
  <FontAwesomeIcon
    aria-hidden="true"
    className="admin_collapse_icon"
    icon={isExpanded ? faChevronDown : faChevronRight}
  />
);

const dateMillis = (value) => {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
};

const stableStringify = (value) => JSON.stringify(value ?? null);

const diffEvent = (expectedEvent, firestoreEvent) => {
  const comparableFields = [
    "category",
    "eventDates",
    "info",
    "inStock",
    "isActive",
    "priceOptions",
    "published",
    "shipping",
    "title",
  ];
  const differences = comparableFields
    .filter((field) => stableStringify(expectedEvent.data[field]) !== stableStringify(firestoreEvent[field]))
    .map((field) => ({
      actual: stableStringify(firestoreEvent[field]),
      expected: stableStringify(expectedEvent.data[field]),
      field,
    }));

  if (dateMillis(expectedEvent.data.date) !== dateMillis(firestoreEvent.date)) {
    differences.push({
      actual: firestoreEvent.date?.toDate ? firestoreEvent.date.toDate().toISOString() : String(firestoreEvent.date || ""),
      expected: expectedEvent.data.date.toISOString(),
      field: "date",
    });
  }

  return differences;
};

const buildAuditReport = (firestoreEvents) => {
  const seed = buildEventSeed();
  const expectedById = new Map(seed.eventDocs.map((eventDoc) => [eventDoc.id, eventDoc]));
  const firestoreById = new Map(firestoreEvents.map((eventDoc) => [eventDoc.id, eventDoc]));
  const matched = [];
  const missing = [];
  const changed = [];

  seed.eventDocs.forEach((expectedEvent) => {
    const firestoreEvent = firestoreById.get(expectedEvent.id);

    if (!firestoreEvent) {
      missing.push(expectedEvent);
      return;
    }

    const differences = diffEvent(expectedEvent, firestoreEvent);
    const row = {
      differences,
      id: expectedEvent.id,
      title: expectedEvent.title,
    };

    if (differences.length) {
      changed.push(row);
      return;
    }

    matched.push(row);
  });

  return {
    changed,
    extra: firestoreEvents.filter((eventDoc) => !expectedById.has(eventDoc.id)),
    matched,
    missing,
    seedWarnings: [...seed.errors, ...seed.warnings],
    totalExpected: seed.eventDocs.length,
    totalFirestore: firestoreEvents.length,
  };
};

export default function EventMirrorAudit({ db }) {
  const [firestoreEvents, setFirestoreEvents] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState("");

  const loadFirestoreEvents = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const snapshot = await getDocs(collection(db, "events"));
      setFirestoreEvents(snapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
      })));
    } catch (error) {
      setMessage("Event mirror audit could not load Firestore events.");
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isExpanded) {
      loadFirestoreEvents();
    }
  }, [isExpanded, loadFirestoreEvents]);

  const report = useMemo(() => buildAuditReport(firestoreEvents), [firestoreEvents]);
  const issueCount = report.changed.length + report.extra.length + report.missing.length + report.seedWarnings.length;

  const seedMissingEvents = async () => {
    const seed = buildEventSeed();

    if (seed.errors.length) {
      setMessage("Event seed has errors. Review warnings before seeding.");
      return;
    }

    const missingEvents = seed.eventDocs.filter((eventDoc) => (
      report.missing.some((missingDoc) => missingDoc.id === eventDoc.id)
    ));

    if (!missingEvents.length) {
      setMessage("No missing event documents to seed.");
      return;
    }

    setIsSeeding(true);
    setMessage("");

    try {
      let createdCount = 0;

      for (const eventDoc of missingEvents) {
        const eventRef = doc(db, "events", eventDoc.id);
        const didCreate = await runTransaction(db, async (transaction) => {
          const currentEvent = await transaction.get(eventRef);

          if (currentEvent.exists()) {
            return false;
          }

          transaction.set(eventRef, {
            ...eventDoc.data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          return true;
        });

        if (didCreate) {
          createdCount += 1;
        }
      }

      setMessage(`${createdCount} missing event document${createdCount === 1 ? "" : "s"} seeded to Firestore.`);
      await loadFirestoreEvents();
    } catch (error) {
      setMessage("Missing events could not be seeded.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <section className="admin_panel">
      <div className="admin_form_header">
        <div>
          <h3>Event Mirror Audit</h3>
          <p className="admin_status">
            Read-only comparison between static events and Firestore event documents.
          </p>
        </div>
        <div className="admin_button_row">
          <button
            aria-label="Refresh event mirror audit"
            className="admin_secondary_button"
            disabled={isLoading || isSeeding || !isExpanded}
            onClick={loadFirestoreEvents}
            type="button"
          >
            Refresh
          </button>
          <button
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} event mirror audit`}
            className="admin_icon_button"
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
            title={`${isExpanded ? "Collapse" : "Expand"} event mirror audit`}
            type="button"
          >
            <CollapseIcon isExpanded={isExpanded} />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          {message ? <p className="admin_message">{message}</p> : null}
          {isLoading ? <p className="admin_status">Loading event audit...</p> : null}
          <div className="admin_button_row">
            <button
              className="admin_primary_button"
              disabled={isLoading || isSeeding || report.missing.length === 0 || report.seedWarnings.some((warning) => warning.startsWith("Duplicate"))}
              onClick={seedMissingEvents}
              type="button"
            >
              {isSeeding ? "Seeding..." : "Seed Missing Events"}
            </button>
          </div>

          <div className="admin_audit_summary" aria-label="Event mirror audit summary">
            <div>
              <span>Static Events</span>
              <strong>{report.totalExpected}</strong>
            </div>
            <div>
              <span>Firestore Events</span>
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
            <p className="admin_message">Firestore events match the static event expectations.</p>
          ) : null}

          {report.seedWarnings.length ? (
            <AuditSection title="Event Warnings">
              {report.seedWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </AuditSection>
          ) : null}

          {report.missing.length ? (
            <AuditSection title={`Missing From Firestore (${report.missing.length})`}>
              {report.missing.map((eventDoc) => (
                <li key={eventDoc.id}>
                  <strong>{eventDoc.title}</strong>
                  <small>{eventDoc.id}</small>
                </li>
              ))}
            </AuditSection>
          ) : null}

          {report.extra.length ? (
            <AuditSection title={`Extra In Firestore (${report.extra.length})`}>
              {report.extra.map((eventDoc) => (
                <li key={eventDoc.id}>
                  <strong>{eventDoc.title || eventDoc.id}</strong>
                  <small>{eventDoc.id}</small>
                </li>
              ))}
            </AuditSection>
          ) : null}

          {report.changed.length ? (
            <AuditSection title={`Different Or Needs Review (${report.changed.length})`}>
              {report.changed.map((eventDoc) => (
                <li key={eventDoc.id}>
                  <strong>{eventDoc.title}</strong>
                  <small>{eventDoc.id}</small>
                  <ul>
                    {eventDoc.differences.map((difference) => (
                      <li key={`${eventDoc.id}-${difference.field}`}>
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
