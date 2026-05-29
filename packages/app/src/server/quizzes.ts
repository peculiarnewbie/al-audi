import { createServerFn } from "@tanstack/solid-start";
import { env } from "cloudflare:workers";
import { eq, inArray, sql } from "drizzle-orm";
import { createDb } from "~/db/client";
import { quizCategories, quizCategoryLinks, quizQuestions, quizzes } from "~/db/schema";
import { getAuthenticatedUser } from "~/utils/auth.server";

export type QuizListItem = {
    id: string;
    name: string | null;
    creatorId: string;
    creatorName: string;
    createdAt: number;
    questionCount: number;
    categories: string[];
};

export type QuizListResult =
    | { status: "ok"; quizzes: QuizListItem[] }
    | { status: "unauthenticated" };

export const listQuizzes = createServerFn({ method: "GET" })
    .inputValidator((data: { search?: string; categoryId?: string }) => data)
    .handler(async ({ data }): Promise<QuizListResult> => {
        const { getRequestHeaders } = await import("@tanstack/solid-start/server");
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { status: "unauthenticated" };

        const db = createDb(env.DB);

        const allOwnQuizzes = await db
            .select()
            .from(quizzes)
            .where(eq(quizzes.creatorId, user.id))
            .orderBy(sql`${quizzes.createdAt} desc`);

        const questionCounts = new Map<string, number>();
        if (allOwnQuizzes.length) {
            const counts = await db
                .select({
                    quizId: quizQuestions.quizId,
                    count: sql<number>`count(*)`,
                })
                .from(quizQuestions)
                .where(
                    inArray(
                        quizQuestions.quizId,
                        allOwnQuizzes.map((q) => q.id),
                    ),
                )
                .groupBy(quizQuestions.quizId);
            for (const row of counts) {
                questionCounts.set(row.quizId, row.count);
            }
        }

        let filtered = allOwnQuizzes;

        if (data.categoryId) {
            const linkedQuizIds = await db
                .select({ quizId: quizCategoryLinks.quizId })
                .from(quizCategoryLinks)
                .where(eq(quizCategoryLinks.categoryId, data.categoryId));
            const ids = new Set(linkedQuizIds.map((r) => r.quizId));
            filtered = filtered.filter((q) => ids.has(q.id));
        } else if (data.search?.trim()) {
            const term = data.search.trim().toLowerCase();
            filtered = filtered.filter(
                (q) => q.name && q.name.toLowerCase().includes(term),
            );
        }

        const quizIds = filtered.map((r) => r.id);

        const categoryLinkRows = quizIds.length
            ? await db
                  .select({
                      quizId: quizCategoryLinks.quizId,
                      categoryName: quizCategories.name,
                  })
                  .from(quizCategoryLinks)
                  .innerJoin(
                      quizCategories,
                      eq(quizCategoryLinks.categoryId, quizCategories.id),
                  )
                  .where(inArray(quizCategoryLinks.quizId, quizIds))
            : [];

        const catsByQuiz = new Map<string, string[]>();
        for (const link of categoryLinkRows) {
            const existing = catsByQuiz.get(link.quizId) ?? [];
            existing.push(link.categoryName);
            catsByQuiz.set(link.quizId, existing);
        }

        return {
            status: "ok",
            quizzes: filtered.map((row) => ({
                id: row.id,
                name: row.name ?? null,
                creatorId: row.creatorId,
                creatorName: user.name,
                createdAt: row.createdAt,
                questionCount: questionCounts.get(row.id) ?? 0,
                categories: catsByQuiz.get(row.id) ?? [],
            })),
        };
    });

type CategoryOption = {
    id: string;
    name: string;
    categoryType: string;
};

export const listQuizCategories = createServerFn({ method: "GET" }).handler(
    async (): Promise<CategoryOption[]> => {
        const db = createDb(env.DB);
        const rows = await db
            .select({
                id: quizCategories.id,
                name: quizCategories.name,
                categoryType: quizCategories.categoryType,
            })
            .from(quizCategories)
            .orderBy(quizCategories.name);

        return rows;
    },
);
