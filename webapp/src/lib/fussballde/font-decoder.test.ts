import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("decodeObfuscatedText", () => {
  it("retries a font download after an earlier failure for the same font id", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("fontkit", () => ({
      create: () => ({
        characterSet: [65],
        glyphForCodePoint: () => ({ name: "one" }),
      }),
    }));

    const { decodeObfuscatedText } = await import("./font-decoder");

    await expect(decodeObfuscatedText("A", "font-1")).rejects.toThrow(
      "Obfuscation-Font 'font-1' konnte nicht geladen werden.",
    );
    await expect(decodeObfuscatedText("A", "font-1")).resolves.toBe("1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
