import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const copilotRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(10000),
  })).min(1).max(50),
  context: z.object({
    trackingData: z.array(z.object({
      id: z.string(),
      type: z.enum(['aircraft', 'satellite', 'rocket', 'vessel']),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })).max(100).optional(),
    selectedObject: z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['aircraft', 'satellite', 'rocket', 'vessel']),
    }).optional(),
  }).optional(),
});