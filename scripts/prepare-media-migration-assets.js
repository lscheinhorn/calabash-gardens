const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const {
  buildMediaAssetPlan,
  repoRoot,
} = require("./product-image-migration-manifest");

const maxUploadSize = 10 * 1024 * 1024;
const optimizedAssetsDir = path.join(repoRoot, ".media-migration-assets");

const fileSizeFor = (sourcePath) => {
  const absolutePath = path.join(repoRoot, sourcePath);

  return fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : 0;
};

const allMigrationAssets = () => {
  const plan = buildMediaAssetPlan();

  return [
    ...plan.productMediaAssets,
    ...plan.otherMediaAssets,
  ];
};

const optimizeAsset = (asset) => {
  const inputPath = path.join(repoRoot, asset.sourcePath);
  const outputPath = path.join(optimizedAssetsDir, asset.storagePath);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const result = spawnSync("sips", [
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    "82",
    "--resampleWidth",
    "1800",
    inputPath,
    "--out",
    outputPath,
  ], {
    encoding: "utf8",
  });

  if (result.error) {
    throw new Error(`Could not run sips to optimize ${asset.sourcePath}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Could not optimize ${asset.sourcePath}`);
  }

  return {
    mediaAssetId: asset.mediaAssetId,
    originalSize: fileSizeFor(asset.sourcePath),
    optimizedPath: path.relative(repoRoot, outputPath),
    optimizedSize: fs.statSync(outputPath).size,
    sourcePath: asset.sourcePath,
    storagePath: asset.storagePath,
  };
};

const prepareAssets = () => {
  const oversizedAssets = allMigrationAssets().filter((asset) => (
    fileSizeFor(asset.sourcePath) >= maxUploadSize
  ));
  const optimizedAssets = oversizedAssets.map(optimizeAsset);

  return {
    optimizedAssets,
    oversizedAssets,
  };
};

const run = () => {
  const result = prepareAssets();

  if (!result.optimizedAssets.length) {
    console.log("No oversized media migration assets found.");
    return;
  }

  result.optimizedAssets.forEach((asset) => {
    console.log(`${asset.mediaAssetId}: ${asset.originalSize} -> ${asset.optimizedSize} bytes at ${asset.optimizedPath}`);
  });
};

if (require.main === module) {
  run();
}

module.exports = {
  prepareAssets,
};
