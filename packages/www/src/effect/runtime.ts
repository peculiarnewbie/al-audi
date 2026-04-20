import { Cause, Effect, LogLevel, Logger } from "effect";

import type { EffectLogContext } from "./logger";
import { compactLogContext } from "./logger";

export function runObservedPromiseExit<A, E>(
    program: Effect.Effect<A, E>,
    operation: string,
    context: EffectLogContext,
) {
    const annotations = compactLogContext({
        ...context,
        operation,
    });

    const observed = program.pipe(
        Effect.annotateLogs(annotations),
        Effect.withLogSpan(operation),
        Effect.catchAllCause((cause: Cause.Cause<unknown>) =>
            Effect.logError(Cause.pretty(cause)).pipe(
                Effect.annotateLogs(
                    compactLogContext({
                        ...context,
                        operation,
                        result: "failure",
                        errorTag: "Cause",
                    }),
                ),
                Effect.flatMap(() => Effect.failCause(cause)),
            ),
        ),
        Logger.withMinimumLogLevel(LogLevel.Warning),
    );

    return Effect.runPromiseExit(observed);
}

export function runObservedSync<A, E>(
    program: Effect.Effect<A, E>,
    operation: string,
    context: EffectLogContext,
) {
    const annotations = compactLogContext({
        ...context,
        operation,
    });

    return Effect.runSync(
        program.pipe(
            Effect.annotateLogs(annotations),
            Effect.withLogSpan(operation),
            Logger.withMinimumLogLevel(LogLevel.Warning),
        ),
    );
}
