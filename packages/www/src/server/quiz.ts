import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { and, eq, inArray, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
    classStudents,
    createDb,
    quizAssignments,
    quizAttempts,
    quizCategories,
    quizCategoryLinks,
    quizQuestionOptions,
    quizQuestions,
    quizResponses,
    quizShareLinks,
    quizzes,
} from "core";
import type { DbClient, QuizCategories, QuizPayload, QuizQuestion } from "core";
import { getAuthenticatedUser } from "~/utils/auth.server";
import type { AuthUser } from "~/utils/auth.server";

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

const saveQuizQuestions = async (
    db: DbClient,
    quizId: string,
    questions: QuizQuestion[],
) => {
    const existingQuestions = await db
        .select({ id: quizQuestions.id })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quizId));
    const existingQuestionIds = existingQuestions.map(
        (question) => question.id,
    );

    if (existingQuestionIds.length) {
        await db
            .delete(quizQuestionOptions)
            .where(
                inArray(quizQuestionOptions.questionId, existingQuestionIds),
            );
    }

    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));

    for (const [position, question] of questions.entries()) {
        const createdAt = Date.now();
        await db.insert(quizQuestions).values({
            id: question.id,
            quizId,
            questionType: question.type,
            prompt: question.prompt,
            answerText: question.type === "text" ? question.answer : null,
            correctOption:
                question.type === "multiple-choice"
                    ? question.correctOptionIndex
                    : null,
            position,
            createdAt,
        });

        if (question.type !== "multiple-choice") {
            continue;
        }

        const optionRows = question.options.map((optionText, optionIndex) => ({
            id: nanoid(10),
            questionId: question.id,
            optionText,
            optionIndex,
            createdAt,
        }));

        if (optionRows.length) {
            await db.insert(quizQuestionOptions).values(optionRows);
        }
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

            await saveQuizQuestions(db, quizId, data.questions);

            if (categories) {
                await saveQuizCategories(db, quizId, categories);
            }

            return { success: true, id: quizId };
        } catch (error) {
            console.error("Failed to save quiz", error);
            return { success: false, error: "Failed to save quiz." };
        }
    });

const shareLinkInputSchema = z.object({
    quizId: z.string().trim().min(1),
    requireToken: z.boolean().default(false),
});

const shareLinkLookupSchema = z.object({
    shareId: z.string().trim().min(1),
    token: z.string().trim().min(1).optional(),
});

type ShareLinkInput = z.infer<typeof shareLinkInputSchema>;
type ShareLinkLookupInput = z.infer<typeof shareLinkLookupSchema>;

type ShareLinkCreateResult =
    | {
          success: true;
          shareId: string;
          accessToken: string | null;
      }
    | {
          success: false;
          error: string;
      };

type SharedQuizPayload = {
    shareId: string;
    quizId: string;
    requiresToken: boolean;
    questions: QuizQuestion[];
    viewer: AuthUser | null;
};

type SharedQuizResult =
    | {
          success: true;
          quiz: SharedQuizPayload;
      }
    | {
          success: false;
          error: string;
          requiresToken?: boolean;
      };

export const createQuizShareLink = createServerFn({ method: "POST" })
    .inputValidator((data: ShareLinkInput) => shareLinkInputSchema.parse(data))
    .handler(async ({ data }): Promise<ShareLinkCreateResult> => {
        const user = await getAuthenticatedUser(getRequestHeaders());

        if (!user) {
            return { success: false, error: "You must be signed in." };
        }

        try {
            const db = createDb(env.DB);
            const [quiz] = await db
                .select({ id: quizzes.id, creatorId: quizzes.creatorId })
                .from(quizzes)
                .where(eq(quizzes.id, data.quizId))
                .limit(1);

            if (!quiz) {
                return { success: false, error: "Quiz not found." };
            }

            if (quiz.creatorId !== user.id) {
                return {
                    success: false,
                    error: "You do not have access to this quiz.",
                };
            }

            const shareId = nanoid(10);
            const accessToken = data.requireToken ? nanoid(12) : null;

            await db.insert(quizShareLinks).values({
                id: shareId,
                quizId: data.quizId,
                creatorId: user.id,
                accessToken,
                createdAt: Date.now(),
            });

            return { success: true, shareId, accessToken };
        } catch (error) {
            console.error("Failed to create share link", error);
            return { success: false, error: "Failed to create share link." };
        }
    });

