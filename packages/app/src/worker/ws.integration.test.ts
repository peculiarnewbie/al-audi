import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";

describe("GameRoom Durable Object", () => {
    function getRoom(roomId: string = "test-room") {
        const stub = env.WS.getByName(roomId);
        return stub;
    }

    function connectToRoom(roomId: string = "test-room", headers?: Record<string, string>) {
        const stub = getRoom(roomId);
        const req = new Request(`http://localhost/room/${roomId}`, {
            headers: {
                Upgrade: "websocket",
                ...headers,
            },
        });
        return stub.fetch(req);
    }

    it("accepts WebSocket upgrade", async () => {
        const res = await connectToRoom();
        expect(res.status).toBe(101);
        expect(res.webSocket).toBeDefined();
    });

    it("sends room_state on connect", async () => {
        const res = await connectToRoom("room-state-test");
        const ws = res.webSocket!;
        ws.accept();

        const message = await new Promise<string>((resolve) => {
            ws.addEventListener("message", (event) => {
                resolve(event.data as string);
            }, { once: true });
        });

        const parsed = JSON.parse(message);
        expect(parsed.type).toBe("room_state");
        expect(parsed.data.players).toEqual([]);
        expect(parsed.data.hostId).toBeNull();

        ws.close();
    });

    it("handles join message and broadcasts player_list", async () => {
        const res = await connectToRoom("join-test");
        const ws = res.webSocket!;
        ws.accept();

        // Consume initial room_state
        await new Promise<void>((resolve) => {
            ws.addEventListener("message", () => resolve(), { once: true });
        });

        // Send join message
        ws.send(JSON.stringify({
            playerId: "p1",
            playerName: "Alice",
            type: "join",
            data: {},
        }));

        // Should receive player_list and host_assigned
        const messages: string[] = [];
        await new Promise<void>((resolve) => {
            let count = 0;
            ws.addEventListener("message", (event) => {
                messages.push(event.data as string);
                count++;
                if (count >= 2) resolve();
            });
        });

        const types = messages.map((m) => JSON.parse(m).type);
        expect(types).toContain("player_list");
        expect(types).toContain("host_assigned");

        const playerList = messages.find((m) => JSON.parse(m).type === "player_list");
        const parsed = JSON.parse(playerList!);
        expect(parsed.data.players).toHaveLength(1);
        expect(parsed.data.players[0].name).toBe("Alice");

        ws.close();
    });

    it("handles start message with question", async () => {
        const res = await connectToRoom("start-test");
        const ws = res.webSocket!;
        ws.accept();

        // Consume room_state
        await new Promise<void>((resolve) => {
            ws.addEventListener("message", () => resolve(), { once: true });
        });

        // Join
        ws.send(JSON.stringify({
            playerId: "p1",
            playerName: "Alice",
            type: "join",
            data: {},
        }));

        // Consume player_list + host_assigned
        await new Promise<void>((resolve) => {
            let count = 0;
            ws.addEventListener("message", () => {
                count++;
                if (count >= 2) resolve();
            });
        });

        // Start game
        ws.send(JSON.stringify({
            playerId: "p1",
            playerName: "Alice",
            type: "start",
            data: {
                question: {
                    id: "q1",
                    prompt: "What is 2+2?",
                    options: ["1", "2", "3", "4"],
                    correctAnswer: "4",
                },
            },
        }));

        // Should receive game_started, question, player_list
        const messages: string[] = [];
        await new Promise<void>((resolve) => {
            let count = 0;
            ws.addEventListener("message", (event) => {
                messages.push(event.data as string);
                count++;
                if (count >= 3) resolve();
            });
        });

        const types = messages.map((m) => JSON.parse(m).type);
        expect(types).toContain("game_started");
        expect(types).toContain("question");

        const questionMsg = messages.find((m) => JSON.parse(m).type === "question");
        const questionData = JSON.parse(questionMsg!);
        expect(questionData.data.question.id).toBe("q1");
        expect(questionData.data.question.correctAnswer).toBeUndefined();

        ws.close();
    });

    it("persists state across reconnections", async () => {
        const roomId = "persist-test";

        // First connection: join a player
        const res1 = await connectToRoom(roomId);
        const ws1 = res1.webSocket!;
        ws1.accept();

        await new Promise<void>((resolve) => {
            ws1.addEventListener("message", () => resolve(), { once: true });
        });

        ws1.send(JSON.stringify({
            playerId: "p1",
            playerName: "Alice",
            type: "join",
            data: {},
        }));

        // Consume player_list + host_assigned
        await new Promise<void>((resolve) => {
            let count = 0;
            ws1.addEventListener("message", () => {
                count++;
                if (count >= 2) resolve();
            });
        });

        ws1.close();

        // Wait a bit for persistence
        await new Promise((r) => setTimeout(r, 100));

        // Second connection: should see persisted state
        const res2 = await connectToRoom(roomId);
        const ws2 = res2.webSocket!;
        ws2.accept();

        const message = await new Promise<string>((resolve) => {
            ws2.addEventListener("message", (event) => {
                resolve(event.data as string);
            }, { once: true });
        });

        const parsed = JSON.parse(message);
        expect(parsed.type).toBe("room_state");
        expect(parsed.data.players).toHaveLength(1);
        expect(parsed.data.players[0].name).toBe("Alice");

        ws2.close();
    });
});
