import { AdminAction, can, enforce, isManagementRole } from "@/lib/permissions";
import { describe, expect, it } from "vitest";

describe("management permissions", () => {
  it("allows users to create reports but not resolve them", () => {
    expect(can("USER", AdminAction.CREATE_REPORT)).toBe(true);
    expect(can("USER", AdminAction.RESOLVE_REPORT)).toBe(false);
  });

  it("allows managers to moderate but reserves admin-only actions", () => {
    expect(can("MANAGER", AdminAction.REMOVE_POST)).toBe(true);
    expect(can("MANAGER", AdminAction.ASSIGN_MANAGER)).toBe(false);
    expect(can("ADMIN", AdminAction.ASSIGN_MANAGER)).toBe(true);
  });

  it("throws a clear error when enforcement fails", () => {
    expect(() => enforce("USER", AdminAction.DISMISS_REPORT)).toThrow(
      "Forbidden: USER cannot perform dismiss:report",
    );
  });

  it("recognizes management roles", () => {
    expect(isManagementRole("ADMIN")).toBe(true);
    expect(isManagementRole("MANAGER")).toBe(true);
    expect(isManagementRole("USER")).toBe(false);
  });
});
