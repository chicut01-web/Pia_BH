export const TARGET_EUR = 27;
export const BUDGET_INIZIALE = 100;
export const COSTO_MINIMO = 1;
export const CODICE_ACCESSO = "piuccia";

export type GiocoId = "slot" | "ruota" | "gratta2" | "gratta3" | "gratta5";

export const COSTI: Record<GiocoId, number> = {
  slot: 1,
  ruota: 1,
  gratta2: 2,
  gratta3: 3,
  gratta5: 5,
};

export const NOMI_GIOCHI: Record<GiocoId, string> = {
  slot: "Slot Piuccia",
  ruota: "Ruota della Fortuna",
  gratta2: "Piuccia d'Oro",
  gratta3: "KitKat Fortunato",
  gratta5: "Vacanza Misteriosa",
};

/** Importi di vincita ammessi: interi 1..12 che non sono multipli di 5.
 *  Le cifre tonde fanno sembrare il gioco finto. */
export const IMPORTI: number[] = Array.from({ length: 12 }, (_, i) => i + 1).filter((n) => n % 5 !== 0);

/** Sopra questa soglia una vincita è "grossa". Ne esiste una sola per sessione. */
export const SOGLIA_GROSSA = 8;

/** Numero di caselle per taglio di gratta e vinci. */
export const CASELLE: Record<"gratta2" | "gratta3" | "gratta5", number> = {
  gratta2: 6,
  gratta3: 9,
  gratta5: 12,
};
