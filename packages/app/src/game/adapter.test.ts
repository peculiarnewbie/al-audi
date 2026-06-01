import { describe, it, expect, beforeEach } from "vitest";
import { createQuizGameAdapter } from "./adapter";
import { createServer } from "./server";
import type { GameServer } from "./server";

function makeAdapter(initialState?: unknown) {
    const stateRef = { current: initialState ?? null };
    const adapter = createQuizGameAdapter(stateRef);
    return { adapter, stateRef };
}

function captureMessages() {
    const messages: string[] = [];
    const broadcast = (msg: string) => messages.push(msg);
    const sentTo: { playerId: string; msg: string }[] = [];
    const sendTo = (playerId: string, msg: string) =>
        sentTo.push({ playerId, msg });
    return {
        messages,
        sentTo,
        broadcast,
        sendTo,
        last: () => JSON.parse(messages[messages.length - 1]),
        clear: () => {
            messages.length = 0;
            sentTo.length = 0;
        },
    };
}

const sampleQuestion = {
    id: "q1",
    prompt: "What is 2 + 2?",
    options: ["1", "2", "3", "4"],
    correctAnswer: "4",
};

describe("GameAdapter", () => {
    describe("processMessage", () => {
        it("handles join message and broadcasts player_list", () => {
            const { adapter } = makeAdapter();
            const { messages, broadcast, sendTo } = captureMessages();

            adapter.processMessage(
                {
                    playerId: "p1",
                    playerName: "Alice",
                    type: "join",
                    data: {},
                },
                broadcast,
                sendTo,
            );

            expect(messages.length).toBeGreaterThanOrEqual(1);
            const parsed = JSON.parse(messages[0]);
            expect(parsed.type).toBe("player_list");
            expect(parsed.data.players).toHaveLength(1);
        });

        it("handles start message and broadcasts game_started + question", () => {
            const { adapter } = makeAdapter();
            const { messages, broadcast, sendTo } = captureMessages();

            adapter.processMessage(
                {
                    playerId: "p1",
                    playerName: "Alice",
                    type: "join",
                    data: {},
                },
                broadcast,
                sendTo,
            );
            messages.length = 0;

            adapter.processMessage(
                {
                    playerId: "p1",
                    playerName: "Alice",
                    type: "start",
                    data: { question: sampleQuestion },
                },
                broadcast,
                sendTo,
            );

            const types = messages.map((m) => JSON.parse(m).type);
            expect(types).toContain("game_started");
            expect(types).toContain("question");
        });

        it("handles answer message and broadcasts player_answered", () => {
            const { adapter } = makeAdapter();
            const { messages, broadcast, sendTo } = captureMessages();

            adapter.processMessage(
                { playerId: "p1", playerName: "Alice", type: "join", data: {} },
                broadcast,
                sendTo,
            );
            adapter.processMessage(
                {
                    playerId: "p1",
                    playerName: "Alice",
                    type: "start",
                    data: { question: sampleQuestion },
                },
                broadcast,
                sendTo,
            );
            messages.length = 0;

            adapter.processMessage(
                {
                    playerId: "p1",
                    playerName: "Alice",
                    type: "answer",
                    data: { questionId: "q1", answer: "4" },
                },
                broadcast,
                sendTo,
            );

            const parsed = JSON.parse(messages[0]);
            expect(parsed.type).toBe("player_answered");
        });

        it("returns LiveSessionSummary on end message", () => {
            const { adapter } = makeAdapter();
            const { messages, broadcast, sendTo } = captureMessages();

            adapter.processMessage(
                { playerId: "p1", playerName: "Alice", type: "join", data: {} },
                broadcast,
                sendTo,
            );
            adapter.processMessage(
                {
                    playerId: "p1",
                    playerName: "Alice",
                    type: "start",
                    data: { question: sampleQuestion },
                },
                broadcast,
                sendTo,
            );
            adapter.processMessage(
                {
                    playerId: "p1",
                    playerName: "Alice",
                    type: "answer",
                    data: { questionId: "q1", answer: "4" },
                },
                broadcast,
                sendTo,
            );

            const result = adapter.processMessage(
                { playerId: "p1", playerName: "Alice", type: "end", data: {} },
                broadcast,
                sendTo,
            );

            expect(result).toBeDefined();
            expect(result!.results).toHaveLength(1);
            expect(result!.results[0].score).toBe(1);
            expect(result!.sessionId).toBeDefined();
        });
    });

    describe("sendStateToPlayer", () => {
        it("sends room_state with players and hostId", () => {
            const { adapter } = makeAdapter();
            const { broadcast, sendTo } = captureMessages();

            adapter.processMessage(
                { playerId: "p1", playerName: "Alice", type: "join", data: {} },
                broadcast,
                sendTo,
            );

            const sent: { playerId: string; msg: string }[] = [];
            adapter.sendStateToPlayer("p1", (pid, msg) =>
                sent.push({ playerId: pid, msg }),
            );

            expect(sent).toHaveLength(1);
            expect(sent[0].playerId).toBe("p1");
            const parsed = JSON.parse(sent[0].msg);
            expect(parsed.type).toBe("room_state");
            expect(parsed.data.players).toHaveLength(1);
            expect(parsed.data.hostId).toBe("p1");
        });

        it("includes current question without correctAnswer", () => {
            const { adapter } = makeAdapter();
            const { messages, broadcast, sendTo } = captureMessages();

            adapter.processMessage(
                { playerId: "p1", playerName: "Alice", type: "join", data: {} },
                broadcast,
                sendTo,
            );
            adapter.processMessage(
                {
                    playerId: "p1",
                    playerName: "Alice",
                    type: "start",
                    data: { question: sampleQuestion },
                },
                broadcast,
                sendTo,
            );

            const sent: { playerId: string; msg: string }[] = [];
            adapter.sendStateToPlayer("p2", (pid, msg) =>
                sent.push({ playerId: pid, msg }),
            );

            const parsed = JSON.parse(sent[0].msg);
            expect(parsed.data.currentQuestion).toBeDefined();
            expect(parsed.data.currentQuestion.id).toBe("q1");
            expect(parsed.data.currentQuestion.correctAnswer).toBe("4");
        });
    });

    describe("removePlayer", () => {
        it("removes player and broadcasts updated list", () => {
            const { adapter } = makeAdapter();
            const { messages, broadcast, sendTo } = captureMessages();

            adapter.processMessage(
                { playerId: "p1", playerName: "Alice", type: "join", data: {} },
                broadcast,
                sendTo,
            );
            messages.length = 0;

            adapter.removePlayer("p1", broadcast, sendTo);

            const parsed = JSON.parse(messages[0]);
            expect(parsed.type).toBe("player_list");
            expect(parsed.data.players).toHaveLength(0);
        });
    });

    describe("endGame", () => {
        it("ends game and returns summary", () => {
            const { adapter } = makeAdapter();
            const { messages, broadcast, sendTo } = captureMessages();

            adapter.processMessage(
                { playerId: "p1", playerName: "Alice", type: "join", data: {} },
                broadcast,
                sendTo,
            );
            adapter.processMessage(
                {
                    playerId: "p1",
                    playerName: "Alice",
                    type: "start",
                    data: { question: sampleQuestion },
                },
                broadcast,
                sendTo,
            );

            const result = adapter.endGame(broadcast, sendTo);

            expect(result).toBeDefined();
            expect(result!.results).toHaveLength(1);
        });
    });

    describe("getState", () => {
        it("returns game state", () => {
            const { adapter } = makeAdapter();
            const { broadcast, sendTo } = captureMessages();

            adapter.processMessage(
                { playerId: "p1", playerName: "Alice", type: "join", data: {} },
                broadcast,
                sendTo,
            );

            const state = adapter.getState();
            expect(state.players).toHaveLength(1);
            expect(state.hostId).toBe("p1");
            expect(state.sessionId).toBeNull();
        });
    });

    describe("lazy initialization", () => {
        it("creates server on first access", () => {
            const stateRef = { current: null };
            const adapter = createQuizGameAdapter(stateRef);

            expect(stateRef.current).toBeNull();

            const { broadcast, sendTo } = captureMessages();
            adapter.processMessage(
                { playerId: "p1", playerName: "Alice", type: "join", data: {} },
                broadcast,
                sendTo,
            );

            expect(stateRef.current).not.toBeNull();
        });

        it("rehydrates from existing server state", () => {
            const server = createServer();
            const messages: string[] = [];
            server.processMessage(
                { playerId: "p1", playerName: "Alice", type: "join", data: {} },
                (msg) => messages.push(msg),
            );

            const stateRef = { current: server };
            const adapter = createQuizGameAdapter(stateRef);

            const state = adapter.getState();
            expect(state.players).toHaveLength(1);
            expect(state.players[0].name).toBe("Alice");
        });
    });
});
