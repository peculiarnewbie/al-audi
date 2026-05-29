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

export type AttemptSummary = {
    attemptCount: number;
    averageScore: number | null;
    lastAttemptAt: number | null;
};
export type ClassReport = {
    id: string;
    name: string;
    description: string | null;
    studentCount: number;
    assignmentCount: number;
    attemptCount: number;
    averageScore: number | null;
    lastAttemptAt: number | null;
};
export type StudentReport = {
    id: string;
    name: string;
    email: string | null;
    classCount: number;
    assignmentCount: number;
    attemptCount: number;
    averageScore: number | null;
    lastAttemptAt: number | null;
};
export type TeacherReport = {
    classes: ClassReport[];
    students: StudentReport[];
    generatedAt: number;
};
