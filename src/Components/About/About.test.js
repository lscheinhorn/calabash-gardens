import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import About from "./About";

test("the About contact action uses the absolute public contact route", () => {
  render(
    <MemoryRouter initialEntries={["/admin/preview/home"]}>
      <About
        aboutContent={{
          button: "Get In Touch",
          contentBlocks: [],
          paragraph_1: "First paragraph",
          paragraph_2: "Second paragraph",
          title: "About Us",
        }}
      />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Get In Touch" }).getAttribute("href")).toBe("/contact");
});
