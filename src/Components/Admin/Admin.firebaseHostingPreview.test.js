import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import Admin from "./Admin";

const mockAdminPreview = jest.fn(() => <div>Read-only preview child</div>);
const mockGetDoc = jest.fn();
const mockSendPasswordResetEmail = jest.fn();
let mockAuthenticatedUser = null;

jest.mock("../../config/deploymentMode", () => ({
  isFirebaseHostingPreview: true,
}));

jest.mock("../../firebase-config", () => ({
  auth: {},
  db: {},
  isFirebaseConfigured: true,
  storage: {},
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (auth, callback) => {
    callback(mockAuthenticatedUser);
    return jest.fn();
  },
  sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: (...args) => mockGetDoc(...args),
}));

jest.mock("./AdminPreview", () => (props) => {
  mockAdminPreview(props);
  return <div>Read-only preview child</div>;
});
jest.mock("./ContentAdmin", () => () => <div>Content editor</div>);
jest.mock("./ContentMirrorAudit", () => () => <div>Content audit</div>);
jest.mock("./EventAdmin", () => () => <div>Event editor</div>);
jest.mock("./EventMirrorAudit", () => () => <div>Event audit</div>);
jest.mock("./InventoryAdmin", () => () => <div>Inventory editor</div>);
jest.mock("./MediaAdmin", () => () => <div>Media editor</div>);
jest.mock("./OrdersAdmin", () => () => <div>Orders editor</div>);
jest.mock("./ProductAdmin", () => () => <div>Product editor</div>);
jest.mock("./ProductMirrorAudit", () => () => <div>Product audit</div>);
jest.mock("./ProductPublicParityAudit", () => () => <div>Parity audit</div>);

describe("Firebase Hosting preview admin safety", () => {
  beforeEach(() => {
    mockAdminPreview.mockClear();
    mockGetDoc.mockReset();
    mockSendPasswordResetEmail.mockReset();
    mockAuthenticatedUser = null;
  });

  test("keeps password reset and editor sections out of the signed-out preview", () => {
    render(<Admin />);

    expect(screen.getByRole("heading", { name: "Temporary Hosting Preview" })).not.toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: "admin@example.com" },
    });
    expect(screen.queryByRole("button", { name: "Forgot Password?" })).toBeNull();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    expect(screen.queryByText("Product editor")).toBeNull();
    expect(screen.queryByText("Inventory editor")).toBeNull();
  });

  test("shows an approved admin only the read-only site preview", async () => {
    mockAuthenticatedUser = { email: "admin@example.com", uid: "approved-admin" };
    mockGetDoc.mockResolvedValue({
      data: () => ({ active: true }),
      exists: () => true,
    });

    render(<Admin />);

    await screen.findByText("Read-only preview child");

    expect(screen.getByRole("button", { name: "Site Preview" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Products" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Events" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Site Content" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Inventory" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Orders" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Photos" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Developer / Audit Tools" })).toBeNull();
    expect(mockAdminPreview).toHaveBeenCalledWith(expect.objectContaining({ readOnly: true }));
    await waitFor(() => expect(mockGetDoc).toHaveBeenCalledTimes(1));
  });
});
