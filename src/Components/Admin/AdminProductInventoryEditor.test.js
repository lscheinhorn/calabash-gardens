import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { getDocs } from "firebase/firestore";

import AdminProductInventoryEditor from "./AdminProductInventoryEditor";
import { InventoryConflictError } from "./inventoryAdminModel";
import { saveInventoryRowsTransaction } from "./inventoryAdminTransactions";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => ({ path: "products" })),
  getDocs: jest.fn(),
}));

jest.mock("./inventoryAdminTransactions", () => ({
  saveInventoryRowsTransaction: jest.fn(),
}));

const productDocument = ({
  id = "saffron-maple-syrup",
  priceOptions = [{ option: "4 oz", price: "15.00" }],
  variants = [{
    active: true,
    id: "4-oz",
    inventoryTracked: true,
    label: "4 oz",
    lowStockThreshold: 2,
    price: "15.00",
    priceOptionIndex: 0,
    sku: "CG-SAFFRON-MAPLE-SYRUP-4-OZ",
    sortOrder: 0,
    stockOnHand: 10,
  }],
} = {}) => ({
  data: () => ({
    isActive: true,
    priceOptions,
    published: true,
    title: "Saffron Maple Syrup",
    variants,
  }),
  id,
});

const renderEditor = (props = {}) => {
  const onCancel = jest.fn();
  const onSaved = jest.fn(async () => {});

  render(
    <AdminProductInventoryEditor
      db={{}}
      onCancel={onCancel}
      onSaved={onSaved}
      productId="saffron-maple-syrup"
      productLabel="Saffron Maple Syrup"
      {...props}
    />,
  );

  return { onCancel, onSaved };
};

