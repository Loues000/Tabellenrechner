import { load } from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { decodeObfuscatedText } from "@/lib/fussballde/font-decoder";
import type { Competition, ImportedMatch, MatchResult, Matchday, TableRow } from "@/lib/fussballde/types";

const LEGACY_HOST = "https://www.fussball.de";
const USER_AGENT = "Mozilla/5.0 Tabellenrechner";

type MatchdayOption = {
  number: number;
  label: string;
  url: string;
  selected: boolean;
};

type CompetitionProfile = {
  id: string;
  name: string;
  season: string;
  association: string;
  teamType: string;
  leagueLevel: string;
  area: string;
  sourceCompetitionUrl: string;
};

function absoluteUrl(value?: string | null): string {
  if (!value) {
    return "";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (value.startsWith("/")) {
    return `${LEGACY_HOST}${value}`;
  }

  return `${LEGACY_HOST}/${value}`;
}

function extractStaffelId(input: string): string | null {
  const explicit = input.match(/staffel\/([^/?#]+)/i);

  if (explicit) {
    return explicit[1];
  }

  const competition = input.match(/\/wettbewerb\/[^?#]*\/([A-Z0-9-]{12,})/i);

  if (competition) {
    return competition[1];
  }

  return null;
}

function normalizeSeason(value: string): string {
  if (/^\d{4}$/.test(value)) {
    return `${value.slice(0, 2)}/${value.slice(2)}`;
  }

  return value;
}

function extractScriptValue(html: string, key: string): string {
  const match = html.match(new RegExp(`${key}='([^']*)'`));
  return match?.[1] ?? "";
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "user-agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Abruf von '${url}' fehlgeschlagen (${response.status}).`);
  }

  return response.text();
}

async function decodeNodeText(node: Cheerio<AnyNode>): Promise<string> {
  const fontId = node.find("[data-obfuscation]").first().attr("data-obfuscation");
  const text = node.text().replace(/\u00a0/g, " ");
  const decoded = await decodeObfuscatedText(text, fontId);
  return decoded.replace(/\s+/g, " ").trim();
}

function parseNumber(value: string): number {
  return Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
}

function parseRatio(value: string): { goalsFor: number; goalsAgainst: number } {
  const [goalsFor, goalsAgainst] = value.split(":").map((part) => parseNumber(part));
  return { goalsFor, goalsAgainst };
}

function parseTeamId(url: string): string {
  return url.match(/team-id\/([^/?]+)/)?.[1] ?? url;
}

function parseMatchId(url: string): string {
  return url.match(/\/spiel\/([^/?]+)/)?.[1] ?? url;
}

function parseTeamLogoUrl(node: Cheerio<AnyNode>): string | undefined {
  const imageUrl =
    node.find(".club-logo img").first().attr("src") ??
    node.find(".club-logo [data-responsive-image]").first().attr("data-responsive-image");

  const normalizedUrl = absoluteUrl(imageUrl);
  return normalizedUrl || undefined;
}

function parseProfile(html: string): CompetitionProfile {
  const id = extractScriptValue(html, "edWettbewerbId");
  const name = extractScriptValue(html, "edWettbewerbName");
  const season = normalizeSeason(extractScriptValue(html, "edSaison"));
  const association = extractScriptValue(html, "edVerbandName");
  const teamType = extractScriptValue(html, "edMannschaftsartName");
  const leagueLevel = extractScriptValue(html, "edSpielklasseName");
  const area = extractScriptValue(html, "edGebietName");
  const sourceCompetitionUrl = extractScriptValue(html, "edWettbewerbUrl");

  if (!id || !name) {
    throw new Error("Die Wettbewerbsdaten konnten aus der fussball.de Seite nicht gelesen werden.");
  }

  return {
    id,
    name,
    season,
    association,
    teamType,
    leagueLevel,
    area,
    sourceCompetitionUrl,
  };
}

function parseMatchdayOptions($: CheerioAPI): MatchdayOption[] {
  return $('select[name="spieltag"] option')
    .toArray()
    .map((option) => {
      const $option = $(option);
      const label = $option.text().trim();
      const number = parseNumber(label);
      return {
        number,
        label,
        url: absoluteUrl($option.attr("data-href")),
        selected: $option.is("[selected]") || $option.hasClass("on"),
      };
    })
    .filter((option) => option.number > 0 && option.url);
}

function parseTable($: CheerioAPI): TableRow[] {
  const rows: TableRow[] = [];

  for (const row of $("#fixture-league-tables tbody tr").toArray()) {
    const $row = $(row);
    const teamLink = $row.find("td.column-club a").first();
    const teamName = teamLink.find(".club-name").text().replace(/\s+/g, " ").trim();

    if (!teamName) {
      continue;
    }

    const cells = $row.find("td");
    const rank = parseNumber($row.find("td.column-rank").text());
    const games = parseNumber(cells.eq(3).text());
    const wins = parseNumber(cells.eq(4).text());
    const draws = parseNumber(cells.eq(5).text());
    const losses = parseNumber(cells.eq(6).text());
    const ratio = parseRatio(cells.eq(7).text());
    const goalDifference = parseNumber(cells.eq(8).text());
    const points = parseNumber(cells.eq(9).text());

    rows.push({
      teamId: parseTeamId(teamLink.attr("href") ?? teamName),
      teamName,
      teamLogoUrl: parseTeamLogoUrl(teamLink),
      rank,
      originalRank: rank,
      games,
      wins,
      draws,
      losses,
      goalsFor: ratio.goalsFor,
      goalsAgainst: ratio.goalsAgainst,
      goalDifference,
      points,
    });
  }

  return rows;
}

function parseScoreValue(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "-" || trimmed === "spielfrei") {
    return null;
  }

  return Number.parseInt(trimmed, 10);
}

async function parseMatchRow($: CheerioAPI, row: AnyNode, matchday: number) {
  const $row = $(row);
  const homeLink = $row.find("td.column-club").first().find("a").first();
  const guestCell = $row.find("td.column-club.no-border").first();
  const guestLink = guestCell.find("a").first();
  const detailLink = $row.find("td.column-score a").first();
  const homeTeamName = homeLink.find(".club-name").text().replace(/\s+/g, " ").trim();
  const guestTeamName =
    guestLink.find(".club-name").text().replace(/\s+/g, " ").trim() ||
    guestCell.find(".info-text").text().replace(/\s+/g, " ").trim();

  if (!homeTeamName) {
    return null;
  }

  const decodedScore = await decodeNodeText($row.find("td.column-score").first());
  const decodedKickoff = await decodeNodeText($row.find("td.column-date").first());
  const isBye = guestTeamName.toLowerCase() === "spielfrei";
  const [homeScoreRaw, guestScoreRaw] = decodedScore.split(":");
  const result: MatchResult = isBye
    ? { home: null, guest: null }
    : {
        home: parseScoreValue(homeScoreRaw ?? ""),
        guest: parseScoreValue(guestScoreRaw ?? ""),
      };

  return {
    id: detailLink.length
      ? parseMatchId(detailLink.attr("href") ?? homeTeamName)
      : `${matchday}-${homeTeamName}-${guestTeamName}`,
    matchday,
    kickoffText: decodedKickoff,
    homeTeamId: parseTeamId(homeLink.attr("href") ?? homeTeamName),
    homeTeamName,
    guestTeamId: guestLink.length
      ? parseTeamId(guestLink.attr("href") ?? guestTeamName)
      : `${homeTeamName}-bye`,
    guestTeamName,
    detailUrl: absoluteUrl(detailLink.attr("href")),
    originalResult: result,
    isBye,
  } satisfies ImportedMatch;
}

async function parseMatches($: CheerioAPI, matchday: number): Promise<ImportedMatch[]> {
  const candidates = $('table.table.table-striped.table-full-width.thead tbody tr')
    .toArray()
    .filter((row) => $(row).find("td.column-club").length > 0);

  const matches = await Promise.all(candidates.map((row) => parseMatchRow($, row, matchday)));
  return matches.filter((match): match is ImportedMatch => Boolean(match));
}

async function withConcurrency<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < values.length) {
      const currentIndex = index++;
      results[currentIndex] = await mapper(values[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return results;
}

async function loadLandingPage(url: string): Promise<{ html: string; sourceUrl: string }> {
  const candidateUrls = [url];
  const staffelId = extractStaffelId(url);

  if (staffelId) {
    candidateUrls.push(`${LEGACY_HOST}/spieltag/-/staffel/${staffelId}`);
    candidateUrls.push(`${LEGACY_HOST}/spieltagsuebersicht/-/staffel/${staffelId}`);
  }

  for (const candidate of candidateUrls) {
    try {
      const html = await fetchText(candidate);

      if (html.includes('select size="1" name="spieltag"') || html.includes('select name="spieltag"')) {
        return { html, sourceUrl: candidate };
      }
    } catch {
      continue;
    }
  }

  throw new Error("Die URL konnte nicht in eine lesbare fussball.de Wettbewerbsseite aufgelöst werden.");
}

export async function loadCompetitionFromUrl(inputUrl: string): Promise<Competition> {
  const { html: landingHtml, sourceUrl } = await loadLandingPage(inputUrl.trim());
  const profile = parseProfile(landingHtml);
  const $landing = load(landingHtml);
  const matchdayOptions = parseMatchdayOptions($landing).sort((left, right) => left.number - right.number);
  const selectedMatchday = matchdayOptions.find((option) => option.selected) ?? matchdayOptions[0];

  if (!selectedMatchday) {
    throw new Error("Es konnten keine Spieltage für den Wettbewerb ermittelt werden.");
  }

  const importedTable = parseTable($landing);

  if (!importedTable.length) {
    throw new Error("Die Wettbewerbstabelle konnte nicht aus der importierten Seite gelesen werden.");
  }

  const matchdays = await withConcurrency(matchdayOptions, 4, async (option) => {
    const pageHtml = option.number === selectedMatchday.number ? landingHtml : await fetchText(option.url);
    const $ = load(pageHtml);

    return {
      number: option.number,
      label: option.label,
      url: option.url,
      matches: await parseMatches($, option.number),
    } satisfies Matchday;
  });

  return {
    id: profile.id,
    name: profile.name,
    season: profile.season,
    association: profile.association,
    teamType: profile.teamType,
    leagueLevel: profile.leagueLevel,
    area: profile.area,
    sourceUrl,
    sourceCompetitionUrl: absoluteUrl(profile.sourceCompetitionUrl || sourceUrl),
    currentMatchdayNumber: selectedMatchday.number,
    importedTable,
    matchdays,
  };
}
