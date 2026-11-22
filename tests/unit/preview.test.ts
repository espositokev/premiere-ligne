import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

describe("cookie de « voir en tant que »", () => {
  beforeEach(() => {
    process.env.PREVIEW_COOKIE_SECRET = "x".repeat(40);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("se relit tel quel et refuse toute modification", async () => {
    const { decodePreview, encodePreview } = await import("@/lib/auth/preview");
    const cookie = encodePreview({ actor: "a", target: "b", org: "o" });
    expect(decodePreview(cookie)).toMatchObject({ actor: "a", target: "b", org: "o" });

    const [body, signature] = cookie.split(".");
    const forged = Buffer.from(
      JSON.stringify({ actor: "a", target: "c", org: "o", exp: Date.now() + 1e6 }),
    ).toString("base64url");
    expect(decodePreview(`${forged}.${signature}`)).toBeNull();
    expect(decodePreview(`${body}.abc`)).toBeNull();
    expect(decodePreview(undefined)).toBeNull();
  });

  it("expire au bout d'une heure", async () => {
    const { decodePreview, encodePreview } = await import("@/lib/auth/preview");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-22T10:00:00Z"));
    const cookie = encodePreview({ actor: "a", target: "b", org: "o" });
    vi.setSystemTime(new Date("2026-11-22T11:01:00Z"));
    expect(decodePreview(cookie)).toBeNull();
  });

  it("le client d'aperçu refuse les écritures", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("[]", { status: 200 }));
    const { createPreviewClient } = await import("@/lib/auth/preview");
    const client = createPreviewClient("token");
    const { error } = await client.from("actions").delete().eq("id", "x");
    expect(error?.message).toBe("Aperçu en lecture seule");
    await client.from("actions").select("id");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });
});
