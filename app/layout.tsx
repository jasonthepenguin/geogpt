export const metadata = {
  title: "GeoGPT — LLM vs You",
  description: "Guess locations from Mapillary and compete with an LLM.",
};

import "./globals.css";
import "leaflet/dist/leaflet.css";
import "mapillary-js/dist/mapillary.css";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
