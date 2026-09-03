import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import AdminPreviewFrame from "./AdminPreviewFrame";

const mockPreviewStatus = jest.fn(() => <div>Preview inventory status</div>);
const mockLoadAdminDrafts = jest.fn();
const mockLoadContent = jest.fn();
const mockLoadEvents = jest.fn();
const mockLoadProducts = jest.fn();

jest.mock("../../config/deploymentMode", () => ({
  isFirebaseHostingPreview: true,
}));

jest.mock("../../firebase-config", () => ({
  db: {},
  isFirebaseConfigured: true,
  storage: {},
}));

jest.mock("../../data/adminDrafts", () => ({
  loadAdminDrafts: (...args) => mockLoadAdminDrafts(...args),
}));

jest.mock("../../data/publicContentAdapter", () => ({
  loadFirestoreSiteContentForPublic: (...args) => mockLoadContent(...args),
}));

jest.mock("../../data/publicEventAdapter", () => ({
  loadFirestoreEventsForPublic: (...args) => mockLoadEvents(...args),
}));

jest.mock("../../data/publicProductAdapter", () => ({
  loadFirestoreProductsForPublic: (...args) => mockLoadProducts(...args),
}));

jest.mock("./AdminProductPreviewStatus", () => (props) => {
  mockPreviewStatus(props);
  return <div>Preview inventory status</div>;
});
jest.mock("../Header/Header", () => () => null);
jest.mock("../Footer/Footer", () => () => null);
jest.mock("../Shop/Shop", () => ({ productsOverride, renderProductPreviewItem }) => (
  <main>
    {renderProductPreviewItem(productsOverride[0], <div>Preview product</div>)}
  </main>
));

test("direct Hosting preview URLs cannot enable edit or inventory controls", async () => {
  mockLoadAdminDrafts.mockResolvedValue([]);
  mockLoadContent.mockResolvedValue({
    content: { home: {} },
    draftConflicts: [],
    experienceBlurb: [],
    experienceBlurbBlocks: {},
  });
  mockLoadEvents.mockResolvedValue([]);
  mockLoadProducts.mockResolvedValue([{
    id: "preview-product",
    isActive: true,
    isHighlighted: false,
    key: "preview-product-key",
    title: "Preview Product",
  }]);

  render(
    <MemoryRouter initialEntries={["/admin/preview/shop?edit=content"]}>
      <Routes>
        <Route path="/admin/preview/:previewTab" element={<AdminPreviewFrame />} />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByText("Preview product");

  expect(screen.queryByRole("button", { name: "Turn full preview edit mode on" })).toBeNull();
  expect(screen.queryByText("Edit")).toBeNull();
  await waitFor(() => expect(mockPreviewStatus).toHaveBeenCalled());
  expect(mockPreviewStatus).toHaveBeenLastCalledWith(expect.objectContaining({
    canEditInventory: false,
  }));
});
