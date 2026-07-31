import { describe, expect, it } from "vitest";
import { normalizeQuestion } from "../src/questionNormalizer.js";

describe("normalizeQuestion", () => {
  it("produces the same key for different players' names", () => {
    const a = normalizeQuestion("When was David Aardsma born?", "David Aardsma");
    const b = normalizeQuestion("When was Henry Aaron born?", "Henry Aaron");
    expect(a).toBe(b);
    expect(a).toBe("when was <player> born?");
  });

  it("ignores casing differences", () => {
    const a = normalizeQuestion("HOW TALL IS Henry Aaron?", "Henry Aaron");
    const b = normalizeQuestion("how tall is henry aaron?", "Henry Aaron");
    expect(a).toBe(b);
  });

  it("collapses extra whitespace from markup", () => {
    const result = normalizeQuestion("When was   Henry Aaron\n  born?", "Henry Aaron");
    expect(result).toBe("when was <player> born?");
  });

  it("preserves punctuation instead of stripping it", () => {
    const result = normalizeQuestion("Did Henry Aaron play?", "Henry Aaron");
    expect(result).toBe("did <player> play?");
    expect(result).not.toBe("did <player> play");
  });

  it("does not corrupt questions for regex-sensitive names", () => {
    const result = normalizeQuestion("How tall is Will Smith?", "Will Smith");
    expect(result).toBe("how tall is <player>?");
  });

  it("does not replace a substring of the player's name in isolation", () => {
    const result = normalizeQuestion("Will Smith is tall. Will he play?", "Will Smith");
    expect(result).toBe("<player> is tall. will he play?");
  });

  it("normalizes both possessive forms of a name to the same key", () => {
    const grammaticallyCorrect = normalizeQuestion(
      "What is Travis Adams' Instagram account?",
      "Travis Adams",
    );
    const withExtraS = normalizeQuestion("What is Maximo Acosta's Instagram account?", "Maximo Acosta");
    expect(grammaticallyCorrect).toBe("what is <player>'s instagram account?");
    expect(withExtraS).toBe("what is <player>'s instagram account?");
  });

  it("matches the player's name even when the question uses accented characters the directory listing omits", () => {
    const result = normalizeQuestion("How old is Gabe Álvarez?", "Gabe Alvarez");
    expect(result).toBe("how old is <player>?");
  });
});
