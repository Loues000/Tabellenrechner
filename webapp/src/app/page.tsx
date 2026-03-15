"use client";

import Image from "next/image";
import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
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
  hasTableAdjustments,
  hasPendingEdit,
  recalculateTable,
} from "@/lib/table-calculator";
import {
  getGuestScoreInputLabel,
  getHomeScoreInputLabel,
  getMatchResetLabel,
} from "@/lib/match-accessibility";
import { getMatchdayHeaderLabel } from "@/lib/matchday-date";

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

function findCurrentMatchdayNumber(competition: Competition | null): number | null {
  if (!competition) {
    return null;
  }

  return (
    competition.currentMatchdayNumber ??
    competition.matchdays.find((matchday) =>
      matchday.matches.some(
        (match) => match.originalResult.home === null || match.originalResult.guest === null,
      ),
    )?.number ??
    competition.matchdays[0]?.number ??
    null
  );
}

function normalizeMetaValue(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE");
}

function formatCompetitionRegion(competition: Competition): string {
  const area = competition.area.trim();
  const association = competition.association.trim();

  if (!area) {
    return association;
  }

  if (!association || normalizeMetaValue(area) === normalizeMetaValue(association)) {
    return area;
  }

  return `${area} (${association})`;
}

export default function Home() {
  const matchdayRailRef = useRef<HTMLDivElement | null>(null);
  const matchdayTabRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const urlImportDialogRef = useRef<HTMLDialogElement | null>(null);
  const [bootstrap, setBootstrap] = useState<SearchBootstrap | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [selectedCompetitionUrl, setSelectedCompetitionUrl] = useState("");
  const [urlInput, setUrlInput] = useState(SAMPLE_URL);
  const [isUrlImportDialogOpen, setIsUrlImportDialogOpen] = useState(false);
  const [isDesktopUrlImportExpanded, setIsDesktopUrlImportExpanded] = useState(false);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [activeMatchdayNumber, setActiveMatchdayNumber] = useState<number | null>(null);
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

  useEffect(() => {
    if (!competition) {
      setActiveMatchdayNumber(null);
      return;
    }

    setActiveMatchdayNumber(findCurrentMatchdayNumber(competition));
  }, [competition]);

  useEffect(() => {
    if (activeMatchdayNumber === null) {
      return;
    }

    const activeTab = matchdayTabRefs.current[activeMatchdayNumber];

    if (!activeTab) {
      return;
    }

    activeTab.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeMatchdayNumber, competition?.id]);

  useEffect(() => {
    const dialog = urlImportDialogRef.current;

    if (!dialog) {
      return;
    }

    const syncDialogState = () => {
      setIsUrlImportDialogOpen(dialog.open);
    };

    dialog.addEventListener("close", syncDialogState);
    dialog.addEventListener("cancel", syncDialogState);

    return () => {
      dialog.removeEventListener("close", syncDialogState);
      dialog.removeEventListener("cancel", syncDialogState);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 900px)");

    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        setIsDesktopUrlImportExpanded(false);
        return;
      }

      urlImportDialogRef.current?.close();
      setIsUrlImportDialogOpen(false);
    };

    mediaQuery.addEventListener("change", handleViewportChange);

    return () => {
      mediaQuery.removeEventListener("change", handleViewportChange);
    };
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

  async function importCompetition(targetUrl: string, source: "url" | "search" = "url") {
    if (!targetUrl.trim()) {
      setImportError("Bitte zuerst eine Wettbewerbs-URL eingeben oder einen Wettbewerb auswählen.");
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

      if (source === "url" && window.matchMedia("(min-width: 900px)").matches) {
        setIsDesktopUrlImportExpanded(false);
      }

      urlImportDialogRef.current?.close();
      setIsUrlImportDialogOpen(false);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Der Wettbewerb konnte nicht importiert werden.");
    } finally {
      setIsImporting(false);
    }
  }

  function openUrlImportDialog() {
    const dialog = urlImportDialogRef.current;

    if (!dialog || dialog.open) {
      return;
    }

    dialog.showModal();
    setIsUrlImportDialogOpen(true);
  }

  function closeUrlImportDialog() {
    urlImportDialogRef.current?.close();
    setIsUrlImportDialogOpen(false);
  }

  function openDesktopUrlImport() {
    setIsDesktopUrlImportExpanded(true);
  }

  function closeDesktopUrlImport() {
    setIsDesktopUrlImportExpanded(false);
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

  function handleMatchdayRailWheel(event: React.WheelEvent<HTMLDivElement>) {
    const rail = matchdayRailRef.current;

    if (!rail || rail.scrollWidth <= rail.clientWidth) {
      return;
    }

    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    rail.scrollBy({
      left: event.deltaY,
      behavior: "auto",
    });
    event.preventDefault();
  }

  const computedTable = competition ? recalculateTable(competition, editedResults) : [];
  const activeEdits = countActiveEdits(editedResults);
  const matchdays = competition?.matchdays ?? [];
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
  const activeMatchdayIndex = matchdays.findIndex((matchday) => matchday.number === activeMatchdayNumber);
  const normalizedActiveMatchdayIndex =
    matchdays.length
      ? activeMatchdayIndex >= 0
        ? activeMatchdayIndex
        : 0
      : -1;
  const activeMatchday = normalizedActiveMatchdayIndex >= 0 ? matchdays[normalizedActiveMatchdayIndex] : null;
  const competitionMeta = competition
    ? [competition.season, competition.teamType, formatCompetitionRegion(competition)]
        .filter(Boolean)
        .join(" · ")
    : "";
  const competitionStats = competition
    ? `${competition.matchdays.length} Spieltage, ${importedMatchCount} Spiele`
    : "";
  const showAdjustmentNotice = competition ? hasTableAdjustments(competition) : false;

  function renderUrlImportControls(fieldId: string, showIntroText = false) {
    return (
      <>
        {showIntroText ? (
          <p className={styles.panelText}>
            Funktioniert mit klassischen fussball.de-Links und mit den neuen next.fussball.de
            Wettbewerbs-URLs.
          </p>
        ) : null}
        <label className={styles.fieldLabel} htmlFor={fieldId}>
          Wettbewerbs-URL
        </label>
        <textarea
          id={fieldId}
          className={styles.textarea}
          value={urlInput}
          onChange={(event) => setUrlInput(event.target.value)}
          rows={2}
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
      </>
    );
  }

  function renderDesktopUrlImportPanel() {
    if (!isDesktopUrlImportExpanded) {
      return (
        <div className={styles.desktopImportInline}>
          <div className={styles.desktopImportInlineCopy}>
            <span className={styles.desktopImportInlineLabel}>Direktimport</span>
            <strong className={styles.desktopImportInlineTitle}>Link schon vorhanden? Per URL laden.</strong>
          </div>
          <div className={styles.desktopImportInlineActions}>
            <button className={styles.secondaryButton} onClick={openDesktopUrlImport} type="button">
              URL einfügen
            </button>
          </div>
          {importError ? <p className={styles.error}>{importError}</p> : null}
        </div>
      );
    }

    return (
      <div className={styles.desktopImportExpanded}>
        <div className={styles.desktopImportExpandedHeader}>
          <div className={styles.desktopImportInlineCopy}>
            <span className={styles.desktopImportInlineLabel}>Direktimport</span>
            <strong className={styles.desktopImportInlineTitle}>Wettbewerb per URL laden</strong>
          </div>
          <button className={styles.secondaryButton} onClick={closeDesktopUrlImport} type="button">
            Einklappen
          </button>
        </div>
        <p className={styles.panelText}>
          Funktioniert mit klassischen fussball.de-Links und mit den neuen next.fussball.de
          Wettbewerbs-URLs.
        </p>
        {renderUrlImportControls("competition-url-desktop")}
      </div>
    );
  }

  function renderSearchPanelContent() {
    return (
      <>
        <p className={styles.panelText}>
          Die Auswahl verwendet die WAM-Endpunkte von fussball.de und führt über Verband,
          Saison, Mannschaftsart, Liga und Gebiet.
        </p>
        <div className={styles.desktopOnly}>{renderDesktopUrlImportPanel()}</div>
        <div className={styles.mobileOnly}>
          <div className={styles.mobileImportInline}>
            <div className={styles.mobileImportInlineCopy}>
              <span className={styles.mobileImportInlineLabel}>Alternativ</span>
              <strong className={styles.mobileImportInlineTitle}>Wettbewerb direkt per URL laden</strong>
            </div>
            <button
              className={`${styles.secondaryButton} ${styles.mobileImportInlineButton}`}
              onClick={openUrlImportDialog}
              type="button"
            >
              URL einfuegen
            </button>
          </div>
          {!isUrlImportDialogOpen && importError ? <p className={styles.error}>{importError}</p> : null}
        </div>

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
                    ? "Wettbewerb wählen"
                    : "Noch kein Wettbewerb verfügbar"}
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
            onClick={() => void importCompetition(selectedCompetitionUrl, "search")}
            disabled={!selectedCompetitionUrl || isImporting}
            type="button"
          >
            Auswahl importieren
          </button>
          {isBootstrapping ? <span className={styles.statusNote}>Filter aktualisieren...</span> : null}
        </div>
        {searchError ? <p className={styles.error}>{searchError}</p> : null}
      </>
    );
  }

  return (
    <main className={styles.page}>
      <dialog
        ref={urlImportDialogRef}
        className={styles.mobileImportDialog}
        aria-labelledby="mobile-url-import-title"
      >
        <div className={styles.mobileImportDialogCard}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelKicker}>Direktimport</span>
              <h2 id="mobile-url-import-title">Wettbewerbs-URL einfuegen</h2>
            </div>
            <button
              className={`${styles.secondaryButton} ${styles.dialogCloseButton}`}
              onClick={closeUrlImportDialog}
              type="button"
            >
              Schliessen
            </button>
          </div>
          {renderUrlImportControls("competition-url-mobile")}
        </div>
      </dialog>
      {/* ── Import controls ── */}
      <section className={styles.controlGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelKicker}>Liga-Suche</span>
              <h2>Wettbewerb über Filter finden</h2>
            </div>
          </div>
          {renderSearchPanelContent()}
        </article>
      </section>

      {competition ? (
        <>
          {/* ── Compact info bar ── */}
          <div className={styles.infoBar}>
            <div className={styles.infoBarBlock}>
              <span className={styles.infoBarLabel}>Wettbewerb</span>
              <strong className={styles.infoBarValue}>{competition.name}</strong>
              <span className={styles.infoBarMeta}>{competitionMeta}</span>
            </div>
            <div className={styles.infoBarBlock}>
              <span className={styles.infoBarLabel}>Rechner</span>
              <span className={styles.infoBarMeta}>{competitionStats}</span>
              <span className={styles.infoBarMeta}>
                <strong className={styles.infoBarAccent}>{activeEdits} Änderungen</strong>,{" "}
                {resolvedMatchCount} Spiele gewertet
              </span>
            </div>
          </div>

          {/* ── Table + Matches workspace ── */}
          <section className={styles.workspace}>
            {/* ── Table ── */}
            <div className={styles.tablePanel}>
              <div className={styles.tablePanelHeader}>
                <div className={styles.tablePanelHeading}>
                  <h2>Tabelle</h2>
                  {showAdjustmentNotice ? (
                    <p className={styles.adjustmentNotice}>
                      Offizielle Korrekturen aus der Ursprungstabelle sind beruecksichtigt.
                    </p>
                  ) : null}
                </div>
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
                    Zurücksetzen
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
                      <th className={styles.colHideable} title="Siege">S</th>
                      <th className={styles.colHideable} title="Unentschieden">U</th>
                      <th className={styles.colHideable} title="Niederlagen">N</th>
                      <th>Tore</th>
                      <th>+/-</th>
                      <th>Pkt.</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedTable.map((row) => {
                      const delta = getTableDelta(row, competition.importedTable);
                      return (
                        <tr key={row.teamId}>
                          <td className={styles.rankCell}>{row.rank}.</td>
                          <td className={styles.teamCell}>
                            <div className={styles.teamCellContent}>
                              {row.teamLogoUrl ? (
                                <Image
                                  className={styles.teamLogo}
                                  src={row.teamLogoUrl}
                                  alt=""
                                  width={20}
                                  height={20}
                                  sizes="20px"
                                  unoptimized
                                />
                              ) : null}
                              <span className={styles.teamNameText}>{row.teamName}</span>
                            </div>
                          </td>
                          <td>{row.games}</td>
                          <td className={styles.colHideable}>{row.wins}</td>
                          <td className={styles.colHideable}>{row.draws}</td>
                          <td className={styles.colHideable}>{row.losses}</td>
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
                  Spieltag wählen, durchklicken und Ergebnisse direkt anpassen. Leere Felder
                  entfernen den Tipp.
                </p>
              </div>

              <div className={styles.matchdayToolbar}>
                <div
                  ref={matchdayRailRef}
                  className={styles.matchdayRail}
                  role="tablist"
                  aria-label="Spieltage"
                  onWheel={handleMatchdayRailWheel}
                >
                  {matchdays.map((matchday) => {
                    const isActive = matchday.number === activeMatchday?.number;

                    return (
                      <button
                        ref={(element) => {
                          matchdayTabRefs.current[matchday.number] = element;
                        }}
                        key={matchday.number}
                        id={`matchday-tab-${matchday.number}`}
                        data-matchday-number={matchday.number}
                        className={`${styles.matchdayTab} ${isActive ? styles.matchdayTabActive : ""}`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`matchday-panel-${matchday.number}`}
                        onClick={() => setActiveMatchdayNumber(matchday.number)}
                      >
                        <span>{matchday.number}. Spieltag</span>
                        <strong>{matchday.matches.length} Partien</strong>
                      </button>
                    );
                  })}
                </div>

                <div className={styles.matchdayNav}>
                  <button
                    className={styles.matchdayNavButton}
                    onClick={() =>
                      normalizedActiveMatchdayIndex > 0 &&
                      setActiveMatchdayNumber(
                        matchdays[normalizedActiveMatchdayIndex - 1].number,
                      )
                    }
                    disabled={normalizedActiveMatchdayIndex <= 0}
                    type="button"
                  >
                    Vorheriger
                  </button>
                  <span className={styles.matchdayCounter}>
                    {normalizedActiveMatchdayIndex + 1} / {matchdays.length}
                  </span>
                  <button
                    className={styles.matchdayNavButton}
                    onClick={() =>
                      normalizedActiveMatchdayIndex >= 0 &&
                      normalizedActiveMatchdayIndex < matchdays.length - 1 &&
                      setActiveMatchdayNumber(
                        matchdays[normalizedActiveMatchdayIndex + 1].number,
                      )
                    }
                    disabled={normalizedActiveMatchdayIndex >= matchdays.length - 1}
                    type="button"
                  >
                    Nächster
                  </button>
                </div>
              </div>

              <div className={styles.matchdayList}>
                {matchdays
                  .filter((matchday) => matchday.number === activeMatchday?.number)
                  .map((matchday) => {
                    const matchdayHeaderLabel = getMatchdayHeaderLabel(matchday);

                    return (
                      <section
                        key={matchday.number}
                        id={`matchday-panel-${matchday.number}`}
                        className={styles.matchdayCard}
                        role="tabpanel"
                        aria-labelledby={`matchday-tab-${matchday.number}`}
                      >
                        <div className={styles.matchdayHeader}>
                          <div className={styles.matchdayHeaderText}>
                            <span className={styles.matchdayBadge}>{matchday.number}. Spieltag</span>
                            {matchdayHeaderLabel ? (
                              <span className={styles.matchdayLabel}>{matchdayHeaderLabel}</span>
                            ) : null}
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
                                aria-label={getHomeScoreInputLabel(match.homeTeamName, match.guestTeamName)}
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
                                aria-label={getGuestScoreInputLabel(match.homeTeamName, match.guestTeamName)}
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
                              aria-label={getMatchResetLabel(match.homeTeamName, match.guestTeamName)}
                              title="Tipp zurücksetzen"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                      </section>
                    );
                  })}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className={styles.emptyState}>
          <h2>Noch kein Wettbewerb geladen</h2>
          <p>
            Importiere eine URL oder wähle einen Wettbewerb über die Filter, um Tabelle und Spielpaarungen zu sehen.
          </p>
        </section>
      )}
    </main>
  );
}
