import { describe, expect, it } from "vitest";
import { creaRng, randInt, scegli } from "./rng";

describe("rng", () => {
  it("è deterministico a parità di seed", () => {
    const a = creaRng(42);
    const b = creaRng(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("seed diversi danno sequenze diverse", () => {
    const a = creaRng(1);
    const b = creaRng(2);
    expect(a()).not.toBe(b());
  });

  it("produce float in [0, 1)", () => {
    const r = creaRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("randInt rispetta gli estremi inclusi", () => {
    const r = creaRng(9);
    const visti = new Set<number>();
    for (let i = 0; i < 500; i++) visti.add(randInt(r, 3, 5));
    expect([...visti].sort()).toEqual([3, 4, 5]);
  });

  it("scegli ritorna sempre un elemento dell'array", () => {
    const r = creaRng(11);
    const arr = ["a", "b", "c"];
    for (let i = 0; i < 100; i++) expect(arr).toContain(scegli(r, arr));
  });
});
