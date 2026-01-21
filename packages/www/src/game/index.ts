import z from "zod";

export const messageTypes = [
    "join",
    "leave",
    "start",
    "end",
    "info",
    "answer",
] as const;
export type MessageType = (typeof messageTypes)[number];

const roomType = ["lobby", "quiz", "rps"] as const;
type RoomType = (typeof roomType)[number];

const playersStorage = "players";
const hostIdStorage = "hostId";
const answersStorage = "answers";
const questionsStorage = "questions";
const currentQuestionStorage = "currentQuestion";
const sessionIdStorage = "sessionId";
const sessionStartedAtStorage = "sessionStartedAt";

export interface Player {
    id: string;
    name: string;
    score?: number;
}

export interface LiveQuestion {
    id: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
}

export type PublicQuestion = Omit<LiveQuestion, "correctAnswer">;

export type LiveAnswers = Record<string, Record<string, string>>;

export type LivePlayerResult = {
    playerId: string;
    playerName: string;
    score: number;
    maxScore: number;
    answers: Record<string, string | null>;
};

export type LiveSessionSummary = {
    sessionId: string;
    startedAt: number;
    endedAt: number;
    results: LivePlayerResult[];
};

const liveQuestionSchema = z.object({
    id: z.string().trim().min(1),
    prompt: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2),
    correctAnswer: z.string().trim().min(1),
});

export const clientMessageSchema = z.object({
    playerId: z.string(),
    playerName: z.string(),
    type: z.enum(messageTypes),
    data: z.record(z.string(), z.unknown()),
});

export type ClientMessage = z.output<typeof clientMessageSchema>;

export const serverMessageSchema = z.object({
    type: z.enum([
        "player_list",
        "host_assigned",
        "room_state",
        "game_started",
        "player_answered",
        "question",
        "game_ended",
    ]),
    data: z.record(z.string(), z.unknown()),
});

export type ServerMessage = z.output<typeof serverMessageSchema>;

export type ProcessMessageResult =
    | { type: "persist"; summary: LiveSessionSummary }
    | { error: string };

const normalizeAnswer = (value: string) => value.trim().toLowerCase();

const toPublicQuestion = (question: LiveQuestion): PublicQuestion => {
    const { correctAnswer, ...publicQuestion } = question;
    return publicQuestion;
};

