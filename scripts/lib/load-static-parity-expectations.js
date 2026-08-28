const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createRequire } = require("module");

const requireFromReactScripts = createRequire(require.resolve("react-scripts/package.json"));
const babel = requireFromReactScripts("@babel/core");
const createReactAppPreset = requireFromReactScripts("babel-preset-react-app/create");
const parityReactAppPreset = (api, options) => createReactAppPreset(api, options, "test");

const { buildAudit: buildOwnershipAudit } = require("../firebase-ownership-audit");

const repoRoot = path.resolve(__dirname, "../..");
const sourceRoot = path.join(repoRoot, "src");
const mediaMigrationDryRunPath = path.join(repoRoot, "docs/media-migration-dry-run.json");
const assetExtensions = [
  ".docx",
  ".DOCX",
  ".jpeg",
  ".JPEG",
  ".jpg",
  ".JPG",
  ".pdf",
  ".PDF",
  ".png",
  ".PNG",
  ".webp",
  ".WEBP",
];

const loadSeedModules = () => {
  const originalJavaScriptLoader = require.extensions[".js"];
  const originalAssetLoaders = Object.fromEntries(assetExtensions.map((extension) => [
    extension,
    require.extensions[extension],
  ]));

  require.extensions[".js"] = (module, filename) => {
    if (!filename.startsWith(`${sourceRoot}${path.sep}`)) {
      originalJavaScriptLoader(module, filename);
      return;
    }

    const source = fs.readFileSync(filename, "utf8");
    const transformed = babel.transformSync(source, {
      babelrc: false,
      configFile: false,
      envName: "test",
      filename,
      presets: [[parityReactAppPreset, { flow: false, typescript: false }]],
      sourceMaps: false,
    });

    module._compile(transformed.code, filename);
  };

  assetExtensions.forEach((extension) => {
    require.extensions[extension] = (module, filename) => {
      module.exports = path.relative(repoRoot, filename);
    };
  });

  try {
    const publicEventAdapter = require(path.join(sourceRoot, "data/publicEventAdapter"));
    const eventLinkProbePath = "event-documents/parity-probe.pdf";
    const eventLinkProbeUrl = "https://parity.invalid/event-menu.pdf";
    const normalizedEventProbe = publicEventAdapter.normalizeFirestoreEventForPublic(
      {
        id: "parity-probe",
        link: eventLinkProbePath,
        title: "Parity Probe",
      },
      {
        storageUrlByPath: {
          [eventLinkProbePath]: eventLinkProbeUrl,
        },
      },
    );

    return {
      contentSeed: require(path.join(sourceRoot, "data/adminContentSeed")).buildContentSeed(),
      eventSeed: require(path.join(sourceRoot, "data/adminEventSeed")).buildEventSeed(),
      productSeed: require(path.join(sourceRoot, "data/adminProductSeed")).buildProductSeed(),
      runtimeProbes: {
        eventLinkStorageResolutionConfigured: normalizedEventProbe.link === eventLinkProbeUrl,
      },
    };
  } finally {
    require.extensions[".js"] = originalJavaScriptLoader;
    assetExtensions.forEach((extension) => {
      if (originalAssetLoaders[extension]) {
        require.extensions[extension] = originalAssetLoaders[extension];
      } else {
        delete require.extensions[extension];
      }
    });
  }
};

const reviewedUploadSourceByStoragePath = () => {
  if (!fs.existsSync(mediaMigrationDryRunPath)) {
    return new Map();
  }

  const dryRun = JSON.parse(fs.readFileSync(mediaMigrationDryRunPath, "utf8"));

  return new Map((Array.isArray(dryRun.storageUploads) ? dryRun.storageUploads : [])
    .filter((upload) => upload.storagePath && upload.uploadSourcePath)
    .map((upload) => [upload.storagePath, upload.uploadSourcePath]));
};

const withReviewedFileIdentity = (mediaAssets) => {
  const uploadSources = reviewedUploadSourceByStoragePath();

  return mediaAssets.map((mediaAsset) => {
    const uploadSourcePath = uploadSources.get(mediaAsset.storagePath) || mediaAsset.sourcePath;
    const absolutePath = path.join(repoRoot, uploadSourcePath);

    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      return mediaAsset;
    }

    const bytes = fs.readFileSync(absolutePath);

    return {
      ...mediaAsset,
      expectedMd5Hash: crypto.createHash("md5").update(bytes).digest("base64"),
      expectedSize: bytes.length,
    };
  });
};

const loadStaticParityExpectations = () => {
  const {
    contentSeed,
    eventSeed,
    productSeed,
    runtimeProbes,
  } = loadSeedModules();
  const ownershipAudit = buildOwnershipAudit();
  const mediaAssets = withReviewedFileIdentity([
    ...ownershipAudit.productMedia,
    ...ownershipAudit.productOtherMedia,
    ...ownershipAudit.eventMedia,
    ...ownershipAudit.siteMedia,
    ...ownershipAudit.otherImageCandidates,
  ]);

  return {
    categories: productSeed.categories,
    contentDocs: contentSeed.contentDocs,
    events: eventSeed.eventDocs,
    mediaAssets,
    ownershipSummary: ownershipAudit.summary,
    products: productSeed.products,
    runtimeProbes,
    seedIssues: {
      errors: [
        ...productSeed.errors,
        ...eventSeed.errors,
        ...contentSeed.errors,
      ],
      warnings: [
        ...productSeed.warnings,
        ...eventSeed.warnings,
        ...contentSeed.warnings,
      ],
    },
  };
};

module.exports = {
  loadStaticParityExpectations,
};
