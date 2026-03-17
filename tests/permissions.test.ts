import { describe, expect, it } from "vitest";

import { canAssignRole } from "../src/lib/auth/permissions";

describe("canAssignRole", () => {
  it("allows readers without email verification", () => {
    expect(canAssignRole("reader", false)).toBe(true);
  });

  it("blocks elevated roles for unverified users", () => {
    expect(canAssignRole("editor", false)).toBe(false);
    expect(canAssignRole("admin", false)).toBe(false);
  });

  it("allows elevated roles for verified users", () => {
    expect(canAssignRole("editor", true)).toBe(true);
    expect(canAssignRole("admin", true)).toBe(true);
  });
});
