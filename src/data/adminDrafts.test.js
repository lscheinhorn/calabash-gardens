import {
  applyAdminDrafts,
  buildAdminDraftPublishPreview,
} from "./adminDrafts";
import {
  contentFingerprintForTarget,
  operationalSnapshotForTarget,
  serializeOperationalSnapshot,
} from "./adminDraftPublishModel";

const product = (overrides = {}) => ({
  id: "preview-product",
  title: "Live title",
  variants: [{
    active: true,
    id: "jar",
    inventoryTracked: true,
    label: "Jar",
    lowStockThreshold: 2,
    price: "15.00",
    priceOptionIndex: 0,
    sku: "PREVIEW-JAR",
    sortOrder: 0,
    stockOnHand: 10,
  }],
  ...overrides,
});

const draftFor = ({ base, data, targetCollection = "products" }) => {
  const { id, ...baseData } = base;

  return {
    data,
    draftBaseContentFingerprint: contentFingerprintForTarget(targetCollection, baseData),
    draftBaseContentRevision: 0,
    draftBaseOperationalJson: serializeOperationalSnapshot(
      operationalSnapshotForTarget(targetCollection, baseData),
    ),
    draftBaseTargetExists: true,
    draftDeletedFields: [],
    draftRevision: 1,
    draftStatus: "draft",
    targetCollection,
    targetId: id,
  };
};

describe("admin draft preview conflicts", () => {
  test("ignores UI document IDs and previews the effective live inventory", () => {
    const base = product();
    const draft = draftFor({
      base,
      data: product({ title: "Draft title" }),
    });
    const currentLive = product({
      variants: [{
        ...product().variants[0],
        stockOnHand: 7,
      }],
    });

    const [preview] = applyAdminDrafts([currentLive], [draft], "products");
    const publishPreview = buildAdminDraftPublishPreview({
      draft,
      liveData: currentLive,
      targetCollection: "products",
    });

    expect(preview.title).toBe("Draft title");
    expect(preview.variants[0].stockOnHand).toBe(7);
    expect(preview._draftConflict).toBeUndefined();
    expect(publishPreview.title).toBe("Draft title");
    expect(publishPreview.variants[0].stockOnHand).toBe(7);
  });

  test("shows current live content and marks a content conflict", () => {
    const base = product();
    const draft = draftFor({
      base,
      data: product({ title: "Draft title" }),
    });
    const currentLive = product({ title: "Newer live title" });

    const [preview] = applyAdminDrafts([currentLive], [draft], "products");

    expect(preview.title).toBe("Newer live title");
    expect(preview._draftConflict).toMatch(/live content changed/i);
  });

  test("shows current live inventory and marks a same-field inventory conflict", () => {
    const base = product();
    const draft = draftFor({
      base,
      data: product({
        title: "Draft title",
        variants: [{
          active: true,
          id: "tin",
          inventoryTracked: true,
          label: "Tin",
          lowStockThreshold: 1,
          price: "12.00",
          priceOptionIndex: 1,
          sku: "PREVIEW-TIN",
          sortOrder: 1,
          stockOnHand: 4,
        }],
      }),
    });
    const currentLive = product({
      variants: [{
        ...product().variants[0],
        stockOnHand: 7,
      }],
    });

    const [preview] = applyAdminDrafts([currentLive], [draft], "products");

    expect(preview.title).toBe("Live title");
    expect(preview.variants[0].stockOnHand).toBe(7);
    expect(preview._draftConflict).toMatch(/option this draft removes/i);
  });
});
