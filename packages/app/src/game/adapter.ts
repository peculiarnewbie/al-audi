import { createServer } from "./server";
import type { GameServer } from "./server";
import type { Player, LiveSessionSummary, LiveQuestion } from "./schemas";

type BroadcastFn = (msg: string) => void;
type SendToFn = (playerId: string, msg: string) => void;

export interface GameAdapter {
    processMessage(
        message: unknown,
        broadcast: BroadcastFn,
        sendTo: SendToFn,
    ): LiveSessionSummary | undefined;
    sendStateToPlayer(playerId: string, sendTo: SendToFn): void;
    initGame(
        players: Player[],
        hostId: string | null,
        broadcast: BroadcastFn,
        sendTo: SendToFn,
    ): void;
    removePlayer(
        playerId: string,
        broadcast: BroadcastFn,
        sendTo: SendToFn,
    ): void;
    endGame(
        broadcast: BroadcastFn,
        sendTo: SendToFn,
    ): LiveSessionSummary | undefined;
    getState(): {
        players: Player[];
        hostId: string | null;
        sessionId: string | null;
        questions: Record<string, LiveQuestion>;
        answers: Record<string, Record<string, string>>;
        currentQuestionId: string | null;
    };
}

export function createQuizGameAdapter(
    stateRef: { current: unknown },
): GameAdapter {
    const ref = stateRef as { current: GameServer | null };

    function getServer(): GameServer {
        if (!ref.current) {
            ref.current = createServer();
        }
        return ref.current;
    }

    return {
        processMessage(message, broadcast, _sendTo): LiveSessionSummary | undefined {
            const server: GameServer = getServer();
            const msg = message as {
                playerId: string;
                playerName: string;
                type: string;
                data: Record<string, unknown>;
            };
            return (server as any).processMessage(
                {
                    playerId: msg.playerId,
                    playerName: msg.playerName,
                    type: msg.type as any,
                    data: msg.data,
                },
                broadcast,
            );
        },

        sendStateToPlayer(playerId, sendTo) {
            const server = getServer();
            const state = server.getState();
            sendTo(
                playerId,
                JSON.stringify({
                    type: "room_state",
                    data: {
                        players: state.players,
                        hostId: state.hostId,
                        currentQuestion: state.currentQuestionId
                            ? state.questions[state.currentQuestionId]
                            : null,
                    },
                }),
            );
        },

        initGame(players, hostId, broadcast, _sendTo) {
            const server = getServer();
            for (const player of players) {
                server.addPlayer(player.id, player.name);
            }
            if (hostId) {
                server.addPlayer(hostId, "Host");
            }
            broadcast(
                JSON.stringify({
                    type: "room_state",
                    data: { players: [...players], hostId },
                }),
            );
        },

        removePlayer(playerId, broadcast, _sendTo) {
            const server = getServer();
            server.removePlayer(playerId);
            const state = server.getState();
            broadcast(
                JSON.stringify({
                    type: "player_list",
                    data: { players: state.players },
                }),
            );
        },

        endGame(broadcast, _sendTo) {
            const server = getServer();
            const summary = server.processMessage(
                {
                    playerId: "",
                    playerName: "",
                    type: "end",
                    data: {},
                },
                broadcast,
            );
            return summary;
        },

        getState() {
            const server = getServer();
            return server.getState();
        },
    };
}
