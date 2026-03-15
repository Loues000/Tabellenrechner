import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recalculateTable } from "../table-calculator";

vi.mock("@/lib/fussballde/font-decoder", () => ({
  decodeObfuscatedText: vi.fn(async () => "-"),
}));

import { loadCompetitionFromUrl } from "./legacy";

const sampleLegacyHtml = readFileSync(new URL("../../../../samples/fussballde/html/legacy.html", import.meta.url), "utf8");

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
    expect(
      recalculateTable(competition, {}).map((row) => ({
        teamId: row.teamId,
        rank: row.rank,
        points: row.points,
        goalDifference: row.goalDifference,
      })),
    ).toEqual(
      competition.importedTable.map((row) => ({
        teamId: row.teamId,
        rank: row.rank,
        points: row.points,
        goalDifference: row.goalDifference,
      })),
    );
  });

  it("canonicalizes supported next.fussball.de imports to legacy staffel URLs", async () => {
    await loadCompetitionFromUrl("https://next.fussball.de/wettbewerb/-/02TMJM5PBK00000AVS5489BUVSSD35NB-G/tabelle");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://www.fussball.de/spieltag/-/staffel/02TMJM5PBK00000AVS5489BUVSSD35NB-G",
    );
  });

  it("rejects unsupported import hosts before any fetch", async () => {
    await expect(loadCompetitionFromUrl("https://localhost/internal")).rejects.toEqual(
      expect.objectContaining({
        status: 400,
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
