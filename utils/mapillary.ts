export type LatLng = { lat: number; lng: number };

export async function fetchNearestImageId(point: LatLng, token: string): Promise<string | null> {
  if (!token) return null;
  const params = new URLSearchParams({
    fields: "id",
    limit: "1",
    access_token: token,
    // Mapillary expects closeto as lon,lat
    closeto: `${point.lng},${point.lat}`,
  });
  const url = `https://graph.mapillary.com/images?${params.toString()}`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const data = await res.json();
    const id = data?.data?.[0]?.id as string | undefined;
    return id ?? null;
  } catch (e) {
    return null;
  }
}

