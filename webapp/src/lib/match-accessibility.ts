export function getHomeScoreInputLabel(homeTeamName: string, guestTeamName: string): string {
  return `Heimtore für ${homeTeamName} gegen ${guestTeamName}`;
}

export function getGuestScoreInputLabel(homeTeamName: string, guestTeamName: string): string {
  return `Gasttore für ${guestTeamName} bei ${homeTeamName}`;
}

export function getMatchResetLabel(homeTeamName: string, guestTeamName: string): string {
  return `Tipp für ${homeTeamName} gegen ${guestTeamName} zurücksetzen`;
}
