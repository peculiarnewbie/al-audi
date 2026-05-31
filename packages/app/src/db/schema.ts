import { createInsertSchema, createSelectSchema } from "drizzle-orm/effect-schema";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const quizzes = sqliteTable("quizzes", {
    id: text("id").primaryKey(),
    creatorId: text("creator_id").notNull(),
    createdAt: integer("created_at").notNull(),
    r2Key: text("r2_key").notNull(),
    name: text("name"),
});

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    role: text("role", {
        enum: ["none", "student", "teacher", "admin"],
    }).notNull(),
    teacherId: text("teacher_id"),
    name: text("name").notNull(),
    email: text("email"),
    createdAt: integer("created_at").notNull(),
});

export const authUsers = sqliteTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
    image: text("image"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
});

export const authSessions = sqliteTable("session", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    token: text("token").notNull(),
    expiresAt: integer("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
});

export const authAccounts = sqliteTable("account", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at"),
    refreshTokenExpiresAt: integer("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
});

export const authVerifications = sqliteTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
});

export const classes = sqliteTable("classes", {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: integer("created_at").notNull(),
});

export const classStudents = sqliteTable("class_students", {
    id: text("id").primaryKey(),
    classId: text("class_id").notNull(),
    studentId: text("student_id").notNull(),
    createdAt: integer("created_at").notNull(),
});

export const quizQuestions = sqliteTable("quiz_questions", {
    id: text("id").primaryKey(),
    quizId: text("quiz_id").notNull(),
    questionType: text("question_type").notNull(),
    prompt: text("prompt").notNull(),
    answerText: text("answer_text"),
    correctOption: integer("correct_option"),
    position: integer("position").notNull(),
    createdAt: integer("created_at").notNull(),
});

export const quizQuestionOptions = sqliteTable("quiz_question_options", {
    id: text("id").primaryKey(),
    questionId: text("question_id").notNull(),
    optionText: text("option_text").notNull(),
    optionIndex: integer("option_index").notNull(),
    createdAt: integer("created_at").notNull(),
});

export const quizAssignments = sqliteTable("quiz_assignments", {
    id: text("id").primaryKey(),
    quizId: text("quiz_id").notNull(),
    teacherId: text("teacher_id").notNull(),
    classId: text("class_id"),
    studentId: text("student_id"),
    status: text("status").notNull(),
    dueAt: integer("due_at"),
    createdAt: integer("created_at").notNull(),
});

export const quizShareLinks = sqliteTable("quiz_share_links", {
    id: text("id").primaryKey(),
    quizId: text("quiz_id").notNull(),
    creatorId: text("creator_id").notNull(),
    accessToken: text("access_token"),
    createdAt: integer("created_at").notNull(),
});

export const quizCategories = sqliteTable("quiz_categories", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    categoryType: text("category_type").notNull(),
    createdAt: integer("created_at").notNull(),
});

export const quizCategoryLinks = sqliteTable("quiz_category_links", {
    id: text("id").primaryKey(),
    quizId: text("quiz_id").notNull(),
    categoryId: text("category_id").notNull(),
    createdAt: integer("created_at").notNull(),
});

export const quizQuestionAssets = sqliteTable("quiz_question_assets", {
    id: text("id").primaryKey(),
    quizId: text("quiz_id").notNull(),
    questionId: text("question_id").notNull(),
    assetType: text("asset_type").notNull(),
    r2Key: text("r2_key").notNull(),
    contentType: text("content_type").notNull(),
    createdAt: integer("created_at").notNull(),
});

export const driveAssets = sqliteTable("drive_assets", {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id").notNull(),
    folderId: text("folder_id"),
    fileName: text("file_name").notNull(),
    r2Key: text("r2_key").notNull(),
    contentType: text("content_type").notNull(),
    fileSize: integer("file_size").notNull(),
    createdAt: integer("created_at").notNull(),
});

export const driveFolders = sqliteTable("drive_folders", {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id").notNull(),
    parentId: text("parent_id"),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
});

export const driveFolderPermissions = sqliteTable("drive_folder_permissions", {
    id: text("id").primaryKey(),
    folderId: text("folder_id").notNull(),
    classId: text("class_id"),
    studentId: text("student_id"),
    createdAt: integer("created_at").notNull(),
});

