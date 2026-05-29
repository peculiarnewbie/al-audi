import { Data, Effect } from "effect";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
    quizzes,
    users,
    quizQuestions,
    quizQuestionOptions,
    quizCategories,
    quizCategoryLinks,
    quizShareLinks,
    quizAssignments,
    quizAttempts,
    quizResponses,
    classStudents,
} from "~/db/schema";
import type { DbClient } from "~/db/client";
import type {
    QuizPayload,
    QuizQuestion,
    QuizCategories,
    SaveQuizInput,
    AssignmentInput,
    AssignmentFilters,
    StudentAssignmentsInput,
    AssignmentStatusUpdateInput,
    QuizAttemptInput,
} from "~/quiz/schemas";

export class QuizNotFound extends Data.TaggedError("QuizNotFound")<{
    id: string;
}> {}

export class QuizAccessDenied extends Data.TaggedError("QuizAccessDenied")<{}> {}

export class QuizSaveError extends Data.TaggedError("QuizSaveError")<{
    message: string;
}> {}

export class ShareLinkNotFound extends Data.TaggedError("ShareLinkNotFound")<{
    id: string;
}> {}

export class ShareLinkTokenRequired extends Data.TaggedError(
    "ShareLinkTokenRequired",
)<{}> {}

export class AssignmentTargetError extends Data.TaggedError(
    "AssignmentTargetError",
)<{
    message: string;
}> {}

export class AssignmentNotFound extends Data.TaggedError(
    "AssignmentNotFound",
)<{
    id: string;
}> {}

export class AttemptError extends Data.TaggedError("AttemptError")<{
    message: string;
}> {}

const toSlug = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

const normalizeCategoryValue = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
};

const buildCategoryPayload = (categories?: QuizCategories): QuizCategories | undefined => {
    if (!categories) return undefined;
    const normalized: QuizCategories = {
        level: normalizeCategoryValue(categories.level),
        topic: normalizeCategoryValue(categories.topic),
        skill: normalizeCategoryValue(categories.skill),
    };
    return Object.values(normalized).some(Boolean) ? normalized : undefined;
};

const saveQuizCategories = async (db: DbClient, quizId: string, categories: QuizCategories) => {
    const entries = [
        { type: "level" as const, name: categories.level },
        { type: "topic" as const, name: categories.topic },
        { type: "skill" as const, name: categories.skill },
    ];

    for (const entry of entries) {
        if (!entry.name) continue;
        const name = entry.name.trim();
        const slug = toSlug(name);
        if (!slug) continue;

        await db
            .insert(quizCategories)
            .values({ id: nanoid(10), name, slug, categoryType: entry.type, createdAt: Date.now() })
            .onConflictDoNothing({ target: [quizCategories.slug, quizCategories.categoryType] });

        const [category] = await db
            .select({ id: quizCategories.id })
            .from(quizCategories)
            .where(and(eq(quizCategories.slug, slug), eq(quizCategories.categoryType, entry.type)))
            .limit(1);

        if (!category?.id) continue;

        await db
            .insert(quizCategoryLinks)
            .values({ id: nanoid(10), quizId, categoryId: category.id, createdAt: Date.now() })
            .onConflictDoNothing({ target: [quizCategoryLinks.quizId, quizCategoryLinks.categoryId] });
    }
};

const saveQuizQuestions = async (db: DbClient, quizId: string, questions: QuizQuestion[]) => {
    const existingQuestions = await db
        .select({ id: quizQuestions.id })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quizId));
    const existingQuestionIds = existingQuestions.map((q) => q.id);

    if (existingQuestionIds.length) {
        await db.delete(quizQuestionOptions).where(inArray(quizQuestionOptions.questionId, existingQuestionIds));
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
            correctOption: question.type === "multiple-choice" ? question.correctOptionIndex : null,
            position,
            createdAt,
        });

        if (question.type !== "multiple-choice") continue;

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

const validateAssignmentTarget = (classId?: string, studentId?: string) => {
    if (!classId && !studentId) return "Assignment must target a class or student.";
    if (classId && studentId) return "Assignment must target either a class or student, not both.";
    return null;
};