describe("admin preview product inventory editor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDocs.mockResolvedValue({ docs: [productDocument()] });
    saveInventoryRowsTransaction.mockResolvedValue(undefined);
  });

  test("keeps stepper changes local until Save Inventory", async () => {
    const { onSaved } = renderEditor();
    const stockInput = await screen.findByRole("textbox", {
      name: "4 oz Saffron Maple Syrup stock",
    });

    fireEvent.click(screen.getByRole("button", {
      name: "Increase 4 oz Saffron Maple Syrup stock by one",
    }));

    expect(stockInput.value).toBe("11");
    expect(screen.getByText("Unsaved inventory change")).toBeTruthy();
    expect(saveInventoryRowsTransaction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Save Inventory/i }));

    await waitFor(() => expect(saveInventoryRowsTransaction).toHaveBeenCalledTimes(1));
    expect(saveInventoryRowsTransaction.mock.calls[0][0].draftRows)
      .toEqual(expect.objectContaining({
        "product-saffron-maple-syrup-0-4-oz": expect.objectContaining({
          stockOnHand: "11",
        }),
      }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  test("requires every option during first-time inventory setup", async () => {
    getDocs.mockResolvedValue({
      docs: [productDocument({
        priceOptions: [
          { option: "4 oz", price: "15.00" },
          { option: "8 oz", price: "27.00" },
        ],
        variants: [],
      })],
    });
    renderEditor();

    const firstInput = await screen.findByRole("textbox", {
      name: "4 oz Saffron Maple Syrup stock",
    });
    const secondInput = screen.getByRole("textbox", {
      name: "8 oz Saffron Maple Syrup stock",
    });
    const saveButton = screen.getByRole("button", { name: /Save Inventory/i });

    expect(firstInput.value).toBe("");
    expect(secondInput.value).toBe("");
    expect(saveButton.disabled).toBe(true);
    expect(screen.queryByText("Unsaved inventory change")).toBeNull();

    fireEvent.change(firstInput, { target: { value: "4" } });
    expect(saveButton.disabled).toBe(true);

    fireEvent.change(secondInput, { target: { value: "0" } });
    expect(saveButton.disabled).toBe(false);
  });

  test("keeps a tracked custom option distinct during partial legacy setup", async () => {
    getDocs.mockResolvedValue({
      docs: [productDocument({
        priceOptions: [
          { option: "Small", price: "15.00" },
          { option: "Large", price: "27.00" },
        ],
        variants: [{
          active: true,
          id: "large-custom",
          inventoryTracked: true,
          label: "Large",
          lowStockThreshold: null,
          price: "27.00",
          priceOptionIndex: 1,
          sku: "JETTE-CUSTOM-LARGE",
          sortOrder: 1,
          stockOnHand: 3,
        }],
      })],
    });
    const { onSaved } = renderEditor();
    const smallInput = await screen.findByRole("textbox", {
      name: "Small Saffron Maple Syrup stock",
    });
    const largeInput = screen.getByRole("textbox", {
      name: "Large Saffron Maple Syrup stock",
    });

    fireEvent.change(smallInput, { target: { value: "4" } });
    fireEvent.change(largeInput, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Inventory/i }));

    await waitFor(() => expect(saveInventoryRowsTransaction).toHaveBeenCalledTimes(1));
    const { dirtyRows } = saveInventoryRowsTransaction.mock.calls[0][0];
    const smallRow = dirtyRows.find((row) => row.secondary === "Small");
    const largeRow = dirtyRows.find((row) => row.secondary === "Large");

    expect(smallRow).toEqual(expect.objectContaining({
      confirmSetupValuesOnSave: true,
      requireTrackedOnSave: true,
    }));
    expect(largeRow).toEqual(expect.objectContaining({
      confirmSetupValuesOnSave: true,
      requireTrackedOnSave: false,
      storedInventoryTracked: true,
    }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  test("requires and enables every untracked option even when identities already exist", async () => {
    getDocs.mockResolvedValue({
      docs: [productDocument({
        priceOptions: [
          { option: "4 oz", price: "15.00" },
          { option: "8 oz", price: "27.00" },
        ],
        variants: [
          {
            active: false,
            id: "4-oz",
            inventoryTracked: false,
            label: "4 oz",
            lowStockThreshold: null,
            price: "15.00",
            priceOptionIndex: 0,
            sku: "CG-SAFFRON-MAPLE-SYRUP-4-OZ",
            sortOrder: 0,
            stockOnHand: 0,
          },
          {
            active: false,
            id: "8-oz",
            inventoryTracked: false,
            label: "8 oz",
            lowStockThreshold: null,
            price: "27.00",
            priceOptionIndex: 1,
            sku: "CG-SAFFRON-MAPLE-SYRUP-8-OZ",
            sortOrder: 1,
            stockOnHand: 0,
          },
        ],
      })],
    });
    const { onSaved } = renderEditor();

    const firstInput = await screen.findByRole("textbox", {
      name: "4 oz Saffron Maple Syrup stock",
    });
    const secondInput = screen.getByRole("textbox", {
      name: "8 oz Saffron Maple Syrup stock",
    });
    const saveButton = screen.getByRole("button", { name: /Save Inventory/i });

    expect(firstInput.value).toBe("");
    expect(secondInput.value).toBe("");
    fireEvent.change(firstInput, { target: { value: "4" } });
    expect(saveButton.disabled).toBe(true);
    fireEvent.change(secondInput, { target: { value: "0" } });
    expect(saveButton.disabled).toBe(false);

    fireEvent.click(saveButton);

    await waitFor(() => expect(saveInventoryRowsTransaction).toHaveBeenCalledTimes(1));
    expect(saveInventoryRowsTransaction.mock.calls[0][0].dirtyRows).toHaveLength(2);
    expect(saveInventoryRowsTransaction.mock.calls[0][0].dirtyRows.every((row) => (
      row.confirmSetupValuesOnSave === true && row.requireTrackedOnSave === true
    ))).toBe(true);
    expect(Object.values(saveInventoryRowsTransaction.mock.calls[0][0].draftRows))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          active: true,
          inventoryTracked: true,
          stockConfirmed: true,
          stockOnHand: "4",
        }),
        expect.objectContaining({
          active: true,
          inventoryTracked: true,
          stockConfirmed: true,
          stockOnHand: "0",
        }),
      ]));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  test("refreshes safely when Firestore rejects a stale quantity", async () => {
    saveInventoryRowsTransaction.mockRejectedValueOnce(new InventoryConflictError(
      "Saffron Maple Syrup stock changed in Firestore while you were editing. Inventory was refreshed; review it and save again.",
      ["product-saffron-maple-syrup-0-4-oz"],
    ));
    const { onSaved } = renderEditor();
    const stockInput = await screen.findByRole("textbox", {
      name: "4 oz Saffron Maple Syrup stock",
    });

    fireEvent.change(stockInput, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Inventory/i }));

    expect(await screen.findByText(/stock changed in Firestore while you were editing/i))
      .toBeTruthy();
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  test("keeps entered values and reports accurately when a conflict refresh fails", async () => {
    getDocs
      .mockResolvedValueOnce({ docs: [productDocument()] })
      .mockRejectedValueOnce(new Error("offline"));
    saveInventoryRowsTransaction.mockRejectedValueOnce(new InventoryConflictError(
      "Saffron Maple Syrup stock changed in Firestore while you were editing. Inventory was refreshed; review it and save again.",
      ["product-saffron-maple-syrup-0-4-oz"],
    ));
    const { onSaved } = renderEditor();
    const stockInput = await screen.findByRole("textbox", {
      name: "4 oz Saffron Maple Syrup stock",
    });

    fireEvent.change(stockInput, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Inventory/i }));

    expect(await screen.findByText(/latest inventory could not be reloaded/i)).toBeTruthy();
    expect(stockInput.value).toBe("12");
    expect(onSaved).not.toHaveBeenCalled();
  });

  test("reports and refreshes the preview when a conflicted product was removed", async () => {
    getDocs
      .mockResolvedValueOnce({ docs: [productDocument()] })
      .mockResolvedValueOnce({ docs: [] });
    saveInventoryRowsTransaction.mockRejectedValueOnce(new InventoryConflictError(
      "Saffron Maple Syrup no longer exists in Firestore. Inventory was refreshed; review it and save again.",
      ["product-saffron-maple-syrup-0-4-oz"],
    ));
    const { onSaved } = renderEditor();
    const stockInput = await screen.findByRole("textbox", {
      name: "4 oz Saffron Maple Syrup stock",
    });

    fireEvent.change(stockInput, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Inventory/i }));

    expect(await screen.findByText(/product or its inventory options were removed/i)).toBeTruthy();
    expect(screen.queryByRole("textbox", {
      name: "4 oz Saffron Maple Syrup stock",
    })).toBeNull();
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});
