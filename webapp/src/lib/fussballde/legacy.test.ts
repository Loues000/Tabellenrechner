import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/fussballde/font-decoder", () => ({
  decodeObfuscatedText: vi.fn(async () => "-"),
}));

import { loadCompetitionFromUrl } from "./legacy";

const sampleLegacyHtml = readFileSync(new URL("../../../../sample_legacy.html", import.meta.url), "utf8");

describe("loadCompetitionFromUrl", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => new Response(sampleLegacyHtml, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads team logo URLs from the imported original table", async () => {
    const competition = await loadCompetitionFromUrl(
      "https://www.fussball.de/spieltag/test/staffel/02TMJM5PBK00000AVS5489BUVSSD35NB-G#!/",
    );

    expect(competition.importedTable[0]?.teamLogoUrl).toBe(
      "https://www.fussball.de/export.media/-/action/getLogo/format/0/id/00ES8GN8VS0000BDVV0AG08LVUPGND5I/verband/0123456789ABCDEF0123456700004110",
    );
    expect(competition.importedTable.every((row) => row.teamLogoUrl)).toBe(true);
  });
});
