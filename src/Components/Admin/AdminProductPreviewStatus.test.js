import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";

import AdminProductPreviewStatus from "./AdminProductPreviewStatus";

jest.mock("./AdminProductInventoryEditor", () => function MockAdminProductInventoryEditor() {
  return <div>Inventory editor open</div>;
});

const renderStatus = (adminPreview, props = {}) => renderToStaticMarkup(
  <AdminProductPreviewStatus
    {...props}
    product={{
      adminPreview,
      id: "saffron-maple-syrup",
      title: "Saffron Maple Syrup",
    }}
  />,
);

describe("admin product preview status", () => {
  test("renders saved draft and every configured inventory option", () => {
    const markup = renderStatus({
      draft: { savedAt: "2026-09-02T15:55:28.638Z", state: "saved" },
      inventory: {
        isConfigured: true,
        options: [
          { active: true, label: "4 oz", stockOnHand: 10 },
          { active: true, label: "8 oz", stockOnHand: 0 },
        ],
      },
    });

    expect(markup).toContain("Saved draft");
    expect(markup).toContain("aria-label=\"Inventory for Saffron Maple Syrup\"");
    expect(markup).toContain("aria-label=\"4 oz, 10 on hand\"");
    expect(markup).toContain("4 oz");
    expect(markup).toContain("10 on hand");
    expect(markup).toContain("8 oz");
    expect(markup).toContain("0 on hand");
  });

  test("renders clear conflict and unavailable labels", () => {
    expect(renderStatus({
      draft: { savedAt: "", state: "conflict" },
      inventory: { isConfigured: false, options: [] },
    })).toContain("Draft conflict: saved draft cannot be previewed; live version shown");

    expect(renderStatus({
      draft: { savedAt: "", state: "unavailable" },
      inventory: { isConfigured: false, options: [] },
    })).toContain("Draft status unavailable");
  });

  test("renders the setup warning instead of partial inventory", () => {
    const markup = renderStatus({
      draft: { savedAt: "", state: "live" },
      inventory: { isConfigured: false, options: [] },
    });

    expect(markup).toContain("No draft changes");
    expect(markup).toContain("Inventory not set up");
    expect(markup).not.toContain("on hand");
  });

  test("only offers inventory editing in preview edit mode", () => {
    const adminPreview = {
      draft: { savedAt: "", state: "live" },
      inventory: { isConfigured: false, options: [] },
    };

    expect(renderStatus(adminPreview)).not.toContain("Adjust inventory for Saffron Maple Syrup");
    expect(renderStatus(adminPreview, {
      canEditInventory: true,
      db: {},
    })).toContain("Adjust inventory for Saffron Maple Syrup");
  });

  test("blocks quick inventory editing when the saved draft already edits inventory", () => {
    const markup = renderStatus({
      draft: { inventoryEdited: true, savedAt: "", state: "saved" },
      inventory: { isConfigured: true, options: [] },
    }, {
      canEditInventory: true,
      db: {},
    });

    expect(markup).toContain("disabled");
    expect(markup).toContain("Finish or discard this product draft&#x27;s inventory changes");
  });

  test("closes an open editor when draft safety changes", () => {
    const product = {
      adminPreview: {
        draft: { inventoryEdited: false, savedAt: "", state: "live" },
        inventory: { isConfigured: true, options: [] },
      },
      id: "saffron-maple-syrup",
      title: "Saffron Maple Syrup",
    };
    const { rerender } = render(
      <AdminProductPreviewStatus canEditInventory db={{}} product={product} />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Adjust inventory for Saffron Maple Syrup",
    }));
    expect(screen.getByText("Inventory editor open")).toBeTruthy();

    rerender(
      <AdminProductPreviewStatus
        canEditInventory
        db={{}}
        product={{
          ...product,
          adminPreview: {
            ...product.adminPreview,
            draft: { inventoryEdited: false, savedAt: "", state: "conflict" },
          },
        }}
      />,
    );

    expect(screen.queryByText("Inventory editor open")).toBeNull();
    expect(screen.getByRole("button", {
      name: "Adjust inventory for Saffron Maple Syrup",
    }).disabled).toBe(true);
  });
});
