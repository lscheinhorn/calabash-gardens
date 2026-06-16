const fs = require("fs");
const path = require("path");

const {
  buildMediaAssetPlan,
  repoRoot,
} = require("./product-image-migration-manifest");

const eventsPath = path.join(repoRoot, "src/resources/events.js");
const imagesDir = path.join(repoRoot, "src/resources/images");
const componentsDir = path.join(repoRoot, "src/Components");
const markdownOutputPath = path.join(repoRoot, "docs/firebase-ownership-audit.md");
const jsonOutputPath = path.join(repoRoot, "docs/firebase-ownership-audit.json");

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const documentExtensions = new Set([".pdf", ".doc", ".docx"]);
const maxRecommendedImageSize = 10 * 1024 * 1024;

const expectedSiteContentDocs = [
  {
    id: "home",
    title: "Home Header",
    source: "src/resources/content.js: content.home.header",
    firebaseTarget: "siteContent/home",
  },
  {
    id: "banner",
    title: "Home Banner",
    source: "src/resources/content.js: content.home.banner",
    firebaseTarget: "siteContent/banner",
  },
  {
    id: "offerings",
    title: "Offerings",
    source: "src/resources/content.js: content.home.offerings",
    firebaseTarget: "siteContent/offerings",
  },
  {
    id: "about",
    title: "About",
    source: "src/resources/content.js: content.home.about",
    firebaseTarget: "siteContent/about",
  },
  {
    id: "team",
    title: "Team",
    source: "src/resources/content.js: content.home.team",
    firebaseTarget: "siteContent/team",
  },
  {
    id: "experienceBlurb",
    title: "Experience Blurb",
    source: "src/resources/events.js: experienceBlurb",
    firebaseTarget: "siteContent/experienceBlurb",
  },
];

const codeOwnedCopySurfaces = [
  {
    area: "Navigation",
    files: ["src/Components/Navbar/Navbar.js"],
    examples: ["Home", "Shop", "The Calabash Experience", "Contact Us"],
    recommendedOwner: "siteContent/navigation or siteSettings/navigation",
  },
  {
    area: "Shop chrome",
    files: ["src/Components/Shop/Shop.js", "src/Components/Product/Product.js"],
    examples: ["Shop by category", "Add To Cart", "Out of Stock"],
    recommendedOwner: "siteContent/shopUi",
  },
  {
    area: "Product detail chrome",
    files: ["src/Components/ProductPage/ProductPage.js"],
    examples: ["Continue Shopping", "Check out our tasting menu here", "Read more"],
    recommendedOwner: "siteContent/productUi",
  },
  {
    area: "Cart and checkout chrome",
    files: [
      "src/Components/Cart/Cart.js",
      "src/Components/Cart/Checkout/Paypal.js",
    ],
    examples: ["Your cart is empty", "Shipping", "Thank you for your purchase"],
    recommendedOwner: "siteContent/cartUi",
  },
  {
    area: "Contact form chrome",
    files: ["src/Components/Contact/Contact.js"],
    examples: ["Send", "Message sent", "Message failed"],
    recommendedOwner: "siteContent/contactUi",
  },
  {
    area: "Event purchase chrome",
    files: [
      "src/Components/Events/Events.js",
      "src/Components/Event/Event.js",
    ],
    examples: ["Previous Experience", "Next Experience", "Adults", "Children 12 & under", "Go to Cart"],
    recommendedOwner: "siteContent/eventUi",
  },
  {
    area: "Embedded media copy and URLs",
    files: ["src/Components/Media/Media.js"],
    examples: ["YouTube embed URL", "YouTube outbound link"],
    recommendedOwner: "siteContent/media or siteSettings/externalLinks",
  },
];

const escapeMarkdown = (value) => String(value || "")
  .replace(/\|/g, "\\|")
  .replace(/\r?\n/g, "<br>");

const tableRow = (cells) => cells
  .map((cell) => escapeMarkdown(cell))
  .join(" | ")
  .replace(/^/, "| ")
  .replace(/$/, " |");

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['‘’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const safeFileName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['‘’]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

