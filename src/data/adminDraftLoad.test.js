import { getDocs } from "firebase/firestore";

import { loadAdminDrafts } from "./adminDrafts";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "draft-collection"),
  deleteField: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(),
}));

describe("admin draft loading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("can preserve the existing empty fallback for ordinary admin lists", async () => {
    getDocs.mockRejectedValueOnce(new Error("draft read unavailable"));

    await expect(loadAdminDrafts({
      db: {},
      targetCollection: "products",
    })).resolves.toEqual([]);
  });

  test("can fail closed when preview status must be trustworthy", async () => {
    getDocs.mockRejectedValueOnce(new Error("draft read unavailable"));

    await expect(loadAdminDrafts({
      db: {},
      targetCollection: "products",
      throwOnError: true,
    })).rejects.toThrow("draft read unavailable");
  });
});
