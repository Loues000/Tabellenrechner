import type { CompetitionOption, Option, SearchBootstrap, SearchFilters } from "@/lib/fussballde/types";

const LEGACY_HOST = "https://www.fussball.de";
const DEFAULT_ASSOCIATION_ID = "22";
const DEFAULT_TEAM_TYPE_ID = "343";
const DEFAULT_LEAGUE_ID = "120";

type BaseResponse = {
  currentSaison: string;
  Mandanten: Record<string, string>;
  Saisons: Record<string, Record<string, string>>;
};

type KindsResponse = {
  Mannschaftsart: Record<string, string>;
  Spielklasse: Record<string, Record<string, string>>;
  Gebiet: Record<string, Record<string, Record<string, string>>>;
};

function stripLeadingUnderscore(value: string): string {
  return value.replace(/^_/, "");
}

function toOptions(record: Record<string, string> | undefined): Option[] {
  if (!record) {
    return [];
  }

  return Object.entries(record)
    .map(([id, label]) => ({
      id: stripLeadingUnderscore(id),
      label,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "de"));
}

function pickValid(
  preferred: string | undefined,
  options: Option[],
  fallbackPreference?: string,
): string {
  if (preferred && options.some((option) => option.id === preferred)) {
    return preferred;
  }

  if (fallbackPreference && options.some((option) => option.id === fallbackPreference)) {
    return fallbackPreference;
  }

  return options[0]?.id ?? "";
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${LEGACY_HOST}/${path}`, {
    cache: "no-store",
    headers: {
      "user-agent": "Mozilla/5.0 Tabellenrechner",
    },
  });

  if (!response.ok) {
    throw new Error(`Der Such-Endpunkt '${path}' konnte nicht geladen werden.`);
  }

  return response.json() as Promise<T>;
}

export async function getSearchBootstrap(partial: Partial<SearchFilters>): Promise<SearchBootstrap> {
  const base = await getJson<BaseResponse>("wam_base.json");
  const associations = toOptions(base.Mandanten);
  const associationId = pickValid(partial.associationId, associations, DEFAULT_ASSOCIATION_ID);
  const seasons = toOptions(base.Saisons[associationId]);
  const seasonId = pickValid(partial.seasonId, seasons, base.currentSaison);
  const kinds = await getJson<KindsResponse>(`wam_kinds_${associationId}_${seasonId}_1.json`);
  const teamTypes = toOptions(kinds.Mannschaftsart);
  const teamTypeId = pickValid(partial.teamTypeId, teamTypes, DEFAULT_TEAM_TYPE_ID);
  const leagues = toOptions(kinds.Spielklasse[teamTypeId]);
  const leagueId = pickValid(partial.leagueId, leagues, DEFAULT_LEAGUE_ID);
  const areas = toOptions(kinds.Gebiet[teamTypeId]?.[leagueId]);
  const areaId = pickValid(partial.areaId, areas);

  return {
    associations,
    seasons,
    teamTypes,
    leagues,
    areas,
    defaults: {
      associationId,
      seasonId,
      teamTypeId,
      leagueId,
      areaId,
    },
  };
}

export async function getCompetitionOptions(filters: SearchFilters): Promise<CompetitionOption[]> {
  const response = await getJson<Record<string, Record<string, Record<string, string>>>>(
    `wam_competitions_${filters.associationId}_${filters.seasonId}_1_${filters.teamTypeId}_${filters.leagueId}_${filters.areaId}.json`,
  );

  const competitionsRecord = response[filters.leagueId]?.[filters.areaId];

  if (!competitionsRecord) {
    return [];
  }

  return Object.entries(competitionsRecord)
    .map(([url, label]) => ({
      label,
      url: stripLeadingUnderscore(url).replace("/spieltagsuebersicht/", "/spieltag/"),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "de"));
}
