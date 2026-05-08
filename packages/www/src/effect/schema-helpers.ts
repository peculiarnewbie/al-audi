import { Data, Effect, Schema } from "effect";

export class RoomMessageDecodeError extends Data.TaggedError(
    "RoomMessageDecodeError",
)<{
    readonly issue: string;
    readonly messageType?: string;
}> {}

export class QuizMessageDecodeError extends Data.TaggedError(
    "QuizMessageDecodeError",
)<{
    readonly issue: string;
    readonly messageType?: string;
}> {}

export class PersistedStateDecodeError extends Data.TaggedError(
    "PersistedStateDecodeError",
)<{
    readonly key: string;
    readonly issue: string;
    readonly fallback: string;
}> {}

export class StorageReadError extends Data.TaggedError("StorageReadError")<{
    readonly operation: string;
    readonly key?: string;
    readonly message: string;
}> {}

export class StorageWriteError extends Data.TaggedError("StorageWriteError")<{
    readonly operation: string;
    readonly key?: string;
    readonly message: string;
}> {}

export function formatUnknownError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

export function extractMessageType(raw: unknown): string | undefined {
    if (
        typeof raw === "object" &&
        raw !== null &&
        "type" in raw &&
        typeof raw.type === "string"
    ) {
        return raw.type;
    }

    return undefined;
}

export function decodeWithSchema<A, E>(
    schema: Schema.Schema<A>,
    raw: unknown,
    mapError: (issue: string, raw: unknown) => E,
): Effect.Effect<A, E> {
    return (Schema.decodeUnknownEffect(schema)(raw) as Effect.Effect<
        A,
        Schema.SchemaError
    >).pipe(
        Effect.mapError((error) => mapError(formatUnknownError(error), raw)),
    );
}

export function encodeWithSchema<A>(
    schema: Schema.Schema<A>,
    value: A,
): unknown {
    return Schema.encodeUnknownSync(schema as any)(value);
}
