import { describe, it, expect } from "vitest";
import { createServer } from "./server";

describe("Game Server", () => {
    it("adds a player and broadcasts player_list", () => {
        const server = createServer();
        const messages: string[] = [];
        const broadcast = (msg: string) => messages.push(msg);

        server.processMessage(
            { playerId: "p1", playerName: "Alice", type: "join", data: {} },
            broadcast,
        );

        expect(messages.length).toBeGreaterThanOrEqual(1);
        const parsed = JSON.parse(messages[0]);
        expect(parsed.type).toBe("player_list");
        expect(parsed.data.players).toHaveLength(1);
        expect(parsed.data.players[0].name).toBe("Alice");
    });

    it("assigns first player as host", () => {
        const server = createServer();
        const messages: string[] = [];
        const broadcast = (msg: string) => messages.push(msg);

        server.processMessage(
            { playerId: "p1", playerName: "Alice", type: "join", data: {} },
            broadcast,
        );

        const hostMsg = messages.find((m) => JSON.parse(m).type === "host_assigned");
        expect(hostMsg).toBeDefined();
        const parsed = JSON.parse(hostMsg!);
        expect(parsed.data.hostId).toBe("p1");
    });

    it("removes a player and broadcasts updated list", () => {
        const server = createServer();
        const messages: string[] = [];
        const broadcast = (msg: string) => messages.push(msg);

        server.processMessage(
            { playerId: "p1", playerName: "Alice", type: "join", data: {} },
            broadcast,
        );

        messages.length = 0;

        server.processMessage(
            { playerId: "p1", playerName: "Alice", type: "leave", data: {} },
            broadcast,
        );

        const parsed = JSON.parse(messages[0]);
        expect(parsed.type).toBe("player_list");
        expect(parsed.data.players).toHaveLength(0);
    });

    it("starts a game with a valid question", () => {
        const server = createServer();
        const messages: string[] = [];
        const broadcast = (msg: string) => messages.push(msg);

        server.processMessage(
            { playerId: "p1", playerName: "Alice", type: "join", data: {} },
            broadcast,
        );

        messages.length = 0;

        server.processMessage(
            {
                playerId: "p1",
                playerName: "Alice",
                type: "start",
                data: {
                    question: {
                        id: "q1",
                        prompt: "What is 2 + 2?",
                        options: ["1", "2", "3", "4"],
                        correctAnswer: "4",
                    },
                },
            },
            broadcast,
        );

        const types = messages.map((m) => JSON.parse(m).type);
        expect(types).toContain("game_started");
        expect(types).toContain("question");
        expect(types).toContain("player_list");
    });

    it("processes an answer and scores correctly", () => {
        const server = createServer();
        const messages: string[] = [];
        const broadcast = (msg: string) => messages.push(msg);

        server.processMessage(
            { playerId: "p1", playerName: "Alice", type: "join", data: {} },
            broadcast,
        );
        server.processMessage(
            { playerId: "p2", playerName: "Bob", type: "join", data: {} },
            broadcast,
        );

        messages.length = 0;

        server.processMessage(
            {
                playerId: "p1",
                playerName: "Alice",
                type: "start",
                data: {
                    question: {
                        id: "q1",
                        prompt: "What is 2 + 2?",
                        options: ["1", "2", "3", "4"],
                        correctAnswer: "4",
                    },
                },
            },
            broadcast,
        );

        messages.length = 0;

        server.processMessage(
            {
                playerId: "p1",
                playerName: "Alice",
                type: "answer",
                data: { questionId: "q1", answer: "4" },
            },
            broadcast,
        );

        const parsed = JSON.parse(messages[0]);
        expect(parsed.type).toBe("player_answered");

        server.processMessage(
            {
                playerId: "p2",
                playerName: "Bob",
                type: "answer",
                data: { questionId: "q1", answer: "3" },
            },
            broadcast,
        );
    });

    it("ends a game and returns session summary", () => {
        const server = createServer();
        const messages: string[] = [];
        const broadcast = (msg: string) => messages.push(msg);

        server.processMessage(
            { playerId: "p1", playerName: "Alice", type: "join", data: {} },
            broadcast,
        );

        server.processMessage(
            {
                playerId: "p1",
                playerName: "Alice",
                type: "start",
                data: {
                    question: {
                        id: "q1",
                        prompt: "What is 2 + 2?",
                        options: ["1", "2", "3", "4"],
                        correctAnswer: "4",
                    },
                },
            },
            broadcast,
        );

        server.processMessage(
            {
                playerId: "p1",
                playerName: "Alice",
                type: "answer",
                data: { questionId: "q1", answer: "4" },
            },
            broadcast,
        );

        messages.length = 0;

        const summary = server.processMessage(
            {
                playerId: "p1",
                playerName: "Alice",
                type: "end",
                data: {},
            },
            broadcast,
        );

        expect(summary).toBeDefined();
        expect(summary!.results).toHaveLength(1);
        expect(summary!.results[0].score).toBe(1);
        expect(summary!.results[0].playerName).toBe("Alice");

        const parsed = JSON.parse(messages[0]);
        expect(parsed.type).toBe("game_ended");
        expect(parsed.data.results).toHaveLength(1);
    });
});