export const server = (ctx: DurableObjectState) => ({
    getOrSetHost: async (playerId: string) => {
        const existing = await ctx.storage.get(hostIdStorage);
        if (existing) return existing as string;
        await ctx.storage.put(hostIdStorage, playerId);
        return playerId;
    },

    addPlayer: async (playerId: string, name: string) => {
        let players: Player[] = (await ctx.storage.get(playersStorage)) || [];

        const existingIndex = players.findIndex((p) => p.id === playerId);
        if (existingIndex >= 0) {
            players[existingIndex].name = name;
            await ctx.storage.put(playersStorage, players);
            return players;
        }

        players.push({ id: playerId, name, score: 0 });
        await ctx.storage.put(playersStorage, players);
        return players;
    },

    removePlayer: async (playerId: string) => {
        let players: Player[] = (await ctx.storage.get(playersStorage)) || [];
        players = players.filter(({ id }) => id !== playerId);
        await ctx.storage.put(playersStorage, players);
        return players;
    },

    getPlayers: async () => {
        return (await ctx.storage.get(playersStorage)) as Player[] | undefined;
    },

    setPlayers: async (players: Player[]) => {
        await ctx.storage.put(playersStorage, players);
        return players;
    },

    resetScores: async () => {
        const players: Player[] = (await ctx.storage.get(playersStorage)) || [];
        const nextPlayers = players.map((player) => ({
            ...player,
            score: 0,
        }));
        await ctx.storage.put(playersStorage, nextPlayers);
        return nextPlayers;
    },

    updatePlayerScore: async (playerId: string, delta: number) => {
        const players: Player[] = (await ctx.storage.get(playersStorage)) || [];
        const nextPlayers = players.map((player) =>
            player.id === playerId
                ? { ...player, score: (player.score ?? 0) + delta }
                : player,
        );
        await ctx.storage.put(playersStorage, nextPlayers);
        return nextPlayers;
    },

    getHostId: async () => {
        return (await ctx.storage.get(hostIdStorage)) as string | undefined;
    },

    setSessionId: async (sessionId: string) => {
        await ctx.storage.put(sessionIdStorage, sessionId);
        return sessionId;
    },

    getSessionId: async () => {
        return (await ctx.storage.get(sessionIdStorage)) as string | undefined;
    },

    setSessionStartedAt: async (startedAt: number) => {
        await ctx.storage.put(sessionStartedAtStorage, startedAt);
        return startedAt;
    },

    getSessionStartedAt: async () => {
        return (await ctx.storage.get(sessionStartedAtStorage)) as
            | number
            | undefined;
    },

    saveAnswer: async (
        questionId: string,
        playerId: string,
        answer: string,
    ) => {
        const answers: LiveAnswers =
            (await ctx.storage.get(answersStorage)) || {};
        const questionAnswers = answers[questionId] ?? {};
        questionAnswers[playerId] = answer;
        answers[questionId] = questionAnswers;
        await ctx.storage.put(answersStorage, answers);
        return answers;
    },

    setAnswers: async (answers: LiveAnswers) => {
        await ctx.storage.put(answersStorage, answers);
        return answers;
    },

    getAnswers: async () => {
        return (await ctx.storage.get(answersStorage)) as
            | LiveAnswers
            | undefined;
    },

    getQuestions: async () => {
        return (await ctx.storage.get(questionsStorage)) as
            | Record<string, LiveQuestion>
            | undefined;
    },

    getQuestion: async (questionId: string) => {
        const questions = (await ctx.storage.get(questionsStorage)) as
            | Record<string, LiveQuestion>
            | undefined;
        return questions?.[questionId];
    },

    setQuestion: async (question: LiveQuestion) => {
        const questions =
            ((await ctx.storage.get(questionsStorage)) as
                | Record<string, LiveQuestion>
                | undefined) ?? {};
        const nextQuestions = { ...questions, [question.id]: question };
        await ctx.storage.put(questionsStorage, nextQuestions);
        await ctx.storage.put(currentQuestionStorage, question.id);
        return question;
    },

    getCurrentQuestion: async () => {
        const currentQuestionId = (await ctx.storage.get(
            currentQuestionStorage,
        )) as string | undefined;

        if (!currentQuestionId) {
            return undefined;
        }

        const questions = (await ctx.storage.get(questionsStorage)) as
            | Record<string, LiveQuestion>
            | undefined;
        return questions?.[currentQuestionId];
    },

    processMessage: async (
        message: string,
        broadcast: (msg: string) => void,
    ): Promise<ProcessMessageResult | undefined> => {
        const json = JSON.parse(message);

        const safeParsed = z.safeParse(clientMessageSchema, json);

        if (!safeParsed.success) {
            return { error: "failed parsing client message" };
        }

        const parsed = safeParsed.data;

        const { playerId, playerName, type } = parsed;

        if (type === "join") {
            const players = await server(ctx).addPlayer(playerId, playerName);
            const hostId = await server(ctx).getOrSetHost(playerId);
            const isHost = hostId === playerId;

            broadcast(
                JSON.stringify({
                    type: "player_list",
                    data: { players },
                } as ServerMessage),
            );

            if (isHost) {
                broadcast(
                    JSON.stringify({
                        type: "host_assigned",
                        data: { hostId },
                    } as ServerMessage),
                );
            }
        } else if (type === "leave") {
            const players = await server(ctx).removePlayer(playerId);
            broadcast(
                JSON.stringify({
                    type: "player_list",
                    data: { players },
                } as ServerMessage),
            );
        } else if (type === "start") {
            const questionParsed = liveQuestionSchema.safeParse(
                parsed.data.question,
            );

            if (!questionParsed.success) {
                return { error: "invalid question payload" };
            }

            const sessionId = crypto.randomUUID();
            const startedAt = Date.now();

            await server(ctx).setSessionId(sessionId);
            await server(ctx).setSessionStartedAt(startedAt);
            await server(ctx).setQuestion(questionParsed.data);
            await server(ctx).setAnswers({});
            const players = await server(ctx).resetScores();

            broadcast(
                JSON.stringify({
                    type: "game_started",
                    data: { sessionId },
                } as ServerMessage),
            );
            broadcast(
                JSON.stringify({
                    type: "question",
                    data: { question: toPublicQuestion(questionParsed.data) },
                } as ServerMessage),
            );
            broadcast(
                JSON.stringify({
                    type: "player_list",
                    data: { players },
                } as ServerMessage),
            );
        } else if (type === "answer") {
            const answerParsed = z
                .object({
                    questionId: z.string().trim().min(1),
                    answer: z.string().trim().min(1),
                })
                .safeParse(parsed.data);

            if (!answerParsed.success) {
                return { error: "invalid answer payload" };
            }

            const { questionId, answer } = answerParsed.data;
            const answers = (await server(ctx).getAnswers()) ?? {};
            const questionAnswers = answers[questionId] ?? {};
            const alreadyAnswered = Boolean(questionAnswers[playerId]);

            if (!alreadyAnswered) {
                questionAnswers[playerId] = answer;
                answers[questionId] = questionAnswers;
                await server(ctx).setAnswers(answers);

                const question = await server(ctx).getQuestion(questionId);
                const isCorrect = question
                    ? normalizeAnswer(answer) ===
                      normalizeAnswer(question.correctAnswer)
                    : false;

                if (isCorrect) {
                    await server(ctx).updatePlayerScore(playerId, 1);
                }
            }

            const players = await server(ctx).getPlayers();

            broadcast(
                JSON.stringify({
                    type: "player_answered",
                    data: {
                        players: players ?? [],
                        answers: questionAnswers,
                        questionId,
                    },
                } as ServerMessage),
            );
        } else if (type === "end") {
            const questions = (await server(ctx).getQuestions()) ?? {};
            const answers = (await server(ctx).getAnswers()) ?? {};
            const players = (await server(ctx).getPlayers()) ?? [];
            const sessionId =
                (await server(ctx).getSessionId()) ?? crypto.randomUUID();
            const startedAt =
                (await server(ctx).getSessionStartedAt()) ?? Date.now();
            const endedAt = Date.now();
            const questionIds = Object.keys(questions);
            const maxScore = questionIds.length;
            const results = players.map((player) => {
                let score = 0;
                const playerAnswers: Record<string, string | null> = {};

                for (const questionId of questionIds) {
                    const answer = answers[questionId]?.[player.id] ?? null;
                    playerAnswers[questionId] = answer;

                    const question = questions[questionId];
                    const isCorrect = answer
                        ? normalizeAnswer(answer) ===
                          normalizeAnswer(question.correctAnswer)
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

            broadcast(
                JSON.stringify({
                    type: "game_ended",
                    data: { results },
                } as ServerMessage),
            );

            return {
                type: "persist",
                summary: {
                    sessionId,
                    startedAt,
                    endedAt,
                    results,
                },
            };
        }
    },
});
