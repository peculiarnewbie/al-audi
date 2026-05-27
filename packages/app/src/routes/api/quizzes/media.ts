import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createDb } from "~/db/client";
import { quizQuestionAssets } from "~/db/schema";
import { getAuthenticatedUser } from "~/utils/auth.server";

const uploadSchema = z.object({
    quizId: z.string().min(1),
    questionId: z.string().min(1),
});

const getFileExtension = (fileName: string) => {
    const trimmed = fileName.trim();
    const dotIndex = trimmed.lastIndexOf(".");

    if (dotIndex <= 0 || dotIndex === trimmed.length - 1) {
        return "";
    }

    const extension = trimmed
        .slice(dotIndex + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    return extension ? `.${extension}` : "";
};

export const Route = createFileRoute("/api/quizzes/media")({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const user = await getAuthenticatedUser(getRequestHeaders());

                if (!user) {
                    return json(
                        { error: "You must be signed in." },
                        { status: 401 },
                    );
                }

                const formData = await request.formData();
                const quizId = formData.get("quizId");
                const questionId = formData.get("questionId");
                const file = formData.get("file");

                if (
                    typeof quizId !== "string" ||
                    typeof questionId !== "string" ||
                    !(file instanceof File)
                ) {
                    return json(
                        { error: "Invalid upload payload." },
                        { status: 400 },
                    );
                }

                const parsed = uploadSchema.safeParse({ quizId, questionId });

                if (!parsed.success) {
                    return json(
                        { error: "Invalid upload payload." },
                        { status: 400 },
                    );
                }

                const contentType = file.type || "application/octet-stream";

                if (!contentType.startsWith("image/")) {
                    return json(
                        { error: "Only image uploads are allowed." },
                        { status: 400 },
                    );
                }

                const assetId = nanoid(10);
                const r2Key = `quiz-media/${quizId}/${questionId}/${assetId}${getFileExtension(
                    file.name,
                )}`;

                await env.BUCKET.put(r2Key, file, {
                    httpMetadata: {
                        contentType,
                    },
                });

                const db = createDb(env.DB);
                await db.insert(quizQuestionAssets).values({
                    id: assetId,
                    quizId,
                    questionId,
                    assetType: "image",
                    r2Key,
                    contentType,
                    createdAt: Date.now(),
                });

                return json({ success: true, id: assetId, r2Key });
            },
        },
    },
});
