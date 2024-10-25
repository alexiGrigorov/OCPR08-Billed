/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";

import { localStorageMock } from "../__mocks__/localStorage.js";
import storeMock from "../__mocks__/store.js";
import { bills } from "../fixtures/bills.js";

import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import router from "../app/Router.js";
import { formatDate, formatStatus } from "../app/format.js";
import BillsUI from "../views/BillsUI.js";

import Bills from "../containers/Bills.js";

beforeAll(() => {
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
  window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));
});

describe("Unit tests - Bills", () => {
  test("the getBills function should return an array of formatted bills", async () => {
    const billsContainer = new Bills({
      document: document,
      onNavigate: null,
      store: storeMock,
      localStorage: localStorageMock,
    });
    const storeBills = await billsContainer.getBills();
    expect(storeBills).toEqual(
      bills.map((bill) => ({
        ...bill,
        date: formatDate(bill.date),
        status: formatStatus(bill.status),
      }))
    );
  });
});

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
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

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    describe("When I click on the New Bill button, ", () => {
      test("When I click on the New Bill button, I should be redirected to the New Bill page", () => {
        document.body.innerHTML = BillsUI({ data: [] });
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        const billsContainer = new Bills({
          document,
          onNavigate,
          firestore: null,
          localStorage: window.localStorage,
        });
        const handleClickNewBill = jest.fn(billsContainer.handleClickNewBill);
        const newBillButton = screen.getByTestId("btn-new-bill");
        newBillButton.addEventListener("click", handleClickNewBill);
        fireEvent.click(newBillButton);
        expect(handleClickNewBill).toHaveBeenCalled();
        expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();
      });
    });

    describe("When I click on an eye icon, ", () => {
      let billsContainer;
      let eyeIcons;
      let onNavigate;

      beforeEach(() => {
        document.body.innerHTML = BillsUI({ data: bills });
        onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        billsContainer = new Bills({
          document,
          onNavigate,
          firestore: null,
          localStorage: window.localStorage,
        });
        eyeIcons = Array.from(screen.getAllByTestId("icon-eye"));
      });

      test("a modal should open", () => {
        $.fn.modal = jest.fn();
        const handleClickIconEye = jest.fn(billsContainer.handleClickIconEye);
        eyeIcons.forEach((icon) => {
          icon.addEventListener("click", () => handleClickIconEye(icon));
          fireEvent.click(icon);
          expect(handleClickIconEye).toHaveBeenCalled();
          expect($.fn.modal).toHaveBeenCalled();
        });
      });

      test("the modal should display the image of the bill", () => {
        const billUrls = eyeIcons.map((icon) =>
          icon.getAttribute("data-bill-url")
        );

        eyeIcons.forEach((icon, index) => {
          fireEvent.click(icon);
          const modaleFile = document.getElementById("modaleFile");
          const img = modaleFile.querySelector("img");
          const decodedSrc = decodeURIComponent(img.src);
          expect(decodedSrc).toBe(billUrls[index]);
          document.querySelector("button[data-dismiss='modal']").click();
        });
      });
    });
  });
});
