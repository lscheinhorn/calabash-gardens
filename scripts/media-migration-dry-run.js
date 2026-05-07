const fs = require("fs");
const path = require("path");

const {
  buildMediaAssetPlan,
  repoRoot,
} = require("./product-image-migration-manifest");

const outputPath = path.join(repoRoot, "docs/media-migration-dry-run.md");
const jsonOutputPath = path.join(repoRoot, "docs/media-migration-dry-run.json");
const optimizedAssetsDir = path.join(repoRoot, ".media-migration-assets");
const maxUploadSize = 10 * 1024 * 1024;

const contentTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const escapeMarkdown = (value) => String(value || "").replace(/\|/g, "\\|");

const contentTypeFor = (sourcePath) => {
  const extension = path.extname(sourcePath).toLowerCase();

  return contentTypes[extension] || "image/*";
};

const fileSizeFor = (sourcePath) => {
  const absolutePath = path.join(repoRoot, sourcePath);

  return fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : 0;
};

const optimizedPathFor = (storagePath) => path.join(optimizedAssetsDir, storagePath);

const uploadSourceFor = (asset) => {
  const optimizedAbsolutePath = optimizedPathFor(asset.storagePath);

  if (fs.existsSync(optimizedAbsolutePath)) {
    return path.relative(repoRoot, optimizedAbsolutePath);
  }

  return asset.sourcePath;
};

const withFileMetadata = (asset) => ({
  ...asset,
  contentType: contentTypeFor(uploadSourceFor(asset)),
  originalSize: fileSizeFor(asset.sourcePath),
  size: fileSizeFor(uploadSourceFor(asset)),
  uploadSourcePath: uploadSourceFor(asset),
  usesOptimizedUpload: uploadSourceFor(asset) !== asset.sourcePath,
});

const buildMediaAssetDoc = (asset) => ({
  alt: asset.alt,
  bin: asset.bin,
  contentType: asset.contentType,
  linkedId: asset.linkedId,
  linkedType: asset.linkedType,
  size: asset.size,
  source: "static-product-photo-migration",
  sourcePath: asset.sourcePath,
  status: asset.status,
  storagePath: asset.storagePath,
  tags: asset.tags,
  title: asset.title,
});

const buildDryRun = () => {
  const plan = buildMediaAssetPlan();
  const productAssets = plan.productMediaAssets.map(withFileMetadata);
  const otherAssets = plan.otherMediaAssets.map(withFileMetadata);
  const allAssets = [...productAssets, ...otherAssets];
  const oversizedAssets = allAssets.filter((asset) => asset.size >= maxUploadSize);
  const productPhotoUpdates = productAssets.reduce((updatesByProduct, asset) => {
    const existingUpdate = updatesByProduct.get(asset.productId) || {
      productId: asset.productId,
      productTitle: asset.productTitle,
      photos: [],
    };

    existingUpdate.photos.push(asset.productPhoto);
    updatesByProduct.set(asset.productId, existingUpdate);

    return updatesByProduct;
  }, new Map());

  const mediaAssetDocuments = allAssets.map((asset) => ({
    id: asset.mediaAssetId,
    data: buildMediaAssetDoc(asset),
  }));

  return {
    allAssets,
    mediaAssetDocuments,
    otherAssets,
    oversizedAssets,
    productAssets,
    productPhotoUpdates: Array.from(productPhotoUpdates.values()),
    skippedPlaceholderCount: plan.skippedRows.length,
  };
};

const tableRow = (cells) => cells
  .map(escapeMarkdown)
  .join(" | ")
  .replace(/^/, "| ")
  .replace(/$/, " |");

