import { describe, expect, it } from "vitest";
import type { ImportedMatch, Matchday } from "@/lib/fussballde/types";
import {
  countMatchdayDates,
  getKickoffDateLabel,
  getKickoffTimeLabel,
  getMatchdayHeaderLabel,
  summarizeMatchdayDates,
} from "./matchday-date";

function createMatch(id: string, kickoffText: string): ImportedMatch {
  return {
    id,
    matchday: 17,
    kickoffText,
    homeTeamId: `${id}-home`,
    homeTeamName: `${id} Home`,
    guestTeamId: `${id}-guest`,
    guestTeamName: `${id} Guest`,
    detailUrl: `https://example.test/${id}`,
    originalResult: { home: null, guest: null },
    isBye: false,
  };
}

function formatDate(year: number, monthIndex: number, day: number): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, monthIndex, day));
}

describe("summarizeMatchdayDates", () => {
  it("uses one explicit date for rows that only show times afterwards", () => {
    expect(
      summarizeMatchdayDates([
        createMatch("m1", "So. 01.03.2026 | 11:00"),
        createMatch("m2", "13:15"),
        createMatch("m3", "15:00"),
      ]),
    ).toBe(formatDate(2026, 2, 1));
  });

  it("lists multiple unique dates when a matchday spans several days", () => {
    expect(
      summarizeMatchdayDates([
        createMatch("m1", "So. 01.03.2026 | 11:00"),
        createMatch("m2", "15:00"),
        createMatch("m3", "Mi. 04.03.2026 | 19:30"),
      ]),
    ).toBe(`${formatDate(2026, 2, 1)} / ${formatDate(2026, 2, 4)}`);
  });

  it("falls back to a condensed range when more than three dates exist", () => {
    expect(
      summarizeMatchdayDates([
        createMatch("m1", "So. 01.03.2026 | 11:00"),
        createMatch("m2", "Mi. 04.03.2026 | 19:30"),
        createMatch("m3", "So. 08.03.2026 | 11:00"),
        createMatch("m4", "Mi. 11.03.2026 | 19:30"),
      ]),
    ).toBe(`4 Termine: ${formatDate(2026, 2, 1)} bis ${formatDate(2026, 2, 11)}`);
  });
});

describe("kickoff row helpers", () => {
  it("extracts a formatted split label from dated kickoff text", () => {
    expect(getKickoffDateLabel("So. 01.03.2026 | 11:00")).toBe(formatDate(2026, 2, 1));
  });

  it("keeps only the time part for per-match display", () => {
    expect(getKickoffTimeLabel("So. 01.03.2026 | 11:00")).toBe("11:00");
    expect(getKickoffTimeLabel("13:15")).toBe("13:15");
    expect(getKickoffTimeLabel("")).toBe("—");
  });

  it("counts unique dates for deciding whether split rows are needed", () => {
    expect(
      countMatchdayDates([
        createMatch("m1", "So. 01.03.2026 | 11:00"),
        createMatch("m2", "13:15"),
        createMatch("m3", "Mi. 04.03.2026 | 19:30"),
      ]),
    ).toBe(2);
  });
});

describe("getMatchdayHeaderLabel", () => {
  it("suppresses duplicate spieltag labels when no date can be derived", () => {
    const matchday: Matchday = {
      number: 17,
      label: "17. Spieltag",
      url: "https://example.test/17",
      matches: [createMatch("m1", "11:00"), createMatch("m2", "13:00")],
    };

    expect(getMatchdayHeaderLabel(matchday)).toBeNull();
  });

  it("keeps non-standard matchday labels as a fallback", () => {
    const matchday: Matchday = {
      number: 17,
      label: "Nachholspieltag",
      url: "https://example.test/17",
      matches: [createMatch("m1", "11:00")],
    };

    expect(getMatchdayHeaderLabel(matchday)).toBe("Nachholspieltag");
  });
});