const removeExtension = (fileName) => fileName.replace(/\.[^.]+$/, "");

const normalizeRelativePath = (absolutePath) => path.relative(repoRoot, absolutePath).replace(/\\/g, "/");

const isImagePath = (sourcePath) => imageExtensions.has(path.extname(sourcePath).toLowerCase());

const isDocumentPath = (sourcePath) => documentExtensions.has(path.extname(sourcePath).toLowerCase());

const fileExists = (sourcePath) => fs.existsSync(path.join(repoRoot, sourcePath));

const fileSizeFor = (sourcePath) => {
  const absolutePath = path.join(repoRoot, sourcePath);

  return fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : 0;
};

const contentTypeFor = (sourcePath) => {
  const extension = path.extname(sourcePath).toLowerCase();
  const types = {
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".webp": "image/webp",
  };

  return types[extension] || "application/octet-stream";
};

const storageRuleStatusFor = (sourcePath, storagePath) => {
  if (!fileExists(sourcePath)) {
    return "blocked: missing source file";
  }

  if (isImagePath(sourcePath)) {
    if (fileSizeFor(sourcePath) > maxRecommendedImageSize) {
      return "supported image path; optimization review recommended over 10 MB";
    }

    return "supported by current image Storage rules";
  }

  if (isDocumentPath(sourcePath)) {
    return storagePath.startsWith("event-documents/")
      ? "needs new Storage rule for event documents"
      : "needs review: document is not an image upload";
  }

  return "needs review: unrecognized file type";
};

const readStringLiteral = (source, startIndex) => {
  const quote = source[startIndex];
  let value = "";
  let index = startIndex + 1;

  while (index < source.length) {
    const char = source[index];

    if (char === "\\") {
      const escapedChar = source[index + 1] || "";
      const escapeMap = {
        n: "\n",
        r: "\r",
        t: "\t",
      };

      value += escapeMap[escapedChar] || escapedChar;
      index += 2;
      continue;
    }

    if (char === quote) {
      return {
        value,
        endIndex: index + 1,
      };
    }

    value += char;
    index += 1;
  }

  return {
    value,
    endIndex: index,
  };
};

const splitTopLevelObjects = (source, arrayMarker) => {
  const markerStart = source.indexOf(arrayMarker);

  if (markerStart === -1) {
    throw new Error(`Could not find array marker: ${arrayMarker}`);
  }

  const arrayStart = source.indexOf("[", markerStart);
  const objects = [];
  let depth = 0;
  let objectStart = -1;
  let index = arrayStart + 1;

  while (index < source.length) {
    const char = source[index];

    if (char === "\"" || char === "'" || char === "`") {
      index = readStringLiteral(source, index).endIndex;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        objectStart = index;
      }

      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0 && objectStart > -1) {
        objects.push(source.slice(objectStart, index + 1));
        objectStart = -1;
      }
    }

    if (char === "]" && depth === 0) {
      break;
    }

    index += 1;
  }

  return objects;
};

const stripLineComments = (source) => source.replace(/^\s*\/\/.*$/gm, "");

const extractStringField = (objectSource, fieldName) => {
  const sourceWithoutComments = stripLineComments(objectSource);
  const match = sourceWithoutComments.match(new RegExp(`${fieldName}\\s*:\\s*(['"\`])`));

  if (!match) {
    return "";
  }

  const literalStart = match.index + match[0].lastIndexOf(match[1]);

  return readStringLiteral(sourceWithoutComments, literalStart).value.trim();
};

const resolveRequirePath = (baseFilePath, requirePath) => {
  const absolutePath = path.resolve(path.dirname(baseFilePath), requirePath);

  return normalizeRelativePath(absolutePath);
};

const extractRequireField = (objectSource, fieldName, baseFilePath) => {
  const match = stripLineComments(objectSource).match(new RegExp(`${fieldName}\\s*:\\s*require\\(\\s*(['"\`])([\\s\\S]*?)\\1\\s*\\)`));

  if (!match) {
    return null;
  }

  return {
    requirePath: match[2],
    sourcePath: resolveRequirePath(baseFilePath, match[2]),
  };
};