export const quizAttempts = sqliteTable("quiz_attempts", {
    id: text("id").primaryKey(),
    quizId: text("quiz_id").notNull(),
    studentId: text("student_id").notNull(),
    teacherId: text("teacher_id").notNull(),
    mode: text("mode").notNull(),
    status: text("status").notNull(),
    startedAt: integer("started_at").notNull(),
    completedAt: integer("completed_at"),
    durationMs: integer("duration_ms"),
    score: integer("score"),
    maxScore: integer("max_score"),
    createdAt: integer("created_at").notNull(),
});

export const quizResponses = sqliteTable("quiz_responses", {
    id: text("id").primaryKey(),
    attemptId: text("attempt_id").notNull(),
    questionId: text("question_id").notNull(),
    questionType: text("question_type").notNull(),
    answerText: text("answer_text"),
    selectedOption: integer("selected_option"),
    isCorrect: integer("is_correct"),
    createdAt: integer("created_at").notNull(),
});

export const liveQuizResults = sqliteTable("live_quiz_results", {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id").notNull(),
    sessionId: text("session_id").notNull(),
    roomId: text("room_id").notNull(),
    playerId: text("player_id").notNull(),
    playerName: text("player_name").notNull(),
    score: integer("score").notNull(),
    maxScore: integer("max_score").notNull(),
    answersJson: text("answers_json").notNull(),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at").notNull(),
    createdAt: integer("created_at").notNull(),
});

// ── Effect Schemas (generated from Drizzle tables) ──────────────
export const QuizSelect = createSelectSchema(quizzes);
export const QuizInsert = createInsertSchema(quizzes);
export const UserSelect = createSelectSchema(users);
export const UserInsert = createInsertSchema(users);
export const AuthUserSelect = createSelectSchema(authUsers);
export const AuthSessionSelect = createSelectSchema(authSessions);
export const AuthAccountSelect = createSelectSchema(authAccounts);
export const AuthVerificationSelect = createSelectSchema(authVerifications);
export const ClassSelect = createSelectSchema(classes);
export const ClassInsert = createInsertSchema(classes);
export const ClassStudentSelect = createSelectSchema(classStudents);
export const ClassStudentInsert = createInsertSchema(classStudents);
export const QuizQuestionSelect = createSelectSchema(quizQuestions);
export const QuizQuestionInsert = createInsertSchema(quizQuestions);
export const QuizQuestionOptionSelect = createSelectSchema(quizQuestionOptions);
export const QuizQuestionOptionInsert = createInsertSchema(quizQuestionOptions);
export const QuizAssignmentSelect = createSelectSchema(quizAssignments);
export const QuizAssignmentInsert = createInsertSchema(quizAssignments);
export const QuizShareLinkSelect = createSelectSchema(quizShareLinks);
export const QuizShareLinkInsert = createInsertSchema(quizShareLinks);
export const QuizCategorySelect = createSelectSchema(quizCategories);
export const QuizCategoryInsert = createInsertSchema(quizCategories);
export const QuizCategoryLinkSelect = createSelectSchema(quizCategoryLinks);
export const QuizCategoryLinkInsert = createInsertSchema(quizCategoryLinks);
export const QuizQuestionAssetSelect = createSelectSchema(quizQuestionAssets);
export const QuizQuestionAssetInsert = createInsertSchema(quizQuestionAssets);
export const DriveAssetSelect = createSelectSchema(driveAssets);
export const DriveAssetInsert = createInsertSchema(driveAssets);
export const DriveFolderSelect = createSelectSchema(driveFolders);
export const DriveFolderInsert = createInsertSchema(driveFolders);
export const DriveFolderPermissionSelect = createSelectSchema(driveFolderPermissions);
export const DriveFolderPermissionInsert = createInsertSchema(driveFolderPermissions);
export const QuizAttemptSelect = createSelectSchema(quizAttempts);
export const QuizAttemptInsert = createInsertSchema(quizAttempts);
export const QuizResponseSelect = createSelectSchema(quizResponses);
export const QuizResponseInsert = createInsertSchema(quizResponses);
export const LiveQuizResultSelect = createSelectSchema(liveQuizResults);
export const LiveQuizResultInsert = createInsertSchema(liveQuizResults);
