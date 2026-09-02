import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import AdminProductPreviewStatus from "./AdminProductPreviewStatus";

const renderStatus = (adminPreview) => renderToStaticMarkup(
  <AdminProductPreviewStatus
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

    expect(markup).toContain("Live only");
    expect(markup).toContain("Inventory not set up");
    expect(markup).not.toContain("on hand");
  });
});
