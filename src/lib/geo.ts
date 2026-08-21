// Geodesic helpers used to compute real areas from polygons returned by the
// classification backend (no mock numbers involved).

export type Ring = [number, number][];

const EARTH_RADIUS_M = 6378137;

/**
 * Spherical excess (geodesic) area of a closed lon/lat ring, in square meters.
 * Same formula used by turf.js / Google Earth Engine `ee.Geometry.area()`.
 */
export function ringAreaM2(ring: Ring): number {
  if (!ring || ring.length < 3) return 0;
  const rad = (d: number) => (d * Math.PI) / 180;
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[(i + 1) % ring.length];
    total += (rad(lon2) - rad(lon1)) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function polygonsAreaHectares(rings: Ring[]): number {
  return rings.reduce((sum, r) => sum + ringAreaM2(r), 0) / 10_000;
}

export function polygonsAreaKm2(rings: Ring[]): number {
  return rings.reduce((sum, r) => sum + ringAreaM2(r), 0) / 1_000_000;
}

/**
 * Accepts any of: GeoJSON FeatureCollection / Feature / Geometry / array of rings,
 * and normalises it to a flat list of outer rings.
 */
export function toRings(input: unknown): Ring[] {
  if (!input) return [];
  const out: Ring[] = [];

  const pushGeometry = (g: any) => {
    if (!g) return;
    if (g.type === "Polygon") out.push(g.coordinates?.[0] as Ring);
    else if (g.type === "MultiPolygon")
      for (const poly of g.coordinates ?? []) out.push(poly?.[0] as Ring);
  };

  const any = input as any;
  if (Array.isArray(any)) {
    for (const item of any) {
      if (Array.isArray(item) && Array.isArray(item[0]) && typeof item[0][0] === "number") {
        out.push(item as Ring);
      } else if (item && typeof item === "object") {
        pushGeometry(item.geometry ?? item);
      }
    }
  } else if (any.type === "FeatureCollection") {
    for (const f of any.features ?? []) pushGeometry(f.geometry);
  } else if (any.type === "Feature") {
    pushGeometry(any.geometry);
  } else {
    pushGeometry(any);
  }

  return out.filter((r) => Array.isArray(r) && r.length >= 3);
}
