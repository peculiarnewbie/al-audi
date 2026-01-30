import { createFileRoute, redirect } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { For, Show, createResource, createSignal } from "solid-js";
import type { AdminStats, AdminStatsResult } from "~/server/admin";
import type { User, UserRole } from "~/utils/users";

const getAdminDashboardStats = createServerFn({ method: "GET" }).handler(
    async (): Promise<AdminStatsResult> => {
        const { getRequestHeaders } =
            await import("@tanstack/solid-start/server");
        const { getAdminStats } = await import("~/server/admin");

        return getAdminStats(getRequestHeaders());
    },
);

type UserQuery = {
    search?: string;
    role?: UserRole;
};

const fetchAdminUsers = createServerFn({ method: "GET" })
    .inputValidator((data: UserQuery) => data)
    .handler(async ({ data }) => {
        const { getRequestHeaders } =
            await import("@tanstack/solid-start/server");
        const { getAdminUsers } = await import("~/server/admin");

        return getAdminUsers(getRequestHeaders(), data.search, data.role);
    });

const updateAdminRole = createServerFn({ method: "POST" })
    .inputValidator((data: { userId: string; role: UserRole }) => data)
    .handler(async ({ data }) => {
        const { getRequestHeaders } =
            await import("@tanstack/solid-start/server");
        const { updateAdminUserRole } = await import("~/server/admin");

        return updateAdminUserRole(getRequestHeaders(), data.userId, data.role);
    });

const updateAdminTeacherAssignment = createServerFn({ method: "POST" })
    .inputValidator(
        (data: { studentId: string; teacherId: string | null }) => data,
    )
    .handler(async ({ data }) => {
        const { getRequestHeaders } =
            await import("@tanstack/solid-start/server");
        const { updateAdminStudentTeacher } = await import("~/server/admin");

        return updateAdminStudentTeacher(
            getRequestHeaders(),
            data.studentId,
            data.teacherId,
        );
    });

const getAdminErrorMessage = (
    status: "unauthenticated" | "forbidden" | "not_found" | "ok",
    fallback: string,
    notFoundMessage = "User not found.",
) => {
    if (status === "unauthenticated") {
        return "You must be signed in.";
    }

    if (status === "forbidden") {
        return "Admin access required.";
    }

    if (status === "not_found") {
        return notFoundMessage;
    }

    return fallback;
};

const roleOptions: UserRole[] = ["none", "student", "teacher", "admin"];

const normalizeRole = (role?: string | null): UserRole => {
    if (!role) {
        return "none";
    }

    const normalized = role.toLowerCase();
    return roleOptions.includes(normalized as UserRole)
        ? (normalized as UserRole)
        : "none";
};

export const Route = createFileRoute("/admin")({
    loader: async () => {
        const result = await getAdminDashboardStats();

        if (result.status === "unauthenticated") {
            throw redirect({ href: "/api/auth/sign-in" });
        }

        return result;
    },
    component: AdminDashboard,
});

type StatItem = {
    label: string;
    value: number;
};

const buildStatItems = (stats: AdminStats): StatItem[] => [
    { label: "Teachers", value: stats.teachers },
    { label: "Students", value: stats.students },
    { label: "Classes", value: stats.classes },
    { label: "Assignments", value: stats.assignments },
    { label: "Quizzes", value: stats.quizzes },
    { label: "Attempts", value: stats.attempts },
];

const formatNumber = (value: number) => value.toLocaleString();

const formatDate = (value: number) =>
    new Date(value).toISOString().slice(0, 10);

type StatCardProps = {
    label: string;
    value: string;
};

type TeacherAssignmentData = {
    teachers: User[];
    students: User[];
};

function StatCard(props: StatCardProps) {
    return (
        <div class="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <div class="text-xs uppercase tracking-wide text-stone-500">
                {props.label}
            </div>
            <div class="mt-2 text-3xl font-semibold text-stone-800">
                {props.value}
            </div>
        </div>
    );
}

