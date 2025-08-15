export type LatLng = { lat: number; lng: number };

export async function fetchNearestImageId(point: LatLng): Promise<string | null> {
  const params = new URLSearchParams({
    lat: point.lat.toString(),
    lng: point.lng.toString(),
  });
  const url = `/api/mapillary/nearest-image?${params.toString()}`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.imageId ?? null;
  } catch (e) {
    return null;
  }
}

