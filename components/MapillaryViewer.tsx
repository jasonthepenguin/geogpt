"use client";

import React, { useEffect, useRef, useState } from "react";
import { Viewer } from "mapillary-js";

type Props = { imageId?: string };

export default function MapillaryViewer({ imageId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Read token from public env var to avoid an extra API call
  useEffect(() => {
    const t = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN as string | undefined;
    setToken(t ?? null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const v: any = viewerRef.current as any;
      try { v?.remove?.(); } catch {}
      try { v?.destroy?.(); } catch {}
      viewerRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const showOverlay = (title: string, msg: string) => {
      containerRef.current!.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(15,17,21,0.8);color:#e6e9ef;text-align:center;padding:16px;">`
        + `<div><h3 style='margin:0 0 8px 0'>${title}</h3><p style='margin:0'>${msg}</p></div>`
        + `</div>`;
    };

    if (!token) {
      showOverlay("Mapillary token missing", "Set NEXT_PUBLIC_MAPILLARY_TOKEN in .env.local");
      return;
    }
    if (!imageId) {
      showOverlay("No image selected", "Provide a mapillaryImageId in your locations data");
      return;
    }

    try {
      // Recreate the viewer for the new image to avoid moveTo on non-navigable viewers.
      const v: any = viewerRef.current as any;
      try { v?.remove?.(); } catch {}
      try { v?.destroy?.(); } catch {}
      viewerRef.current = null;
      containerRef.current.innerHTML = "";

      viewerRef.current = new Viewer({
        container: containerRef.current,
        accessToken: token,
        imageId,
      });
    } catch (e) {
      showOverlay("Mapillary failed to load", "Check token and image id.");
    }
  }, [imageId, token]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
