import { beforeEach, describe, expect, it, vi } from "vitest";
import { statoIniziale } from "./engine";
import { azzera, carica, CHIAVE, salva } from "./storage";

function mockStorage() {
  const dati = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => dati.get(k) ?? null,
    setItem: (k: string, v: string) => void dati.set(k, v),
    removeItem: (k: string) => void dati.delete(k),
  });
  return dati;
}

describe("storage", () => {
  beforeEach(() => mockStorage());

  it("ritorna null quando non c'è nulla di salvato", () => {
    expect(carica()).toBeNull();
  });

  it("fa un round-trip completo dello stato", () => {
    const s = { stato: statoIniziale(99), sbloccato: true, introVista: false };
    salva(s);
    expect(carica()).toEqual(s);
  });

  it("ritorna null su JSON corrotto invece di lanciare", () => {
    const dati = mockStorage();
    dati.set(CHIAVE, "{ non json");
    expect(() => carica()).not.toThrow();
    expect(carica()).toBeNull();
  });

  it("ritorna null se mancano campi obbligatori", () => {
    const dati = mockStorage();
    dati.set(CHIAVE, JSON.stringify({ sbloccato: true }));
    expect(carica()).toBeNull();
  });

  it("ritorna null se mancano campi dentro stato", () => {
    const dati = mockStorage();
    dati.set(CHIAVE, JSON.stringify({ stato: { piuccine: 5 }, sbloccato: true, introVista: true }));
    expect(carica()).toBeNull();
  });

  it("ritorna null se stato ha solo alcuni dei campi richiesti", () => {
    const dati = mockStorage();
    dati.set(CHIAVE, JSON.stringify({ stato: { piuccine: 5, vinto: 10 }, sbloccato: true, introVista: true }));
    expect(carica()).toBeNull();
  });

  it("azzera cancella il salvataggio", () => {
    salva({ stato: statoIniziale(1), sbloccato: true, introVista: true });
    azzera();
    expect(carica()).toBeNull();
  });
});
