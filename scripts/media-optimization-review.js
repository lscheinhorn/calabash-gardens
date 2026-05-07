const fs = require("fs");
const path = require("path");

const { repoRoot } = require("./product-image-migration-manifest");

const dryRunPath = path.join(repoRoot, "docs/media-migration-dry-run.json");
const outputPath = path.join(repoRoot, "docs/media-optimization-review.html");

const formatBytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const relativeFromDocs = (sourcePath) => `../${sourcePath}`;

const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const buildReviewHtml = () => {
  if (!fs.existsSync(dryRunPath)) {
    throw new Error("Run npm run plan:media-migration before generating the optimization review.");
  }

  const dryRun = JSON.parse(fs.readFileSync(dryRunPath, "utf8"));
  const optimizedUploads = dryRun.storageUploads.filter((upload) => upload.usesOptimizedUpload);
  const now = new Date().toISOString().slice(0, 10);

  const rows = optimizedUploads.map((upload) => `
      <section class="comparison">
        <h2>${escapeHtml(upload.mediaAssetId)}</h2>
        <div class="meta">
          <span>Original: ${escapeHtml(formatBytes(upload.originalSize))}</span>
          <span>Optimized: ${escapeHtml(formatBytes(upload.size))}</span>
          <span>Storage path: ${escapeHtml(upload.storagePath)}</span>
        </div>
        <div class="images">
          <figure>
            <img alt="Original ${escapeHtml(upload.mediaAssetId)}" src="${escapeHtml(relativeFromDocs(upload.sourcePath))}">
            <figcaption>Original source</figcaption>
          </figure>
          <figure>
            <img alt="Optimized ${escapeHtml(upload.mediaAssetId)}" src="${escapeHtml(relativeFromDocs(upload.uploadSourcePath))}">
            <figcaption>Optimized upload copy</figcaption>
          </figure>
        </div>
      </section>`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Media Optimization Review</title>
  <style>
    body {
      color: #302936;
      font-family: Arial, sans-serif;
      line-height: 1.45;
      margin: 0;
      padding: 24px;
    }

    header,
    .comparison {
      margin: 0 auto 28px;
      max-width: 1120px;
    }

    h1,
    h2 {
      color: #735284;
      margin: 0 0 10px;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }

    .meta span {
      background: #f9f8fa;
      border: 1px solid #e5deea;
      border-radius: 999px;
      color: #5f5366;
      font-size: 13px;
      font-weight: 700;
      padding: 5px 9px;
    }

    .images {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    figure {
      border: 1px solid #e5deea;
      border-radius: 6px;
      margin: 0;
      padding: 10px;
    }

    img {
      display: block;
      height: auto;
      max-height: 580px;
      object-fit: contain;
      width: 100%;
    }

    figcaption {
      color: #5f5366;
      font-size: 13px;
      font-weight: 700;
      margin-top: 8px;
    }

    @media (max-width: 800px) {
      .images {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Media Optimization Review</h1>
    <p>Generated: ${escapeHtml(now)}. Local review only. This file compares original project images with optimized migration upload copies and does not upload or write data.</p>
  </header>
${rows || "  <p>No optimized upload copies are used in the current dry run.</p>"}
</body>
</html>
`;
};

const writeReview = () => {
  fs.writeFileSync(outputPath, buildReviewHtml());
  console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
};

if (require.main === module) {
  writeReview();
}

module.exports = {
  buildReviewHtml,
  writeReview,
};
