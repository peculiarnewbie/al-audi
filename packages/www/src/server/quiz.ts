import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createDb, quizzes } from "core";
import type { QuizPayload } from "core";
import { getAuthenticatedUser } from "~/utils/workos-auth.server";

const multipleChoiceSchema = z.object({
    id: z.string(),
    type: z.literal("multiple-choice"),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correctOptionIndex: z.number().int().min(0).nullable(),
});

const textQuestionSchema = z.object({
    id: z.string(),
    type: z.literal("text"),
    prompt: z.string().min(1),
    answer: z.string(),
});

const quizInputSchema = z.object({
    questions: z
        .array(z.union([multipleChoiceSchema, textQuestionSchema]))
        .min(1),
});

type QuizInput = z.infer<typeof quizInputSchema>;

type SaveQuizResult =
    | {
          success: true;
          id: string;
      }
    | {
          success: false;
          error: string;
      };

export const saveQuiz = createServerFn({ method: "POST" })
    .inputValidator((data: QuizInput) => quizInputSchema.parse(data))
    .handler(async ({ data }): Promise<SaveQuizResult> => {
        const user = await getAuthenticatedUser(getRequestHeaders());

        if (!user) {
            return { success: false, error: "You must be signed in." };
        }

        try {
            const quizId = nanoid(10);
            const createdAt = new Date().toISOString();
            const payload: QuizPayload = {
                id: quizId,
                creatorId: user.id,
                createdAt,
                questions: data.questions,
            };
            const r2Key = `quizzes/${quizId}.json`;

            await env.BUCKET.put(r2Key, JSON.stringify(payload), {
                httpMetadata: {
                    contentType: "application/json",
                },
            });

            const db = createDb(env.DB);
            await db.insert(quizzes).values({
                id: quizId,
                creatorId: user.id,
                createdAt: Date.now(),
                r2Key,
            });

            return { success: true, id: quizId };
        } catch (error) {
            console.error("Failed to save quiz", error);
            return { success: false, error: "Failed to save quiz." };
        }
    });
