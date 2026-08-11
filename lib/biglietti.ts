/** Dov'è il pannello argentato dentro l'immagine di ciascun biglietto.
 *
 *  Frazioni del lato della carta, non pixel: l'immagine viene servita a risoluzioni diverse a
 *  seconda del telefono, e le frazioni restano valide.
 *
 *  GENERATO da `scripts/biglietti.mjs`, che misura il pannello sull'immagine cercando la
 *  macchia connessa di pixel chiari e poco saturi che riempie il proprio riquadro. Non
 *  scriverli a mano: a occhio si sbaglia di qualche pixel, e basta quello perché la griglia
 *  non combaci con l'argento stampato e la carta smetta di sembrare vera.
 */
export type AreaGioco = { x: number; y: number; w: number; h: number };

export const AREE: Record<"gratta2" | "gratta3" | "gratta5", AreaGioco> = {
  gratta2: { x: 0.17442606516290726, y: 0.37720574162679427, w: 0.6636791979949874, h: 0.39869856459330144 },
  gratta3: { x: 0.1318688524590164, y: 0.3714418604651163, w: 0.7165901639344262, h: 0.3175813953488372 },
  gratta5: { x: 0.14936340852130325, y: 0.567169164882227, w: 0.7138045112781954, h: 0.3281884368308351 },
};
