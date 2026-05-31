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
                    <div class="glass-panel p-6 space-y-6">
                        <div class="text-center space-y-2">
                            <div class="inline-block text-xs uppercase tracking-[0.3em] bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                                Game Over
                            </div>
                            <h2 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                                Session results
                            </h2>
                        </div>
                        <Show
                            when={finalResults() && finalResults()!.length}
                            fallback={
                                <div class="text-sm text-slate-500 text-center py-8">
                                    Game ended. No results recorded.
                                </div>
                            }
                        >
                            <div class="space-y-2">
                                <For each={
                                    (finalResults() ?? []).slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                                }>
                                    {(result, idx) => {
                                        const rank = idx() + 1;
                                        const medal = rank === 1 ? "bg-yellow-100 text-yellow-700" :
                                            rank === 2 ? "bg-slate-200 text-slate-600" :
                                            rank === 3 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500";
                                        const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
                                        return (
                                            <div class={"flex items-center justify-between rounded-2xl px-4 py-3 " + (rank <= 3 ? "bg-white/90 shadow-sm" : "bg-white/60")}>
                                                <div class="flex items-center gap-3">
                                                    <span class={"flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold " + medal}>
                                                        {rank <= 3 ? ["1st", "2nd", "3rd"][rank - 1] : String(rank) + "th"}
                                                    </span>
                                                    <span class="font-medium text-[color:var(--dashboard-ink)]">{result.playerName}</span>
                                                </div>
                                                <div class="flex items-center gap-3">
                                                    <div class="text-right">
                                                        <div class="text-lg font-bold text-[color:var(--dashboard-ink)]">{String(pct) + "%"}</div>
                                                        <div class="text-xs text-slate-500">{result.score} / {result.maxScore}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>
                        </Show>
                        <div class="flex justify-center pt-2">
                            <a
                                href="/room"
                                class="rounded-full bg-[color:var(--dashboard-accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]"
                            >
                                New game
                            </a>
                        </div>
                    </div>
                </div>
            </Match>
        </Switch>
    );
}
