import { describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/health/route";

describe("API routes", () => {
  it("returns liveness and build version from the health route", async () => {
    const response = health();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      version: "unknown",
    });
  });
});
