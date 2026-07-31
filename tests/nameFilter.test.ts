import { describe, expect, it } from "vitest";
import { countLetterA, hasExactlyThreeAs } from "../src/nameFilter.js";

describe("countLetterA", () => {
  it("counts case-insensitively", () => {
    expect(countLetterA("David Aardsma")).toBe(4);
    expect(countLetterA("Tal Abernathy")).toBe(3);
  });
});

describe("hasExactlyThreeAs", () => {
  it("rejects a player with four occurrences", () => {
    expect(hasExactlyThreeAs("David Aardsma")).toBe(false);
  });

  it("accepts a player with exactly three occurrences", () => {
    expect(hasExactlyThreeAs("Tal Abernathy")).toBe(true);
    expect(hasExactlyThreeAs("Fernando Abad")).toBe(true);
  });

  it("rejects a player with fewer than three occurrences", () => {
    expect(hasExactlyThreeAs("Don Aase")).toBe(false);
    expect(hasExactlyThreeAs("Henry Aaron")).toBe(false);
  });

  it("is case-insensitive at the boundary", () => {
    expect(hasExactlyThreeAs("AAA Aaa")).toBe(false);
    expect(hasExactlyThreeAs("aaa")).toBe(true);
  });
});
