import { Schema } from "effect";

export const AttemptSummarySchema = Schema.Struct({
    attemptCount: Schema.Number,
    averageScore: Schema.NullOr(Schema.Number),
    lastAttemptAt: Schema.NullOr(Schema.Number),
});

export const ClassReportSchema = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    description: Schema.NullOr(Schema.String),
    studentCount: Schema.Number,
    assignmentCount: Schema.Number,
    attemptCount: Schema.Number,
    averageScore: Schema.NullOr(Schema.Number),
    lastAttemptAt: Schema.NullOr(Schema.Number),
});

export const StudentReportSchema = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    email: Schema.NullOr(Schema.String),
    classCount: Schema.Number,
    assignmentCount: Schema.Number,
    attemptCount: Schema.Number,
    averageScore: Schema.NullOr(Schema.Number),
    lastAttemptAt: Schema.NullOr(Schema.Number),
});

export const TeacherReportSchema = Schema.Struct({
    classes: Schema.Array(ClassReportSchema),
    students: Schema.Array(StudentReportSchema),
    generatedAt: Schema.Number,
});

export const AttemptResponseSchema = Schema.Struct({
    id: Schema.String,
    questionId: Schema.String,
    questionType: Schema.String,
    prompt: Schema.String,
    options: Schema.Array(Schema.String),
    correctOption: Schema.NullOr(Schema.Number),
    answerText: Schema.NullOr(Schema.String),
    selectedOption: Schema.NullOr(Schema.Number),
    isCorrect: Schema.NullOr(Schema.Number),
});

export const AttemptDetailSchema = Schema.Struct({
    attemptId: Schema.String,
    quizId: Schema.String,
    quizName: Schema.String,
    studentName: Schema.String,
    status: Schema.String,
    mode: Schema.String,
    startedAt: Schema.Number,
    completedAt: Schema.NullOr(Schema.Number),
    durationMs: Schema.NullOr(Schema.Number),
    score: Schema.NullOr(Schema.Number),
    maxScore: Schema.NullOr(Schema.Number),
    responses: Schema.Array(AttemptResponseSchema),
});

export const StudentHistoryItemSchema = Schema.Struct({
    attemptId: Schema.String,
    quizId: Schema.String,
    quizName: Schema.String,
    mode: Schema.String,
    score: Schema.NullOr(Schema.Number),
    maxScore: Schema.NullOr(Schema.Number),
    completedAt: Schema.NullOr(Schema.Number),
    durationMs: Schema.NullOr(Schema.Number),
});

export const StudentHistorySchema = Schema.Struct({
    studentId: Schema.String,
    studentName: Schema.String,
    studentEmail: Schema.NullOr(Schema.String),
    classCount: Schema.Number,
    totalAttempts: Schema.Number,
    averageScore: Schema.NullOr(Schema.Number),
    items: Schema.Array(StudentHistoryItemSchema),
});

export const LiveSessionResultItemSchema = Schema.Struct({
    id: Schema.String,
    sessionId: Schema.String,
    roomId: Schema.String,
    playerId: Schema.String,
    playerName: Schema.String,
    score: Schema.Number,
    maxScore: Schema.Number,
    startedAt: Schema.Number,
    endedAt: Schema.Number,
});

export const LiveSessionSchema = Schema.Struct({
    roomId: Schema.String,
    sessionId: Schema.String,
    playerCount: Schema.Number,
    quizName: Schema.NullOr(Schema.String),
    startedAt: Schema.Number,
    endedAt: Schema.NullOr(Schema.Number),
    results: Schema.Array(LiveSessionResultItemSchema),
});

export type AttemptResponse = {
    id: string;
    questionId: string;
    questionType: string;
    prompt: string;
    options: string[];
    correctOption: number | null;
    answerText: string | null;
    selectedOption: number | null;
    isCorrect: number | null;
};

export type AttemptDetail = {
    attemptId: string;
    quizId: string;
    quizName: string;
    studentName: string;
    status: string;
    mode: string;
    startedAt: number;
    completedAt: number | null;
    durationMs: number | null;
    score: number | null;
    maxScore: number | null;
    responses: AttemptResponse[];
};

export type StudentHistoryItem = {
    attemptId: string;
    quizId: string;
    quizName: string;
    mode: string;
    score: number | null;
    maxScore: number | null;
    completedAt: number | null;
    durationMs: number | null;
};

export type StudentHistory = {
    studentId: string;
    studentName: string;
    studentEmail: string | null;
    classCount: number;
    totalAttempts: number;
    averageScore: number | null;
    items: StudentHistoryItem[];
};

export type LiveSessionResultItem = {
    id: string;
    sessionId: string;
    roomId: string;
    playerId: string;
    playerName: string;
    score: number;
    maxScore: number;
    startedAt: number;
    endedAt: number;
};

export type LiveSession = {
    roomId: string;
    sessionId: string;
    playerCount: number;
    quizName: string | null;
    startedAt: number;
    endedAt: number | null;
    results: LiveSessionResultItem[];
};
