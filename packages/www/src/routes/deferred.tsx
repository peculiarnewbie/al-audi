import { Await, createFileRoute } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { Suspense, createSignal } from "solid-js";

const personServerFn = createServerFn({ method: "GET" })
    .inputValidator((d: string) => d)
    .handler(({ data: name }) => {
        return { name, randomNumber: Math.floor(Math.random() * 100) };
    });

const slowServerFn = createServerFn({ method: "GET" })
    .inputValidator((d: string) => d)
    .handler(async ({ data: name }) => {
        await new Promise((r) => setTimeout(r, 1000));
        return { name, randomNumber: Math.floor(Math.random() * 100) };
    });

export const Route = createFileRoute("/deferred")({
    loader: async () => {
        return {
            deferredStuff: new Promise<string>((r) =>
                setTimeout(() => r("Hello deferred!"), 2000),
            ),
            deferredPerson: slowServerFn({ data: "Tanner Linsley" }),
            person: await personServerFn({ data: "John Doe" }),
        };
    },
    component: Deferred,
});

function Deferred() {
    const [count, setCount] = createSignal(0);
    const loaderData = Route.useLoaderData();

    return (
        <div class="mx-auto max-w-3xl px-6 py-12">
            <div class="glass-panel p-6 space-y-4">
                <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                    Deferred demo
                </h1>
                <div
                    class="text-sm text-slate-600"
                    data-testid="regular-person"
                >
                    {loaderData().person.name} -{" "}
                    {loaderData().person.randomNumber}
                </div>
                <Suspense
                    fallback={
                        <div class="text-sm text-slate-500">
                            Loading person...
                        </div>
                    }
                >
                    <Await
                        promise={loaderData().deferredPerson}
                        children={(data) => (
                            <div
                                class="text-sm text-slate-600"
                                data-testid="deferred-person"
                            >
                                {data.name} - {data.randomNumber}
                            </div>
                        )}
                    />
                </Suspense>
                <Suspense
                    fallback={
                        <div class="text-sm text-slate-500">
                            Loading stuff...
                        </div>
                    }
                >
                    <Await
                        promise={loaderData().deferredStuff}
                        children={(data) => (
                            <h3
                                class="font-display text-xl text-[color:var(--dashboard-ink)]"
                                data-testid="deferred-stuff"
                            >
                                {data}
                            </h3>
                        )}
                    />
                </Suspense>
                <div class="text-sm text-slate-600">Count: {count()}</div>
                <div>
                    <button
                        onClick={() => setCount(count() + 1)}
                        class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-white"
                    >
                        Increment
                    </button>
                </div>
            </div>
        </div>
    );
}
