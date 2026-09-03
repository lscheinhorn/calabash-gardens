import { fireEvent, render, screen } from "@testing-library/react";

import Contact from "../Components/Contact/Contact";
import Event from "../Components/Event/Event";
import Paypal from "../Components/Paypal/Paypal";

const mockAddDoc = jest.fn();
const mockSendForm = jest.fn();

jest.mock("./deploymentMode", () => ({
  isFirebaseHostingPreview: true,
}));

jest.mock("@emailjs/browser", () => ({
  sendForm: (...args) => mockSendForm(...args),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: () => [],
}));

jest.mock("firebase/firestore", () => ({
  addDoc: (...args) => mockAddDoc(...args),
  collection: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock("firebase/functions", () => ({
  httpsCallable: jest.fn(),
}));

jest.mock("../firebase-config", () => ({
  db: {},
  functions: null,
  isFirebaseConfigured: true,
}));

describe("Firebase Hosting preview public-action safety", () => {
  beforeEach(() => {
    mockAddDoc.mockClear();
    mockSendForm.mockClear();
  });

  test("disables contact form submission", () => {
    const { container } = render(<Contact />);

    expect(screen.getByRole("button", { name: "Send" }).disabled).toBe(true);
    fireEvent.submit(container.querySelector("form"));
    expect(mockSendForm).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Contact form sending is disabled on this temporary hosting preview.",
    );
  });

  test("does not render an actionable PayPal checkout", () => {
    render(<Paypal shipping={{ pref: "GET_FROM_FILE", shipping: "17.00" }} subtotal="15.00" total="32.00" />);

    expect(screen.getByRole("status").textContent).toBe(
      "Checkout is disabled on this temporary hosting preview.",
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("does not submit an event waitlist entry from preview", () => {
    render(<Event
      event={{
        capacity: 1,
        date: new Date(2030, 5, 1),
        eventDates: ["June 1st, 2030"],
        id: "preview-event",
        inStock: true,
        info: [],
        manualSeatsReserved: 0,
        photos: [],
        priceOptions: ["50.00"],
        ticketsSold: 1,
        title: "Preview Event",
        waitlistEnabled: true,
      }}
      isPreview
    />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Preview Guest" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "preview@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Join Waitlist" }));

    expect(mockAddDoc).not.toHaveBeenCalled();
    expect(screen.getByText(
      "Waitlist signup is disabled in site preview.",
    )).not.toBeNull();
  });
});
