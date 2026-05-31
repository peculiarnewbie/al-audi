import { Data, Effect } from "effect";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
    classStudents,
    classes,
    liveQuizResults,
    quizAttempts,
    quizQuestions,
    quizQuestionOptions,
    quizResponses,
    quizzes,
    users,
} from "~/db/schema";
import type { DbClient } from "~/db/client";

export class ReportAccessDenied extends Data.TaggedError("ReportAccessDenied")<{}> {}

export class AttemptNotFound extends Data.TaggedError("AttemptNotFound")<{ id: string }> {}

export class StudentNotFound extends Data.TaggedError("StudentNotFound")<{ id: string }> {}

export function getAttemptDetailEffect(
    db: DbClient,
    attemptId: string,
    teacherId: string,
) {
    return Effect.tryPromise({
        try: async () => {
            const [attempt] = await db
                .select()
                .from(quizAttempts)
                .where(eq(quizAttempts.id, attemptId))
                .limit(1);

            if (!attempt) throw new AttemptNotFound({ id: attemptId });
            if (attempt.teacherId !== teacherId) throw new ReportAccessDenied();

            const [quiz] = await db
                .select({ name: quizzes.name })
                .from(quizzes)
                .where(eq(quizzes.id, attempt.quizId))
                .limit(1);

            const [student] = await db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.id, attempt.studentId))
                .limit(1);

            const responses = await db
                .select()
                .from(quizResponses)
                .where(eq(quizResponses.attemptId, attemptId));

            const questionRows = await db
                .select()
                .from(quizQuestions)
                .where(eq(quizQuestions.quizId, attempt.quizId));

            const questionIds = questionRows.map((q) => q.id);
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

            const questionsByQuestionId = new Map(questionRows.map((q) => [q.id, q]));

            const enrichedResponses = responses.map((r) => {
                const question = questionsByQuestionId.get(r.questionId);
                return {
                    id: r.id,
                    questionId: r.questionId,
                    questionType: r.questionType,
                    prompt: question?.prompt ?? "",
                    options: optionsByQuestionId.get(r.questionId) ?? [],
                    correctOption: question?.correctOption ?? null,
                    answerText: r.answerText,
                    selectedOption: r.selectedOption,
                    isCorrect: r.isCorrect,
                };
            });

            return {
                attemptId: attempt.id,
                quizId: attempt.quizId,
                quizName: quiz?.name ?? "Untitled quiz",
                studentName: student?.name ?? "Unknown",
                status: attempt.status,
                mode: attempt.mode,
                startedAt: attempt.startedAt,
                completedAt: attempt.completedAt,
                durationMs: attempt.durationMs,
                score: attempt.score,
                maxScore: attempt.maxScore,
                responses: enrichedResponses,
            };
        },
        catch: (error) => {
            if (error instanceof AttemptNotFound) return error;
            if (error instanceof ReportAccessDenied) return error;
            return new ReportAccessDenied();
        },
    });
}

export function getStudentHistoryEffect(
    db: DbClient,
    studentId: string,
    teacherId: string,
) {
    return Effect.tryPromise({
        try: async () => {
            const [student] = await db
                .select()
                .from(users)
                .where(eq(users.id, studentId))
                .limit(1);

            if (!student) throw new StudentNotFound({ id: studentId });

            const isOwnStudent = student.teacherId === teacherId;
            const isTeacher = student.role === "teacher" && student.id === teacherId;
            if (!isOwnStudent && !isTeacher) throw new ReportAccessDenied();

            const attempts = await db
                .select()
                .from(quizAttempts)
                .where(and(eq(quizAttempts.studentId, studentId), eq(quizAttempts.teacherId, teacherId)))
                .orderBy(desc(quizAttempts.completedAt));

            const quizIds = [...new Set(attempts.map((a) => a.quizId))];
            const quizRows = quizIds.length
                ? await db
                      .select({ id: quizzes.id, name: quizzes.name })
                      .from(quizzes)
                      .where(inArray(quizzes.id, quizIds))
                : [];
            const quizNameById = new Map(quizRows.map((q) => [q.id, q.name ?? "Untitled quiz"]));

            const classRowsForStudent = await db
                .select({ classId: classStudents.classId })
                .from(classStudents)
                .where(eq(classStudents.studentId, studentId));

            const classIds = classRowsForStudent.map((c) => c.classId);
            const classCount = classIds.length;

            let totalScore = 0;
            let totalMax = 0;
            let scoredAttempts = 0;

            const items = attempts.map((a) => {
                if (typeof a.score === "number" && typeof a.maxScore === "number" && a.maxScore > 0) {
                    totalScore += a.score;
                    totalMax += a.maxScore;
                    scoredAttempts += 1;
                }
                return {
                    attemptId: a.id,
                    quizId: a.quizId,
                    quizName: quizNameById.get(a.quizId) ?? "Untitled quiz",
                    mode: a.mode,
                    score: a.score,
                    maxScore: a.maxScore,
                    completedAt: a.completedAt,
                    durationMs: a.durationMs,
                };
            });

            return {
                studentId: student.id,
                studentName: student.name,
                studentEmail: student.email ?? null,
                classCount,
                totalAttempts: attempts.length,
                averageScore: scoredAttempts > 0 ? Math.round((totalScore / totalMax) * 100) : null,
                items,
            };
        },
        catch: (error) => {
            if (error instanceof StudentNotFound) return error;
            if (error instanceof ReportAccessDenied) return error;
            return new ReportAccessDenied();
        },
    });
}

export function getLiveSessionsEffect(
    db: DbClient,
    teacherId: string,
) {
    return Effect.tryPromise({
        try: async () => {
            const results = await db
                .select()
                .from(liveQuizResults)
                .orderBy(desc(liveQuizResults.endedAt));

            const grouped = new Map<string, typeof results>();

            for (const r of results) {
                const key = `${r.roomId}::${r.sessionId}`;
                const group = grouped.get(key) ?? [];
                group.push(r);
                grouped.set(key, group);
            }

            const sessions = await Promise.all(
                Array.from(grouped.entries()).map(async ([key, rows]) => {
                    const [roomId, sessionId] = key.split("::");
                    const earliest = rows.reduce((min, r) => Math.min(min, r.startedAt), Infinity);
                    const latest = rows.reduce((max, r) => Math.max(max, r.endedAt), 0);

                    return {
                        roomId,
                        sessionId,
                        playerCount: rows.length,
                        quizName: null as string | null,
                        startedAt: earliest,
                        endedAt: latest,
                        results: rows.map((r) => ({
                            id: r.id,
                            sessionId: r.sessionId,
                            roomId: r.roomId,
                            playerId: r.playerId,
                            playerName: r.playerName,
                            score: r.score,
                            maxScore: r.maxScore,
                            startedAt: r.startedAt,
                            endedAt: r.endedAt,
                        })),
                    };
                }),
            );

            return sessions;
        },
        catch: (error) => {
            if (error instanceof ReportAccessDenied) return error;
            return new ReportAccessDenied();
        },
    });
}
