import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const briefingRequestSchema = z.object({
  timeRange: z.enum(['24h', '7d', '30d']).default('24h'),
  categories: z.array(z.enum(['aircraft', 'satellites', 'rockets', 'vessels'])).default(['aircraft', 'satellites', 'rockets']),
  focusAreas: z.array(z.enum(['anomalies', 'traffic', 'geopolitical', 'weather', 'technical'])).optional(),
});