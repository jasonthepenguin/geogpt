export type LatLng = { lat: number; lng: number };

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000; // meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || Number.isNaN(meters)) return "—";
  if (meters < 1000) return `${meters.toFixed(0)} m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(2)} km`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatLatLng(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
}

