import { Schema } from "effect";

export const messageTypes = [
    "join",
    "leave",
    "start",
    "end",
    "info",
    "answer",
] as const;

export type MessageType = (typeof messageTypes)[number];

const messageTypeEnum = {
    join: "join",
    leave: "leave",
    start: "start",
    end: "end",
    info: "info",
    answer: "answer",
} as const;

export const clientMessageSchema = Schema.Struct({
    playerId: Schema.String,
    playerName: Schema.String,
    type: Schema.Enum(messageTypeEnum),
    data: Schema.Record(Schema.String, Schema.Any),
});

export type ClientMessage = {
    playerId: string;
    playerName: string;
    type: MessageType;
    data: Record<string, unknown>;
};

const serverTypeEnum = {
    player_list: "player_list",
    host_assigned: "host_assigned",
    room_state: "room_state",
    game_started: "game_started",
    player_answered: "player_answered",
    question: "question",
    game_ended: "game_ended",
} as const;

export const serverMessageSchema = Schema.Struct({
    type: Schema.Enum(serverTypeEnum),
    data: Schema.Record(Schema.String, Schema.Any),
});

export type ServerMessage = {
    type: keyof typeof serverTypeEnum;
    data: Record<string, unknown>;
};

export type ProcessMessageResult =
    | { type: "persist"; summary: LiveSessionSummary }
    | { error: string };

export type Player = {
    id: string;
    name: string;
    score?: number;
};

export type LiveQuestion = {
    id: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
};

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

const normalizeAnswer = (value: string): string => value.trim().toLowerCase();

const toPublicQuestion = (question: LiveQuestion): PublicQuestion => {
    const { correctAnswer, ...publicQuestion } = question;
    return publicQuestion;
};

export { normalizeAnswer, toPublicQuestion };
