export type GeoPoint = { lat: number; lng: number };

/** Haversine distance in meters. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function transportEtaMessage(input: {
  routeName: string;
  metersAway: number;
  avgSpeedMps?: number;
}): string {
  const speed = input.avgSpeedMps ?? 8; // ~30 km/h urban
  const minutes = Math.max(1, Math.round(input.metersAway / speed / 60));
  if (minutes <= 5) {
    return `${input.routeName} van is about ${minutes} minute(s) away.`;
  }
  return `${input.routeName} van is roughly ${minutes} minutes away (${Math.round(input.metersAway)} m).`;
}
