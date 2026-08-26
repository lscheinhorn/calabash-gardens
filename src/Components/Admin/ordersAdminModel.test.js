import {
  assertFulfillmentUnchanged,
  FulfillmentConflictError,
  fulfillmentFor,
  fulfillmentHasChanges,
  ordersToCsv,
  validatedFulfillmentDraft,
} from "./ordersAdminModel";

describe("ordersAdminModel", () => {
  test("validates the fixed fulfillment vocabulary and notes limit", () => {
    expect(validatedFulfillmentDraft({ notes: "Packed", status: "shipped" })).toEqual({
      notes: "Packed",
      status: "shipped",
    });
    expect(() => validatedFulfillmentDraft({ status: "paid" })).toThrow("valid fulfillment status");
    expect(() => validatedFulfillmentDraft({ notes: "x".repeat(2001), status: "new" }))
      .toThrow("2000 characters or fewer");
  });

  test("detects edits without treating line-ending changes as content changes", () => {
    const order = {
      fulfillmentNotes: "Line one\nLine two",
      fulfillmentRevision: 2,
      fulfillmentStatus: "new",
    };

    expect(fulfillmentFor(order)).toEqual({ notes: "Line one\nLine two", revision: 2, status: "new" });
    expect(fulfillmentHasChanges(order, { notes: "Line one\r\nLine two", status: "new" })).toBe(false);
    expect(fulfillmentHasChanges(order, { notes: "Line one\nLine two", status: "fulfilled" })).toBe(true);
  });

  test("rejects a stale fulfillment revision while ignoring unrelated order changes", () => {
    expect(() => assertFulfillmentUnchanged({
      baseline: { notes: "Packed", revision: 3, status: "in_progress" },
      current: {
        fulfillmentNotes: "Packed",
        fulfillmentRevision: 3,
        fulfillmentStatus: "in_progress",
        paymentStatus: "completed",
      },
    })).not.toThrow();

    expect(() => assertFulfillmentUnchanged({
      baseline: { notes: "Packed", revision: 3, status: "in_progress" },
      current: {
        fulfillmentNotes: "Packed",
        fulfillmentRevision: 4,
        fulfillmentStatus: "in_progress",
      },
    })).toThrow(FulfillmentConflictError);
  });

  test("exports quoted filtered order data and escapes spreadsheet formulas", () => {
    const csv = ordersToCsv([{
      createdAt: new Date("2026-08-26T12:00:00.000Z"),
      customer: {
        email: "\t@malicious",
        name: "\n =IMPORTXML(\"bad\")",
        phone: "  -123",
      },
      fulfillmentNotes: "Packed, then\nshipped",
      fulfillmentStatus: "shipped",
      id: "paypal_TEST",
      items: [{ quantity: 1, seatCount: 0, title: "+Suspicious item" }],
      paidAt: new Date("2026-08-26T12:01:00.000Z"),
      paymentStatus: "completed",
      shipping: { address: { address_line_1: "1 Main St", admin_area_2: "Wells River" } },
      source: "paypal_web",
      sourceOrderId: "TEST",
      sourcePaymentId: "CAPTURE",
      totals: { currency: "USD", shipping: 17, subtotal: 15, total: 32 },
    }]);

    expect(csv).toContain('"Order ID","Source Order ID"');
    expect(csv).toContain('"\'\n =IMPORTXML(""bad"")"');
    expect(csv).toContain('"\'\t@malicious"');
    expect(csv).toContain('"\'  -123"');
    expect(csv).toContain('"\'+Suspicious item x1"');
    expect(csv).toContain('"Packed, then\nshipped"');
    expect(csv).toContain('"32"');
  });
});
