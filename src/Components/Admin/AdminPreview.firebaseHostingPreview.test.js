import { render, screen } from "@testing-library/react";

import AdminPreview from "./AdminPreview";

jest.mock("../../config/deploymentMode", () => ({
  isBrowserRoutingEnabled: true,
  isFirebaseHostingPreview: true,
}));

jest.mock("./ContentAdmin", () => () => null);
jest.mock("./EventAdmin", () => () => null);
jest.mock("./ProductAdmin", () => () => null);

test("read-only mode keeps the Firestore preview while removing edit entry points", () => {
  render(<AdminPreview db={{}} defaultExpanded readOnly />);

  expect(screen.getByText(
    "Read-only preview using public components with saved Firestore data.",
  )).not.toBeNull();
  expect(screen.queryByRole("button", { name: "Turn preview edit mode on" })).toBeNull();

  const previewFrame = screen.getByTitle("Firestore home Desktop preview");
  const previewUrl = new URL(previewFrame.src);

  expect(previewUrl.pathname).toBe("/admin/preview/home");
  expect(previewUrl.searchParams.has("edit")).toBe(false);
});
