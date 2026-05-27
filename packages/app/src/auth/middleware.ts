import { Data, Effect } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import {
    getAuthenticatedUser,
    getAuthenticatedDbUser,
    getAdminUser,
} from "~/utils/auth.server";
import type { AuthUser, DbUser } from "~/utils/auth.server";

export class NotAuthenticated extends Data.TaggedError("NotAuthenticated")<{}> {}

export class Forbidden extends Data.TaggedError("Forbidden")<{
    required: "authenticated" | "teacher" | "admin";
    actual: string | null;
}> {}

export function getAuthenticatedUserEffect(headers: Headers) {
    return Effect.tryPromise({
        try: () => getAuthenticatedUser(headers),
        catch: () => new NotAuthenticated(),
    }).pipe(
        Effect.flatMap((user) =>
            user ? Effect.succeed(user) : Effect.fail(new NotAuthenticated()),
        ),
    );
}

export function getAuthenticatedDbUserEffect(headers: Headers) {
    return Effect.tryPromise({
        try: () => getAuthenticatedDbUser(headers),
        catch: () => new NotAuthenticated(),
    }).pipe(
        Effect.flatMap((user) =>
            user ? Effect.succeed(user) : Effect.fail(new NotAuthenticated()),
        ),
    );
}

export function getAdminUserEffect(headers: Headers) {
    return Effect.tryPromise({
        try: () => getAdminUser(headers),
        catch: () => new NotAuthenticated(),
    }).pipe(
        Effect.flatMap((user) =>
            user
                ? Effect.succeed(user)
                : Effect.fail(
                      new Forbidden({
                          required: "admin",
                          actual: null,
                      }),
                  ),
        ),
    );
}

export function requireRole(user: DbUser, ...roles: DbUser["role"][]) {
    if (roles.includes(user.role)) return Effect.succeed(user);
    return Effect.fail(new Forbidden({ required: "admin", actual: user.role }));
}

export interface HandlerContext {
    params?: Record<string, unknown>;
    payload?: unknown;
}

export function createProtectedHandler<A>(
    fn: (
        webReq: Request,
        user: AuthUser,
        dbUser: DbUser,
        ctx: HandlerContext,
    ) => Promise<A>,
) {
    return (
        ctx: {
            request: any;
            params?: Record<string, unknown>;
            payload?: unknown;
        },
    ) =>
        Effect.gen(function* () {
            const webReq = yield* HttpServerRequest.toWeb(ctx.request);
            const user = yield* getAuthenticatedUserEffect(webReq.headers);
            const dbUser = yield* getAuthenticatedDbUserEffect(webReq.headers);
            return yield* Effect.tryPromise(() =>
                fn(webReq, user, dbUser, {
                    params: ctx.params,
                    payload: ctx.payload,
                }),
            );
        }).pipe(
            Effect.catch((error: unknown) => {
                if (error instanceof NotAuthenticated) {
                    return Effect.succeed(
                        HttpServerResponse.fromWeb(
                            new Response("Unauthorized", { status: 401 }),
                        ) as A,
                    );
                }
                if (error instanceof Forbidden) {
                    return Effect.succeed(
                        HttpServerResponse.fromWeb(
                            new Response("Forbidden", { status: 403 }),
                        ) as A,
                    );
                }
                console.error("Unhandled error in protected handler:", error instanceof Error ? error.message : error);
                return Effect.succeed(
                    HttpServerResponse.fromWeb(
                        new Response("Internal error", { status: 500 }),
                    ) as A,
                );
            }),
        );
}
