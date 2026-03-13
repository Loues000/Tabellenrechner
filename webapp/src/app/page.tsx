"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
import styles from "./page.module.css";
import type {
  Competition,
  CompetitionOption,
  EditableResultMap,
  SearchBootstrap,
  SearchFilters,
} from "@/lib/fussballde/types";
import {
  countActiveEdits,
  getEffectiveResult,
  getTableDelta,
  hasPendingEdit,
  recalculateTable,
} from "@/lib/table-calculator";

const SAMPLE_URL =
  "https://www.fussball.de/spieltag/kreisliga-b-gruppe-1-kreis-essen-kreisliga-b-herren-saison2526-niederrhein/-/spieldatum/2026-03-15/staffel/02TMJM5PBK00000AVS5489BUVSSD35NB-G#!/";

const EMPTY_FILTERS: SearchFilters = {
  associationId: "",
  seasonId: "",
  teamTypeId: "",
  leagueId: "",
  areaId: "",
};

function signedDelta(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

export default function Home() {
  const [bootstrap, setBootstrap] = useState<SearchBootstrap | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [selectedCompetitionUrl, setSelectedCompetitionUrl] = useState("");
  const [urlInput, setUrlInput] = useState(SAMPLE_URL);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [editedResults, setEditedResults] = useState<EditableResultMap>({});
  const [searchError, setSearchError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isLoadingCompetitionList, setIsLoadingCompetitionList] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const searchSelects: Array<{
    label: string;
    key: keyof SearchFilters;
    options: SearchBootstrap["associations"];
  }> = [
    { label: "Verband", key: "associationId", options: bootstrap?.associations ?? [] },
    { label: "Saison", key: "seasonId", options: bootstrap?.seasons ?? [] },
    { label: "Mannschaftsart", key: "teamTypeId", options: bootstrap?.teamTypes ?? [] },
    { label: "Spielklasse", key: "leagueId", options: bootstrap?.leagues ?? [] },
    { label: "Gebiet", key: "areaId", options: bootstrap?.areas ?? [] },
  ];

  const bootstrapOnMount = useEffectEvent(() => {
    void loadBootstrap({});
  });

  useEffect(() => {
    bootstrapOnMount();
  }, []);

  async function loadBootstrap(partial: Partial<SearchFilters>) {
    setIsBootstrapping(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams();

      for (const [key, value] of Object.entries(partial)) {
        if (value) {
          params.set(key, value);
        }
      }

      const response = await fetch(`/api/search/bootstrap?${params.toString()}`);
      const payload = (await response.json()) as SearchBootstrap | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Die Suchfilter konnten nicht geladen werden.");
      }

      startTransition(() => {
        setBootstrap(payload);
        setFilters(payload.defaults);
      });

      if (payload.defaults.areaId) {
        await loadCompetitionOptions(payload.defaults);
      } else {
        startTransition(() => {
          setCompetitions([]);
          setSelectedCompetitionUrl("");
        });
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Die Suchfilter konnten nicht geladen werden.");
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function loadCompetitionOptions(nextFilters: SearchFilters) {
    if (!nextFilters.areaId) {
      startTransition(() => {
        setCompetitions([]);
        setSelectedCompetitionUrl("");
      });

      return;
    }

    setIsLoadingCompetitionList(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams(nextFilters);
      const response = await fetch(`/api/search/competitions?${params.toString()}`);
      const payload = (await response.json()) as
        | { competitions: CompetitionOption[] }
        | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Die Wettbewerbe konnten nicht geladen werden.");
      }

      startTransition(() => {
        setCompetitions(payload.competitions);
        setSelectedCompetitionUrl(payload.competitions[0]?.url ?? "");
      });
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Die Wettbewerbe konnten nicht geladen werden.");
    } finally {
      setIsLoadingCompetitionList(false);
    }
  }

  async function importCompetition(targetUrl: string) {
    if (!targetUrl.trim()) {
      setImportError("Bitte zuerst eine Wettbewerbs-URL eingeben oder einen Wettbewerb auswaehlen.");
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const response = await fetch("/api/competition", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      const payload = (await response.json()) as Competition | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Der Wettbewerb konnte nicht importiert werden.");
      }

      startTransition(() => {
        setCompetition(payload);
        setEditedResults({});
      });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Der Wettbewerb konnte nicht importiert werden.");
    } finally {
      setIsImporting(false);
    }
  }

  function updateFilters(patch: Partial<SearchFilters>) {
    void loadBootstrap({ ...filters, ...patch });
  }

  function updateMatchResult(matchId: string, side: "home" | "guest", value: string) {
    const sanitized = value.replace(/[^\d]/g, "").slice(0, 2);

    startTransition(() => {
      setEditedResults((current) => {
        const existing = current[matchId] ?? { home: "", guest: "" };
        const next = {
          ...current,
          [matchId]: {
            ...existing,
            [side]: sanitized,
          },
        };

        if (!next[matchId].home && !next[matchId].guest) {
          delete next[matchId];
        }

        return next;
      });
    });
  }

  function resetMatchResult(matchId: string) {
    startTransition(() => {
      setEditedResults((current) => {
        const next = { ...current };
        delete next[matchId];
        return next;
      });
    });
  }

  const computedTable = competition ? recalculateTable(competition, editedResults) : [];
  const activeEdits = countActiveEdits(editedResults);
  const importedMatchCount = competition
    ? competition.matchdays.reduce((sum, matchday) => sum + matchday.matches.length, 0)
    : 0;
  const resolvedMatchCount = competition
    ? competition.matchdays.reduce((sum, matchday) => {
        return (
          sum +
          matchday.matches.filter((match) => {
            const result = getEffectiveResult(match, editedResults);
            return result.home !== null && result.guest !== null;
          }).length
        );
      }, 0)
    : 0;

  return (
    <main className={styles.page}>
      {/* ── Import controls ── */}
      <section className={styles.controlGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelKicker}>Direktimport</span>
              <h2>Wettbewerbs-URL einfuegen</h2>
            </div>
          </div>
          <p className={styles.panelText}>
            Funktioniert mit klassischen fussball.de-Links und mit den neuen next.fussball.de
            Wettbewerbs-URLs.
          </p>
          <label className={styles.fieldLabel} htmlFor="competition-url">
            Wettbewerbs-URL
          </label>
          <textarea
            id="competition-url"
            className={styles.textarea}
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            rows={3}
            placeholder="https://www.fussball.de/spieltag/.../staffel/..."
          />
          <div className={styles.inlineActions}>
            <button
              className={styles.primaryButton}
              onClick={() => void importCompetition(urlInput)}
              disabled={isImporting}
              type="button"
            >
              {isImporting ? "Import laeuft..." : "Staffel laden"}
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => setUrlInput(SAMPLE_URL)}
              type="button"
            >
              Beispiel einsetzen
            </button>
          </div>
          {importError ? <p className={styles.error}>{importError}</p> : null}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelKicker}>Liga-Suche</span>
              <h2>Wettbewerb ueber Filter finden</h2>
            </div>
          </div>
          <p className={styles.panelText}>
            Die Auswahl verwendet die WAM-Endpunkte von fussball.de und fuehrt ueber Verband,
            Saison, Mannschaftsart, Liga und Gebiet.
          </p>

          <div className={styles.filterGrid}>
            {searchSelects.map(({ label, key, options }) => (
              <label key={key} className={styles.selectGroup}>
                <span>{label}</span>
                <select
                  value={filters[key]}
                  onChange={(event) =>
                    updateFilters({ [key]: event.target.value } as Partial<SearchFilters>)
                  }
                  disabled={!bootstrap || isBootstrapping}
                >
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <label className={styles.selectGroupWide}>
              <span>Wettbewerb</span>
              <select
                value={selectedCompetitionUrl}
                onChange={(event) => setSelectedCompetitionUrl(event.target.value)}
                disabled={isLoadingCompetitionList || !competitions.length}
              >
                <option value="">
                  {isLoadingCompetitionList
                    ? "Wettbewerbe laden..."
                    : competitions.length
                      ? "Wettbewerb waehlen"
                      : "Noch kein Wettbewerb verfuegbar"}
                </option>
                {competitions.map((option) => (
                  <option key={option.url} value={option.url}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.inlineActions}>
            <button
              className={styles.primaryButton}
              onClick={() => void importCompetition(selectedCompetitionUrl)}
              disabled={!selectedCompetitionUrl || isImporting}
              type="button"
            >
              Auswahl importieren
            </button>
            {isBootstrapping ? <span className={styles.statusNote}>Filter aktualisieren...</span> : null}
          </div>
          {searchError ? <p className={styles.error}>{searchError}</p> : null}
        </article>
      </section>

      {competition ? (
        <>
          {/* ── Compact info bar ── */}
          <div className={styles.infoBar}>
            <span>Wettbewerb:</span>
            <strong>{competition.name}</strong>
            <span>·</span>
            <span>{competition.season} / {competition.teamType}</span>
            <span>·</span>
            <span>{competition.area} ({competition.association})</span>
            <span>·</span>
            <span>{competition.matchdays.length} Spieltage, {importedMatchCount} Spiele</span>
            <span>·</span>
            <span>Rechner: <strong className={styles.infoBarAccent}>{activeEdits} Aenderungen</strong>, {resolvedMatchCount} Spiele gewertet</span>
          </div>

          {/* ── Table + Matches workspace ── */}
          <section className={styles.workspace}>
            {/* ── Table ── */}
            <div className={styles.tablePanel}>
              <div className={styles.tablePanelHeader}>
                <h2>Tabelle</h2>
                <div className={styles.tablePanelActions}>
                  <a
                    className={styles.linkButton}
                    href={competition.sourceCompetitionUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Original ↗
                  </a>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setEditedResults({})}
                    disabled={!activeEdits}
                    type="button"
                  >
                    Zuruecksetzen
                  </button>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Pl.</th>
                      <th>Vereine</th>
                      <th>Sp.</th>
                      <th>S</th>
                      <th>U</th>
                      <th>N</th>
                      <th>Tore</th>
                      <th>Diff.</th>
                      <th>Punkte</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedTable.map((row) => {
                      const delta = getTableDelta(row, competition.importedTable);
                      return (
                        <tr key={row.teamId}>
                          <td className={styles.rankCell}>{row.rank}.</td>
                          <td className={styles.teamCell}>{row.teamName}</td>
                          <td>{row.games}</td>
                          <td>{row.wins}</td>
                          <td>{row.draws}</td>
                          <td>{row.losses}</td>
                          <td>{row.goalsFor}:{row.goalsAgainst}</td>
                          <td>{signedDelta(row.goalDifference)}</td>
                          <td className={styles.pointsCell}>{row.points}</td>
                          <td>
                            <span
                              className={
                                delta.positionDelta > 0
                                  ? styles.trendUp
                                  : delta.positionDelta < 0
                                    ? styles.trendDown
                                    : styles.trendFlat
                              }
                            >
                              {delta.positionDelta > 0
                                ? `↑${delta.positionDelta}`
                                : delta.positionDelta < 0
                                  ? `↓${Math.abs(delta.positionDelta)}`
                                  : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Matches (Spielpaarungen) ── */}
            <div className={styles.matchesPanel}>
              <div className={styles.matchesPanelHeader}>
                <h2>Spielpaarungen</h2>
                <p className={styles.matchesPanelHint}>
                  Ergebnisse eingeben oder ueberschreiben. Leere Felder entfernen den Tipp.
                </p>
              </div>

              <div className={styles.matchdayList}>
                {competition.matchdays.map((matchday) => (
                  <section key={matchday.number} className={styles.matchdayCard}>
                    <div className={styles.matchdayHeader}>
                      <div>
                        <span className={styles.matchdayBadge}>{matchday.number}. Spieltag</span>
                        <span className={styles.matchdayLabel}>{matchday.label}</span>
                      </div>
                      <span className={styles.matchdayMeta}>{matchday.matches.length} Partien</span>
                    </div>

                    <div className={styles.matchList}>
                      {matchday.matches.map((match) => {
                        const effectiveResult = getEffectiveResult(match, editedResults);
                        const pending = hasPendingEdit(match, editedResults);
                        const originalResult =
                          match.originalResult.home !== null && match.originalResult.guest !== null
                            ? `${match.originalResult.home}:${match.originalResult.guest}`
                            : match.isBye
                              ? "frei"
                              : "-:-";

                        return (
                          <div key={`${matchday.number}-${match.id}`} className={styles.matchRow}>
                            <span className={styles.matchKickoff}>
                              {match.kickoffText || "—"}
                            </span>

                            <span className={styles.matchHome}>{match.homeTeamName}</span>

                            <div className={styles.scoreInputGroup}>
                              <input
                                className={styles.scoreInput}
                                type="text"
                                inputMode="numeric"
                                value={editedResults[match.id]?.home ?? ""}
                                onChange={(event) => updateMatchResult(match.id, "home", event.target.value)}
                                placeholder={
                                  match.originalResult.home !== null
                                    ? String(match.originalResult.home)
                                    : "-"
                                }
                                disabled={match.isBye}
                              />
                              <span className={styles.scoreColon}>:</span>
                              <input
                                className={styles.scoreInput}
                                type="text"
                                inputMode="numeric"
                                value={editedResults[match.id]?.guest ?? ""}
                                onChange={(event) => updateMatchResult(match.id, "guest", event.target.value)}
                                placeholder={
                                  match.originalResult.guest !== null
                                    ? String(match.originalResult.guest)
                                    : "-"
                                }
                                disabled={match.isBye}
                              />
                            </div>

                            <span className={styles.matchGuest}>{match.guestTeamName}</span>

                            <span className={styles.matchOriginal}>{originalResult}</span>

                            <span className={styles.matchStatus}>
                              <span
                                className={
                                  pending
                                    ? styles.matchStatePending
                                    : effectiveResult.home === null || effectiveResult.guest === null
                                      ? styles.matchStateOpen
                                      : styles.matchStateReady
                                }
                              >
                                {pending
                                  ? "···"
                                  : effectiveResult.home === null || effectiveResult.guest === null
                                    ? ""
                                    : "✓"}
                              </span>
                            </span>

                            <button
                              className={styles.matchReset}
                              onClick={() => resetMatchResult(match.id)}
                              disabled={!editedResults[match.id]}
                              type="button"
                              title="Tipp zuruecksetzen"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className={styles.emptyState}>
          <h2>Noch kein Wettbewerb geladen</h2>
          <p>
            Importiere eine URL oder waehle einen Wettbewerb ueber die Filter, um Tabelle und Spielpaarungen zu sehen.
          </p>
        </section>
      )}
    </main>
  );
}