const normalizeAnswer = (value?: string | null) => value?.trim().toLowerCase() ?? "";

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

    if (!assignment) return { success: false as const, error: "Assignment not found." };
    if (assignment.quizId !== quizId) return { success: false as const, error: "Assignment does not match quiz." };

    const isTeacher = assignment.teacherId === userId;
    const isStudent = assignment.studentId === userId;
    let isClassStudent = false;

    if (!isTeacher && !isStudent && assignment.classId) {
        const [membership] = await db
            .select({ id: classStudents.id })
            .from(classStudents)
            .where(and(eq(classStudents.classId, assignment.classId), eq(classStudents.studentId, userId)))
            .limit(1);
        isClassStudent = Boolean(membership);
    }

    if (!isTeacher && !isStudent && !isClassStudent) {
        return { success: false as const, error: "You do not have access to this assignment." };
    }

    return { success: true as const, assignment };
};

const catchKnown = (error: unknown) => {
    if (error instanceof QuizNotFound) return error;
    if (error instanceof QuizAccessDenied) return error;
    if (error instanceof ShareLinkNotFound) return error;
    if (error instanceof ShareLinkTokenRequired) return error;
    if (error instanceof AssignmentTargetError) return error;
    if (error instanceof AssignmentNotFound) return error;
    if (error instanceof AttemptError) return error;
    return new QuizSaveError({ message: String(error) });
};

export function saveQuizEffect(
    db: DbClient,
    bucket: R2Bucket,
    userId: string,
    input: SaveQuizInput,
) {
    return Effect.tryPromise({
        try: async () => {
            const quizId = input.quizId ?? nanoid(10);
            const createdAt = new Date().toISOString();
            const categories = buildCategoryPayload(input.categories);
            const payload: QuizPayload = {
                id: quizId,
                creatorId: userId,
                createdAt,
                name: input.name || undefined,
                questions: input.questions,
                categories,
            };
            const r2Key = `quizzes/${quizId}.json`;

            await bucket.put(r2Key, JSON.stringify(payload), {
                httpMetadata: { contentType: "application/json" },
            });

            await db
                .insert(quizzes)
                .values({ id: quizId, creatorId: userId, createdAt: Date.now(), r2Key, name: input.name || null })
                .onConflictDoNothing();

            await saveQuizQuestions(db, quizId, input.questions);

            if (categories) {
                await saveQuizCategories(db, quizId, categories);
            }

            return { id: quizId };
        },
        catch: catchKnown,
    });
}

export function createQuizShareLinkEffect(
    db: DbClient,
    quizId: string,
    userId: string,
    requireToken: boolean,
) {
    return Effect.tryPromise({
        try: async () => {
            const [quiz] = await db
                .select({ id: quizzes.id, creatorId: quizzes.creatorId })
                .from(quizzes)
                .where(eq(quizzes.id, quizId))
                .limit(1);

            if (!quiz) throw new QuizNotFound({ id: quizId });
            if (quiz.creatorId !== userId) throw new QuizAccessDenied();

            const shareId = nanoid(10);
            const accessToken = requireToken ? nanoid(12) : null;

            await db.insert(quizShareLinks).values({
                id: shareId,
                quizId,
                creatorId: userId,
                accessToken,
                createdAt: Date.now(),
            });

            return { shareId, accessToken };
        },
        catch: catchKnown,
    });
}

export function getSharedQuizEffect(
    db: DbClient,
    shareId: string,
    token?: string,
) {
    return Effect.tryPromise({
        try: async () => {
            const [shareLink] = await db
                .select()
                .from(quizShareLinks)
                .where(eq(quizShareLinks.id, shareId))
                .limit(1);

            if (!shareLink) throw new ShareLinkNotFound({ id: shareId });

            if (shareLink.accessToken && shareLink.accessToken !== token) {
                throw new ShareLinkTokenRequired();
            }

            const questionRows = await db
                .select()
                .from(quizQuestions)
                .where(eq(quizQuestions.quizId, shareLink.quizId));

            if (!questionRows.length) {
                throw new QuizNotFound({ id: shareLink.quizId });
            }

            const sortedQuestions = [...questionRows].sort((a, b) => a.position - b.position);
            const questionIds = sortedQuestions.map((q) => q.id);
            const optionRows = questionIds.length
                ? await db
                      .select()
                      .from(quizQuestionOptions)
                      .where(inArray(quizQuestionOptions.questionId, questionIds))
                : [];
            const optionsByQuestionId = new Map<string, string[]>();

            for (const option of [...optionRows].sort((a, b) => a.optionIndex - b.optionIndex)) {
                const current = optionsByQuestionId.get(option.questionId) ?? [];
                current.push(option.optionText);
                optionsByQuestionId.set(option.questionId, current);
            }

            const questions: QuizQuestion[] = sortedQuestions.map((question) => {
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
            });

            return {
                shareId: shareLink.id,
                quizId: shareLink.quizId,
                requiresToken: Boolean(shareLink.accessToken),
                questions,
            };
        },
        catch: catchKnown,
    });
}

