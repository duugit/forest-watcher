import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  region: z.string(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  pastDate: z.string(),
});

export type GeeClassMetric = { name: string; km2: number };
export type GeeMetricsResponse = {
  region: string;
  bbox: [number, number, number, number];
  pastDate: string;
  presentDate: string;
  loss: number;
  gain: number;
  classes: GeeClassMetric[];
};

const CLASS_NAMES = ["Dense Forest", "Forest", "Grass/Veg", "Water", "Bare Soil"];

/**
 * Proxy to the Google Earth Engine multi-temporal Random Forest classifier.
 * Currently returns deterministic mock metrics derived from the AOI bounding box
 * so the dashboard runs without live GEE credentials.
 */
export const computeGeeMetrics = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<GeeMetricsResponse> => {
    const [minLon, minLat, maxLon, maxLat] = data.bbox;
    const areaFactor = Math.abs((maxLon - minLon) * (maxLat - minLat)) * 12100; // ~km2
    const seed = Math.abs(Math.round((minLon + maxLat) * 1000)) % 97;

    const loss = Math.round(areaFactor * (0.06 + (seed % 11) / 400));
    const gain = Math.round(loss * (0.12 + (seed % 7) / 60));

    const weights = [0.31, 0.27, 0.19, 0.07, 0.16];
    const classes = CLASS_NAMES.map((name, i) => ({
      name,
      km2: Math.round(areaFactor * weights[i] * (1 + ((seed + i) % 5) / 50) * 10) / 10,
    }));

    await new Promise((r) => setTimeout(r, 900));

    return {
      region: data.region,
      bbox: data.bbox,
      pastDate: data.pastDate,
      presentDate: new Date().toISOString().slice(0, 10),
      loss,
      gain,
      classes,
    };
  });
