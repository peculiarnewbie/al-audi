import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { z } from "zod";
import { createDb } from "~/db/client";
import { quizShareLinks } from "~/db/schema";

const shareQrSchema = z.object({
    shareId: z.string().trim().min(1),
    token: z.string().trim().min(1).optional(),
});

const buildShareUrl = (requestUrl: URL, shareId: string, token?: string) => {
    const shareUrl = new URL(requestUrl);
    shareUrl.pathname = `/share/${shareId}`;
    shareUrl.search = "";

    if (token) {
        shareUrl.searchParams.set("token", token);
    }

    return shareUrl.toString();
};

const buildQrKey = (shareId: string, token?: string) =>
    `share-qr/${shareId}${token ? `-${token}` : ""}.svg`;

const buildHeaders = (contentType: string) => {
    const headers = new Headers();
    headers.set("content-type", contentType);
    headers.set("cache-control", "public, max-age=86400");
    return headers;
};

export const Route = createFileRoute("/api/share/$shareId/qr")({
    server: {
        handlers: {
            GET: async ({ request, params }) => {
                const url = new URL(request.url);
                const tokenValue = url.searchParams.get("token")?.trim();
                const parsed = shareQrSchema.safeParse({
                    shareId: params.shareId,
                    token: tokenValue || undefined,
                });

                if (!parsed.success) {
                    return json(
                        { error: "Invalid share link request." },
                        { status: 400 },
                    );
                }

                const { shareId, token } = parsed.data;
                const db = createDb(env.DB);
                const [shareLink] = await db
                    .select({ accessToken: quizShareLinks.accessToken })
                    .from(quizShareLinks)
                    .where(eq(quizShareLinks.id, shareId))
                    .limit(1);

                if (!shareLink) {
                    return json(
                        { error: "Share link not found." },
                        { status: 404 },
                    );
                }

                if (shareLink.accessToken && shareLink.accessToken !== token) {
                    return json(
                        { error: "Access token required." },
                        { status: 401 },
                    );
                }

                const qrToken = shareLink.accessToken ?? undefined;
                const r2Key = buildQrKey(shareId, qrToken);
                const cached = await env.BUCKET.get(r2Key);

                if (cached) {
                    const contentType =
                        cached.httpMetadata?.contentType ?? "image/svg+xml";
                    return new Response(cached.body, {
                        headers: buildHeaders(contentType),
                    });
                }

                const shareUrl = buildShareUrl(url, shareId, qrToken);
                const svg = await QRCode.toString(shareUrl, {
                    type: "svg",
                    margin: 1,
                    width: 256,
                });
                const contentType = "image/svg+xml";

                await env.BUCKET.put(r2Key, svg, {
                    httpMetadata: {
                        contentType,
                        cacheControl: "public, max-age=86400",
                    },
                });

                return new Response(svg, {
                    headers: buildHeaders(contentType),
                });
            },
        },
    },
});