export const getSharedQuiz = createServerFn({ method: "GET" })
    .inputValidator((data: ShareLinkLookupInput) =>
        shareLinkLookupSchema.parse(data),
    )
    .handler(async ({ data }): Promise<SharedQuizResult> => {
        try {
            const db = createDb(env.DB);
            const [shareLink] = await db
                .select()
                .from(quizShareLinks)
                .where(eq(quizShareLinks.id, data.shareId))
                .limit(1);

            if (!shareLink) {
                return { success: false, error: "Share link not found." };
            }

            if (shareLink.accessToken && shareLink.accessToken !== data.token) {
                return {
                    success: false,
                    error: "Access token required.",
                    requiresToken: true,
                };
            }

            const questionRows = await db
                .select()
                .from(quizQuestions)
                .where(eq(quizQuestions.quizId, shareLink.quizId));

            if (!questionRows.length) {
                return {
                    success: false,
                    error: "Quiz questions not found.",
                };
            }

            const sortedQuestions = [...questionRows].sort(
                (left, right) => left.position - right.position,
            );
            const questionIds = sortedQuestions.map((question) => question.id);
            const optionRows = questionIds.length
                ? await db
                      .select()
                      .from(quizQuestionOptions)
                      .where(
                          inArray(quizQuestionOptions.questionId, questionIds),
                      )
                : [];
            const optionsByQuestionId = new Map<string, string[]>();

            for (const option of [...optionRows].sort(
                (left, right) => left.optionIndex - right.optionIndex,
            )) {
                const current =
                    optionsByQuestionId.get(option.questionId) ?? [];
                current.push(option.optionText);
                optionsByQuestionId.set(option.questionId, current);
            }

            const questions: QuizQuestion[] = sortedQuestions.map(
                (question) => {
                    if (question.questionType === "multiple-choice") {
                        return {
                            id: question.id,
                            type: "multiple-choice",
                            prompt: question.prompt,
                            options: optionsByQuestionId.get(question.id) ?? [],
                            correctOptionIndex: null,
                        };
                    }

                    return {
                        id: question.id,
                        type: "text",
                        prompt: question.prompt,
                        answer: "",
                    };
                },
            );

            const viewer = await getAuthenticatedUser(getRequestHeaders());

            return {
                success: true,
                quiz: {
                    shareId: shareLink.id,
                    quizId: shareLink.quizId,
                    requiresToken: Boolean(shareLink.accessToken),
                    questions,
                    viewer,
                },
            };
        } catch (error) {
            console.error("Failed to load shared quiz", error);
            return { success: false, error: "Failed to load shared quiz." };
        }
    });

const assignmentInputSchema = z.object({
    quizId: z.string().trim().min(1),
    classId: z.string().trim().min(1).optional(),
    studentId: z.string().trim().min(1).optional(),
    dueAt: z.number().int().positive().optional(),
    status: z.string().trim().min(1).optional(),
});

const assignmentFiltersSchema = z
    .object({
        quizId: z.string().trim().min(1).optional(),
        status: z.string().trim().min(1).optional(),
        classId: z.string().trim().min(1).optional(),
        studentId: z.string().trim().min(1).optional(),
    })
    .default({});

const studentAssignmentsSchema = z
    .object({
        quizId: z.string().trim().min(1).optional(),
        status: z.string().trim().min(1).optional(),
    })
    .default({});

const assignmentStatusUpdateSchema = z.object({
    assignmentId: z.string().trim().min(1),
    status: z.string().trim().min(1),
});

type AssignmentInput = z.infer<typeof assignmentInputSchema>;
type AssignmentFilters = z.infer<typeof assignmentFiltersSchema>;
type StudentAssignmentsInput = z.infer<typeof studentAssignmentsSchema>;
type AssignmentStatusUpdateInput = z.infer<typeof assignmentStatusUpdateSchema>;
type QuizAssignmentRow = typeof quizAssignments.$inferSelect;

type AssignmentCreateResult =
    | {
          success: true;
          id: string;
      }
    | {
          success: false;
          error: string;
      };

