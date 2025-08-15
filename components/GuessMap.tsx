"use client";

import React, { useEffect, useRef } from "react";
import L, { LatLngExpression, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

type Props = {
  guess: LatLng | null;
  onGuessChange: (latlng: LatLng | null) => void;
  revealed: boolean;
  gpt: LatLng | null;
  answer: LatLng | null;
};

export default function GuessMap({ guess, onGuessChange, revealed, gpt, answer }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const yourMarkerRef = useRef<L.CircleMarker | null>(null);
  const gptMarkerRef = useRef<L.CircleMarker | null>(null);
  const ansMarkerRef = useRef<L.CircleMarker | null>(null);
  const lineYouRef = useRef<L.Polyline | null>(null);
  const lineGptRef = useRef<L.Polyline | null>(null);

  // Init map once
  useEffect(() => {
    if (mapRef.current || !rootRef.current) return;
    const map = L.map(rootRef.current, { worldCopyJump: true }).setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    map.on("click", (e: any) => {
      const latlng = e.latlng as L.LatLng;
      // place or move guess marker
      if (!yourMarkerRef.current) {
        yourMarkerRef.current = L.circleMarker(latlng, {
          radius: 8,
          color: "#3b82f6",
          weight: 3,
          fillColor: "#3b82f6",
          fillOpacity: 0.8,
        }).addTo(map);
      } else {
        yourMarkerRef.current.setLatLng(latlng);
      }
      onGuessChange({ lat: latlng.lat, lng: latlng.lng });
    });

    mapRef.current = map;
  }, [onGuessChange]);

  // Sync external guess position (e.g., when resetting round)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!guess) {
      if (yourMarkerRef.current) {
        map.removeLayer(yourMarkerRef.current);
        yourMarkerRef.current = null;
      }
      return;
    }
    const latlng: LatLngExpression = [guess.lat, guess.lng];
    if (!yourMarkerRef.current) {
      yourMarkerRef.current = L.circleMarker(latlng, {
        radius: 8,
        color: "#3b82f6",
        weight: 3,
        fillColor: "#3b82f6",
        fillOpacity: 0.8,
      }).addTo(map);
    } else {
      yourMarkerRef.current.setLatLng(latlng as any);
    }
  }, [guess]);

  // Reveal markers and lines when requested
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear GPT/Answer + lines
    const clearReveal = () => {
      if (gptMarkerRef.current) { map.removeLayer(gptMarkerRef.current); gptMarkerRef.current = null; }
      if (ansMarkerRef.current) { map.removeLayer(ansMarkerRef.current); ansMarkerRef.current = null; }
      if (lineYouRef.current) { map.removeLayer(lineYouRef.current); lineYouRef.current = null; }
      if (lineGptRef.current) { map.removeLayer(lineGptRef.current); lineGptRef.current = null; }
    };

    if (!revealed) {
      clearReveal();
      map.setView([20, 0], 2);
      return;
    }

    if (gpt && answer) {
      gptMarkerRef.current = L.circleMarker([gpt.lat, gpt.lng], {
        radius: 8,
        color: "#f59e0b",
        weight: 3,
        fillColor: "#f59e0b",
        fillOpacity: 0.8,
      }).addTo(map);
      ansMarkerRef.current = L.circleMarker([answer.lat, answer.lng], {
        radius: 8,
        color: "#22c55e",
        weight: 3,
        fillColor: "#22c55e",
        fillOpacity: 0.8,
      }).addTo(map);
    }
    if (answer && guess) {
      lineYouRef.current = L.polyline([[guess.lat, guess.lng], [answer.lat, answer.lng]], { color: "#3b82f6" }).addTo(map);
    }
    if (answer && gpt) {
      lineGptRef.current = L.polyline([[gpt.lat, gpt.lng], [answer.lat, answer.lng]], { color: "#f59e0b" }).addTo(map);
    }

    const layers: L.Layer[] = [];
    if (yourMarkerRef.current) layers.push(yourMarkerRef.current);
    if (gptMarkerRef.current) layers.push(gptMarkerRef.current);
    if (ansMarkerRef.current) layers.push(ansMarkerRef.current);
    if (layers.length > 0) {
      const group = L.featureGroup(layers);
      map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 6 });
    }
  }, [revealed, gpt, answer, guess]);

  return <div ref={rootRef} style={{ height: "100%", width: "100%" }} />;
}

