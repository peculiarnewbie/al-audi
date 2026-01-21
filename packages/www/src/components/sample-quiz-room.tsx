import { Component, createSignal, onMount, For, Show } from "solid-js";
import type { Player, PublicQuestion } from "~/game";

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
        class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
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
        <div class="p-8 space-y-6">
            <Show
                when={question()}
                fallback={
                    <div class="text-sm text-gray-500">
                        Waiting for the host to start the quiz...
                    </div>
                }
            >
                {(currentQuestion) => (
                    <div class="space-y-4">
                        <h1 class="text-2xl font-bold">
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
                    class="px-4 py-2 bg-rose-600 rounded hover:bg-rose-700"
                >
                    End session
                </button>
            </Show>
            <Show when={scores().length > 0}>
                <div class="border-t border-gray-700 pt-4">
                    <h2 class="font-semibold mb-2">Scores</h2>
                    <ul class="space-y-1">
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
                <div class="border-t border-gray-700 pt-4">
                    <h2 class="font-semibold mb-2">Answers</h2>
                    <ul class="space-y-1">
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
    );
};
