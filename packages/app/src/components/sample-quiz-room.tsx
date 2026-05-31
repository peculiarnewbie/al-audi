import { Component, createSignal, onMount, onCleanup, For, Show } from "solid-js";
import type { Player, PublicQuestion } from "~/game/schemas";

type PlayerAnswer = {
    player: Player;
    answer: string;
};

export const SampleQuizRoom: Component<{
    roomId: string;
    playerId: string | null;
    isHost: boolean;
}> = (props) => {
    const [playerAnswer, setPlayerAnswer] = createSignal<string | null>(null);
    const [playerAnswers, setPlayerAnswers] = createSignal<PlayerAnswer[]>([]);
    const [question, setQuestion] = createSignal<PublicQuestion | null>(null);
    const [scores, setScores] = createSignal<Player[]>([]);
    const [timeLeft, setTimeLeft] = createSignal<number | null>(null);
    let ws: WebSocket;
    let timer: ReturnType<typeof setInterval> | undefined;

    onCleanup(() => {
        if (timer) clearInterval(timer);
    });

    const startTimer = (seconds: number) => {
        setTimeLeft(seconds);
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 1) {
                    if (timer) clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    onMount(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = protocol + "//" + host + "/api/room/" + props.roomId;

        ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
            const json = JSON.parse(e.data);

            if (json.type === "room_state") {
                const players = json.data.players as Player[];
                setScores(players ?? []);
            }

            if (json.type === "question") {
                const nextQuestion = json.data.question as PublicQuestion;
                setQuestion(nextQuestion);
                setPlayerAnswer(null);
                setPlayerAnswers([]);
                startTimer(json.data.timeLimit ?? 15);
            }

            if (json.type === "player_answered") {
                const questionId = json.data.questionId as string | undefined;
                const currentQuestion = question();

                if (questionId && currentQuestion?.id && questionId !== currentQuestion.id) {
                    return;
                }

                const players = json.data.players as Player[];
                const answers = json.data.answers as Record<string, string>;
                setScores(players ?? []);
                setPlayerAnswers(
                    (players ?? [])
                        .filter((p: Player) => answers[p.id])
                        .map((p: Player) => ({
                            player: p,
                            answer: answers[p.id],
                        })),
                );
            }
        };
    });

    const submitAnswer = (answer: string) => {
        const currentQuestion = question();
        if (!currentQuestion) return;

        setPlayerAnswer(answer);
        ws.send(
            JSON.stringify({
                playerId: props.playerId,
                playerName: "",
                type: "answer",
                data: { questionId: currentQuestion.id, answer },
            }),
        );
    };

    const endSession = () => {
        if (!props.isHost) return;
        ws.send(
            JSON.stringify({
                playerId: props.playerId,
                playerName: "",
                type: "end",
                data: {},
            }),
        );
    };

    const timerPercent = () => {
        const tl = timeLeft();
        if (tl === null) return 100;
        return (tl / 15) * 100;
    };

    return (
        <div class="mx-auto max-w-3xl px-6 py-12">
            <div class="glass-panel p-6 space-y-6">
                <Show
                    when={question()}
                    fallback={
                        <div class="text-center py-8 space-y-3">
                            <div class="w-8 h-8 border-2 border-[color:var(--dashboard-accent)] border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <div class="text-sm text-slate-500">Waiting for the next question...</div>
                        </div>
                    }
                >
                    {(currentQuestion) => (
                        <div class="space-y-5">
                            <Show when={timeLeft() !== null}>
                                <div class="space-y-1">
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-slate-500 uppercase tracking-[0.2em]">Time left</span>
                                        <span class={"font-mono font-bold " + (timeLeft()! <= 5 ? "text-red-600" : "text-slate-600")}>
                                            {timeLeft()}s
                                        </span>
                                    </div>
                                    <div class="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                        <div
                                            class={"h-full rounded-full transition-all duration-1000 " + (timeLeft()! <= 5 ? "bg-red-500" : "bg-[color:var(--dashboard-accent)]")}
                                            style={{ width: timerPercent() + "%" }}
                                        ></div>
                                    </div>
                                </div>
                            </Show>

                            <div class="space-y-1">
                                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">Live question</div>
                                <h1 class="font-display text-xl font-semibold text-[color:var(--dashboard-ink)]">
                                    {currentQuestion().prompt}
                                </h1>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <For each={currentQuestion().options}>
                                    {(option) => {
                                        const answered = playerAnswer();
                                        const disabled = answered !== null;
                                        let cls = "border-white/70 bg-white/80 text-slate-700 hover:bg-white";
                                        if (answered === option) {
                                            cls = "border-[color:var(--dashboard-accent)] bg-[color:var(--dashboard-accent)]/10 text-[color:var(--dashboard-ink)]";
                                        }
                                        return (
                                            <button
                                                onClick={() => submitAnswer(option)}
                                                disabled={disabled}
                                                class={"rounded-2xl border px-4 py-3 text-sm font-medium transition-all " + cls + (disabled ? " cursor-default" : " hover:shadow-md active:scale-[0.98]")}
                                            >
                                                {option}
                                            </button>
                                        );
                                    }}
                                </For>
                            </div>

                            <Show when={props.isHost && playerAnswers().length > 0}>
                                <div class="border-t border-white/70 pt-4">
                                    <h2 class="font-semibold text-[color:var(--dashboard-ink)] text-sm mb-2">
                                        Answer progress ({String(playerAnswers().length)} / {String(scores().length)})
                                    </h2>
                                    <div class="flex gap-1">
                                        <For each={scores()}>
                                            {(player) => {
                                                const hasAnswered = playerAnswers().some((pa) => pa.player.id === player.id);
                                                return (
                                                    <div
                                                        class={"flex-1 h-1.5 rounded-full " + (hasAnswered ? "bg-green-400" : "bg-slate-200")}
                                                        title={player.name + ": " + (hasAnswered ? "Answered" : "Pending")}
                                                    ></div>
                                                );
                                            }}
                                        </For>
                                    </div>
                                </div>
                            </Show>
                        </div>
                    )}
                </Show>

                <Show when={props.isHost}>
                    <button
                        onClick={endSession}
                        class="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 transition hover:bg-rose-100"
                    >
                        End session
                    </button>
                </Show>

                <Show when={scores().length > 0}>
                    <div class="border-t border-white/70 pt-4">
                        <h2 class="font-semibold text-[color:var(--dashboard-ink)] text-sm mb-2">Scores</h2>
                        <ul class="space-y-1 text-sm text-slate-600">
                            <For each={scores().slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))}>
                                {(player, idx) => (
                                    <li class="flex items-center justify-between rounded-xl px-3 py-2 bg-white/60">
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs font-bold text-slate-400 w-5">#{String(idx() + 1)}</span>
                                            <span>{player.name}</span>
                                        </div>
                                        <span class="font-semibold">{player.score ?? 0}</span>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </div>
                </Show>
            </div>
        </div>
    );
};
