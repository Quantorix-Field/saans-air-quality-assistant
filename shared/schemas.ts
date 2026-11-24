import { z } from 'zod';
import { BAND_KEYS } from './domain/bands.js';
import { RULE_IDS } from './domain/rules.js';
import { POLLUTANTS } from './domain/types.js';

/** Shared by the browser and the server: every request and response is checked against these. */

export const LanguageSchema = z.enum(['en', 'hi']);
export const LatSchema = z.number().finite().min(-90).max(90);
export const LonSchema = z.number().finite().min(-180).max(180);

const hourOfDay = z.number().int().min(0).max(24);

export const ProfileSchema = z
  .object({
    ageGroup: z.enum(['child', 'adult', 'senior']),
    conditions: z.array(z.enum(['asthmaCopd', 'heart', 'pregnancy'])).max(3),
    commuteMode: z.enum([
      'walk',
      'cycle',
      'twoWheeler',
      'carPetrol',
      'carDiesel',
      'bus',
      'metro',
      'eTwoWheeler',
      'workFromHome',
    ]),
    hasPurifier: z.boolean(),
    hasN95: z.boolean(),
    outdoorHours: z
      .object({ start: hourOfDay, end: hourOfDay })
      .strict()
      .refine((hours) => hours.start < hours.end, { message: 'start must be before end' }),
    language: LanguageSchema,
  })
  .strict();

/** The request carries the language beside the profile, so the profile there has none. */
export const ProfileInputSchema = ProfileSchema.omit({ language: true });

export const AdviceRequestSchema = z
  .object({ lat: LatSchema, lon: LonSchema, profile: ProfileInputSchema, language: LanguageSchema })
  .strict();

export const TurnSchema = z
  .object({ role: z.enum(['user', 'assistant']), text: z.string().max(800) })
  .strict();

export const AskRequestSchema = AdviceRequestSchema.extend({
  question: z.string().trim().min(1).max(400),
  history: z.array(TurnSchema).max(6).default([]),
}).strict();

const queryNumber = (schema: z.ZodNumber) =>
  z
    .string()
    .regex(/^-?\d{1,3}(?:\.\d{1,6})?$/)
    .transform(Number)
    .pipe(schema);

export const AirQuerySchema = z.object({ lat: queryNumber(LatSchema), lon: queryNumber(LonSchema) });

export const GeocodeQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  all: z.enum(['0', '1']).optional(),
});

const reading = z.number().finite().min(0).nullable();

export const HourlyPointSchema = z.object({
  time: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  pm25: reading,
  pm10: reading,
  no2: reading,
  so2: reading,
  o3: reading,
  co: reading,
});

export const AirResponseSchema = z.object({
  hours: z.array(HourlyPointSchema).min(1).max(96),
  nowIndex: z.number().int().min(0),
  usAqi: reading,
  /** Local time of the latest reading, "YYYY-MM-DDTHH:MM". */
  observedAt: z.string(),
  dataAgeHours: z.number().finite().min(0),
});
export type AirResponse = z.infer<typeof AirResponseSchema>;

export const PlaceSchema = z.object({
  name: z.string().min(1).max(120),
  region: z.string().max(120),
  country: z.string().max(120),
  lat: LatSchema,
  lon: LonSchema,
});
export const GeocodeResponseSchema = z.object({ results: z.array(PlaceSchema).max(5) });
export type Place = z.infer<typeof PlaceSchema>;

export const RenderedActionSchema = z.object({
  id: z.enum(RULE_IDS),
  category: z.enum(['outdoor', 'indoor', 'commute', 'health', 'community', 'info']),
  title: z.string(),
  why: z.string(),
});

export const AqiSnapshotSchema = z.object({
  index: z.number().int().min(0).max(500),
  band: z.enum(BAND_KEYS),
  label: z.string(),
  dominant: z.enum(POLLUTANTS),
  partial: z.boolean(),
});

/** "ai" means Gemini wrote the summary and tips; "rules" means our own rule engine did. */
export const AdviceResponseSchema = z.object({
  source: z.enum(['ai', 'rules']),
  language: LanguageSchema,
  summary: z.string(),
  tips: z.array(z.string()).max(5),
  actions: z.array(RenderedActionSchema).max(8),
  aqi: AqiSnapshotSchema,
});
export type AdviceResponse = z.infer<typeof AdviceResponseSchema>;

export const AskResponseSchema = z.object({
  source: z.enum(['ai', 'rules']),
  language: LanguageSchema,
  answer: z.string(),
});
export type AskResponse = z.infer<typeof AskResponseSchema>;

/** What Gemini must return. Checked again with zod because the model is not trusted. */
export const AiAdviceSchema = z.object({
  summary: z.string().trim().min(1).max(700),
  tips: z.array(z.string().trim().min(1).max(300)).max(5),
});
export const AiAskSchema = z.object({ answer: z.string().trim().min(1).max(1200) });

export const ErrorBodySchema = z.object({ error: z.string() });
