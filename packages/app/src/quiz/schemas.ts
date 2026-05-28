import { Schema } from "effect";

export const MultipleChoiceQuestionSchema = Schema.Struct({
    id: Schema.String,
    type: Schema.Literal("multiple-choice"),
    prompt: Schema.String,
    options: Schema.Array(Schema.String),
    correctOptionIndex: Schema.NullOr(Schema.Number),
});

export const TextQuestionSchema = Schema.Struct({
    id: Schema.String,
    type: Schema.Literal("text"),
    prompt: Schema.String,
    answer: Schema.String,
});

export const QuizQuestionSchema = Schema.Union([
    MultipleChoiceQuestionSchema,
    TextQuestionSchema,
]);

export const QuizCategoriesSchema = Schema.Struct({
    level: Schema.optional(Schema.String),
    topic: Schema.optional(Schema.String),
    skill: Schema.optional(Schema.String),
});

export const QuizPayloadSchema = Schema.Struct({
    id: Schema.String,
    creatorId: Schema.String,
    createdAt: Schema.String,
    questions: Schema.Array(QuizQuestionSchema),
    categories: Schema.optional(QuizCategoriesSchema),
});

export const SaveQuizInputSchema = Schema.Struct({
    quizId: Schema.optional(Schema.String),
    questions: Schema.Array(QuizQuestionSchema),
    categories: Schema.optional(QuizCategoriesSchema),
});

export const ShareLinkInputSchema = Schema.Struct({
    quizId: Schema.String,
    requireToken: Schema.optional(Schema.Boolean),
});

export const ShareLinkLookupSchema = Schema.Struct({
    shareId: Schema.String,
    token: Schema.optional(Schema.String),
});

export const AssignmentInputSchema = Schema.Struct({
    quizId: Schema.String,
    classId: Schema.optional(Schema.String),
    studentId: Schema.optional(Schema.String),
    dueAt: Schema.optional(Schema.Number),
    status: Schema.optional(Schema.String),
});

export const AssignmentFiltersSchema = Schema.Struct({
    quizId: Schema.optional(Schema.String),
    status: Schema.optional(Schema.String),
    classId: Schema.optional(Schema.String),
    studentId: Schema.optional(Schema.String),
});

export const StudentAssignmentsInputSchema = Schema.Struct({
    quizId: Schema.optional(Schema.String),
    status: Schema.optional(Schema.String),
});

export const AssignmentStatusUpdateInputSchema = Schema.Struct({
    assignmentId: Schema.String,
    status: Schema.String,
});

export const QuizAttemptResponseSchema = Schema.Struct({
    questionId: Schema.String,
    answerText: Schema.optional(Schema.String),
    selectedOption: Schema.optional(Schema.Number),
});

export const QuizAttemptInputSchema = Schema.Struct({
    quizId: Schema.String,
    assignmentId: Schema.optional(Schema.String),
    mode: Schema.optional(
        Schema.Union([Schema.Literal("homework"), Schema.Literal("live")]),
    ),
    startedAt: Schema.optional(Schema.Number),
    completedAt: Schema.optional(Schema.Number),
    responses: Schema.Array(QuizAttemptResponseSchema),
});

export type MultipleChoiceQuestion = {
    id: string;
    type: "multiple-choice";
    prompt: string;
    options: string[];
    correctOptionIndex: number | null;
};

export type TextQuestion = {
    id: string;
    type: "text";
    prompt: string;
    answer: string;
};

export type QuizQuestion = MultipleChoiceQuestion | TextQuestion;

export type QuizCategories = {
    level?: string;
    topic?: string;
    skill?: string;
};

export type QuizPayload = {
    id: string;
    creatorId: string;
    createdAt: string;
    questions: QuizQuestion[];
    categories?: QuizCategories;
};

export type SaveQuizInput = {
    quizId?: string;
    questions: QuizQuestion[];
    categories?: QuizCategories;
};

export type ShareLinkInput = {
    quizId: string;
    requireToken?: boolean;
};

export type ShareLinkLookupInput = {
    shareId: string;
    token?: string;
};

export type AssignmentInput = {
    quizId: string;
    classId?: string;
    studentId?: string;
    dueAt?: number;
    status?: string;
};

export type AssignmentFilters = {
    quizId?: string;
    status?: string;
    classId?: string;
    studentId?: string;
};

export type StudentAssignmentsInput = {
    quizId?: string;
    status?: string;
};

export type AssignmentStatusUpdateInput = {
    assignmentId: string;
    status: string;
};

export type QuizAttemptInput = {
    quizId: string;
    assignmentId?: string;
    mode?: "homework" | "live";
    startedAt?: number;
    completedAt?: number;
    responses: Array<{
        questionId: string;
        answerText?: string;
        selectedOption?: number;
    }>;
};
