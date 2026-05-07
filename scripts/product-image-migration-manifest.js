const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const productsPath = path.join(repoRoot, "src/resources/products.js");
const outputPath = path.join(repoRoot, "docs/product-image-migration-manifest.md");
const defaultPhotoPath = "src/resources/images/large_logo_no_purple_square.png";
const productPhotosDir = path.join(repoRoot, "src/resources/images/product_photos");
const excludedProductTitles = new Set([
  "Test basket",
]);
const legacyGiftProductTitles = new Set([
  "Calabash Gifts Set",
  "Calabash Gift Set",
  "Spa Day Gift Set",
  "Erotic Gift Set",
]);

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

const escapeMarkdown = (value) => String(value || "").replace(/\|/g, "\\|");

const stripLineComments = (source) => source.replace(/^\s*\/\/.*$/gm, "");

const readStringLiteral = (source, startIndex) => {
  const quote = source[startIndex];
  let value = "";
  let index = startIndex + 1;

  while (index < source.length) {
    const char = source[index];

    if (char === "\\") {
      value += source[index + 1] || "";
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

const splitTopLevelObjects = (source) => {
  const productsStart = source.indexOf("export const products = [");

  if (productsStart === -1) {
    throw new Error("Could not find products array.");
  }

  const arrayStart = source.indexOf("[", productsStart);
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

const extractStringField = (objectSource, fieldName) => {
  const sourceWithoutComments = stripLineComments(objectSource);
  const match = sourceWithoutComments.match(new RegExp(`${fieldName}\\s*:\\s*(['"\`])`));

  if (!match) {
    return "";
  }

  const literalStart = match.index + match[0].lastIndexOf(match[1]);

  return readStringLiteral(sourceWithoutComments, literalStart).value.trim();
};

const extractBooleanField = (objectSource, fieldName) => {
  const match = stripLineComments(objectSource).match(new RegExp(`${fieldName}\\s*:\\s*(true|false)`));

  return match ? match[1] === "true" : null;
};

const resolveCategory = (title, category) => {
  if (category) {
    return category;
  }

  if (legacyGiftProductTitles.has(title)) {
    return "Gifts";
  }

  return "";
};

const resolveRequirePath = (requirePath) => {
  const absolutePath = path.resolve(path.dirname(productsPath), requirePath);

  return path.relative(repoRoot, absolutePath);
};

const extractPhotos = (objectSource) => {
  const photosMatch = objectSource.match(/photos\s*:\s*\[([\s\S]*?)\]/);

  if (!photosMatch) {
    return [];
  }

  const photoSource = photosMatch[1];
  const photos = [];

  if (/\bdefaultPhoto\b/.test(photoSource)) {
    photos.push({
      kind: "default",
      sourceExpression: "defaultPhoto",
      sourcePath: defaultPhotoPath,
    });
  }

  const requirePattern = /require\(\s*(['"`])([\s\S]*?)\1\s*\)/g;
  let match = requirePattern.exec(photoSource);

  while (match) {
    photos.push({
      kind: "source",
      sourceExpression: `require("${match[2]}")`,
      sourcePath: resolveRequirePath(match[2]),
    });
    match = requirePattern.exec(photoSource);
  }

  return photos;
};

const buildManifest = () => {
  const source = fs.readFileSync(productsPath, "utf8");
  const productObjects = splitTopLevelObjects(source);
  const rows = [];

  productObjects.forEach((objectSource, productIndex) => {
    const title = extractStringField(objectSource, "title");
    const productId = slugify(title);
    const category = resolveCategory(title, extractStringField(objectSource, "category"));
    const isActive = extractBooleanField(objectSource, "isActive");
    const excludedFromSeed = excludedProductTitles.has(title);
    const photos = extractPhotos(objectSource);

    photos.forEach((photo, photoIndex) => {
      const sourceExists = fs.existsSync(path.join(repoRoot, photo.sourcePath));
      const sourceName = path.basename(photo.sourcePath);
      const proposedStoragePath = photo.kind === "source"
        ? `product-images/${productId}-${String(photoIndex + 1).padStart(2, "0")}-${safeFileName(sourceName)}`
        : "";

      rows.push({
        productIndex,
        title,
        productId,
        category,
        isActive,
        photoIndex,
        kind: photo.kind,
        sourcePath: photo.sourcePath,
        sourceExpression: photo.sourceExpression,
        sourceExists,
        proposedStoragePath,
        excludedFromSeed,
        action: photo.kind === "source" ? "candidate" : "skip-default-placeholder",
      });
    });
  });

  return rows;
};

const listUnreferencedProductPhotos = (rows) => {
  const referencedPaths = new Set(rows
    .filter((row) => row.sourcePath.startsWith("src/resources/images/product_photos/"))
    .map((row) => row.sourcePath));

  if (!fs.existsSync(productPhotosDir)) {
    return [];
  }

  return fs.readdirSync(productPhotosDir)
    .filter((fileName) => !fileName.startsWith("."))
    .map((fileName) => `src/resources/images/product_photos/${fileName}`)
    .filter((sourcePath) => !referencedPaths.has(sourcePath))
    .sort();
};

const buildMarkdown = (rows) => {
  const candidateRows = rows.filter((row) => row.action === "candidate");
  const skippedRows = rows.filter((row) => row.action !== "candidate");
  const missingRows = rows.filter((row) => !row.sourceExists);
  const unreferencedFiles = listUnreferencedProductPhotos(rows);
  const now = new Date().toISOString().slice(0, 10);
  const lines = [
    "# Product Image Migration Manifest",
    "",
    `Generated: ${now}`,
    "",
    "Dry-run only. This file maps current static product image references to proposed Firebase Storage paths. It does not upload files, write Firestore data, or change protected static resources.",
    "",
    "## Summary",
    "",
    `- Static product photo references checked: ${rows.length}`,
    `- Upload candidates: ${candidateRows.length}`,
    `- Default placeholder references skipped: ${skippedRows.length}`,
    `- Missing source files: ${missingRows.length}`,
    `- Unreferenced files in product photo folder: ${unreferencedFiles.length}`,
    "",
    "Product IDs use the same slug rule as the admin seed tool. Proposed Storage paths are intentionally stable and do not include timestamps.",
    "",
    "## Upload Candidates",
    "",
    "| Product | Product ID | Category | Active | Seed Status | Source File | Proposed Storage Path |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  candidateRows.forEach((row) => {
    lines.push([
      escapeMarkdown(row.title),
      row.productId,
      escapeMarkdown(row.category || "Uncategorized"),
      row.isActive === true ? "Yes" : "No",
      row.excludedFromSeed ? "Excluded from seed" : "Included in seed",
      row.sourceExists ? row.sourcePath : `${row.sourcePath} (missing)`,
      row.proposedStoragePath,
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  });

  lines.push(
    "",
    "## Skipped Default Placeholders",
    "",
    "These products currently point at the shared Calabash logo placeholder. They should not be uploaded as individual product images unless Luke approves that behavior.",
    "",
    "| Product | Product ID | Category | Active | Seed Status | Placeholder |",
    "| --- | --- | --- | --- | --- | --- |",
  );

  skippedRows.forEach((row) => {
    lines.push([
      escapeMarkdown(row.title),
      row.productId,
      escapeMarkdown(row.category || "Uncategorized"),
      row.isActive === true ? "Yes" : "No",
      row.excludedFromSeed ? "Excluded from seed" : "Included in seed",
      row.sourcePath,
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  });

  lines.push(
    "",
    "## Unreferenced Product Photo Files",
    "",
    "These files exist under `src/resources/images/product_photos/` but are not referenced by `src/resources/products.js` product photos. Do not delete or migrate them without separate review.",
    "",
  );

  if (unreferencedFiles.length) {
    unreferencedFiles.forEach((sourcePath) => {
      lines.push(`- ${sourcePath}`);
    });
  } else {
    lines.push("- None");
  }

  lines.push(
    "",
    "## Next Approval Gate",
    "",
    "Before any upload phase, review this manifest and approve:",
    "",
    "- which candidate images should upload",
    "- whether inactive products should receive migrated photos",
    "- whether gift-set photos should remain preserved but inactive",
    "- whether any default-placeholder products need real product photos first",
    "- whether proposed Storage paths should be used exactly as listed",
  );

  return `${lines.join("\n")}\n`;
};

const rows = buildManifest();
const markdown = buildMarkdown(rows);

fs.writeFileSync(outputPath, markdown);
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
