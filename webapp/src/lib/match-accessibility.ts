export function getHomeScoreInputLabel(homeTeamName: string, guestTeamName: string): string {
  return `Heimtore fuer ${homeTeamName} gegen ${guestTeamName}`;
}

export function getGuestScoreInputLabel(homeTeamName: string, guestTeamName: string): string {
  return `Gasttore fuer ${guestTeamName} bei ${homeTeamName}`;
}

export function getMatchResetLabel(homeTeamName: string, guestTeamName: string): string {
  return `Tipp fuer ${homeTeamName} gegen ${guestTeamName} zuruecksetzen`;
}
