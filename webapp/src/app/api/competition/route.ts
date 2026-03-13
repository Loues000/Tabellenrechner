import { NextRequest, NextResponse } from "next/server";
import { loadCompetitionFromUrl } from "@/lib/fussballde/legacy";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { url?: string };

    if (!payload.url?.trim()) {
      return NextResponse.json({ error: "Es wurde keine Wettbewerbs-URL uebergeben." }, { status: 400 });
    }

    const competition = await loadCompetitionFromUrl(payload.url);
    return NextResponse.json(competition);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Der Wettbewerb konnte nicht importiert werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
