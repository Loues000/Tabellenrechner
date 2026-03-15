export type Option = {
  id: string;
  label: string;
};

export type CompetitionOption = {
  label: string;
  url: string;
};

export type SearchFilters = {
  associationId: string;
  seasonId: string;
  teamTypeId: string;
  leagueId: string;
  areaId: string;
};

export type SearchBootstrap = {
  associations: Option[];
  seasons: Option[];
  teamTypes: Option[];
  leagues: Option[];
  areas: Option[];
  defaults: SearchFilters;
};

export type MatchResult = {
  home: number | null;
  guest: number | null;
};

export type EditableResultMap = Record<
  string,
  {
    home: string;
    guest: string;
  }
>;

export type ImportedMatch = {
  id: string;
  matchday: number;
  kickoffText: string;
  homeTeamId: string;
  homeTeamName: string;
  guestTeamId: string;
  guestTeamName: string;
  detailUrl: string;
  originalResult: MatchResult;
  isBye: boolean;
};

export type Matchday = {
  number: number;
  label: string;
  url: string;
  matches: ImportedMatch[];
};

export type TableRow = {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | undefined;
  rank: number;
  originalRank: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type Competition = {
  id: string;
  name: string;
  season: string;
  association: string;
  teamType: string;
  leagueLevel: string;
  area: string;
  sourceUrl: string;
  sourceCompetitionUrl: string;
  currentMatchdayNumber?: number | null;
  importedTable: TableRow[];
  matchdays: Matchday[];
};
