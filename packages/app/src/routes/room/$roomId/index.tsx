import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, onMount, Switch, Match, For, Show } from "solid-js";
import { nanoid } from "nanoid";
import { RoomLobby } from "~/components/room-lobby";
import { SampleQuizRoom } from "~/components/sample-quiz-room";
import type {
    LivePlayerResult,
    LiveQuestion,
    MessageType,
    Player,
    ServerMessage,
} from "~/game/schemas";

const sampleQuestion: LiveQuestion = {
    id: "sample-question",
    prompt: "Which option means 'hello'?",
    options: ["Hello", "Goodbye", "Thanks"],
    correctAnswer: "Hello",
};

export const Route = createFileRoute("/room/$roomId/")({
    component: RouteComponent,
});

function RouteComponent() {
    const params = Route.useParams();
    let ws: WebSocket;

    const [playerId, setPlayerId] = createSignal<string | null>(null);
    const [name, setName] = createSignal("");
    const [players, setPlayers] = createSignal<Player[]>([]);
    const [isHost, setIsHost] = createSignal(false);
    const [gameState, setGameState] = createSignal<
        "lobby" | "playing" | "ended"
    >("lobby");
    const [finalResults, setFinalResults] = createSignal<
        LivePlayerResult[] | null
    >(null);

    const refreshPlayerId = () => {
        const match = document.cookie.match(/playerId=([^;]+)/);
        if (match) return match[1];
        const id = nanoid(10);
        document.cookie = `playerId=${id}; path=/; max-age=31536000; SameSite=Strict`;
        return id;
    };

    const send = (
        type: MessageType,
        name?: string,
        data?: Record<string, unknown>,
    ) => {
        const pid = playerId();
        if (!ws || !pid) return;
        ws.send(
            JSON.stringify({
                playerId: pid,
                playerName: name || "",
                type,
                data: data ?? {},
            }),
        );
    };

    const join = (name: string) => send("join", name);
    const leave = () => send("leave");
    const startGame = () => send("start", name(), { question: sampleQuestion });

    const isJoined = () => players().some((p) => p.id === playerId());

    onMount(() => {
        const pid = refreshPlayerId();
        setPlayerId(pid);

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/room/${params().roomId}`;

        ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
            const json = JSON.parse(e.data);
            const msg = json as ServerMessage;

            if (msg.type === "room_state") {
                const players = msg.data.players as Player[];
                setPlayers(players);
                setIsHost(msg.data.hostId === playerId());
                const currentPlayer = players.find(
                    (p: Player) => p.id === playerId(),
                );
                if (currentPlayer) {
                    setName(currentPlayer.name);
                }
            }
            if (msg.type === "player_list") {
                const players = msg.data.players as Player[];
                setPlayers(players);
            }
            if (msg.type === "host_assigned") {
                setIsHost(msg.data.hostId === playerId());
            }
            if (msg.type === "game_started") {
                setFinalResults(null);
                setGameState("playing");
            }
            if (msg.type === "game_ended") {
                setFinalResults(msg.data.results as LivePlayerResult[]);
                setGameState("ended");
            }
        };
    });

    return (
        <Switch>
            <Match when={gameState() === "lobby"}>
                <RoomLobby
                    roomId={params().roomId}
                    playerId={playerId()}
                    name={name()}
                    setName={setName}
                    players={players()}
                    isHost={isHost()}
                    isJoined={isJoined()}
                    onJoin={join}
                    onLeave={leave}
                    onStart={startGame}
                />
            </Match>
            <Match when={gameState() === "playing"}>
                <SampleQuizRoom
                    roomId={params().roomId}
                    playerId={playerId()}
                    isHost={isHost()}
                />
            </Match>
            <Match when={gameState() === "ended"}>
                <div class="mx-auto max-w-3xl px-6 py-12">
                    <div class="glass-panel p-6 space-y-4">
                        <h2 class="font-display text-2xl font-semibold text-[color:var(--dashboard-ink)]">
                            Session results
                        </h2>
                        <Show
                            when={finalResults() && finalResults()!.length}
                            fallback={
                                <div class="text-sm text-slate-500">
                                    Game ended.
                                </div>
                            }
                        >
                            <ul class="space-y-2 text-sm text-slate-600">
                                <For each={finalResults() ?? []}>
                                    {(result) => (
                                        <li class="flex items-center justify-between border-b border-white/70 pb-2">
                                            <span>{result.playerName}</span>
                                            <span>
                                                {result.score} /{" "}
                                                {result.maxScore}
                                            </span>
                                        </li>
                                    )}
                                </For>
                            </ul>
                        </Show>
                    </div>
                </div>
            </Match>
        </Switch>
    );
}