type AssignmentListResult =
    | {
          success: true;
          assignments: QuizAssignmentRow[];
      }
    | {
          success: false;
          error: string;
      };

type AssignmentUpdateResult =
    | {
          success: true;
          assignment: QuizAssignmentRow;
      }
    | {
          success: false;
          error: string;
      };

const sortAssignments = (assignments: QuizAssignmentRow[]) =>
    [...assignments].sort((left, right) => right.createdAt - left.createdAt);

const validateAssignmentTarget = (classId?: string, studentId?: string) => {
    if (!classId && !studentId) {
        return "Assignment must target a class or student.";
    }

    if (classId && studentId) {
        return "Assignment must target either a class or student, not both.";
    }

    return null;
};

export const createQuizAssignment = createServerFn({ method: "POST" })
    .inputValidator((data: AssignmentInput) =>
        assignmentInputSchema.parse(data),
    )
    .handler(async ({ data }): Promise<AssignmentCreateResult> => {
        const user = await getAuthenticatedUser(getRequestHeaders());

        if (!user) {
            return { success: false, error: "You must be signed in." };
        }

        const targetError = validateAssignmentTarget(
            data.classId,
            data.studentId,
        );

        if (targetError) {
            return { success: false, error: targetError };
        }

        try {
            const assignmentId = nanoid(10);
            const db = createDb(env.DB);
            await db.insert(quizAssignments).values({
                id: assignmentId,
                quizId: data.quizId,
                teacherId: user.id,
                classId: data.classId ?? null,
                studentId: data.studentId ?? null,
                status: data.status ?? "assigned",
                dueAt: data.dueAt ?? null,
                createdAt: Date.now(),
            });

            return { success: true, id: assignmentId };
        } catch (error) {
            console.error("Failed to create assignment", error);
            return { success: false, error: "Failed to create assignment." };
        }
    });

export const getTeacherAssignments = createServerFn({ method: "GET" })
    .inputValidator((data: AssignmentFilters) =>
        assignmentFiltersSchema.parse(data),
    )
    .handler(async ({ data }): Promise<AssignmentListResult> => {
        const user = await getAuthenticatedUser(getRequestHeaders());

        if (!user) {
            return { success: false, error: "You must be signed in." };
        }

        try {
            const db = createDb(env.DB);
            const conditions = [eq(quizAssignments.teacherId, user.id)];

            if (data.quizId) {
                conditions.push(eq(quizAssignments.quizId, data.quizId));
            }

            if (data.status) {
                conditions.push(eq(quizAssignments.status, data.status));
            }

            if (data.classId) {
                conditions.push(eq(quizAssignments.classId, data.classId));
            }

            if (data.studentId) {
                conditions.push(eq(quizAssignments.studentId, data.studentId));
            }

            const whereClause =
                conditions.length === 1 ? conditions[0] : and(...conditions);
            const assignments = await db
                .select()
                .from(quizAssignments)
                .where(whereClause);

            return { success: true, assignments: sortAssignments(assignments) };
        } catch (error) {
            console.error("Failed to load assignments", error);
            return { success: false, error: "Failed to load assignments." };
        }
    });

export const getStudentAssignments = createServerFn({ method: "GET" })
    .inputValidator((data: StudentAssignmentsInput) =>
        studentAssignmentsSchema.parse(data),
    )
    .handler(async ({ data }): Promise<AssignmentListResult> => {
        const user = await getAuthenticatedUser(getRequestHeaders());

        if (!user) {
            return { success: false, error: "You must be signed in." };
        }

        try {
            const db = createDb(env.DB);
            const classMemberships = await db
                .select({ classId: classStudents.classId })
                .from(classStudents)
                .where(eq(classStudents.studentId, user.id));
            const classIds = classMemberships.map((row) => row.classId);
            const baseCondition = classIds.length
                ? or(
                      eq(quizAssignments.studentId, user.id),
                      inArray(quizAssignments.classId, classIds),
                  )
                : eq(quizAssignments.studentId, user.id);
            const conditions = [baseCondition];

            if (data.quizId) {
                conditions.push(eq(quizAssignments.quizId, data.quizId));
            }

            if (data.status) {
                conditions.push(eq(quizAssignments.status, data.status));
            }

            const whereClause =
                conditions.length === 1 ? conditions[0] : and(...conditions);
            const assignments = await db
                .select()
                .from(quizAssignments)
                .where(whereClause);

            return { success: true, assignments: sortAssignments(assignments) };
        } catch (error) {
            console.error("Failed to load assignments", error);
            return { success: false, error: "Failed to load assignments." };
        }
    });

