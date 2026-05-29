import { nanoid } from "nanoid";
import { validateQuestion, validateAnswer } from "./engine";
import type {
    Player,
    LiveQuestion,
    LiveAnswers,
    LiveSessionSummary,
    ClientMessage,
    ServerMessage,
    PublicQuestion,
    LivePlayerResult,
} from "./schemas";

type BroadcastFn = (msg: string) => void;
type SendToFn = (playerId: string, msg: string) => void;

const normalizeAnswer = (value: string) => value.trim().toLowerCase();

const toPublicQuestion = (question: LiveQuestion): PublicQuestion => {
    const { correctAnswer, ...publicQuestion } = question;
    return publicQuestion;
};

function createServer(initialState?: {
    players?: Player[];
    hostId?: string | null;
    sessionId?: string;
    sessionStartedAt?: number;
    questions?: Record<string, LiveQuestion>;
    answers?: LiveAnswers;
    currentQuestionId?: string;
}) {
    const players: Player[] = initialState?.players ?? [];
    let hostId: string | null = initialState?.hostId ?? null;
    let sessionId: string | null = initialState?.sessionId ?? null;
    let sessionStartedAt: number | null = initialState?.sessionStartedAt ?? null;
    let questions: Record<string, LiveQuestion> = initialState?.questions ?? {};
    let answers: LiveAnswers = initialState?.answers ?? {};
    let currentQuestionId: string | null = initialState?.currentQuestionId ?? null;

    return {
        getState() {
            return {
                players,
                hostId,
                sessionId,
                sessionStartedAt,
                questions,
                answers,
                currentQuestionId,
            };
        },

        addPlayer(playerId: string, name: string) {
            const existingIndex = players.findIndex((p) => p.id === playerId);
            if (existingIndex >= 0) {
                players[existingIndex].name = name;
                return players;
            }
            players.push({ id: playerId, name, score: 0 });
            return players;
        },

        removePlayer(playerId: string) {
            const index = players.findIndex((p) => p.id === playerId);
            if (index >= 0) {
                players.splice(index, 1);
            }
            return players;
        },

        getOrSetHost(playerId: string): string {
            if (!hostId) {
                hostId = playerId;
            }
            return hostId;
        },

        resetScores() {
            for (const player of players) {
                player.score = 0;
            }
            return players;
        },

        updatePlayerScore(playerId: string, delta: number) {
            const player = players.find((p) => p.id === playerId);
            if (player) {
                player.score = (player.score ?? 0) + delta;
            }
            return players;
        },

        setQuestion(question: LiveQuestion) {
            questions[question.id] = question;
            currentQuestionId = question.id;
            return question;
        },

        saveAnswer(questionId: string, playerId: string, answer: string) {
            const questionAnswers = answers[questionId] ?? {};
            questionAnswers[playerId] = answer;
            answers[questionId] = questionAnswers;
            return answers;
        },

        getCurrentQuestion(): LiveQuestion | undefined {
            return currentQuestionId ? questions[currentQuestionId] : undefined;
        },

        getResults(): LivePlayerResult[] {
            const questionIds = Object.keys(questions);
            const maxScore = questionIds.length;

            return players.map((player) => {
                let score = 0;
                const playerAnswers: Record<string, string | null> = {};

                for (const questionId of questionIds) {
                    const answer = answers[questionId]?.[player.id] ?? null;
                    playerAnswers[questionId] = answer;

                    const question = questions[questionId];
                    const isCorrect = answer
                        ? normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer)
                        : false;

                    if (isCorrect) {
                        score += 1;
                    }
                }

                return {
                    playerId: player.id,
                    playerName: player.name,
                    score,
                    maxScore,
                    answers: playerAnswers,
                };
            });
        },

        processMessage(
            message: ClientMessage,
            broadcast: BroadcastFn,
        ): LiveSessionSummary | undefined {
            const { playerId, playerName, type, data } = message;

            if (type === "join") {
                this.addPlayer(playerId, playerName);
                const isHost = this.getOrSetHost(playerId) === playerId;

                broadcast(JSON.stringify({
                    type: "player_list",
                    data: { players: [...players] },
                } as ServerMessage));

                if (isHost) {
                    broadcast(JSON.stringify({
                        type: "host_assigned",
                        data: { hostId },
                    } as ServerMessage));
                }
            } else if (type === "leave") {
                this.removePlayer(playerId);
                broadcast(JSON.stringify({
                    type: "player_list",
                    data: { players: [...players] },
                } as ServerMessage));
            } else if (type === "start") {
                const qResult = validateQuestion(data.question);
                if (!qResult.success) {
                    return undefined;
                }

                sessionId = nanoid(10);
                sessionStartedAt = Date.now();

                this.setQuestion(qResult.value);
                answers = {};
                this.resetScores();

                broadcast(JSON.stringify({
                    type: "game_started",
                    data: { sessionId },
                } as ServerMessage));

                broadcast(JSON.stringify({
                    type: "question",
                    data: { question: toPublicQuestion(qResult.value) },
                } as ServerMessage));

                broadcast(JSON.stringify({
                    type: "player_list",
                    data: { players: [...players] },
                } as ServerMessage));
            } else if (type === "answer") {
                const aResult = validateAnswer(data);
                if (!aResult.success) {
                    return undefined;
                }

                const { questionId, answer } = aResult.value;
                const questionAnswers = answers[questionId] ?? {};
                const alreadyAnswered = Boolean(questionAnswers[playerId]);

                if (!alreadyAnswered) {
                    this.saveAnswer(questionId, playerId, answer);

                    const question = questions[questionId];
                    const isCorrect = question
                        ? normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer)
                        : false;

                    if (isCorrect) {
                        this.updatePlayerScore(playerId, 1);
                    }
                }

                broadcast(JSON.stringify({
                    type: "player_answered",
                    data: {
                        players: [...players],
                        answers: questionAnswers,
                        questionId,
                    },
                } as ServerMessage));
            } else if (type === "end") {
                const results = this.getResults();
                const endedAt = Date.now();
                const summary: LiveSessionSummary = {
                    sessionId: sessionId ?? nanoid(10),
                    startedAt: sessionStartedAt ?? Date.now(),
                    endedAt,
                    results,
                };

                broadcast(JSON.stringify({
                    type: "game_ended",
                    data: { results },
                } as ServerMessage));

                return summary;
            }

            return undefined;
        },
    };
}

export type GameServer = ReturnType<typeof createServer>;
export { createServer };
