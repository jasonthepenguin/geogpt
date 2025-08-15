"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { formatDistance, formatLatLng, haversineMeters } from "@/utils/geo";
import { fetchNearestImageId } from "@/utils/mapillary";

// Client-only components
const MapillaryViewer = dynamic(() => import("@/components/MapillaryViewer"), { ssr: false });
const GuessMap = dynamic(() => import("@/components/GuessMap"), { ssr: false });

type LatLng = { lat: number; lng: number };
type Location = {
  id: string;
  title?: string;
  mapillaryImageId: string;
  answer: LatLng;
  gpt: LatLng;
};

type RoundResult = {
  roundIndex: number;
  youDistance: number;
  gptDistance: number;
  winner: "you" | "gpt" | "tie";
  youGuess: LatLng;
  gptGuess: LatLng;
  answer: LatLng;
  locationId: string;
  title?: string;
};

export default function Page() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState<LatLng | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const current = locations[round];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      async function fetchJson(url: string) {
        try {
          const r = await fetch(url, { cache: "no-store" });
          if (!r.ok) return null;
          return (await r.json()) as { locations: Location[] };
        } catch {
          return null;
        }
      }
      const primary = await fetchJson("/data/locations.json");
      const fallback = !primary ? await fetchJson("/data/locations.example.json") : null;
      const locs = primary?.locations ?? fallback?.locations ?? [];
      if (!cancelled) setLocations(locs);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Resolve missing image IDs progressively using Mapillary Graph API
  useEffect(() => {
    let cancelled = false;
    async function resolveAll() {
      // Resolve any entries with missing or placeholder imageId
      const copy = [...locations];
      let changed = false;
      for (let i = 0; i < copy.length; i++) {
        const loc = copy[i];
        const missing = !loc.mapillaryImageId || loc.mapillaryImageId === "REPLACE_WITH_REAL_IMAGE_ID";
        if (missing && loc.answer) {
          const id = await fetchNearestImageId(loc.answer);
          if (cancelled) return;
          if (id) {
            copy[i] = { ...loc, mapillaryImageId: id };
            changed = true;
          }
        }
      }
      if (changed && !cancelled) setLocations(copy);
    }
    if (locations.length) resolveAll();
    return () => { cancelled = true; };
  }, [locations.length]);

  useEffect(() => {
    // Reset per-round state
    setGuess(null);
    setRevealed(false);
  }, [round]);

  const onSubmit = useCallback(() => {
    if (!guess || !current) {
      alert("Click on the map to place your guess.");
      return;
    }
    setRevealed(true);
    const youDistance = haversineMeters(guess, current.answer);
    const gptDistance = haversineMeters(current.gpt, current.answer);
    const winner: "you" | "gpt" | "tie" = youDistance === gptDistance ? "tie" : (youDistance < gptDistance ? "you" : "gpt");
    setResults((prev) => {
      if (prev.some((r) => r.roundIndex === round)) return prev; // avoid duplicate if re-render
      const entry: RoundResult = {
        roundIndex: round,
        youDistance,
        gptDistance,
        winner,
        youGuess: guess,
        gptGuess: current.gpt,
        answer: current.answer,
        locationId: current.id,
        title: current.title,
      };
      return [...prev, entry];
    });
    if (round + 1 >= locations.length) {
      setShowResults(true);
    }
  }, [guess, current, round, locations.length]);

  const onNext = useCallback(() => {
    if (round + 1 < locations.length) setRound((r) => r + 1);
  }, [round, locations.length]);

  const distances = useMemo(() => {
    if (!revealed || !current || !guess) return { you: null as number | null, gpt: null as number | null };
    const you = haversineMeters(guess, current.answer);
    const gpt = haversineMeters(current.gpt, current.answer);
    return { you, gpt };
  }, [revealed, current, guess]);

  const winner = useMemo(() => {
    if (!revealed || distances.you == null || distances.gpt == null) return "";
    if (distances.you === distances.gpt) return "This round is a tie.";
    return distances.you < distances.gpt ? "You win this round!" : "GPT-5 wins this round.";
  }, [revealed, distances]);

  const totals = useMemo(() => {
    let you = 0, gpt = 0, tie = 0;
    for (const r of results) {
      if (r.winner === "you") you++;
      else if (r.winner === "gpt") gpt++;
      else tie++;
    }
    return { you, gpt, tie };
  }, [results]);

  const onRestart = useCallback(() => {
    setRound(0);
    setGuess(null);
    setRevealed(false);
    setResults([]);
    setShowResults(false);
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="brand">GeoGPT</div>
        <div className="round-info">
          <span id="roundLabel">{showResults ? "Results" : (locations.length ? `Round ${round + 1} / ${locations.length}` : "Loading...")}</span>
          <span id="locationTitle" className="muted">{!showResults && current?.title ? ` • ${current.title}` : ""}</span>
          {results.length > 0 && (
            <div className="score-tally">Score: You {totals.you} — {totals.gpt} GPT-5{totals.tie ? ` (ties ${totals.tie})` : ""}</div>
          )}
        </div>
        <div className="actions">
          {showResults ? (
            <button className="primary" onClick={onRestart}>Play Again</button>
          ) : (
            <>
              <button className="primary" onClick={onSubmit} disabled={!current || revealed}>Submit Guess</button>
              <button className="secondary" onClick={onNext} disabled={!current || !revealed || round + 1 >= locations.length}>Next Round</button>
            </>
          )}
        </div>
      </header>

      {showResults ? (
        <main className="results">
          <section className="results-summary">
            <h2 style={{ margin: 0 }}>Final Results</h2>
            <div className="final-score">You {totals.you} — {totals.gpt} GPT-5{totals.tie ? ` (ties ${totals.tie})` : ""}</div>
            <div className="final-winner">{totals.you === totals.gpt ? "Overall: Tie" : (totals.you > totals.gpt ? "Overall: You win!" : "Overall: GPT-5 wins.")}</div>
          </section>
          <section className="results-list">
            {results
              .slice()
              .sort((a, b) => a.roundIndex - b.roundIndex)
              .map((r) => (
                <div key={r.roundIndex} className="result-row">
                  <div className="round">Round {r.roundIndex + 1}</div>
                  <div className="title">{r.title ?? r.locationId}</div>
                  <div className="spacer" />
                  <div className="distances">You: {formatDistance(r.youDistance)} • GPT-5: {formatDistance(r.gptDistance)}</div>
                  <div className="winner">{r.winner === "tie" ? "Tie" : (r.winner === "you" ? "You" : "GPT-5")}</div>
                </div>
              ))}
          </section>
        </main>
      ) : (
        <main className="content">
          <section className="viewer-panel">
            <div className="mly-container" style={{ position: "relative" }}>
              <MapillaryViewer imageId={current?.mapillaryImageId} />
            </div>
          </section>
          <section className="map-panel">
            <div className="map-container">
              <GuessMap
                guess={guess}
                onGuessChange={setGuess}
                revealed={revealed}
                gpt={current?.gpt ?? null}
                answer={current?.answer ?? null}
              />
            </div>
            <div className="scoreboard">
              <div><strong>Your guess:</strong> <span>{guess ? formatLatLng(guess.lat, guess.lng) : "—"}</span></div>
              <div><strong>GPT-5 guess:</strong> <span>{revealed && current ? formatLatLng(current.gpt.lat, current.gpt.lng) : "Hidden"}</span></div>
              <div><strong>Answer:</strong> <span>{revealed && current ? formatLatLng(current.answer.lat, current.answer.lng) : "Hidden"}</span></div>
              <div className="divider"></div>
              <div><strong>Your distance:</strong> <span>{distances.you != null ? formatDistance(distances.you) : "—"}</span></div>
              <div><strong>GPT-5 distance:</strong> <span>{distances.gpt != null ? formatDistance(distances.gpt) : "—"}</span></div>
              <div className="winner">{winner}</div>
            </div>
          </section>
        </main>
      )}

      <footer className="footer">
        <span className="muted">Map data © OpenStreetMap contributors • Imagery © Mapillary</span>
      </footer>
    </>
  );
}
