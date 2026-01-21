import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const quizzes = sqliteTable("quizzes", {
    id: text("id").primaryKey(),
    creatorId: text("creator_id").notNull(),
    createdAt: integer("created_at").notNull(),
    r2Key: text("r2_key").notNull(),
});

export const teachers = sqliteTable("teachers", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    createdAt: integer("created_at").notNull(),
});

export const students = sqliteTable("students", {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    createdAt: integer("created_at").notNull(),
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
