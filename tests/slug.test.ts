import { describe, expect, it } from "vitest";

import { slugifyResearchTitle } from "../src/lib/research/slug";

describe("slugifyResearchTitle", () => {
  it("creates lowercase hyphenated slugs", () => {
    expect(slugifyResearchTitle("AI in Healthcare Systems")).toBe(
      "ai-in-healthcare-systems",
    );
  });

  it("removes repeated separators and trims edges", () => {
    expect(slugifyResearchTitle("  Data---Driven@@ Research  ")).toBe(
      "data-driven-research",
    );
  });

  it("falls back to empty slug when title has no valid chars", () => {
    expect(slugifyResearchTitle("***")).toBe("");
  });
});
