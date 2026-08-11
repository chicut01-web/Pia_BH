import { describe, expect, it } from "vitest";
import { BUDGET_INIZIALE, CODICE_ACCESSO, COSTI, COSTO_MINIMO, IMPORTI, TARGET_EUR } from "./config";

describe("config", () => {
  it("ha il target e il budget concordati", () => {
    expect(TARGET_EUR).toBe(27);
    expect(BUDGET_INIZIALE).toBe(100);
    expect(COSTO_MINIMO).toBe(1);
  });

  it("il costo minimo coincide col gioco più economico", () => {
    expect(Math.min(...Object.values(COSTI))).toBe(COSTO_MINIMO);
  });

  it("il codice d'accesso è normalizzato in minuscolo", () => {
    expect(CODICE_ACCESSO).toBe(CODICE_ACCESSO.toLowerCase().trim());
  });

  it("nessun importo di vincita è multiplo di 5", () => {
    expect(IMPORTI.every((i) => i % 5 !== 0)).toBe(true);
  });

  it("gli importi coprono la fascia da 1 a 12", () => {
    expect(Math.min(...IMPORTI)).toBe(1);
    expect(Math.max(...IMPORTI)).toBe(12);
  });
});
