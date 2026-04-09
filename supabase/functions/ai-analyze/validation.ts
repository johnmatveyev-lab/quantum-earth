import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const analyzeRequestSchema = z.object({
  trackingData: z.array(z.object({
    id: z.string(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    type: z.enum(['aircraft', 'satellite', 'rocket', 'vessel']),
  })).max(1000), // Limit array size
  analysisType: z.enum(['trajectory', 'collision', 'anomaly', 'general']),
});