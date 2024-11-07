/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent, within } from "@testing-library/dom";

import { localStorageMock } from "../__mocks__/localStorage.js";
import storeMock from "../__mocks__/store.js";
import { bills as mockedBills } from "../fixtures/bills.js";

import { ROUTES_PATH } from "../constants/routes.js";
import router from "../app/Router.js";
import { formatDate, formatStatus } from "../app/format.js";
import BillsUI from "../views/BillsUI.js";

import Bills from "../containers/Bills.js";
import store from "../__mocks__/store.js";

describe("Given I am connected as an employee on the Bills page", () => {
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
  window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

  let bills;
  let newBill;
  let iconEyes;

  beforeEach(() => {
    document.body.innerHTML = BillsUI({
      data: mockedBills,
    });
    newBill = screen.getByTestId("btn-new-bill");
    iconEyes = screen.getAllByTestId("icon-eye");

    bills = new Bills({
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
    describe("handleClickNewBill", () => {
      it("should call onNavigate with the newBill route", () => {
        bills.handleClickNewBill();
        expect(bills.onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
      });
    });

    describe("handleClickIconEye", () => {
      it("should display the modal with the correct image", async () => {
        $.fn.modal = jest.fn(); // Mock jQuery modal function

        for (const iconEye of iconEyes) {
          const billUrl = iconEye.getAttribute("data-bill-url");
          fireEvent.click(iconEye);

          await waitFor(() => expect($.fn.modal).toHaveBeenCalled());
          const modalBody = document.querySelector("#modaleFile .modal-body");
          const imgElement = modalBody.querySelector("img");

          expect(imgElement.getAttribute("src")).toBe(billUrl);

          $.fn.modal.mockReset();
        }
      });
    });

    describe("getBills", () => {
      it("should return an array of formatted bills", async () => {
        const storeBills = await bills.getBills();
        const formattedMockedBills = mockedBills
          .map((bill) => ({
            ...bill,
            date: formatDate(bill.date),
            status: formatStatus(bill.status),
          }))
          .sort((a, b) => a.id.localeCompare(b.id));

        expect(storeBills.sort((a, b) => a.id.localeCompare(b.id))).toEqual(
          formattedMockedBills
        );
      });

      it("should handle corrupted data by loging the error and returning the unformatted date", async () => {
        const storeBills = await storeMock.bills().list();
        const storeBillsWithCorruptedData = [
          storeBills[0],
          storeBills[1],
          { ...storeBills[2], date: "2022-13-01" },
          { ...storeBills[3], date: "2022-01-32" },
        ];

        jest
          .spyOn(bills.store.bills(), "list")
          .mockResolvedValue(storeBillsWithCorruptedData);
        const consoleSpy = jest.spyOn(console, "log");

        const result = await bills.getBills();

        expect(consoleSpy).toHaveBeenCalledTimes(3); // 2 for the corrupted entries, 1 for the length
        expect(result).toEqual([
          {
            ...storeBills[0],
            date: formatDate(storeBills[0].date),
            status: formatStatus(storeBills[0].status),
          },
          {
            ...storeBills[1],
            date: formatDate(storeBills[1].date),
            status: formatStatus(storeBills[1].status),
          },
          {
            ...storeBills[2],
            date: "2022-13-01",
            status: formatStatus(storeBills[2].status),
          },
          {
            ...storeBills[3],
            date: "2022-01-32",
            status: formatStatus(storeBills[3].status),
          },
        ]);
      });
    });
  });

  describe("Integration tests", () => {
    describe("When the page has loaded", () => {
      it("should have the bill icon in vertical layout be highlighted", async () => {
        document.body.innerHTML = "";
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.append(root);
        router();
        window.onNavigate(ROUTES_PATH["Bills"]);
        await waitFor(() => screen.getByTestId("icon-window"));
        const windowIcon = screen.getByTestId("icon-window");
        expect(windowIcon.classList.contains("active-icon")).toBeTruthy();
      });

      it("should fetch and display the bills from the store", async () => {
        const storeBills = await store.bills().list();
        const formattedStoreBills = storeBills
          .map((bill) => ({
            ...bill,
            date: formatDate(bill.date),
            status: formatStatus(bill.status),
          }))
          .sort((a, b) => a.id.localeCompare(b.id));

        document.body.innerHTML = BillsUI({
          data: await bills.getBills(),
        });

        const rows = screen.getAllByRole("row").slice(1); // Skip the header row

        expect(rows.length).toBe(formattedStoreBills.length);

        formattedStoreBills.forEach((bill) => {
          const row = rows.find((r) => {
            const [type, name, date, amount, status] =
              within(r).getAllByRole("cell");

            return (
              type.innerHTML === bill.type &&
              name.innerHTML === bill.name &&
              date.innerHTML === bill.date &&
              amount.innerHTML === `${bill.amount} €` &&
              status.innerHTML === bill.status
            );
          });

          expect(row).toBeTruthy();
        });
      });

      it("should have the bills be ordered from earliest to latest", () => {
        console.log(document.body.innerHTML);
        const dates = screen
          .getAllByText(
            /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
          )
          .map((a) => a.innerHTML);
        const antiChrono = (a, b) => (a < b ? 1 : -1);
        const datesSorted = [...dates].sort(antiChrono);
        expect(dates).toEqual(datesSorted);
      });
    });

    describe("When I click on the new bill button", () => {
      it("should navigagte to the new bill form", async () => {
        fireEvent.click(newBill);
        expect(bills.onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
      });
    });

    describe("When I click on an eye icon", () => {
      it("should display the modal with the correct image", async () => {
        $.fn.modal = jest.fn(); // Mock jQuery modal function

        for (const iconEye of iconEyes) {
          const billUrl = iconEye.getAttribute("data-bill-url");
          fireEvent.click(iconEye);

          await waitFor(() => expect($.fn.modal).toHaveBeenCalled());
          const modalBody = document.querySelector("#modaleFile .modal-body");
          const imgElement = modalBody.querySelector("img");

          expect(imgElement.getAttribute("src")).toBe(billUrl);

          $.fn.modal.mockReset();
        }
      });
    });
  });
});