const extractPhotoRequires = (objectSource, baseFilePath) => {
  const photosMatch = objectSource.match(/photos\s*:\s*\[([\s\S]*?)\]/);

  if (!photosMatch) {
    return [];
  }

  const requirePattern = /require\(\s*(['"`])([\s\S]*?)\1\s*\)/g;
  const photos = [];
  let match = requirePattern.exec(photosMatch[1]);

  while (match) {
    photos.push({
      requirePath: match[2],
      sourcePath: resolveRequirePath(baseFilePath, match[2]),
    });
    match = requirePattern.exec(photosMatch[1]);
  }

  return photos;
};

const eventStoragePathFor = (eventId, fileName, field, index) => {
  const safeName = safeFileName(fileName);

  if (field === "photo") {
    return `event-images/${eventId}-${String(index + 1).padStart(2, "0")}-${safeName}`;
  }

  return isImagePath(fileName)
    ? `event-images/${eventId}-menu-${safeName}`
    : `event-documents/${eventId}-menu-${safeName}`;
};

const buildEventMediaOwnership = () => {
  const source = fs.readFileSync(eventsPath, "utf8");
  const eventObjects = splitTopLevelObjects(source, "export const events = [");
  const eventMedia = [];

  eventObjects.forEach((objectSource, eventIndex) => {
    const title = extractStringField(objectSource, "title");
    const eventId = slugify(title);
    const link = extractRequireField(objectSource, "link", eventsPath);
    const photos = extractPhotoRequires(objectSource, eventsPath);

    if (link) {
      const fileName = path.basename(link.sourcePath);
      const storagePath = eventStoragePathFor(eventId, fileName, "link", 0);

      eventMedia.push({
        bin: "events",
        contentType: contentTypeFor(link.sourcePath),
        eventId,
        eventIndex,
        eventTitle: title,
        field: "link",
        fileSize: fileSizeFor(link.sourcePath),
        linkedId: eventId,
        linkedType: "event",
        mediaAssetId: `event-${eventId}-menu`,
        sourceExists: fileExists(link.sourcePath),
        sourcePath: link.sourcePath,
        storagePath,
        storageRuleStatus: storageRuleStatusFor(link.sourcePath, storagePath),
      });
    }

    photos.forEach((photo, photoIndex) => {
      const fileName = path.basename(photo.sourcePath);
      const storagePath = eventStoragePathFor(eventId, fileName, "photo", photoIndex);

      eventMedia.push({
        bin: "events",
        contentType: contentTypeFor(photo.sourcePath),
        eventId,
        eventIndex,
        eventTitle: title,
        field: "photo",
        fileSize: fileSizeFor(photo.sourcePath),
        linkedId: eventId,
        linkedType: "event",
        mediaAssetId: `event-${eventId}-photo-${String(photoIndex + 1).padStart(2, "0")}`,
        sourceExists: fileExists(photo.sourcePath),
        sourcePath: photo.sourcePath,
        storagePath,
        storageRuleStatus: storageRuleStatusFor(photo.sourcePath, storagePath),
      });
    });
  });

  return eventMedia;
};

const walkFiles = (startDir, predicate) => {
  if (!fs.existsSync(startDir)) {
    return [];
  }

  return fs.readdirSync(startDir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(startDir, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(absolutePath, predicate);
    }

    return predicate(absolutePath) ? [absolutePath] : [];
  });
};

const findResourceReferences = (sourceFile) => {
  const source = fs.readFileSync(sourceFile, "utf8");
  const sourceFileRelative = normalizeRelativePath(sourceFile);
  const references = [];
  const patterns = [
    {
      type: "js-require",
      regex: /require\(\s*(['"`])([^'"`]+)\1\s*\)/g,
      valueIndex: 2,
    },
    {
      type: "js-import",
      regex: /from\s+(['"`])([^'"`]+)\1/g,
      valueIndex: 2,
    },
    {
      type: "css-url",
      regex: /url\(\s*(['"]?)([^)'"]+)\1\s*\)/g,
      valueIndex: 2,
    },
  ];

  patterns.forEach((pattern) => {
    let match = pattern.regex.exec(source);

    while (match) {
      const value = match[pattern.valueIndex];

      if (value.startsWith(".")) {
        const absolutePath = path.resolve(path.dirname(sourceFile), value);
        const sourcePath = normalizeRelativePath(absolutePath);

        if (sourcePath.startsWith("src/resources/") && fs.existsSync(absolutePath)) {
          references.push({
            referenceType: pattern.type,
            sourceFile: sourceFileRelative,
            sourcePath,
          });
        }
      }

      match = pattern.regex.exec(source);
    }
  });

  return references;
};

const buildSiteMediaOwnership = () => {
  const componentFiles = walkFiles(componentsDir, (absolutePath) => (
    [".css", ".js", ".jsx"].includes(path.extname(absolutePath).toLowerCase())
  ));
  const references = componentFiles.flatMap(findResourceReferences)
    .filter((reference) => reference.sourcePath.startsWith("src/resources/images/"));
  const grouped = references.reduce((groups, reference) => {
    const existing = groups.get(reference.sourcePath) || [];
    const nextReference = {
      referenceType: reference.referenceType,
      sourceFile: reference.sourceFile,
    };
    const alreadyTracked = existing.some((trackedReference) => (
      trackedReference.referenceType === nextReference.referenceType
        && trackedReference.sourceFile === nextReference.sourceFile
    ));

    if (!alreadyTracked) {
      existing.push(nextReference);
    }

    groups.set(reference.sourcePath, existing);
    return groups;
  }, new Map());

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([sourcePath, refs]) => {
      const fileName = path.basename(sourcePath);
      const baseId = slugify(removeExtension(fileName));

      return {
        bin: "site",
        contentType: contentTypeFor(sourcePath),
        fileSize: fileSizeFor(sourcePath),
        linkedId: refs.length > 1 ? "shared" : slugify(path.basename(path.dirname(refs[0].sourceFile))),
        linkedType: "site",
        mediaAssetId: `site-${baseId}`,
        references: refs,
        sourceExists: fileExists(sourcePath),
        sourcePath,
        storagePath: `site-content-images/${safeFileName(fileName)}`,
        storageRuleStatus: storageRuleStatusFor(sourcePath, `site-content-images/${safeFileName(fileName)}`),
      };
    });
};

const buildExternalMediaReferences = () => {
  const componentFiles = walkFiles(componentsDir, (absolutePath) => (
    [".js", ".jsx"].includes(path.extname(absolutePath).toLowerCase())
  ));
  const urlRegex = /https?:\/\/[^'"`\s)]+/g;
  const references = [];

  componentFiles.forEach((absolutePath) => {
    const source = fs.readFileSync(absolutePath, "utf8");
    let match = urlRegex.exec(source);

    while (match) {
      const url = match[0];

      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        references.push({
          ownerSuggestion: "siteSettings/externalLinks or siteContent/media",
          sourceFile: normalizeRelativePath(absolutePath),
          type: "youtube",
          url,
        });
      }

      match = urlRegex.exec(source);
    }
  });

  return references;
};

const buildOtherImageCandidates = (knownSourcePaths) => {
  const files = walkFiles(imagesDir, (absolutePath) => isImagePath(absolutePath));

  return files
    .map(normalizeRelativePath)
    .filter((sourcePath) => !knownSourcePaths.has(sourcePath))
    .sort()
    .map((sourcePath) => {
      const fileName = path.basename(sourcePath);
      const baseId = slugify(removeExtension(fileName));
      const storagePath = `other-images/${safeFileName(fileName)}`;

      return {
        bin: "other",
        contentType: contentTypeFor(sourcePath),
        fileSize: fileSizeFor(sourcePath),
        linkedId: "",
        linkedType: "none",
        mediaAssetId: `other-${baseId}`,
        sourceExists: fileExists(sourcePath),
        sourcePath,
        storagePath,
        storageRuleStatus: storageRuleStatusFor(sourcePath, storagePath),
      };
    });
};

const countUnique = (items, key) => new Set(items.map((item) => item[key])).size;

const buildSharedSourceReview = (assets) => {
  const grouped = assets.reduce((groups, asset) => {
    const existing = groups.get(asset.sourcePath) || [];
    existing.push({
      bin: asset.bin,
      field: asset.field || "",
      linkedId: asset.linkedId,
      linkedType: asset.linkedType,
      mediaAssetId: asset.mediaAssetId,
      storagePath: asset.storagePath,
    });
    groups.set(asset.sourcePath, existing);
    return groups;
  }, new Map());

  return Array.from(grouped.entries())
    .filter(([, references]) => references.length > 1)
    .map(([sourcePath, references]) => ({
      sourcePath,
      references,
    }))
    .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
};

const buildAudit = () => {
  const productPlan = buildMediaAssetPlan();
  const productMedia = productPlan.productMediaAssets.map((asset) => ({
    bin: asset.bin,
    contentType: contentTypeFor(asset.sourcePath),
    fileSize: fileSizeFor(asset.sourcePath),
    linkedId: asset.linkedId,
    linkedType: asset.linkedType,
    mediaAssetId: asset.mediaAssetId,
    productId: asset.productId,
    productTitle: asset.productTitle,
    sourceExists: asset.sourceExists,
    sourcePath: asset.sourcePath,
    storagePath: asset.storagePath,
    storageRuleStatus: storageRuleStatusFor(asset.sourcePath, asset.storagePath),
  }));
  const productOtherMedia = productPlan.otherMediaAssets.map((asset) => ({
    bin: asset.bin,
    contentType: contentTypeFor(asset.sourcePath),
    fileSize: fileSizeFor(asset.sourcePath),
    linkedId: asset.linkedId,
    linkedType: asset.linkedType,
    mediaAssetId: asset.mediaAssetId,
    sourceExists: fileExists(asset.sourcePath),
    sourcePath: asset.sourcePath,
    storagePath: asset.storagePath,
    storageRuleStatus: storageRuleStatusFor(asset.sourcePath, asset.storagePath),
  }));
  const eventMedia = buildEventMediaOwnership();
  const siteMedia = buildSiteMediaOwnership();
  const knownSourcePaths = new Set([
    ...productMedia.map((asset) => asset.sourcePath),
    ...productOtherMedia.map((asset) => asset.sourcePath),
    ...productPlan.skippedRows.map((row) => row.sourcePath),
    ...eventMedia.map((asset) => asset.sourcePath),
    ...siteMedia.map((asset) => asset.sourcePath),
  ]);
  const otherImageCandidates = buildOtherImageCandidates(knownSourcePaths);
  const externalMediaReferences = buildExternalMediaReferences();
  const allStorageCandidates = [
    ...productMedia,
    ...productOtherMedia,
    ...eventMedia,
    ...siteMedia,
    ...otherImageCandidates,
  ];
  const missingSources = allStorageCandidates.filter((asset) => !asset.sourceExists);
  const documentRuleBlockers = allStorageCandidates.filter((asset) => (
    asset.storageRuleStatus.includes("needs new Storage rule")
  ));
  const largeImageReview = allStorageCandidates.filter((asset) => (
    isImagePath(asset.sourcePath) && asset.fileSize > maxRecommendedImageSize
  ));
  const sharedSourceReview = buildSharedSourceReview(allStorageCandidates);

  return {
    generatedAt: new Date().toISOString(),
    notes: [
      "Read-only local audit. No Firebase network calls, no uploads, no Firestore writes, no protected static resource edits.",
      "Product image ownership reuses the existing product image migration manifest rules.",
      "Event media links are planned separately from event text because static event seed intentionally left link/photos empty.",
      "Document uploads need a new reviewed Storage rule before PDF/DOC menu assets can move to Firebase Storage.",
    ],
    summary: {
      codeOwnedCopySurfaces: codeOwnedCopySurfaces.length,
      eventDocumentsNeedingRules: documentRuleBlockers.length,
      eventMediaReferences: eventMedia.length,
      eventPhotoReferences: eventMedia.filter((asset) => asset.field === "photo").length,
      eventLinkReferences: eventMedia.filter((asset) => asset.field === "link").length,
      externalMediaReferences: externalMediaReferences.length,
      largeImageReview: largeImageReview.length,
      missingSources: missingSources.length,
      otherImageCandidates: otherImageCandidates.length,
      productDefaultPlaceholdersSkipped: productPlan.skippedRows.length,
      productMediaCandidates: productMedia.length,
      productOtherMediaCandidates: productOtherMedia.length,
      sharedSourceReview: sharedSourceReview.length,
      siteContentDocsExpected: expectedSiteContentDocs.length,
      siteMediaAssets: siteMedia.length,
      storageCandidatesTotal: allStorageCandidates.length,
      uniqueEventMediaFiles: countUnique(eventMedia, "sourcePath"),
      uniqueSiteMediaFiles: countUnique(siteMedia, "sourcePath"),
    },
    expectedFirestoreOwnership: {
      existingAdminCollections: [
        "products",
        "productCategories",
        "events",
        "siteContent",
        "mediaAssets",
      ],
      stillNeedsPlanning: [
        "event inventory / ticket stock",
        "event menu documents",
        "site settings / navigation / UI chrome copy",
        "public-read rules and generated fallback refresh workflow",
      ],
    },
    productMedia,
    productOtherMedia,
    eventMedia,
    siteMedia,
    otherImageCandidates,
    siteContentDocs: expectedSiteContentDocs,
    codeOwnedCopySurfaces,
    externalMediaReferences,
    blockers: {
      documentRuleBlockers,
      largeImageReview,
      missingSources,
      sharedSourceReview,
    },
  };
};

const buildMarkdown = (audit) => {
  const lines = [
    "# Firebase Ownership Audit",
    "",
    `Generated: ${audit.generatedAt.slice(0, 10)}`,
    "",
    "Read-only local audit. This report does not upload files, query Firebase, create Firestore documents, edit protected static resources, or deploy rules.",
    "",
    "## Summary",
    "",
    `- Product media candidates already covered by product migration: ${audit.summary.productMediaCandidates}`,
    `- Product photo placeholders intentionally skipped: ${audit.summary.productDefaultPlaceholdersSkipped}`,
    `- Product-folder photos currently heading to Other bin: ${audit.summary.productOtherMediaCandidates}`,
    `- Event media references found: ${audit.summary.eventMediaReferences} (${audit.summary.eventPhotoReferences} photos, ${audit.summary.eventLinkReferences} menu/link files)`,
    `- Site media assets referenced by components/CSS: ${audit.summary.siteMediaAssets}`,
    `- Additional unowned local image candidates for Other bin: ${audit.summary.otherImageCandidates}`,
    `- Expected editable siteContent documents: ${audit.summary.siteContentDocsExpected}`,
    `- Code-owned UI/content surfaces still needing an owner decision: ${audit.summary.codeOwnedCopySurfaces}`,
    `- External media links needing editable ownership: ${audit.summary.externalMediaReferences}`,
    `- Missing source files: ${audit.summary.missingSources}`,
    `- Image files over 10 MB needing optimization review: ${audit.summary.largeImageReview}`,
    `- Event document/menu files needing new Storage rules: ${audit.summary.eventDocumentsNeedingRules}`,
    `- Shared source files needing reuse/linking decisions: ${audit.summary.sharedSourceReview}`,
    "",
    "## Scope Guardrails",
    "",
    "- Protected files were treated as read-only inputs for this audit.",
    "- Public product/event/content reads are not switched to Firestore by this audit.",
    "- Event photos and menu links remain intentionally absent from the current event seed until a reviewed upload/import phase is approved.",
    "- Inventory remains static and should get a separate backend plan before checkout behavior changes.",
    "",
    "## Site Content Documents",
    "",
    "| Firestore Doc | Title | Static Source |",
    "| --- | --- | --- |",
  ];

  audit.siteContentDocs.forEach((contentDoc) => {
    lines.push(tableRow([
      contentDoc.firebaseTarget,
      contentDoc.title,
      contentDoc.source,
    ]));
  });

  lines.push(
    "",
    "## Product Media Ownership",
    "",
    "Product media candidates are the same reviewed product-photo migration set. Shared default placeholders stay skipped unless Luke approves real replacement photos.",
    "",
    "| Media Asset ID | Product | Source File | Proposed Storage Path | Size Bytes | Status |",
    "| --- | --- | --- | --- | --- | --- |",
  );

  audit.productMedia.forEach((asset) => {
    lines.push(tableRow([
      asset.mediaAssetId,
      asset.productTitle,
      asset.sourcePath,
      asset.storagePath,
      String(asset.fileSize),
      asset.storageRuleStatus,
    ]));
  });

  lines.push(
    "",
    "## Product-Folder Other Bin Candidates",
    "",
    "These files are under `src/resources/images/product_photos/` but are not currently linked to a static product photo field. Some may be claimed by event media in the full-site audit and should be linked or moved in metadata instead of duplicated.",
    "",
    "| Media Asset ID | Source File | Proposed Storage Path | Size Bytes | Status |",
    "| --- | --- | --- | --- | --- |",
  );

  if (audit.productOtherMedia.length) {
    audit.productOtherMedia.forEach((asset) => {
      lines.push(tableRow([
        asset.mediaAssetId,
        asset.sourcePath,
        asset.storagePath,
        String(asset.fileSize),
        asset.storageRuleStatus,
      ]));
    });
  } else {
    lines.push("| None |  |  |  |  |");
  }

  lines.push(
    "",
    "## Event Media Ownership",
    "",
    "Event text is already mirrored through the guarded event seed/editor path. These bundled media refs still need upload/import planning before event preview/public reads can be complete.",
    "",
    "| Event | Field | Source File | Proposed Storage Path | Size Bytes | Status |",
    "| --- | --- | --- | --- | --- | --- |",
  );

  audit.eventMedia.forEach((asset) => {
    lines.push(tableRow([
      asset.eventTitle,
      asset.field,
      asset.sourcePath,
      asset.storagePath,
      String(asset.fileSize),
      asset.storageRuleStatus,
    ]));
  });

  lines.push(
    "",
    "## Site Media Ownership",
    "",
    "| Media Asset ID | Source File | Proposed Storage Path | Referenced By | Status |",
    "| --- | --- | --- | --- | --- |",
  );

  audit.siteMedia.forEach((asset) => {
    lines.push(tableRow([
      asset.mediaAssetId,
      asset.sourcePath,
      asset.storagePath,
      asset.references.map((reference) => reference.sourceFile).join("<br>"),
      asset.storageRuleStatus,
    ]));
  });

  lines.push(
    "",
    "## Other Image Candidates",
    "",
    "These images are present under `src/resources/images/` but were not claimed by product, event, or site component references. They are safest as reviewed `other` bin assets first.",
    "",
    "| Media Asset ID | Source File | Proposed Storage Path | Size Bytes | Status |",
    "| --- | --- | --- | --- | --- |",
  );

  if (audit.otherImageCandidates.length) {
    audit.otherImageCandidates.forEach((asset) => {
      lines.push(tableRow([
        asset.mediaAssetId,
        asset.sourcePath,
        asset.storagePath,
        String(asset.fileSize),
        asset.storageRuleStatus,
      ]));
    });
  } else {
    lines.push("| None |  |  |  |  |");
  }

  lines.push(
    "",
    "## Code-Owned Copy Surfaces",
    "",
    "These are not product/event/content records yet. To make the whole site a true CRUD editor, each surface needs a reviewed Firestore owner before public behavior changes.",
    "",
    "| Area | Files | Examples | Recommended Owner |",
    "| --- | --- | --- | --- |",
  );

  audit.codeOwnedCopySurfaces.forEach((surface) => {
    lines.push(tableRow([
      surface.area,
      surface.files.join("<br>"),
      surface.examples.join(", "),
      surface.recommendedOwner,
    ]));
  });

  lines.push(
    "",
    "## External Media Links",
    "",
    "| Type | Source File | URL | Suggested Owner |",
    "| --- | --- | --- | --- |",
  );

  if (audit.externalMediaReferences.length) {
    audit.externalMediaReferences.forEach((reference) => {
      lines.push(tableRow([
        reference.type,
        reference.sourceFile,
        reference.url,
        reference.ownerSuggestion,
      ]));
    });
  } else {
    lines.push("| None |  |  |  |");
  }

  lines.push(
    "",
    "## Blockers And Review Items",
    "",
    "### Event Documents Needing Rules",
    "",
    "| Source File | Proposed Storage Path | Status |",
    "| --- | --- | --- |",
  );

  if (audit.blockers.documentRuleBlockers.length) {
    audit.blockers.documentRuleBlockers.forEach((asset) => {
      lines.push(tableRow([
        asset.sourcePath,
        asset.storagePath,
        asset.storageRuleStatus,
      ]));
    });
  } else {
    lines.push("| None |  |  |");
  }

  lines.push(
    "",
    "### Large Image Review",
    "",
    "| Source File | Size Bytes | Proposed Storage Path |",
    "| --- | --- | --- |",
  );

  if (audit.blockers.largeImageReview.length) {
    audit.blockers.largeImageReview.forEach((asset) => {
      lines.push(tableRow([
        asset.sourcePath,
        String(asset.fileSize),
        asset.storagePath,
      ]));
    });
  } else {
    lines.push("| None |  |  |");
  }

  lines.push(
    "",
    "### Missing Sources",
    "",
    "| Source File | Proposed Storage Path |",
    "| --- | --- |",
  );

  if (audit.blockers.missingSources.length) {
    audit.blockers.missingSources.forEach((asset) => {
      lines.push(tableRow([
        asset.sourcePath,
        asset.storagePath,
      ]));
    });
  } else {
    lines.push("| None |  |");
  }

  lines.push(
    "",
    "### Shared Source Review",
    "",
    "These source files appear in more than one ownership candidate. Before upload/import, decide whether to reuse one Storage object, create event-specific copies, or relink existing Other-bin metadata.",
    "",
    "| Source File | Candidate Storage Paths |",
    "| --- | --- |",
  );

  if (audit.blockers.sharedSourceReview.length) {
    audit.blockers.sharedSourceReview.forEach((sharedSource) => {
      lines.push(tableRow([
        sharedSource.sourcePath,
        sharedSource.references.map((reference) => (
          `${reference.mediaAssetId}: ${reference.storagePath}`
        )).join("<br>"),
      ]));
    });
  } else {
    lines.push("| None |  |");
  }

  lines.push(
    "",
    "## Next Approval Gate",
    "",
    "Before any write phase, approve:",
    "",
    "- the event image and event document Storage paths",
    "- whether to add document upload rules for event menus and bios",
    "- which Other-bin images should be uploaded",
    "- the Firestore owner for navigation, cart, contact, product UI, event UI, and external-media settings",
    "- whether inventory moves next or remains static until checkout requirements are clarified",
  );

  return `${lines.join("\n")}\n`;
};

const writeAudit = () => {
  const audit = buildAudit();

  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, buildMarkdown(audit));
  console.log(`Wrote ${path.relative(repoRoot, markdownOutputPath)}`);
  console.log(`Wrote ${path.relative(repoRoot, jsonOutputPath)}`);
};

if (require.main === module) {
  writeAudit();
}

module.exports = {
  buildAudit,
  buildMarkdown,
  writeAudit,
};
