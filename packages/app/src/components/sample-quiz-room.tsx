import { Component, createSignal, onMount, For, Show } from "solid-js";
import type { Player, PublicQuestion } from "~/game/schemas";

type PlayerAnswer = {
    player: Player;
    answer: string;
};

const AnswerButton: Component<{
    answer: string;
    label: string;
    playerAnswer: string | null;
    onSubmit: (answer: string) => void;
}> = (props) => (
    <button
        onClick={() => props.onSubmit(props.answer)}
        disabled={props.playerAnswer !== null}
        class="rounded-full bg-[color:var(--dashboard-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:opacity-60"
    >
        {props.label}
    </button>
);

export const SampleQuizRoom: Component<{
    roomId: string;
    playerId: string | null;
    isHost: boolean;
}> = (props) => {
    const [playerAnswer, setPlayerAnswer] = createSignal<string | null>(null);
    const [playerAnswers, setPlayerAnswers] = createSignal<PlayerAnswer[]>([]);
    const [question, setQuestion] = createSignal<PublicQuestion | null>(null);
    const [scores, setScores] = createSignal<Player[]>([]);
    let ws: WebSocket;

    onMount(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/room/${props.roomId}`;

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
            }

            if (json.type === "player_answered") {
                const questionId = json.data.questionId as string | undefined;
                const currentQuestion = question();

                if (
                    questionId &&
                    currentQuestion?.id &&
                    questionId !== currentQuestion.id
                ) {
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

        if (!currentQuestion) {
            return;
        }

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
        if (!props.isHost) {
            return;
        }

        ws.send(
            JSON.stringify({
                playerId: props.playerId,
                playerName: "",
                type: "end",
                data: {},
            }),
        );
    };

    return (
        <div class="mx-auto max-w-3xl px-6 py-12">
            <div class="glass-panel p-6 space-y-6">
                <Show
                    when={question()}
                    fallback={
                        <div class="text-sm text-slate-500">
                            Waiting for the host to start the quiz...
                        </div>
                    }
                >
                    {(currentQuestion) => (
                        <div class="space-y-4">
                            <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                Live question
                            </div>
                            <h1 class="font-display text-2xl font-semibold text-[color:var(--dashboard-ink)]">
                                {currentQuestion().prompt}
                            </h1>
                            <div class="flex flex-wrap gap-2">
                                <For each={currentQuestion().options}>
                                    {(option) => (
                                        <AnswerButton
                                            answer={option}
                                            label={option}
                                            playerAnswer={playerAnswer()}
                                            onSubmit={submitAnswer}
                                        />
                                    )}
                                </For>
                            </div>
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
                        <h2 class="font-semibold text-[color:var(--dashboard-ink)] mb-2">
                            Scores
                        </h2>
                        <ul class="space-y-1 text-sm text-slate-600">
                            <For each={scores()}>
                                {(player) => (
                                    <li class="flex items-center justify-between">
                                        <span>{player.name}</span>
                                        <span>{player.score ?? 0}</span>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </div>
                </Show>
                <Show when={props.isHost && playerAnswers().length > 0}>
                    <div class="border-t border-white/70 pt-4">
                        <h2 class="font-semibold text-[color:var(--dashboard-ink)] mb-2">
                            Answers
                        </h2>
                        <ul class="space-y-1 text-sm text-slate-600">
                            <For each={playerAnswers()}>
                                {(pa) => (
                                    <li>
                                        {pa.player.name}: {pa.answer}
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
