import { collection, getDocs } from "firebase/firestore";

import { applyAdminDrafts } from "./adminDrafts";
import { content as staticContent, experienceBlurb as staticExperienceBlurb } from "./siteData";

const clone = (value) => JSON.parse(JSON.stringify(value || {}));

const sortedParagraphs = (paragraphs) => {
  if (!paragraphs || typeof paragraphs !== "object" || Array.isArray(paragraphs)) {
    return [];
  }

  return Object.entries(paragraphs)
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey, undefined, { numeric: true }))
    .map(([, paragraph]) => String(paragraph || ""))
    .filter(Boolean);
};

const normalizeContentBlocks = (blocks) => {
  if (!blocks || typeof blocks !== "object") {
    return {};
  }

  const entries = Array.isArray(blocks)
    ? blocks.map((block, index) => [block?.id || `block_${index + 1}`, block])
    : Object.entries(blocks);

  return Object.fromEntries(entries.map(([id, block], index) => [
    id,
    {
      sortOrder: Number.isFinite(block?.sortOrder) ? block.sortOrder : index,
      text: String(block?.text || ""),
      type: ["paragraph", "subtitle", "title"].includes(block?.type) ? block.type : "paragraph",
    },
  ]));
};

export const normalizeSiteContentForPublic = (siteContentDocs, options = {}) => {
  const content = clone(options.staticContent || staticContent);
  const draftConflicts = siteContentDocs
    .filter((contentDoc) => contentDoc._draftConflict)
    .map((contentDoc) => ({
      id: contentDoc.id,
      message: String(contentDoc._draftConflict),
    }));
  let experienceBlurb = [...(options.staticExperienceBlurb || staticExperienceBlurb)];
  let experienceBlurbBlocks = {};
  const publishedDocs = siteContentDocs.filter((contentDoc) => contentDoc.published === true);

  publishedDocs.forEach((contentDoc) => {
    const sections = clone(contentDoc.sections);

    if (contentDoc.id === "home" && sections.header) {
      content.home.header = sections.header;
      return;
    }

    if (contentDoc.id === "banner") {
      content.home.banner = sections;
      return;
    }

    if (contentDoc.id === "offerings") {
      content.home.offerings = sections;
      return;
    }

    if (contentDoc.id === "about") {
      content.home.about = sections;
      return;
    }

    if (contentDoc.id === "team") {
      content.home.team = sections;
      return;
    }

    if (contentDoc.id === "experienceBlurb") {
      experienceBlurb = Array.isArray(sections)
        ? sections.map((paragraph) => String(paragraph || "")).filter(Boolean)
        : sortedParagraphs(sections.paragraphs || sections);
      experienceBlurbBlocks = normalizeContentBlocks(sections.contentBlocks);
    }
  });

  return {
    content,
    draftConflicts,
    experienceBlurb,
    experienceBlurbBlocks,
  };
};

export const loadFirestoreSiteContentForPublic = async ({ db, drafts = [] }) => {
  const snapshot = await getDocs(collection(db, "siteContent"));
  const liveSiteContentDocs = snapshot.docs.map((contentDoc) => ({
    id: contentDoc.id,
    ...contentDoc.data(),
  }));
  const siteContentDocs = drafts.length
    ? applyAdminDrafts(liveSiteContentDocs, drafts, "siteContent")
    : liveSiteContentDocs;

  return normalizeSiteContentForPublic(siteContentDocs);
};
