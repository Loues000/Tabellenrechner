import { NextRequest, NextResponse } from "next/server";
import { getCompetitionOptions } from "@/lib/fussballde/search";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const required = ["associationId", "seasonId", "teamTypeId", "leagueId", "areaId"] as const;

    for (const key of required) {
      if (!params.get(key)) {
        return NextResponse.json({ error: `Suchparameter '${key}' fehlt.` }, { status: 400 });
      }
    }

    const competitions = await getCompetitionOptions({
      associationId: params.get("associationId") as string,
      seasonId: params.get("seasonId") as string,
      teamTypeId: params.get("teamTypeId") as string,
      leagueId: params.get("leagueId") as string,
      areaId: params.get("areaId") as string,
    });

    return NextResponse.json({ competitions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Die Wettbewerbe konnten nicht geladen werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
