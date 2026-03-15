import { describe, expect, it } from "vitest";
import { recalculateTable } from "./table-calculator";
import type { Competition } from "@/lib/fussballde/types";

const competition: Competition = {
  id: "demo",
  name: "Testliga",
  season: "25/26",
  association: "Niederrhein",
  teamType: "Herren",
  leagueLevel: "Kreisliga B",
  area: "Kreis Essen",
  sourceUrl: "https://example.test",
  sourceCompetitionUrl: "https://example.test",
  tableAdjustments: {},
  importedTable: [
    {
      teamId: "a",
      teamName: "Team A",
      rank: 1,
      originalRank: 1,
      games: 2,
      wins: 1,
      draws: 1,
      losses: 0,
      goalsFor: 3,
      goalsAgainst: 2,
      goalDifference: 1,
      points: 4,
    },
    {
      teamId: "b",
      teamName: "Team B",
      rank: 2,
      originalRank: 2,
      games: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      goalsFor: 4,
      goalsAgainst: 3,
      goalDifference: 1,
      points: 3,
    },
    {
      teamId: "c",
      teamName: "Team C",
      rank: 3,
      originalRank: 3,
      games: 2,
      wins: 0,
      draws: 1,
      losses: 1,
      goalsFor: 1,
      goalsAgainst: 4,
      goalDifference: -3,
      points: 1,
    },
  ],
  matchdays: [
    {
      number: 1,
      label: "1. Spieltag",
      url: "https://example.test/1",
      matches: [
        {
          id: "m1",
          matchday: 1,
          kickoffText: "So. 01.09.2025 | 11:00",
          homeTeamId: "a",
          homeTeamName: "Team A",
          guestTeamId: "b",
          guestTeamName: "Team B",
          detailUrl: "https://example.test/m1",
          originalResult: { home: 2, guest: 1 },
          isBye: false,
        },
      ],
    },
    {
      number: 2,
      label: "2. Spieltag",
      url: "https://example.test/2",
      matches: [
        {
          id: "m2",
          matchday: 2,
          kickoffText: "So. 08.09.2025 | 11:00",
          homeTeamId: "b",
          homeTeamName: "Team B",
          guestTeamId: "c",
          guestTeamName: "Team C",
          detailUrl: "https://example.test/m2",
          originalResult: { home: 3, guest: 0 },
          isBye: false,
        },
        {
          id: "m3",
          matchday: 2,
          kickoffText: "So. 08.09.2025 | 14:00",
          homeTeamId: "c",
          homeTeamName: "Team C",
          guestTeamId: "a",
          guestTeamName: "Team A",
          detailUrl: "https://example.test/m3",
          originalResult: { home: 1, guest: 1 },
          isBye: false,
        },
      ],
    },
  ],
};

describe("recalculateTable", () => {
  it("rebuilds the imported standings from original results", () => {
    const table = recalculateTable(competition, {});

    expect(table.map((row) => `${row.rank}-${row.teamName}-${row.points}`)).toEqual([
      "1-Team A-4",
      "2-Team B-3",
      "3-Team C-1",
    ]);
    expect(table[0].goalDifference).toBe(1);
  });

  it("applies edited past results and changes the ranking", () => {
    const table = recalculateTable(competition, {
      m1: { home: "0", guest: "2" },
    });

    expect(table.map((row) => `${row.rank}-${row.teamName}-${row.points}`)).toEqual([
      "1-Team B-6",
      "2-Team A-1",
      "3-Team C-1",
    ]);
  });

  it("ignores incomplete edited results", () => {
    const table = recalculateTable(competition, {
      m2: { home: "4", guest: "" },
    });

    expect(table.map((row) => row.points)).toEqual([4, 1, 0]);
  });

  it("preserves official table adjustments in the baseline standings", () => {
    const adjustedCompetition: Competition = {
      ...competition,
      importedTable: [
        {
          ...competition.importedTable[0],
          rank: 2,
          originalRank: 2,
          points: 2,
        },
        {
          ...competition.importedTable[1],
          rank: 1,
          originalRank: 1,
          points: 3,
        },
        competition.importedTable[2],
      ],
      tableAdjustments: {
        a: {
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: -2,
        },
      },
    };

    const table = recalculateTable(adjustedCompetition, {});

    expect(table.map((row) => `${row.rank}-${row.teamName}-${row.points}`)).toEqual([
      "1-Team B-3",
      "2-Team A-2",
      "3-Team C-1",
    ]);
  });
});
