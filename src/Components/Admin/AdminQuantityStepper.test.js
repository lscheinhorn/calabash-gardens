import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import AdminQuantityStepper from "./AdminQuantityStepper";

const renderStepper = (props = {}) => {
  const onChange = jest.fn();

  render(
    <AdminQuantityStepper
      ariaLabel="Test quantity"
      decrementLabel="Decrease test quantity"
      incrementLabel="Increase test quantity"
      onChange={onChange}
      value="3"
      {...props}
    />,
  );

  return onChange;
};

describe("admin quantity stepper", () => {
  test("requests one-step changes without saving by itself", () => {
    const onChange = renderStepper();

    fireEvent.click(screen.getByRole("button", { name: "Decrease test quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase test quantity" }));

    expect(onChange.mock.calls).toEqual([["2"], ["4"]]);
  });

  test("accepts only whole-number text input", () => {
    const onChange = renderStepper();
    const input = screen.getByRole("textbox", { name: "Test quantity" });

    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.change(input, { target: { value: "12.5" } });
    fireEvent.change(input, { target: { value: "many" } });

    expect(onChange.mock.calls).toEqual([["12"]]);
  });

  test("honors the minimum boundary", () => {
    const onChange = renderStepper({ max: 5, min: 0, value: "0" });

    expect(screen.getByRole("button", { name: "Decrease test quantity" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Increase test quantity" }));
    expect(onChange).toHaveBeenCalledWith("1");
  });

  test("honors the maximum boundary", () => {
    const onChange = renderStepper({ max: 5, min: 0, value: "5" });

    expect(screen.getByRole("button", { name: "Increase test quantity" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Decrease test quantity" }));
    expect(onChange).toHaveBeenCalledWith("4");
  });
});