export const updateQuizAssignmentStatus = createServerFn({ method: "POST" })
    .inputValidator((data: AssignmentStatusUpdateInput) =>
        assignmentStatusUpdateSchema.parse(data),
    )
    .handler(async ({ data }): Promise<AssignmentUpdateResult> => {
        const user = await getAuthenticatedUser(getRequestHeaders());

        if (!user) {
            return { success: false, error: "You must be signed in." };
        }

        try {
            const db = createDb(env.DB);
            const [assignment] = await db
                .select()
                .from(quizAssignments)
                .where(eq(quizAssignments.id, data.assignmentId))
                .limit(1);

            if (!assignment) {
                return { success: false, error: "Assignment not found." };
            }

            const isTeacher = assignment.teacherId === user.id;
            const isStudent = assignment.studentId === user.id;
            let isClassStudent = false;

            if (!isTeacher && !isStudent && assignment.classId) {
                const [membership] = await db
                    .select({ id: classStudents.id })
                    .from(classStudents)
                    .where(
                        and(
                            eq(classStudents.classId, assignment.classId),
                            eq(classStudents.studentId, user.id),
                        ),
                    )
                    .limit(1);
                isClassStudent = Boolean(membership);
            }

            if (!isTeacher && !isStudent && !isClassStudent) {
                return {
                    success: false,
                    error: "You do not have access to this assignment.",
                };
            }

            await db
                .update(quizAssignments)
                .set({ status: data.status })
                .where(eq(quizAssignments.id, assignment.id));

            return {
                success: true,
                assignment: { ...assignment, status: data.status },
            };
        } catch (error) {
            console.error("Failed to update assignment", error);
            return { success: false, error: "Failed to update assignment." };
        }
    });

const quizAttemptResponseSchema = z
    .object({
        questionId: z.string().trim().min(1),
        answerText: z.string().trim().min(1).optional(),
        selectedOption: z.number().int().min(0).optional(),
    })
    .refine(
        (data) =>
            typeof data.answerText === "string" ||
            typeof data.selectedOption === "number",
        {
            message: "Response must include an answer.",
        },
    );

const quizAttemptInputSchema = z.object({
    quizId: z.string().trim().min(1),
    assignmentId: z.string().trim().min(1).optional(),
    mode: z.enum(["homework", "live"]).default("homework"),
    startedAt: z.number().int().positive().optional(),
    completedAt: z.number().int().positive().optional(),
    responses: z.array(quizAttemptResponseSchema).min(1),
});

type QuizAttemptInput = z.infer<typeof quizAttemptInputSchema>;

type QuizAttemptSubmitResult =
    | {
          success: true;
          attemptId: string;
          score: number;
          maxScore: number;
      }
    | {
          success: false;
          error: string;
      };

const normalizeAnswer = (value?: string | null) =>
    value?.trim().toLowerCase() ?? "";

const ensureAssignmentAccess = async (
    db: DbClient,
    assignmentId: string,
    quizId: string,
    userId: string,
) => {
    const [assignment] = await db
        .select()
        .from(quizAssignments)
        .where(eq(quizAssignments.id, assignmentId))
        .limit(1);

    if (!assignment) {
        return { success: false, error: "Assignment not found." } as const;
    }

    if (assignment.quizId !== quizId) {
        return {
            success: false,
            error: "Assignment does not match quiz.",
        } as const;
    }

    const isTeacher = assignment.teacherId === userId;
    const isStudent = assignment.studentId === userId;
    let isClassStudent = false;

    if (!isTeacher && !isStudent && assignment.classId) {
        const [membership] = await db
            .select({ id: classStudents.id })
            .from(classStudents)
            .where(
                and(
                    eq(classStudents.classId, assignment.classId),
                    eq(classStudents.studentId, userId),
                ),
            )
            .limit(1);
        isClassStudent = Boolean(membership);
    }

    if (!isTeacher && !isStudent && !isClassStudent) {
        return {
            success: false,
            error: "You do not have access to this assignment.",
        } as const;
    }

    return { success: true, assignment } as const;
};

