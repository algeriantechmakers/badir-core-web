import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { closeEndedInitiatives } = vi.hoisted(() => ({
  closeEndedInitiatives: vi.fn(),
}));
vi.mock("@/services/initiatives", () => ({
  InitiativeService: { closeEndedInitiatives },
}));

import { GET } from "@/app/api/cron/close-initiatives/route";

describe("close initiatives cron route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects requests without the scheduler secret", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/cron/close-initiatives"),
    );
    expect(response.status).toBe(401);
    expect(closeEndedInitiatives).not.toHaveBeenCalled();
  });

  it("closes ended initiatives for authenticated scheduler requests", async () => {
    closeEndedInitiatives.mockResolvedValue(3);
    const response = await GET(
      new NextRequest("http://localhost/api/cron/close-initiatives", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ success: true, closed: 3 }),
    );
  });
});
