import { buildAdminProductPreviewState } from "./adminProductPreviewState";
import {
  operationalSnapshotForTarget,
  serializeOperationalSnapshot,
} from "./adminDraftPublishModel";

const configuredProduct = (overrides = {}) => ({
  id: "saffron-maple-syrup",
  priceOptions: [
    { option: "4 oz", price: "15.00" },
    { option: "8 oz", price: "27.00" },
  ],
  variants: [
    {
      active: true,
      id: "4-oz",
      inventoryTracked: true,
      label: "4 oz",
      lowStockThreshold: null,
      price: "15.00",
      priceOptionIndex: 0,
      sku: "CG-SAFFRON-MAPLE-SYRUP-4-OZ",
      sortOrder: 0,
      stockOnHand: 10,
    },
    {
      active: true,
      id: "8-oz",
      inventoryTracked: true,
      label: "8 oz",
      lowStockThreshold: 2,
      price: "27.00",
      priceOptionIndex: 1,
      sku: "CG-SAFFRON-MAPLE-SYRUP-8-OZ",
      sortOrder: 1,
      stockOnHand: 0,
    },
  ],
  ...overrides,
});

describe("admin product preview state", () => {
  test("reports exact configured option inventory", () => {
    const state = buildAdminProductPreviewState(configuredProduct());

    expect(state.inventory).toEqual({
      isConfigured: true,
      options: [
        { active: true, label: "4 oz", stockOnHand: 10 },
        { active: true, label: "8 oz", stockOnHand: 0 },
      ],
    });
  });

  test.each([
    ["missing variants", { variants: [] }],
    ["missing SKU", { variants: configuredProduct().variants.map((variant, index) => (
      index === 0 ? { ...variant, sku: "" } : variant
    )) }],
    ["duplicate price index", { variants: configuredProduct().variants.map((variant) => (
      { ...variant, priceOptionIndex: 0 }
    )) }],
    ["invalid stock", { variants: configuredProduct().variants.map((variant, index) => (
      index === 0 ? { ...variant, stockOnHand: "10" } : variant
    )) }],
    ["untracked option", { variants: configuredProduct().variants.map((variant, index) => (
      index === 0 ? { ...variant, inventoryTracked: false } : variant
    )) }],
    ["mismatched sort order", { variants: configuredProduct().variants.map((variant, index) => (
      index === 0 ? { ...variant, sortOrder: 1 } : variant
    )) }],
    ["duplicate SKU", { variants: configuredProduct().variants.map((variant) => (
      { ...variant, sku: "CG-DUPLICATE" }
    )) }],
  ])("marks %s as inventory not set up", (label, overrides) => {
    const state = buildAdminProductPreviewState(configuredProduct(overrides));

    expect(state.inventory).toEqual({ isConfigured: false, options: [] });
  });

  test("distinguishes live, saved, and conflicting drafts", () => {
    expect(buildAdminProductPreviewState(configuredProduct()).draft.state).toBe("live");

    expect(buildAdminProductPreviewState(configuredProduct({
      _draft: {
        draftUpdatedAt: { toDate: () => new Date("2026-09-02T15:55:28.638Z") },
      },
    })).draft).toEqual({
      inventoryEdited: false,
      savedAt: "2026-09-02T15:55:28.638Z",
      state: "saved",
    });

    expect(buildAdminProductPreviewState(configuredProduct({
      _draft: {},
      _draftConflict: "Live content changed.",
    })).draft.state).toBe("conflict");
  });

  test("never reports live-only when draft loading was unavailable", () => {
    const state = buildAdminProductPreviewState(configuredProduct(), {
      draftStatusAvailable: false,
    });

    expect(state.draft).toEqual({
      inventoryEdited: false,
      savedAt: "",
      state: "unavailable",
    });
  });

  test("identifies whether a saved draft edits operational inventory", () => {
    const liveProduct = configuredProduct();
    const draftBaseOperationalJson = serializeOperationalSnapshot(
      operationalSnapshotForTarget("products", liveProduct),
    );
    const contentOnlyDraft = {
      data: {
        ...liveProduct,
        title: "Updated title",
      },
      draftBaseOperationalJson,
    };
    const inventoryDraft = {
      data: configuredProduct({
        variants: liveProduct.variants.map((variant, index) => (
          index === 0 ? { ...variant, stockOnHand: 12 } : variant
        )),
      }),
      draftBaseOperationalJson,
    };

    expect(buildAdminProductPreviewState(configuredProduct({
      _draft: contentOnlyDraft,
    })).draft.inventoryEdited).toBe(false);
    expect(buildAdminProductPreviewState(configuredProduct({
      _draft: inventoryDraft,
    })).draft.inventoryEdited).toBe(true);
  });
});
