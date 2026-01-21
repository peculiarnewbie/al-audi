export type UserRole = "none" | "student" | "teacher" | "admin";

export type User = {
    id: string;
    name: string;
    email: string | null;
    role: UserRole;
    teacherId?: string | null;
    createdAt: number;
};