const buildMarkdown = (dryRun) => {
  const now = new Date().toISOString().slice(0, 10);
  const lines = [
    "# Media Migration Dry Run",
    "",
    `Generated: ${now}`,
    "",
    "Dry-run only. This report does not upload files, create Firestore documents, update products, edit static resources, or deploy rules.",
    "",
    "## Summary",
    "",
    `- Storage uploads planned: ${dryRun.allAssets.length}`,
    `- Product image uploads planned: ${dryRun.productAssets.length}`,
    `- Other image uploads planned: ${dryRun.otherAssets.length}`,
    `- mediaAssets documents planned: ${dryRun.allAssets.length}`,
    `- Product documents that would receive photo references: ${dryRun.productPhotoUpdates.length}`,
    `- Product photo references planned: ${dryRun.productAssets.length}`,
    `- Default placeholder references skipped: ${dryRun.skippedPlaceholderCount}`,
    `- Upload blockers over 10 MB: ${dryRun.oversizedAssets.length}`,
    `- Optimized upload copies used: ${dryRun.allAssets.filter((asset) => asset.usesOptimizedUpload).length}`,
    "",
  ];

  if (dryRun.oversizedAssets.length) {
    lines.push(
      "## Upload Blockers",
      "",
      "These files exceed the current 10 MB Storage rule limit and need resizing/compression or an approved rules change before a real upload.",
      "",
    "| Media Asset ID | Upload Source File | Size Bytes | Storage Path |",
    "| --- | --- | --- | --- |",
    );

    dryRun.oversizedAssets.forEach((asset) => {
      lines.push(tableRow([
        asset.mediaAssetId,
        asset.uploadSourcePath,
        String(asset.size),
        asset.storagePath,
      ]));
    });

    lines.push("");
  }

  lines.push(
    "## Planned Storage Uploads",
    "",
    "| Media Asset ID | Bin | Original Source File | Upload Source File | Storage Path | Content Type | Upload Size Bytes | Original Size Bytes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  );

  dryRun.allAssets.forEach((asset) => {
    lines.push(tableRow([
      asset.mediaAssetId,
      asset.bin,
      asset.sourcePath,
      asset.uploadSourcePath,
      asset.storagePath,
      asset.contentType,
      String(asset.size),
      String(asset.originalSize),
    ]));
  });

  lines.push(
    "",
    "## Planned mediaAssets Documents",
    "",
    "| Document ID | Title | Bin | Linked Type | Linked ID | Status | Alt | Tags | Content Type | Size Bytes | Source | Source Path | Storage Path |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  );

  dryRun.mediaAssetDocuments.forEach((document) => {
    const doc = document.data;

    lines.push(tableRow([
      document.id,
      doc.title,
      doc.bin,
      doc.linkedType,
      doc.linkedId,
      doc.status,
      doc.alt,
      doc.tags.join(", "),
      doc.contentType,
      String(doc.size),
      doc.source,
      doc.sourcePath,
      doc.storagePath,
    ]));
  });

  lines.push(
    "",
    "## Planned Product Photo Updates",
    "",
    "These updates would merge new `photos` references into existing Firestore product drafts after upload. Static product files remain unchanged.",
    "",
    "| Product ID | Product | Exact Photo Objects |",
    "| --- | --- | --- |",
  );

  dryRun.productPhotoUpdates.forEach((update) => {
    const references = update.photos.map((photo) => (
      `path: ${photo.path}; alt: "${photo.alt}"; mediaAssetId: ${photo.mediaAssetId}; sortOrder: ${photo.sortOrder}`
    )).join("<br>");

    lines.push(tableRow([
      update.productId,
      update.productTitle,
      references,
    ]));
  });

  lines.push(
    "",
    "Exact write payloads are also available in `docs/media-migration-dry-run.json`.",
    "",
    "## Next Approval Gate",
    "",
    "Before a real upload/import run, approve:",
    "",
    "- deploying reviewed Firestore and Storage rules for `mediaAssets` and `other-images`",
    "- uploading the listed files to the listed Storage paths",
    "- creating the listed `mediaAssets` documents",
    "- attaching the listed product photo references to Firestore products",
    "- keeping default placeholder products skipped",
  );

  return `${lines.join("\n")}\n`;
};

const writeDryRun = () => {
  const dryRun = buildDryRun();
  const markdown = buildMarkdown(dryRun);
  const json = JSON.stringify({
    mediaAssetDocuments: dryRun.mediaAssetDocuments,
    productPhotoUpdates: dryRun.productPhotoUpdates,
    storageUploads: dryRun.allAssets.map((asset) => ({
      contentType: asset.contentType,
      mediaAssetId: asset.mediaAssetId,
      originalSize: asset.originalSize,
      size: asset.size,
      sourcePath: asset.sourcePath,
      storagePath: asset.storagePath,
      uploadSourcePath: asset.uploadSourcePath,
      usesOptimizedUpload: asset.usesOptimizedUpload,
    })),
    uploadBlockers: dryRun.oversizedAssets.map((asset) => ({
      mediaAssetId: asset.mediaAssetId,
      size: asset.size,
      uploadSourcePath: asset.uploadSourcePath,
      storagePath: asset.storagePath,
    })),
  }, null, 2);

  fs.writeFileSync(outputPath, markdown);
  fs.writeFileSync(jsonOutputPath, `${json}\n`);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
  console.log(`Wrote ${path.relative(repoRoot, jsonOutputPath)}`);
};

if (require.main === module) {
  writeDryRun();
}

module.exports = {
  buildDryRun,
  buildMediaAssetDoc,
  buildMarkdown,
  writeDryRun,
};
