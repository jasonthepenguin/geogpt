"use client";

import React, { useEffect, useRef } from "react";
import { Viewer } from "mapillary-js";

type Props = { imageId?: string; token: string };

export default function MapillaryViewer({ imageId, token }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!token) {
      // Render a simple overlay when missing token
      containerRef.current.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(15,17,21,0.8);color:#e6e9ef;text-align:center;padding:16px;">`+
        `<div><h3 style='margin:0 0 8px 0'>Mapillary token missing</h3><p style='margin:0'>Set NEXT_PUBLIC_MAPILLARY_TOKEN in .env.local</p></div>`+
        `</div>`;
      return;
    }

    try {
      if (!viewerRef.current) {
        viewerRef.current = new Viewer({
          container: containerRef.current,
          accessToken: token,
          imageId,
        });
      } else if (imageId) {
        viewerRef.current.moveTo(imageId);
      }
    } catch (e) {
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(15,17,21,0.8);color:#e6e9ef;text-align:center;padding:16px;">`+
          `<div><h3 style='margin:0 0 8px 0'>Mapillary failed to load</h3><p style='margin:0'>Check token and image id.</p></div>`+
          `</div>`;
      }
    }
  }, [imageId, token]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}