export function createQuizAssignmentEffect(
    db: DbClient,
    userId: string,
    input: AssignmentInput,
) {
    return Effect.tryPromise({
        try: async () => {
            const targetError = validateAssignmentTarget(input.classId, input.studentId);
            if (targetError) throw new AssignmentTargetError({ message: targetError });

            const assignmentId = nanoid(10);
            await db.insert(quizAssignments).values({
                id: assignmentId,
                quizId: input.quizId,
                teacherId: userId,
                classId: input.classId ?? null,
                studentId: input.studentId ?? null,
                status: input.status ?? "assigned",
                dueAt: input.dueAt ?? null,
                createdAt: Date.now(),
            });

            return { id: assignmentId };
        },
        catch: catchKnown,
    });
}

export function getTeacherAssignmentsEffect(
    db: DbClient,
    userId: string,
    filters: AssignmentFilters,
) {
    return Effect.tryPromise({
        try: async () => {
            const conditions = [eq(quizAssignments.teacherId, userId)];
            if (filters.quizId) conditions.push(eq(quizAssignments.quizId, filters.quizId));
            if (filters.status) conditions.push(eq(quizAssignments.status, filters.status));
            if (filters.classId) conditions.push(eq(quizAssignments.classId, filters.classId));
            if (filters.studentId) conditions.push(eq(quizAssignments.studentId, filters.studentId));

            const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
            const assignments = await db.select().from(quizAssignments).where(whereClause);
            return [...assignments].sort((a, b) => b.createdAt - a.createdAt);
        },
        catch: catchKnown,
    });
}

export function getStudentAssignmentsEffect(
    db: DbClient,
    userId: string,
    filters: StudentAssignmentsInput,
) {
    return Effect.tryPromise({
        try: async () => {
            const classMemberships = await db
                .select({ classId: classStudents.classId })
                .from(classStudents)
                .where(eq(classStudents.studentId, userId));
            const classIds = classMemberships.map((row) => row.classId);
            const baseCondition = classIds.length
                ? or(eq(quizAssignments.studentId, userId), inArray(quizAssignments.classId, classIds))
                : eq(quizAssignments.studentId, userId);
            const conditions = [baseCondition];

            if (filters.quizId) conditions.push(eq(quizAssignments.quizId, filters.quizId));
            if (filters.status) conditions.push(eq(quizAssignments.status, filters.status));

            const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
            const assignments = await db.select().from(quizAssignments).where(whereClause);
            return [...assignments].sort((a, b) => b.createdAt - a.createdAt);
        },
        catch: catchKnown,
    });
}

export function updateQuizAssignmentStatusEffect(
    db: DbClient,
    userId: string,
    input: AssignmentStatusUpdateInput,
) {
    return Effect.tryPromise({
        try: async () => {
            const [assignment] = await db
                .select()
                .from(quizAssignments)
                .where(eq(quizAssignments.id, input.assignmentId))
                .limit(1);

            if (!assignment) throw new AssignmentNotFound({ id: input.assignmentId });

            const isTeacher = assignment.teacherId === userId;
            const isStudent = assignment.studentId === userId;
            let isClassStudent = false;

            if (!isTeacher && !isStudent && assignment.classId) {
                const [membership] = await db
                    .select({ id: classStudents.id })
                    .from(classStudents)
                    .where(and(eq(classStudents.classId, assignment.classId), eq(classStudents.studentId, userId)))
                    .limit(1);
                isClassStudent = Boolean(membership);
            }

            if (!isTeacher && !isStudent && !isClassStudent) {
                throw new QuizAccessDenied();
            }

            await db.update(quizAssignments).set({ status: input.status }).where(eq(quizAssignments.id, assignment.id));

            return { ...assignment, status: input.status };
        },
        catch: catchKnown,
    });
}