function AdminDashboard() {
    const result = Route.useLoaderData();
    const stats = () => {
        const current = result();
        return current.status === "ok" ? current.stats : null;
    };
    const statItems = () => {
        const current = stats();
        return current ? buildStatItems(current) : [];
    };
    const [searchInput, setSearchInput] = createSignal("");
    const [searchTerm, setSearchTerm] = createSignal("");
    const [userError, setUserError] = createSignal<string | null>(null);
    const [updatingUserId, setUpdatingUserId] = createSignal<string | null>(
        null,
    );
    const [assignmentSearchInput, setAssignmentSearchInput] = createSignal("");
    const [assignmentSearchTerm, setAssignmentSearchTerm] = createSignal("");
    const [assignmentError, setAssignmentError] = createSignal<string | null>(
        null,
    );
    const [updatingStudentId, setUpdatingStudentId] = createSignal<
        string | null
    >(null);

    const [users, { mutate, refetch }] = createResource(
        () => (stats() ? searchTerm().trim() : null),
        async (search): Promise<User[]> => {
            if (search === null) {
                return [];
            }

            setUserError(null);
            const result = await fetchAdminUsers({
                data: {
                    search: search || undefined,
                },
            });

            if (result.status !== "ok") {
                setUserError(
                    getAdminErrorMessage(
                        result.status,
                        "Unable to load users.",
                    ),
                );
                return [];
            }

            return result.users as User[];
        },
    );

    const [
        assignmentData,
        { mutate: mutateAssignments, refetch: refetchAssignments },
    ] = createResource(
        () => (stats() ? assignmentSearchTerm().trim() : null),
        async (search): Promise<TeacherAssignmentData> => {
            if (search === null) {
                return { teachers: [], students: [] };
            }

            setAssignmentError(null);
            const [teacherResult, studentResult] = await Promise.all([
                fetchAdminUsers({
                    data: {
                        role: "teacher",
                    },
                }),
                fetchAdminUsers({
                    data: {
                        role: "student",
                        search: search || undefined,
                    },
                }),
            ]);

            if (
                teacherResult.status !== "ok" ||
                studentResult.status !== "ok"
            ) {
                const failedResult =
                    teacherResult.status !== "ok"
                        ? teacherResult
                        : studentResult;
                setAssignmentError(
                    getAdminErrorMessage(
                        failedResult.status,
                        "Unable to load teacher assignments.",
                    ),
                );
                return { teachers: [], students: [] };
            }

            return {
                teachers: teacherResult.users as User[],
                students: studentResult.users as User[],
            };
        },
    );

    const handleSearch = (event: Event) => {
        event.preventDefault();
        setSearchTerm(searchInput().trim());
    };

    const clearSearch = () => {
        setSearchInput("");
        setSearchTerm("");
    };

    const handleAssignmentSearch = (event: Event) => {
        event.preventDefault();
        setAssignmentSearchTerm(assignmentSearchInput().trim());
    };

    const clearAssignmentSearch = () => {
        setAssignmentSearchInput("");
        setAssignmentSearchTerm("");
    };

    const updateUserRole = async (userId: string, role: UserRole) => {
        setUpdatingUserId(userId);
        setUserError(null);

        try {
            const result = await updateAdminRole({
                data: {
                    userId,
                    role,
                },
            });

            if (result.status !== "ok") {
                setUserError(
                    getAdminErrorMessage(
                        result.status,
                        "Unable to update role.",
                    ),
                );
                return;
            }

            const updated = result.user as User;
            const current = users();

            if (current) {
                mutate(
                    current.map((user) =>
                        user.id === updated.id ? updated : user,
                    ),
                );
            } else {
                refetch();
            }
        } finally {
            setUpdatingUserId(null);
        }
    };

    const updateStudentTeacher = async (
        studentId: string,
        teacherId: string | null,
    ) => {
        setUpdatingStudentId(studentId);
        setAssignmentError(null);

        try {
            const result = await updateAdminTeacherAssignment({
                data: {
                    studentId,
                    teacherId,
                },
            });

            if (result.status !== "ok") {
                setAssignmentError(
                    getAdminErrorMessage(
                        result.status,
                        "Unable to update teacher.",
                        "Student or teacher not found.",
                    ),
                );
                return;
            }

            const updated = result.user as User;
            const current = assignmentData();

            if (current) {
                mutateAssignments({
                    teachers: current.teachers,
                    students: current.students.map((student) =>
                        student.id === updated.id
                            ? {
                                  ...student,
                                  teacherId: updated.teacherId ?? null,
                              }
                            : student,
                    ),
                });
            } else {
                refetchAssignments();
            }
        } finally {
            setUpdatingStudentId(null);
        }
    };

    const assignmentTeachers = () => assignmentData()?.teachers ?? [];
    const assignmentStudents = () => assignmentData()?.students ?? [];
    const hasAssignmentStudents = () => assignmentStudents().length > 0;
    const hasUsers = () => (users() ?? []).length > 0;

    return (
        <div class="max-w-5xl mx-auto px-6 py-12 space-y-8">
            <header class="space-y-2">
                <div class="text-xs uppercase tracking-wide text-stone-500">
                    Admin access
                </div>
                <h1 class="text-2xl font-semibold text-stone-800">
                    Admin dashboard
                </h1>
                <p class="text-stone-600">
                    Monitor overall usage for the school program.
                </p>
                <Show when={stats()}>
                    <div class="text-xs uppercase tracking-wide text-stone-400">
                        Updated {formatDate(stats()!.generatedAt)}
                    </div>
                </Show>
            </header>

            <Show
                when={stats()}
                fallback={
                    <div class="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-2">
                        <div class="text-sm text-stone-700">
                            Admin access required.
                        </div>
                        <div class="text-xs text-stone-500">
                            Ask a superadmin to grant access.
                        </div>
                    </div>
                }
            >
                <div class="space-y-8">
                    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <For each={statItems()}>
                            {(item) => (
                                <StatCard
                                    label={item.label}
                                    value={formatNumber(item.value)}
                                />
                            )}
                        </For>
                    </div>

                    <div class="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div class="text-xs uppercase tracking-wide text-stone-500">
                                    User management
                                </div>
                                <div class="text-sm text-stone-600">
                                    Search users and update access roles.
                                </div>
                            </div>
                            <div class="text-xs uppercase tracking-wide text-stone-400">
                                {formatNumber((users() ?? []).length)} users
                            </div>
                        </div>

                        <form
                            class="flex flex-wrap gap-3"
                            onSubmit={handleSearch}
                        >
                            <input
                                class="w-full sm:w-64 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                                type="text"
                                placeholder="Search by name, email, or ID"
                                value={searchInput()}
                                onInput={(event) =>
                                    setSearchInput(event.currentTarget.value)
                                }
                            />
                            <button
                                class="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
                                type="submit"
                            >
                                Search
                            </button>
                            <button
                                class="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:text-stone-900"
                                type="button"
                                onClick={clearSearch}
                            >
                                Clear
                            </button>
                        </form>

                        <Show when={userError()}>
                            <div class="text-sm text-red-600">
                                {userError()}
                            </div>
                        </Show>

                        <Show
                            when={!users.loading}
                            fallback={
                                <div class="text-sm text-stone-500">
                                    Loading users...
                                </div>
                            }
                        >
                            <Show
                                when={hasUsers()}
                                fallback={
                                    <div class="text-sm text-stone-500">
                                        No users found.
                                    </div>
                                }
                            >
                                <div class="divide-y divide-stone-200">
                                    <For each={users() ?? []}>
                                        {(user) => (
                                            <div class="flex flex-wrap items-center justify-between gap-4 py-4">
                                                <div class="space-y-1">
                                                    <div class="text-sm font-medium text-stone-800">
                                                        {user.name}
                                                    </div>
                                                    <div class="text-xs text-stone-500">
                                                        {user.email ??
                                                            "No email on file"}
                                                    </div>
                                                    <div class="text-xs text-stone-400">
                                                        ID {user.id}
                                                    </div>
                                                    <div class="text-xs text-stone-400">
                                                        Joined{" "}
                                                        {formatDate(
                                                            user.createdAt,
                                                        )}
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-3">
                                                    <select
                                                        class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                                                        disabled={
                                                            updatingUserId() ===
                                                            user.id
                                                        }
                                                        onChange={(event) => {
                                                            const nextRole =
                                                                event
                                                                    .currentTarget
                                                                    .value as UserRole;
                                                            if (
                                                                nextRole !==
                                                                normalizeRole(
                                                                    user.role,
                                                                )
                                                            ) {
                                                                void updateUserRole(
                                                                    user.id,
                                                                    nextRole,
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <For each={roleOptions}>
                                                            {(role) => (
                                                                <option
                                                                    value={role}
                                                                    selected={
                                                                        role ===
                                                                        normalizeRole(
                                                                            user.role,
                                                                        )
                                                                    }
                                                                >
                                                                    {role}
                                                                </option>
                                                            )}
                                                        </For>
                                                    </select>
                                                    <Show
                                                        when={
                                                            updatingUserId() ===
                                                            user.id
                                                        }
                                                    >
                                                        <span class="text-xs text-stone-400">
                                                            Saving...
                                                        </span>
                                                    </Show>
                                                </div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </Show>
                    </div>

                    <div class="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div class="text-xs uppercase tracking-wide text-stone-500">
                                    Teacher assignments
                                </div>
                                <div class="text-sm text-stone-600">
                                    Link students to their assigned teacher.
                                </div>
                            </div>
                            <div class="text-xs uppercase tracking-wide text-stone-400">
                                {formatNumber(assignmentStudents().length)}{" "}
                                students
                            </div>
                        </div>

                        <form
                            class="flex flex-wrap gap-3"
                            onSubmit={handleAssignmentSearch}
                        >
                            <input
                                class="w-full sm:w-64 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                                type="text"
                                placeholder="Search students by name, email, or ID"
                                value={assignmentSearchInput()}
                                onInput={(event) =>
                                    setAssignmentSearchInput(
                                        event.currentTarget.value,
                                    )
                                }
                            />
                            <button
                                class="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
                                type="submit"
                            >
                                Search
                            </button>
                            <button
                                class="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:text-stone-900"
                                type="button"
                                onClick={clearAssignmentSearch}
                            >
                                Clear
                            </button>
                        </form>

                        <Show when={assignmentError()}>
                            <div class="text-sm text-red-600">
                                {assignmentError()}
                            </div>
                        </Show>

                        <Show
                            when={!assignmentData.loading}
                            fallback={
                                <div class="text-sm text-stone-500">
                                    Loading teacher assignments...
                                </div>
                            }
                        >
                            <Show
                                when={hasAssignmentStudents()}
                                fallback={
                                    <div class="text-sm text-stone-500">
                                        No students found.
                                    </div>
                                }
                            >
                                <div class="divide-y divide-stone-200">
                                    <For each={assignmentStudents()}>
                                        {(student) => (
                                            <div class="flex flex-wrap items-center justify-between gap-4 py-4">
                                                <div class="space-y-1">
                                                    <div class="text-sm font-medium text-stone-800">
                                                        {student.name}
                                                    </div>
                                                    <div class="text-xs text-stone-500">
                                                        {student.email ??
                                                            "No email on file"}
                                                    </div>
                                                    <div class="text-xs text-stone-400">
                                                        ID {student.id}
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-3">
                                                    <select
                                                        class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                                                        value={
                                                            student.teacherId ??
                                                            ""
                                                        }
                                                        disabled={
                                                            updatingStudentId() ===
                                                            student.id
                                                        }
                                                        onChange={(event) => {
                                                            const nextTeacherId =
                                                                event
                                                                    .currentTarget
                                                                    .value;
                                                            if (
                                                                nextTeacherId !==
                                                                (student.teacherId ??
                                                                    "")
                                                            ) {
                                                                void updateStudentTeacher(
                                                                    student.id,
                                                                    nextTeacherId
                                                                        ? nextTeacherId
                                                                        : null,
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <option value="">
                                                            Unassigned
                                                        </option>
                                                        <For
                                                            each={assignmentTeachers()}
                                                        >
                                                            {(teacher) => (
                                                                <option
                                                                    value={
                                                                        teacher.id
                                                                    }
                                                                >
                                                                    {
                                                                        teacher.name
                                                                    }
                                                                </option>
                                                            )}
                                                        </For>
                                                    </select>
                                                    <Show
                                                        when={
                                                            updatingStudentId() ===
                                                            student.id
                                                        }
                                                    >
                                                        <span class="text-xs text-stone-400">
                                                            Saving...
                                                        </span>
                                                    </Show>
                                                </div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </Show>
                    </div>
                </div>
            </Show>
        </div>
    );
}
