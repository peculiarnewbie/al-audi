import { DurableObject } from "cloudflare:workers";
import { nanoid } from "nanoid";
import { createDb } from "~/db/client";
import { liveQuizResults } from "~/db/schema";
import { server } from "~/game";
import type { LiveSessionSummary } from "~/game";

export class GameRoom extends DurableObject {
    env: Env;
    roomId?: string;
    sessions: Map<WebSocket, { [key: string]: string }>;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.env = env;
        this.sessions = new Map();

        this.ctx.getWebSockets().forEach((ws) => {
            let attachment = ws.deserializeAttachment();
            if (attachment) {
                this.sessions.set(ws, { ...attachment });
            }
        });

        this.ctx.setWebSocketAutoResponse(
            new WebSocketRequestResponsePair("ping", "pong"),
        );
    }

    async fetch(request: Request): Promise<Response> {
        if (!this.roomId) {
            const { pathname } = new URL(request.url);
            const segments = pathname.split("/").filter(Boolean);
            this.roomId = segments[segments.length - 1];
        }

        const webSocketPair = new WebSocketPair();
        const [client, serverWs] = Object.values(webSocketPair);

        this.ctx.acceptWebSocket(serverWs);

        const id = crypto.randomUUID();
        serverWs.serializeAttachment({ id });
        this.sessions.set(serverWs, { id });

        const send = (msg: string) => serverWs.send(msg);

        const serverInstance = server(this.ctx);

        const players = await serverInstance.getPlayers();
        const hostId = await serverInstance.getHostId();

        send(
            JSON.stringify({
                type: "room_state",
                data: {
                    players: players || [],
                    hostId: hostId || null,
                },
            }),
        );

        const currentQuestion = await serverInstance.getCurrentQuestion();

        if (currentQuestion) {
            const { correctAnswer, ...publicQuestion } = currentQuestion;
            send(
                JSON.stringify({
                    type: "question",
                    data: { question: publicQuestion },
                }),
            );
        }

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    async webSocketMessage(ws: WebSocket, message: string) {
        const broadcast = (msg: string) => {
            this.sessions.forEach((_, connectedWs) => {
                connectedWs.send(msg);
            });
        };

        const result = await server(this.ctx).processMessage(
            message,
            broadcast,
        );

        if (result && "type" in result && result.type === "persist") {
            await this.persistSessionResults(result.summary);
        }
    }

    async persistSessionResults(summary: LiveSessionSummary) {
        if (!this.roomId || !summary.results.length) {
            return;
        }

        const roomId = this.roomId;
        const db = createDb(this.env.DB);
        const createdAt = Date.now();
        const rows = summary.results.map((result) => ({
            id: nanoid(10),
            sessionId: summary.sessionId,
            roomId,
            playerId: result.playerId,
            playerName: result.playerName,
            score: result.score,
            maxScore: result.maxScore,
            answersJson: JSON.stringify(result.answers),
            startedAt: summary.startedAt,
            endedAt: summary.endedAt,
            createdAt,
        }));

        await db.insert(liveQuizResults).values(rows);
    }

    async webSocketClose(
        ws: WebSocket,
        code: number,
        reason: string,
        wasClean: boolean,
    ) {
        this.sessions.delete(ws);
        ws.close(code, "Durable Object is closing WebSocket");
    }
}
