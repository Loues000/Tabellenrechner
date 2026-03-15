import type { ImportedMatch, Matchday } from "@/lib/fussballde/types";

const DATE_PATTERN = /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/;
const TIME_PATTERN = /\b(\d{1,2}:\d{2})\b/;
const DATE_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function parseKickoffDate(kickoffText: string): Date | null {
  const match = kickoffText.match(DATE_PATTERN);

  if (!match) {
    return null;
  }

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const rawYear = Number.parseInt(match[3], 10);
  const year = match[3].length === 2 ? 2000 + rawYear : rawYear;
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function getKickoffDateLabel(kickoffText: string): string | null {
  const date = parseKickoffDate(kickoffText);
  return date ? DATE_FORMATTER.format(date) : null;
}

export function getKickoffDateKey(kickoffText: string): string | null {
  const date = parseKickoffDate(kickoffText);
  return date ? getDateKey(date) : null;
}

export function getKickoffTimeLabel(kickoffText: string): string {
  const normalizedKickoff = kickoffText.trim();
  const timeMatch = normalizedKickoff.match(TIME_PATTERN);

  if (timeMatch) {
    return timeMatch[1];
  }

  if (!normalizedKickoff || DATE_PATTERN.test(normalizedKickoff)) {
    return "—";
  }

  return normalizedKickoff;
}

export function countMatchdayDates(matches: ImportedMatch[]): number {
  const uniqueDates = new Set<string>();

  for (const match of matches) {
    const dateKey = getKickoffDateKey(match.kickoffText);

    if (dateKey) {
      uniqueDates.add(dateKey);
    }
  }

  return uniqueDates.size;
}

export function summarizeMatchdayDates(matches: ImportedMatch[]): string | null {
  const uniqueDates = new Map<string, Date>();

  for (const match of matches) {
    const date = parseKickoffDate(match.kickoffText);

    if (!date) {
      continue;
    }

    const key = getDateKey(date);

    if (!uniqueDates.has(key)) {
      uniqueDates.set(key, date);
    }
  }

  const dates = [...uniqueDates.values()].sort((left, right) => left.getTime() - right.getTime());

  if (!dates.length) {
    return null;
  }

  const formattedDates = dates.map((date) => DATE_FORMATTER.format(date));

  if (formattedDates.length <= 3) {
    return formattedDates.join(" / ");
  }

  return `${formattedDates.length} Termine: ${formattedDates[0]} bis ${formattedDates.at(-1)}`;
}

export function getMatchdayHeaderLabel(matchday: Matchday): string | null {
  const dateSummary = summarizeMatchdayDates(matchday.matches);

  if (dateSummary) {
    return dateSummary;
  }

  const normalizedLabel = matchday.label.trim();
  return normalizedLabel === `${matchday.number}. Spieltag` ? null : normalizedLabel;
}
