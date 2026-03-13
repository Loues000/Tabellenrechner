import { NextRequest, NextResponse } from "next/server";
import { getSearchBootstrap } from "@/lib/fussballde/search";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const bootstrap = await getSearchBootstrap({
      associationId: params.get("associationId") ?? undefined,
      seasonId: params.get("seasonId") ?? undefined,
      teamTypeId: params.get("teamTypeId") ?? undefined,
      leagueId: params.get("leagueId") ?? undefined,
      areaId: params.get("areaId") ?? undefined,
    });

    return NextResponse.json(bootstrap);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Die Suchfilter konnten nicht geladen werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
