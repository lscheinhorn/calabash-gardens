import {
  contentFingerprintForTarget,
  DraftPublishConflictError,
  mergeDraftWithLiveOperationalData,
  operationalSnapshotForTarget,
} from "./adminDraftPublishModel";

const variant = (overrides = {}) => ({
  active: true,
  id: "jar",
  inventoryTracked: true,
  label: "Jar",
  lowStockThreshold: 2,
  price: "15.00",
  priceOptionIndex: 0,
  sku: "CG-JAR",
  sortOrder: 0,
  stockOnHand: 10,
  ...overrides,
});

const product = (overrides = {}) => ({
  category: "culinary",
  inStock: true,
  isActive: true,
  photos: [],
  priceOptions: [{ option: "Jar", price: "15.00" }],
  published: true,
  shipping: "17.00",
  title: "Test Product",
  variants: [variant()],
  ...overrides,
});

const futureDate = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const event = (overrides = {}) => ({
  capacity: 30,
  category: "Experience",
  date: futureDate(),
  eventDates: ["Future date"],
  inStock: true,
  info: ["Event description"],
  isActive: true,
  manualSeatsReserved: 2,
  photos: [],
  priceOptions: ["60.00"],
  published: true,
  shipping: "0.00",
  ticketsSold: 5,
  title: "Test Event",
  waitlistEnabled: false,
  ...overrides,
});

describe("adminDraftPublishModel", () => {
  test("product content fingerprints ignore inventory-only changes", () => {
    const baseline = product();
    const inventoryChange = product({
      variants: [variant({ lowStockThreshold: 4, stockOnHand: 7 })],
    });
    const contentChange = product({ title: "Changed title" });

    expect(contentFingerprintForTarget("products", inventoryChange))
      .toBe(contentFingerprintForTarget("products", baseline));
    expect(contentFingerprintForTarget("products", contentChange))
      .not.toBe(contentFingerprintForTarget("products", baseline));
  });

  test("product publishing preserves newer stock when the draft did not edit it", () => {
    const baseline = product();
    const draft = product({ title: "Updated product" });
    const live = product({ variants: [variant({ stockOnHand: 7 })] });
    const result = mergeDraftWithLiveOperationalData({
      baseOperational: operationalSnapshotForTarget("products", baseline),
      draftData: draft,
      liveData: live,
      targetCollection: "products",
      targetExists: true,
    });

    expect(result.payload.title).toBe("Updated product");
    expect(result.payload.variants[0]).toMatchObject({
      lowStockThreshold: 2,
      stockOnHand: 7,
    });
  });

  test("product publishing carries explicit optional field deletions", () => {
    const baseline = product({ sortOrder: 4 });
    const draft = product();
    const result = mergeDraftWithLiveOperationalData({
      baseOperational: operationalSnapshotForTarget("products", baseline),
      deletedFields: ["sortOrder"],
      draftData: draft,
      liveData: baseline,
      targetCollection: "products",
      targetExists: true,
    });

    expect(result.fieldsToDelete).toContain("sortOrder");
  });

  test("an intentional product inventory edit applies when live inventory is unchanged", () => {
    const baseline = product();
    const draft = product({ variants: [variant({ lowStockThreshold: 4 })] });
    const result = mergeDraftWithLiveOperationalData({
      baseOperational: operationalSnapshotForTarget("products", baseline),
      draftData: draft,
      liveData: baseline,
      targetCollection: "products",
      targetExists: true,
    });

    expect(result.payload.variants[0].lowStockThreshold).toBe(4);
    expect(result.payload.variants[0].stockOnHand).toBe(10);
  });

  test("conflicting product inventory edits are rejected", () => {
    const baseline = product();
    const draft = product({ variants: [variant({ stockOnHand: 8 })] });
    const live = product({ variants: [variant({ stockOnHand: 7 })] });

    expect(() => mergeDraftWithLiveOperationalData({
      baseOperational: operationalSnapshotForTarget("products", baseline),
      draftData: draft,
      liveData: live,
      targetCollection: "products",
      targetExists: true,
    })).toThrow(DraftPublishConflictError);
  });

  test("removing a product option with newer inventory is rejected", () => {
    const baseline = product({
      priceOptions: [
        { option: "Jar", price: "15.00" },
        { option: "Large", price: "25.00" },
      ],
      variants: [
        variant(),
        variant({ id: "large", label: "Large", price: "25.00", priceOptionIndex: 1, stockOnHand: 4 }),
      ],
    });
    const draft = product();
    const live = {
      ...baseline,
      variants: [baseline.variants[0], { ...baseline.variants[1], stockOnHand: 3 }],
    };

    expect(() => mergeDraftWithLiveOperationalData({
      baseOperational: operationalSnapshotForTarget("products", baseline),
      draftData: draft,
      liveData: live,
      targetCollection: "products",
      targetExists: true,
    })).toThrow(/option this draft removes/i);
  });

  test("event publishing preserves newer capacity, holds, ticket sales, and waitlist state", () => {
    const baseline = event();
    const draft = event({ title: "Updated event" });
    const live = event({
      capacity: 32,
      manualSeatsReserved: 4,
      ticketsSold: 7,
      waitlistEnabled: true,
    });
    const result = mergeDraftWithLiveOperationalData({
      baseOperational: operationalSnapshotForTarget("events", baseline),
      draftData: draft,
      liveData: live,
      targetCollection: "events",
      targetExists: true,
    });

    expect(result.payload).toMatchObject({
      capacity: 32,
      manualSeatsReserved: 4,
      ticketsSold: 7,
      title: "Updated event",
      waitlistEnabled: true,
    });
  });

  test("conflicting event capacity edits are rejected", () => {
    const baseline = event();
    const draft = event({ capacity: 40 });
    const live = event({ capacity: 32 });

    expect(() => mergeDraftWithLiveOperationalData({
      baseOperational: operationalSnapshotForTarget("events", baseline),
      draftData: draft,
      liveData: live,
      targetCollection: "events",
      targetExists: true,
    })).toThrow(DraftPublishConflictError);
  });

  test("event capacity cannot drop below seats already sold and held", () => {
    const baseline = event();
    const draft = event({ capacity: 6 });

    expect(() => mergeDraftWithLiveOperationalData({
      baseOperational: operationalSnapshotForTarget("events", baseline),
      draftData: draft,
      liveData: baseline,
      targetCollection: "events",
      targetExists: true,
    })).toThrow(/sold and held seats/i);
  });

  test("new events initialize tickets sold at zero", () => {
    const draft = event({ ticketsSold: 99 });
    const result = mergeDraftWithLiveOperationalData({
      baseOperational: {},
      draftData: draft,
      liveData: {},
      targetCollection: "events",
      targetExists: false,
    });

    expect(result.payload.ticketsSold).toBe(0);
    expect(result.payload.inStock).toBe(true);
  });
});
