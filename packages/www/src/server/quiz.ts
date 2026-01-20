import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createDb, quizCategories, quizCategoryLinks, quizzes } from "core";
import type { DbClient, QuizCategories, QuizPayload } from "core";
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

const quizCategorySchema = z
    .object({
        level: z.string().trim().min(1).optional(),
        topic: z.string().trim().min(1).optional(),
        skill: z.string().trim().min(1).optional(),
    })
    .optional();

const quizInputSchema = z.object({
    quizId: z.string().min(1).optional(),
    questions: z
        .array(z.union([multipleChoiceSchema, textQuestionSchema]))
        .min(1),
    categories: quizCategorySchema,
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

const normalizeCategoryValue = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
};

const buildCategoryPayload = (
    categories?: QuizCategories,
): QuizCategories | undefined => {
    if (!categories) {
        return undefined;
    }

    const normalized: QuizCategories = {
        level: normalizeCategoryValue(categories.level),
        topic: normalizeCategoryValue(categories.topic),
        skill: normalizeCategoryValue(categories.skill),
    };

    return Object.values(normalized).some(Boolean) ? normalized : undefined;
};

const toSlug = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

const saveQuizCategories = async (
    db: DbClient,
    quizId: string,
    categories: QuizCategories,
) => {
    const entries = [
        { type: "level", name: categories.level },
        { type: "topic", name: categories.topic },
        { type: "skill", name: categories.skill },
    ] as const;

    for (const entry of entries) {
        if (!entry.name) {
            continue;
        }

        const name = entry.name.trim();
        const slug = toSlug(name);

        if (!slug) {
            continue;
        }

        await db
            .insert(quizCategories)
            .values({
                id: nanoid(10),
                name,
                slug,
                categoryType: entry.type,
                createdAt: Date.now(),
            })
            .onConflictDoNothing({
                target: [quizCategories.slug, quizCategories.categoryType],
            });

        const [category] = await db
            .select({ id: quizCategories.id })
            .from(quizCategories)
            .where(
                and(
                    eq(quizCategories.slug, slug),
                    eq(quizCategories.categoryType, entry.type),
                ),
            )
            .limit(1);

        if (!category?.id) {
            continue;
        }

        await db
            .insert(quizCategoryLinks)
            .values({
                id: nanoid(10),
                quizId,
                categoryId: category.id,
                createdAt: Date.now(),
            })
            .onConflictDoNothing({
                target: [
                    quizCategoryLinks.quizId,
                    quizCategoryLinks.categoryId,
                ],
            });
    }
};

export const saveQuiz = createServerFn({ method: "POST" })
    .inputValidator((data: QuizInput) => quizInputSchema.parse(data))
    .handler(async ({ data }): Promise<SaveQuizResult> => {
        const user = await getAuthenticatedUser(getRequestHeaders());

        if (!user) {
            return { success: false, error: "You must be signed in." };
        }

        try {
            const quizId = data.quizId ?? nanoid(10);
            const createdAt = new Date().toISOString();
            const categories = buildCategoryPayload(data.categories);
            const payload: QuizPayload = {
                id: quizId,
                creatorId: user.id,
                createdAt,
                questions: data.questions,
                categories,
            };
            const r2Key = `quizzes/${quizId}.json`;

            await env.BUCKET.put(r2Key, JSON.stringify(payload), {
                httpMetadata: {
                    contentType: "application/json",
                },
            });

            const db = createDb(env.DB);
            await db
                .insert(quizzes)
                .values({
                    id: quizId,
                    creatorId: user.id,
                    createdAt: Date.now(),
                    r2Key,
                })
                .onConflictDoNothing();

            if (categories) {
                await saveQuizCategories(db, quizId, categories);
            }

            return { success: true, id: quizId };
        } catch (error) {
            console.error("Failed to save quiz", error);
            return { success: false, error: "Failed to save quiz." };
        }
    });
