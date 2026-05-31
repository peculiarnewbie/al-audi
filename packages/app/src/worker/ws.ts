import { DurableObject } from "cloudflare:workers";
import { sql, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createDoDb, gameKv } from "./db";
import { createDb } from "~/db/client";
import { liveQuizResults } from "~/db/schema";
import { createQuizGameAdapter } from "~/game/adapter";
import { createServer } from "~/game/server";
import type { GameAdapter } from "~/game/adapter";
import type { LiveSessionSummary } from "~/game/schemas";

const ROOM_STATE_KEY = "room_state";
const TEACHER_ID_KEY = "teacher_id";

export class GameRoom extends DurableObject {
    env: Env;
    db: ReturnType<typeof createDoDb>;
    roomId: string;
    sessions: Map<WebSocket, { id: string }>;
    gameAdapter: GameAdapter;
    private stateRef: { current: unknown };
    private teacherId: string | null;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.env = env;
        this.roomId = ctx.id.name ?? "";
        this.sessions = new Map();
        this.stateRef = { current: null };
        this.teacherId = null;
        this.db = createDoDb(ctx.storage);
        this.gameAdapter = createQuizGameAdapter(this.stateRef);

        this.ctx.setWebSocketAutoResponse(
            new WebSocketRequestResponsePair("ping", "pong"),
        );

        ctx.blockConcurrencyWhile(async () => {
            this.ensureSchema();
            this.loadTeacherId();
            this.loadPersistedState();
            this.rehydrateSessions();
        });
    }

    private ensureSchema() {
        this.db.run(sql`CREATE TABLE IF NOT EXISTS game_kv (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )`);
    }

    private loadPersistedState() {
        try {
            const row = this.db
                .select({ value: gameKv.value })
                .from(gameKv)
                .where(eq(gameKv.key, ROOM_STATE_KEY))
                .get();
            if (row) {
                const parsed = JSON.parse(row.value);
                this.stateRef.current = createServer(parsed);
            }
        } catch {
            this.stateRef.current = null;
        }
    }

    private loadTeacherId() {
        try {
            const row = this.db
                .select({ value: gameKv.value })
                .from(gameKv)
                .where(eq(gameKv.key, TEACHER_ID_KEY))
                .get();
            this.teacherId = row?.value ?? null;
        } catch {
            this.teacherId = null;
        }
    }

    private persistTeacherId() {
        if (!this.teacherId) return;
        this.db
            .insert(gameKv)
            .values({ key: TEACHER_ID_KEY, value: this.teacherId })
            .onConflictDoUpdate({
                target: gameKv.key,
                set: { value: this.teacherId },
            })
            .run();
    }

    private persistState() {
        const server = this.stateRef.current as ReturnType<typeof createServer> | null;
        if (!server) return;
        const state = server.getState();
        this.db
            .insert(gameKv)
            .values({ key: ROOM_STATE_KEY, value: JSON.stringify(state) })
            .onConflictDoUpdate({
                target: gameKv.key,
                set: { value: JSON.stringify(state) },
            })
            .run();
    }

    private rehydrateSessions() {
        this.ctx.getWebSockets().forEach((ws) => {
            const attachment = ws.deserializeAttachment();
            if (attachment?.id) {
                this.sessions.set(ws, { id: attachment.id as string });
            }
        });
    }

    async fetch(request: Request): Promise<Response> {
        const webSocketPair = new WebSocketPair();
        const [client, serverWs] = Object.values(webSocketPair);
        const teacherId = request.headers.get("x-teacher-id");
        if (teacherId && !this.teacherId) {
            this.teacherId = teacherId;
            this.persistTeacherId();
        }

        const playerId = crypto.randomUUID();
        serverWs.serializeAttachment({ id: playerId });
        this.ctx.acceptWebSocket(serverWs, [playerId]);
        this.sessions.set(serverWs, { id: playerId });

        const send = (msg: string) => serverWs.send(msg);
        this.gameAdapter.sendStateToPlayer(playerId, send);

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    async webSocketMessage(ws: WebSocket, message: string) {
        const broadcast = (msg: string) => {
            this.sessions.forEach((_, connectedWs) => {
                try {
                    connectedWs.send(msg);
                } catch {
                    // Ignore send errors
                }
            });
        };

        const sendTo = (playerId: string, msg: string) => {
            this.sessions.forEach((attachment, connectedWs) => {
                if (attachment.id === playerId) {
                    try {
                        connectedWs.send(msg);
                    } catch {
                        // Ignore send errors
                    }
                }
            });
        };

        try {
            const json = JSON.parse(message);
            const result = this.gameAdapter.processMessage(json, broadcast, sendTo);
            this.persistState();
            if (result) {
                await this.persistSessionResults(result);
            }
        } catch {
            // Ignore malformed messages
        }
    }

    async webSocketClose(
        ws: WebSocket,
        _code: number,
        _reason: string,
        _wasClean: boolean,
    ) {
        const attachment = this.sessions.get(ws);
        this.sessions.delete(ws);
        if (attachment) {
            this.gameAdapter.removePlayer(
                attachment.id,
                () => {},
                () => {},
            );
            this.persistState();
        }
    }

    async webSocketError(ws: WebSocket, _error: unknown) {
        this.sessions.delete(ws);
    }

    async persistSessionResults(summary: LiveSessionSummary) {
        if (!this.roomId || !this.teacherId || !summary.results.length) {
            return;
        }

        const db = createDb(this.env.DB);
        const createdAt = Date.now();
        const rows = summary.results.map((result) => ({
            id: nanoid(10),
            teacherId: this.teacherId!,
            sessionId: summary.sessionId,
            roomId: this.roomId,
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
}
