/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import storeMock from "../__mocks__/store.js";
import router from "../app/Router.js";
import { ROUTES_PATH } from "../constants/routes.js";

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));
    document.body.innerHTML = NewBillUI();
  });

  describe("When I am on NewBill Page", () => {
    test("Then the form should be rendered", () => {
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
    });

    test("Then the file input should accept only jpg, jpeg, and png files", () => {
      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: storeMock,
        localStorage: window.localStorage,
      });

      const fileInput = screen.getByTestId("file");
      const handleChangeFile = jest.fn(newBill.handleChangeFile);
      fileInput.addEventListener("change", handleChangeFile);

      const file = new File(["file"], "file.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(handleChangeFile).toHaveBeenCalled();
      expect(fileInput.value).toBe("");
    });

    test("Then the form submission should call handleSubmit", () => {
      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: storeMock,
        localStorage: window.localStorage,
      });

      const form = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn(newBill.handleSubmit);
      form.addEventListener("submit", handleSubmit);

      fireEvent.submit(form);

      expect(handleSubmit).toHaveBeenCalled();
    });

    test("Then the form data should be correctly processed and submitted", async () => {
      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: storeMock,
        localStorage: window.localStorage,
      });

      const form = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn(newBill.handleSubmit);
      form.addEventListener("submit", handleSubmit);

      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: "Transports" },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "Taxi" },
      });
      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: "100" },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: "2023-01-01" },
      });
      fireEvent.change(screen.getByTestId("vat"), {
        target: { value: "20" },
      });
      fireEvent.change(screen.getByTestId("pct"), {
        target: { value: "20" },
      });
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: "Business trip" },
      });

      fireEvent.submit(form);

      await waitFor(() => expect(handleSubmit).toHaveBeenCalled());
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
    });
  });
});
