import { createSignal, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";
import type { ServerMessage, ClientMessage } from "./schemas";

export interface GameConnection<TView, TOutgoing> {
    view: Accessor<TView | null>;
    send: (message: TOutgoing) => void;
    connect: (playerId: string, playerName: string) => void;
    disconnect: () => void;
}

type RoomView = {
    players: Array<{ id: string; name: string; score?: number }>;
    hostId: string | null;
    currentQuestion: {
        id: string;
        prompt: string;
        options: string[];
    } | null;
    sessionId: string | null;
    results: Array<{
        playerId: string;
        playerName: string;
        score: number;
        maxScore: number;
        answers: Record<string, string | null>;
    }> | null;
};

export function createGameConnection(
    roomId: string,
): GameConnection<RoomView, ClientMessage> {
    const [view, setView] = createSignal<RoomView | null>(null);
    let ws: WebSocket | null = null;
    let playerId: string = crypto.randomUUID();
    let playerName: string = "Player";

    function connect(id: string, name: string) {
        playerId = id;
        playerName = name;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const url = `${protocol}//${host}/api/room/${roomId}`;

        ws = new WebSocket(url);

        ws.onopen = () => {
            // Send initial join message
            send({
                playerId,
                playerName,
                type: "join",
                data: {},
            });
        };

        ws.onmessage = (event) => {
            try {
                const message: ServerMessage = JSON.parse(event.data);
                handleServerMessage(message);
            } catch {
                // Ignore malformed messages
            }
        };

        ws.onclose = () => {
            setView(null);
            ws = null;
        };

        ws.onerror = () => {
            ws?.close();
        };
    }

    function disconnect() {
        if (ws) {
            send({
                playerId,
                playerName,
                type: "leave",
                data: {},
            });
            ws.close();
            ws = null;
        }
    }

    function send(message: ClientMessage) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    function handleServerMessage(message: ServerMessage) {
        const current = view() ?? {
            players: [],
            hostId: null,
            currentQuestion: null,
            sessionId: null,
            results: null,
        };

        switch (message.type) {
            case "player_list": {
                setView({
                    ...current,
                    players: message.data.players as Array<{ id: string; name: string; score?: number }>,
                });
                break;
            }
            case "host_assigned": {
                setView({
                    ...current,
                    hostId: message.data.hostId as string,
                });
                break;
            }
            case "room_state": {
                setView({
                    ...current,
                    players: (message.data.players as Array<{ id: string; name: string; score?: number }>) ?? [],
                    hostId: (message.data.hostId as string | null) ?? null,
                    currentQuestion: message.data.currentQuestion
                        ? {
                              id: (message.data.currentQuestion as any).id,
                              prompt: (message.data.currentQuestion as any).prompt,
                              options: (message.data.currentQuestion as any).options,
                          }
                        : null,
                });
                break;
            }
            case "game_started": {
                setView({
                    ...current,
                    sessionId: message.data.sessionId as string,
                    results: null,
                });
                break;
            }
            case "question": {
                const q = message.data.question as { id: string; prompt: string; options: string[] };
                setView({
                    ...current,
                    currentQuestion: {
                        id: q.id,
                        prompt: q.prompt,
                        options: q.options,
                    },
                });
                break;
            }
            case "player_answered": {
                setView({
                    ...current,
                    players: message.data.players as Array<{ id: string; name: string; score?: number }>,
                });
                break;
            }
            case "game_ended": {
                setView({
                    ...current,
                    results: message.data.results as RoomView["results"],
                    currentQuestion: null,
                });
                break;
            }
        }
    }

    onCleanup(() => {
        disconnect();
    });

    return {
        view,
        send,
        connect,
        disconnect,
    };
}
