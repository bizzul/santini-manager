/**
 * @jest-environment jsdom
 *
 * Test d'interazione del configuratore riga da catalogo, focalizzato sul punto
 * "override manuale del prezzo": il prezzo calcolato viene mostrato, e quando
 * l'utente lo modifica compare il badge "Modificato" mentre il prezzo calcolato
 * resta visibile e distinto nel breakdown.
 *
 * Gli endpoint /api/listino/* sono mockati; si esercita la logica client reale.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CatalogLineConfigurator } from "../catalog-line-configurator";

const PROD = {
  id: 916,
  name: "Finestra alluminio",
  internalCode: "ZZTEST-GRID",
  modalitaPrezzo: "griglia",
  categoria: "Serramenti",
  imageUrl: null,
};

const CONFIG = {
  prodotto: {
    id: 916,
    name: "Finestra alluminio",
    internalCode: "ZZTEST-GRID",
    modalitaPrezzo: "griglia",
    famigliaAperturaCod: "FIN_SING",
    codMateriale: null,
    codVetroTelaio: null,
    codTipoCassone: null,
    imageUrl: null,
    categoria: "Serramenti",
  },
  coefficienti: {
    materiale: [],
    vetroTelaio: [],
    esecuzioneAnte: [],
    tipoCassone: [],
  },
  dimensioniIncremento: [],
  supplementi: [],
};

const BREAKDOWN = {
  modalitaPrezzo: "griglia",
  prezzoBase: 450,
  incrementiDimensionali: [],
  prezzoBaseConIncrementi: 450,
  coefficienti: [],
  prezzoDopoCoefficienti: 450,
  supplementiFissi: [],
  supplementiPercentuali: [],
  prezzoUnitario: 450,
  quantita: 1,
  totale: 450,
};

function jsonRes(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => data } as Response;
}

beforeAll(() => {
  // Polyfill richiesti da Radix Dialog in jsdom
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/listino/prodotti")) return jsonRes({ prodotti: [PROD] });
    if (url.includes("/api/listino/prodotto-config")) return jsonRes(CONFIG);
    if (url.includes("/api/listino/calcola-prezzo")) return jsonRes({ breakdown: BREAKDOWN });
    return jsonRes({}, false);
  }) as jest.Mock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("CatalogLineConfigurator - override manuale prezzo", () => {
  it("mostra il prezzo calcolato e, dopo la modifica manuale, il badge 'Modificato' con il calcolato ancora visibile", async () => {
    render(
      <CatalogLineConfigurator
        domain="test"
        open
        onOpenChange={jest.fn()}
        onAdd={jest.fn()}
      />,
    );

    // 1) ricerca e selezione prodotto
    const search = await screen.findByPlaceholderText(
      "Cerca prodotto per nome o codice...",
    );
    fireEvent.change(search, { target: { value: "fin" } });

    const prodBtn = await screen.findByText("Finestra alluminio", undefined, {
      timeout: 3000,
    });
    fireEvent.click(prodBtn);

    // 2) inserimento misure (griglia)
    const larghLabel = await screen.findByText("Larghezza (mm)", undefined, {
      timeout: 3000,
    });
    const altLabel = await screen.findByText("Altezza (mm)");
    const inputOf = (labelEl: HTMLElement) =>
      labelEl.parentElement!.querySelector("input") as HTMLInputElement;
    fireEvent.change(inputOf(larghLabel), { target: { value: "700" } });
    fireEvent.change(inputOf(altLabel), { target: { value: "700" } });

    // 3) il prezzo calcolato compare nel breakdown e popola l'input
    await screen.findByText("Prezzo unitario calcolato", undefined, {
      timeout: 3000,
    });

    const priceInput = () =>
      (screen.getAllByRole("spinbutton") as HTMLInputElement[]).find(
        (i) => i.value === "450",
      );
    await waitFor(() => expect(priceInput()).toBeTruthy());

    // Prima della modifica: nessun badge "Modificato"
    expect(screen.queryByText("Modificato")).toBeNull();

    // 4) override manuale
    const input = priceInput()!;
    fireEvent.change(input, { target: { value: "600" } });

    // Badge "Modificato" visibile
    expect(await screen.findByText("Modificato")).toBeTruthy();
    // L'input riflette il valore manuale
    expect(input.value).toBe("600");
    // Il prezzo calcolato resta visibile e distinto (CHF 450.00 nel breakdown)
    expect(screen.getByText("Prezzo unitario calcolato")).toBeTruthy();
    expect(screen.getAllByText("CHF 450.00").length).toBeGreaterThan(0);
  });

  it("in caso di errore fuori fascia mostra il messaggio e disabilita 'Aggiungi al documento'", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/listino/prodotti")) return jsonRes({ prodotti: [PROD] });
      if (url.includes("/api/listino/prodotto-config")) return jsonRes(CONFIG);
      if (url.includes("/api/listino/calcola-prezzo")) {
        return jsonRes(
          { error: "Nessuna fascia in listino per queste misure." },
          false,
        );
      }
      return jsonRes({}, false);
    });

    render(
      <CatalogLineConfigurator
        domain="test"
        open
        onOpenChange={jest.fn()}
        onAdd={jest.fn()}
      />,
    );

    const search = await screen.findByPlaceholderText(
      "Cerca prodotto per nome o codice...",
    );
    fireEvent.change(search, { target: { value: "fin" } });
    fireEvent.click(await screen.findByText("Finestra alluminio", undefined, { timeout: 3000 }));

    const larghLabel = await screen.findByText("Larghezza (mm)", undefined, { timeout: 3000 });
    const altLabel = await screen.findByText("Altezza (mm)");
    const inputOf = (labelEl: HTMLElement) =>
      labelEl.parentElement!.querySelector("input") as HTMLInputElement;
    fireEvent.change(inputOf(larghLabel), { target: { value: "9999" } });
    fireEvent.change(inputOf(altLabel), { target: { value: "9999" } });

    // messaggio d'errore visibile
    expect(
      await screen.findByText("Nessuna fascia in listino per queste misure.", undefined, {
        timeout: 3000,
      }),
    ).toBeTruthy();

    // bottone di conferma disabilitato -> niente inserimento a prezzo errato
    const addBtn = screen.getByRole("button", {
      name: "Aggiungi al documento",
    }) as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);
  });
});
