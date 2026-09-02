export type LatLng = { latitude: number; longitude: number };

/** Great-circle distance in km between a point and a lat/lng pair. */
export function distanceKm(a: LatLng, lat: number, lng: number): number {
  const R = 6371;
  const dLat = ((lat - a.latitude) * Math.PI) / 180;
  const dLng = ((lng - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
