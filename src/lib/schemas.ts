import { z } from "zod";
import {
  ASSIGNMENT_METHODS,
  EVENT_TYPES,
  EXPERIMENT_STATUSES,
  FEED_LAYOUTS,
  FEED_ORDERS,
  SURVEY_QUESTION_TYPES,
} from "./constants";

export const eventSchema = z.object({
  id: z.string().uuid(),
  tab_id: z.string().max(64).default(""),
  event_type: z.enum(EVENT_TYPES),
  payload: z.record(z.unknown()).optional(),
  client_timestamp: z.number(),
});

export const eventBatchSchema = z.object({
  session_id: z.string().uuid(),
  events: z.array(eventSchema).min(1).max(100),
});

export const surveyQuestionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  type: z.enum(SURVEY_QUESTION_TYPES),
  prompt: z.string().trim().min(1).max(1000),
  options: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  required: z.boolean().optional(),
});

export const surveyDefinitionSchema = z
  .array(surveyQuestionSchema)
  .max(50)
  .superRefine((questions, ctx) => {
    const ids = new Set<string>();
    questions.forEach((question, index) => {
      if (ids.has(question.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Question IDs must be unique",
          path: [index, "id"],
        });
      }
      ids.add(question.id);
      if (question.type === "choice") {
        const options = question.options ?? [];
        if (options.length < 2 || new Set(options).size !== options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Choice questions need at least two unique options",
            path: [index, "options"],
          });
        }
      } else if (question.options?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only choice questions may define options",
          path: [index, "options"],
        });
      }
    });
  });

export const joinSchema = z.object({
  external_id: z.string().max(128).optional(),
  preview_token: z.string().optional(),
  screen: z
    .object({ w: z.number().int().positive(), h: z.number().int().positive() })
    .optional(),
});

export const surveySubmitSchema = z
  .object({
    answers: z
      .array(
        z.object({
          question_id: z.string().min(1).max(64),
          answer: z.string().min(1).max(5000),
        })
      )
      .max(50),
  })
  .superRefine(({ answers }, ctx) => {
    const ids = new Set<string>();
    answers.forEach((answer, index) => {
      if (ids.has(answer.question_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Answers may include each question only once",
          path: ["answers", index, "question_id"],
        });
      }
      ids.add(answer.question_id);
    });
  });

export const experimentUpsertSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,80}$/)
    .optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(EXPERIMENT_STATUSES).optional(),
  assignmentMethod: z.enum(ASSIGNMENT_METHODS).optional(),
  targetSampleSize: z.number().int().positive().max(1_000_000).nullable().optional(),
  welcomeContent: z.string().max(50000).optional(),
  completionContent: z.string().max(50000).optional(),
  completionRedirectUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  completionCode: z.string().max(64).nullable().optional(),
  surveyJson: surveyDefinitionSchema.nullable().optional(),
  resumeWindowHours: z.number().int().min(1).max(24 * 30).optional(),
});

export const conditionUpsertSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  contentSetId: z.string().uuid().nullable().optional(),
  feedLayout: z.enum(FEED_LAYOUTS).optional(),
  feedOrder: z.enum(FEED_ORDERS).optional(),
  maxItems: z.number().int().positive().max(500).nullable().optional(),
  timeLimitSeconds: z.number().int().positive().max(86_400).nullable().optional(),
  showSourceLabels: z.boolean().optional(),
  showEngagementCounts: z.boolean().optional(),
  showActionBar: z.boolean().optional(),
  customCssClass: z.string().max(100).nullable().optional(),
  weight: z.number().positive().max(100).optional(),
});

export const contentItemUpsertSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  body: z.string().max(100000).optional(),
  snippet: z.string().max(500).optional(),
  sourceName: z.string().trim().min(1).max(100).optional(),
  sourceLogoUrl: z.string().max(500).nullable().optional(),
  thumbnailUrl: z.string().max(500).nullable().optional(),
  category: z.string().max(50).optional(),
  publishedAt: z.string().datetime().optional(),
  isFiller: z.boolean().optional(),
  fakeLikes: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  fakeComments: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  fakeViews: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  approved: z.boolean().optional(),
});

export const contentImportSchema = z.object({
  items: z
    .array(
      contentItemUpsertSchema.extend({
        title: z.string().trim().min(1).max(300),
        body: z.string().min(1).max(100000),
        sourceName: z.string().trim().min(1).max(100),
      })
    )
    .min(1)
    .max(200),
});

export const setItemsSchema = z.object({
  item_ids: z.array(z.string().uuid()).max(500),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export const generateSchema = z.object({
  source_item_ids: z.array(z.string().uuid()).min(1).max(20),
  template_name: z.string().min(1).max(64),
  variables: z.record(z.string().max(2000)).default({}),
});

export const checkpointSchema = z.object({
  scroll_position: z.number(),
  last_card_index: z.number(),
  elapsed_ms: z.number(),
});
