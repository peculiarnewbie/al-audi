import { Schema } from "effect";

const statusValues = ["active", "completed", "submitted"] as const;

export const AssignmentSchema = Schema.Struct({
    id: Schema.String,
    quizId: Schema.String,
    studentId: Schema.optional(Schema.String),
    classId: Schema.optional(Schema.String),
    dueAt: Schema.optional(Schema.Number),
    status: Schema.Literals(statusValues),
});

export const AssignmentFiltersSchema = Schema.Struct({
    quizId: Schema.optional(Schema.String),
    status: Schema.optional(Schema.Literals(statusValues)),
    classId: Schema.optional(Schema.String),
    studentId: Schema.optional(Schema.String),
});

export const AssignmentStatusUpdateSchema = Schema.Struct({
    assignmentId: Schema.String,
    status: Schema.Literals(statusValues),
});

export type Assignment = {
    id: string;
    quizId: string;
    studentId?: string;
    classId?: string;
    dueAt?: number;
    status: "active" | "completed" | "submitted";
};

export type AssignmentInput = {
    quizId: string;
    classId?: string;
    studentId?: string;
    dueAt?: number;
};

export type AssignmentFilters = {
    quizId?: string;
    status?: "active" | "completed" | "submitted";
    classId?: string;
    studentId?: string;
};

export type AssignmentStatusUpdate = {
    assignmentId: string;
    status: "active" | "completed" | "submitted";
};
