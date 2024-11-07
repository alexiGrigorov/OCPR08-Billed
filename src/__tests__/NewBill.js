/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom";

import storeMock from "../__mocks__/store.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

import router from "../app/Router.js";
import { ROUTES_PATH } from "../constants/routes.js";

import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";

describe("Given I am connected as an employee on the NewBill page", () => {
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
  window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

  let newBill;
  let file;
  let form;
  beforeEach(() => {
    document.body.innerHTML = NewBillUI();
    file = screen.getByTestId("file");
    form = screen.getByTestId("form-new-bill");

    newBill = new NewBill({
      document,
      onNavigate: jest.fn(),
      store: storeMock,
      localStorage: window.localStorage,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restore all mocks
  });

  describe("Unit tests", () => {
    describe("handleFileChange", () => {
      it("should only allow the file extensions jpg, jpeg, or png", () => {
        fireEvent.change(file, {
          target: {
            files: [new File([], "OK.jpg")],
          },
        });
        expect(file.files[0].name).toBe("OK.jpg");
        fireEvent.change(file, {
          target: {
            files: [new File([], "OK.jpeg")],
          },
        });
        expect(file.files[0].name).toBe("OK.jpeg");
        fireEvent.change(file, {
          target: {
            files: [new File([], "OK.png")],
          },
        });
        expect(file.files[0].name).toBe("OK.png");
        fireEvent.change(file, {
          target: {
            files: [new File([], "NotOK.pdf")],
          },
        });
        expect(file.value).toBeFalsy();
      });

      it("should only call the store.bills.create method if the file extension is jpg, jpeg, or png", () => {
        const billsSpy = jest.spyOn(newBill.store, "bills");

        // Mock the file input change event with a valid file extension
        fireEvent.change(file, {
          target: {
            files: [new File([], "OK.jpg")],
          },
        });
        expect(billsSpy).toHaveBeenCalled();
        billsSpy.mockClear();

        // Mock the file input change event with an invalid file extension
        fireEvent.change(file, {
          target: {
            files: [new File([], "NotOK.pdf")],
          },
        });
        expect(billsSpy).not.toHaveBeenCalled();
      });

      it("should call the store.bills.create method with the correct data", () => {
        const createSpy = jest
          .spyOn(newBill.store.bills(), "create")
          .mockResolvedValue({});
        const mockedFile = new File([], "OK.jpg");
        const formData = new FormData();
        formData.append("file", mockedFile);
        formData.append(
          "email",
          JSON.parse(localStorage.getItem("user")).email
        );
        fireEvent.change(file, {
          target: {
            files: [mockedFile],
          },
        });
        expect(createSpy).toHaveBeenCalledWith({
          data: formData,
          headers: { noContentType: true },
        });
      });

      it("should handle errors from the server by logging them to the console", async () => {
        jest
          .spyOn(newBill.store.bills(), "create")
          .mockRejectedValue("Server error");
        // Mock console.error
        const consoleErrorMock = jest.spyOn(console, "error");
        const mockedFile = new File([], "OK.jpg");
        fireEvent.change(file, {
          target: {
            files: [mockedFile],
          },
        });
        await waitFor(() => {
          expect(consoleErrorMock).toHaveBeenCalledWith("Server error");
        });
      });

      it("should update the newBill object with the fileUrl and billID", async () => {
        const mockedFile = new File([], "OK.jpg");
        fireEvent.change(file, {
          target: {
            files: [mockedFile],
          },
        });
        await waitFor(() => {
          expect(newBill.fileUrl).toBe(
            "https://localhost:3456/images/test.jpg"
          );
          expect(newBill.billId).toBe("1234");
        });
      });
    });

    describe("handleSubmit", () => {
      it("should prevent default form submission behavior", () => {
        const mockEvent = {
          target: screen.getByTestId("form-new-bill"),
          preventDefault: jest.fn(),
        };
        newBill.handleSubmit(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
      });

      it("should call updateBill with the correct bill object", () => {
        // Mock form data
        screen.getByTestId("expense-type").value = "Services en ligne";
        screen.getByTestId("expense-name").value = "OpenClassrooms";
        screen.getByTestId("datepicker").value = "2024-11-01";
        screen.getByTestId("amount").value = "400";
        screen.getByTestId("vat").value = "25";
        screen.getByTestId("pct").value = "100";
        screen.getByTestId("commentary").value = "Awesome Education";
        newBill.fileUrl = "https://localhost:3456/images/test.jpg";
        newBill.fileName = "test.jpg";
        // Mock updateBill function
        newBill.updateBill = jest.fn();
        fireEvent.submit(form);
        expect(newBill.updateBill).toHaveBeenCalledWith({
          email: JSON.parse(localStorage.getItem("user")).email,
          type: "Services en ligne",
          name: "OpenClassrooms",
          amount: 400,
          date: "2024-11-01",
          vat: "25",
          pct: 100,
          commentary: "Awesome Education",
          fileUrl: "https://localhost:3456/images/test.jpg",
          fileName: "test.jpg",
          status: "pending",
        });
      });

      it("should call onNavigate with the Bills page path", () => {
        fireEvent.submit(form);
        expect(newBill.onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
      });
    });
  });

  describe("Integration tests", () => {
    describe("When the page has loaded", () => {
      it("should have the mail icon in vertical layout be highlighted", async () => {
        document.body.innerHTML = "";
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.append(root);
        router();
        window.onNavigate(ROUTES_PATH["NewBill"]);
        await waitFor(() => screen.getByTestId("icon-mail"));
        const mailIcon = screen.getByTestId("icon-mail");
        expect(mailIcon.classList.contains("active-icon")).toBeTruthy();
      });

      it("should render the form for submitting a new bill", () => {
        expect(screen.getByTestId("form-new-bill")).toBeTruthy();
      });
    });

    describe("When I upload a file", () => {
      it("should upload the file to the server and update the fileUrl and fileName", async () => {
        const createSpy = jest.spyOn(newBill.store.bills(), "create");

        fireEvent.change(file, {
          target: {
            files: [new File([], "OK.jpg")],
          },
        });

        expect(createSpy).toHaveBeenCalled();
        await waitFor(() => {
          expect(newBill.fileUrl).toBe(
            "https://localhost:3456/images/test.jpg"
          );
          expect(newBill.billId).toBe("1234");
        });
      });

      it("should handle errors from the server by logging them to the console", async () => {
        jest
          .spyOn(newBill.store.bills(), "create")
          .mockRejectedValue("Server error");

        // Mock console.error
        const consoleErrorMock = jest.spyOn(console, "error");

        fireEvent.change(file, {
          target: {
            files: [new File([], "OK.jpg")],
          },
        });

        await waitFor(() => {
          expect(consoleErrorMock).toHaveBeenCalledWith("Server error");
        });
      });
    });

    describe("When I submit the form", () => {
      it("should submit the new bill and navigate to the Bills page", () => {
        // Mock form data
        screen.getByTestId("expense-type").value = "Services en ligne";
        screen.getByTestId("expense-name").value = "OpenClassrooms";
        screen.getByTestId("datepicker").value = "2024-11-01";
        screen.getByTestId("amount").value = "400";
        screen.getByTestId("vat").value = "25";
        screen.getByTestId("pct").value = "100";
        screen.getByTestId("commentary").value = "Awesome Education";
        newBill.fileUrl = "https://localhost:3456/images/test.jpg";
        newBill.fileName = "test.jpg";

        // Mock updateBill function
        newBill.updateBill = jest.fn();

        fireEvent.submit(form);

        expect(newBill.updateBill).toHaveBeenCalledWith({
          email: JSON.parse(localStorage.getItem("user")).email,
          type: "Services en ligne",
          name: "OpenClassrooms",
          amount: 400,
          date: "2024-11-01",
          vat: "25",
          pct: 100,
          commentary: "Awesome Education",
          fileUrl: "https://localhost:3456/images/test.jpg",
          fileName: "test.jpg",
          status: "pending",
        });

        expect(newBill.onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
      });

      it("should handle errors from the server by logging them to the console", async () => {
        jest
          .spyOn(newBill.store.bills(), "update")
          .mockRejectedValue("Server error");

        // Mock form data
        screen.getByTestId("expense-type").value = "Services en ligne";
        screen.getByTestId("expense-name").value = "OpenClassrooms";
        screen.getByTestId("datepicker").value = "2024-11-01";
        screen.getByTestId("amount").value = "400";
        screen.getByTestId("vat").value = "25";
        screen.getByTestId("pct").value = "100";
        screen.getByTestId("commentary").value = "Awesome Education";
        newBill.fileUrl = "https://localhost:3456/images/test.jpg";
        newBill.fileName = "test.jpg";

        // Mock console.error
        const consoleErrorMock = jest.spyOn(console, "error");

        fireEvent.submit(form);

        await waitFor(() => {
          expect(consoleErrorMock).toHaveBeenCalledWith("Server error");
        });
      });
    });
  });
});