export function submitQuizAttemptEffect(
    db: DbClient,
    userId: string,
    input: QuizAttemptInput,
) {
    return Effect.tryPromise({
        try: async () => {
            const [quiz] = await db
                .select({ id: quizzes.id, creatorId: quizzes.creatorId })
                .from(quizzes)
                .where(eq(quizzes.id, input.quizId))
                .limit(1);

            if (!quiz) throw new QuizNotFound({ id: input.quizId });

            let assignment: typeof quizAssignments.$inferSelect | null = null;

            if (input.assignmentId) {
                const assignmentResult = await ensureAssignmentAccess(db, input.assignmentId, input.quizId, userId);
                if (!assignmentResult.success) {
                    throw new AttemptError({ message: assignmentResult.error });
                }
                assignment = assignmentResult.assignment;
            }

            const questions = await db
                .select()
                .from(quizQuestions)
                .where(eq(quizQuestions.quizId, input.quizId));

            if (!questions.length) throw new AttemptError({ message: "Quiz questions not found." });

            const responsesByQuestionId = new Map(
                input.responses.map((r) => [r.questionId, r]),
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

                if (hasAnswer) maxScore += 1;

                const response = responsesByQuestionId.get(question.id);
                if (!response) continue;

                const answerText = response.answerText?.trim() ?? null;
                const selectedOption = typeof response.selectedOption === "number" ? response.selectedOption : null;
                let isCorrect: number | null = null;

                if (hasAnswer) {
                    if (question.questionType === "multiple-choice") {
                        isCorrect = selectedOption === question.correctOption ? 1 : 0;
                    } else {
                        isCorrect = answerText
                            ? normalizeAnswer(answerText) === normalizeAnswer(question.answerText) ? 1 : 0
                            : 0;
                    }
                }

                if (isCorrect === 1) score += 1;

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

            const startedAt = input.startedAt ?? now;
            const completedAt = input.completedAt ?? now;
            const durationMs = Math.max(0, completedAt - startedAt);

            await db.insert(quizAttempts).values({
                id: attemptId,
                quizId: input.quizId,
                studentId: userId,
                teacherId: assignment?.teacherId ?? quiz.creatorId,
                mode: input.mode ?? "homework",
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
                await db.update(quizAssignments).set({ status: "completed" }).where(eq(quizAssignments.id, assignment.id));
            }

            return { attemptId, score, maxScore };
        },
        catch: catchKnown,
    });
}

export function getStudentAssignmentsWithDetailsEffect(
    db: DbClient,
    userId: string,
    filters: { status?: string },
) {
    return Effect.tryPromise({
        try: async () => {
            const classMemberships = await db
                .select({ classId: classStudents.classId })
                .from(classStudents)
                .where(eq(classStudents.studentId, userId));
            const classIds = classMemberships.map((r) => r.classId);

            const baseCondition = classIds.length
                ? or(eq(quizAssignments.studentId, userId), inArray(quizAssignments.classId, classIds))
                : eq(quizAssignments.studentId, userId);
            const conditions = [baseCondition];
            if (filters.status) conditions.push(eq(quizAssignments.status, filters.status));
            const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

            const rows = await db
                .select({
                    id: quizAssignments.id,
                    quizId: quizAssignments.quizId,
                    status: quizAssignments.status,
                    dueAt: quizAssignments.dueAt,
                    createdAt: quizAssignments.createdAt,
                    quizName: quizzes.name,
                    teacherName: users.name,
                })
                .from(quizAssignments)
                .leftJoin(quizzes, eq(quizAssignments.quizId, quizzes.id))
                .leftJoin(users, eq(quizAssignments.teacherId, users.id))
                .where(whereClause)
                .orderBy(desc(quizAssignments.createdAt));

            const assignmentQuizIds = [...new Set(rows.map((r) => r.quizId))];
            const attempts = assignmentQuizIds.length
                ? await db
                      .select()
                      .from(quizAttempts)
                      .where(and(inArray(quizAttempts.quizId, assignmentQuizIds), eq(quizAttempts.studentId, userId), eq(quizAttempts.mode, "homework")))
                : [];

            const attemptByQuizId = new Map<string, typeof quizAttempts.$inferSelect>();
            for (const a of attempts) {
                const existing = attemptByQuizId.get(a.quizId);
                if (!existing || (a.completedAt ?? 0) > (existing.completedAt ?? 0)) {
                    attemptByQuizId.set(a.quizId, a);
                }
            }

            return rows.map((row) => {
                const attempt = attemptByQuizId.get(row.quizId) ?? null;
                return {
                    id: row.id,
                    quizId: row.quizId,
                    quizName: row.quizName ?? "Untitled quiz",
                    status: row.status,
                    dueAt: row.dueAt,
                    createdAt: row.createdAt,
                    teacherName: row.teacherName ?? "Unknown",
                    attempt: attempt
                        ? { id: attempt.id, score: attempt.score, maxScore: attempt.maxScore, completedAt: attempt.completedAt }
                        : null,
                };
            });
        },
        catch: catchKnown,
    });
}

export function getAssignmentQuizForPlayEffect(
    db: DbClient,
    assignmentId: string,
    userId: string,
) {
    return Effect.tryPromise({
        try: async () => {
            const [assignment] = await db
                .select()
                .from(quizAssignments)
                .where(eq(quizAssignments.id, assignmentId))
                .limit(1);

            if (!assignment) throw new AssignmentNotFound({ id: assignmentId });

            const accessResult = await ensureAssignmentAccess(db, assignmentId, assignment.quizId, userId);
            if (!accessResult.success) throw new AttemptError({ message: accessResult.error });

            const questionRows = await db
                .select()
                .from(quizQuestions)
                .where(eq(quizQuestions.quizId, assignment.quizId));

            if (!questionRows.length) throw new QuizNotFound({ id: assignment.quizId });

            const sortedQuestions = [...questionRows].sort((a, b) => a.position - b.position);
            const questionIds = sortedQuestions.map((q) => q.id);
            const optionRows = questionIds.length
                ? await db
                      .select()
                      .from(quizQuestionOptions)
                      .where(inArray(quizQuestionOptions.questionId, questionIds))
                : [];
            const optionsByQuestionId = new Map<string, string[]>();

            for (const opt of [...optionRows].sort((a, b) => a.optionIndex - b.optionIndex)) {
                const current = optionsByQuestionId.get(opt.questionId) ?? [];
                current.push(opt.optionText);
                optionsByQuestionId.set(opt.questionId, current);
            }

            const questions = sortedQuestions.map((question) => {
                if (question.questionType === "multiple-choice") {
                    return {
                        id: question.id,
                        type: "multiple-choice" as const,
                        prompt: question.prompt,
                        options: optionsByQuestionId.get(question.id) ?? [],
                        correctOptionIndex: null,
                    };
                }
                return {
                    id: question.id,
                    type: "text" as const,
                    prompt: question.prompt,
                    answer: "",
                };
            });

            const [quiz] = await db
                .select({ name: quizzes.name })
                .from(quizzes)
                .where(eq(quizzes.id, assignment.quizId))
                .limit(1);

            const [existingAttempt] = await db
                .select()
                .from(quizAttempts)
                .where(and(eq(quizAttempts.quizId, assignment.quizId), eq(quizAttempts.studentId, userId), eq(quizAttempts.mode, "homework")))
                .orderBy(desc(quizAttempts.completedAt))
                .limit(1);

            let existingResult = null;

            if (existingAttempt) {
                const responses = await db
                    .select()
                    .from(quizResponses)
                    .where(eq(quizResponses.attemptId, existingAttempt.id));
                existingResult = {
                    attempt: existingAttempt,
                    responses,
                };
            }

            return {
                assignmentId: assignment.id,
                quizId: assignment.quizId,
                quizName: quiz?.name ?? "Untitled quiz",
                status: assignment.status,
                dueAt: assignment.dueAt,
                questions,
                existingResult,
            };
        },
        catch: catchKnown,
    });
}
