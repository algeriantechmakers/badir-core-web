import { beforeEach, describe, expect, it, vi } from "vitest";

const { signOut, revalidatePath, redirect, headers } = vi.hoisted(() => ({
  signOut: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { signOut } } }));
vi.mock("next/headers", () => ({ headers }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));

import { logoutAction } from "@/actions/logout";

describe("logoutAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    headers.mockResolvedValue(new Headers());
  });

  it("signs out, revalidates the layout, and redirects home", async () => {
    signOut.mockResolvedValue({});

    await expect(logoutAction()).resolves.toBeUndefined();

    expect(signOut).toHaveBeenCalledWith(
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("does not redirect when sign-out fails", async () => {
    signOut.mockRejectedValue(new Error("sign-out failed"));

    await expect(logoutAction()).resolves.toBeUndefined();

    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