export const submitQuizAttempt = createServerFn({ method: "POST" })
    .inputValidator((data: QuizAttemptInput) =>
        quizAttemptInputSchema.parse(data),
    )
    .handler(async ({ data }): Promise<QuizAttemptSubmitResult> => {
        const user = await getAuthenticatedUser(getRequestHeaders());

        if (!user) {
            return { success: false, error: "You must be signed in." };
        }

        try {
            const db = createDb(env.DB);
            const [quiz] = await db
                .select({ id: quizzes.id, creatorId: quizzes.creatorId })
                .from(quizzes)
                .where(eq(quizzes.id, data.quizId))
                .limit(1);

            if (!quiz) {
                return { success: false, error: "Quiz not found." };
            }

            let assignment: QuizAssignmentRow | null = null;

            if (data.assignmentId) {
                const assignmentResult = await ensureAssignmentAccess(
                    db,
                    data.assignmentId,
                    data.quizId,
                    user.id,
                );

                if (!assignmentResult.success) {
                    return {
                        success: false,
                        error: assignmentResult.error,
                    };
                }

                assignment = assignmentResult.assignment;
            }

            const questions = await db
                .select()
                .from(quizQuestions)
                .where(eq(quizQuestions.quizId, data.quizId));

            if (!questions.length) {
                return {
                    success: false,
                    error: "Quiz questions not found.",
                };
            }

            const responsesByQuestionId = new Map(
                data.responses.map((response) => [
                    response.questionId,
                    response,
                ]),
            );
            const now = Date.now();
            const attemptId = nanoid(10);
            const responseRows: (typeof quizResponses.$inferInsert)[] = [];
            let score = 0;
            let maxScore = 0;

            for (const question of questions) {
                const hasAnswer =
                    question.questionType === "multiple-choice"
                        ? question.correctOption !== null
                        : Boolean(question.answerText?.trim());

                if (hasAnswer) {
                    maxScore += 1;
                }

                const response = responsesByQuestionId.get(question.id);

                if (!response) {
                    continue;
                }

                const answerText = response.answerText?.trim() ?? null;
                const selectedOption =
                    typeof response.selectedOption === "number"
                        ? response.selectedOption
                        : null;
                let isCorrect: number | null = null;

                if (hasAnswer) {
                    if (question.questionType === "multiple-choice") {
                        isCorrect =
                            selectedOption === question.correctOption ? 1 : 0;
                    } else {
                        isCorrect = answerText
                            ? normalizeAnswer(answerText) ===
                              normalizeAnswer(question.answerText)
                                ? 1
                                : 0
                            : 0;
                    }
                }

                if (isCorrect === 1) {
                    score += 1;
                }

                responseRows.push({
                    id: nanoid(10),
                    attemptId,
                    questionId: question.id,
                    questionType: question.questionType,
                    answerText,
                    selectedOption,
                    isCorrect,
                    createdAt: now,
                });
            }

            const startedAt = data.startedAt ?? now;
            const completedAt = data.completedAt ?? now;
            const durationMs = Math.max(0, completedAt - startedAt);

            await db.insert(quizAttempts).values({
                id: attemptId,
                quizId: data.quizId,
                studentId: user.id,
                teacherId: assignment?.teacherId ?? quiz.creatorId,
                mode: data.mode,
                status: "completed",
                startedAt,
                completedAt,
                durationMs,
                score,
                maxScore,
                createdAt: now,
            });

            if (responseRows.length) {
                await db.insert(quizResponses).values(responseRows);
            }

            if (assignment) {
                await db
                    .update(quizAssignments)
                    .set({ status: "completed" })
                    .where(eq(quizAssignments.id, assignment.id));
            }

            return { success: true, attemptId, score, maxScore };
        } catch (error) {
            console.error("Failed to submit quiz attempt", error);
            return { success: false, error: "Failed to submit quiz attempt." };
        }
    });
