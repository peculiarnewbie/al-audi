import { createFileRoute, Link } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { createSignal, onMount } from "solid-js";

export const Route = createFileRoute("/room/")({
    component: RouteComponent,
});

function RouteComponent() {
    let ws: WebSocket;

    onMount(async () => {
        ws = new WebSocket("ws://localhost:3000/api/room/hey");
        ws.onmessage = (e) => {
            console.log(e.data);
        };
    });

    const connect = (name: string) => {
        ws.send(JSON.stringify({ user: name, data: { message: "hello" } }));
    };

    const [name, setName] = createSignal("");

    const [roomId, setRoomId] = createSignal("");

    const joinRoom = (e: Event) => {
        e.preventDefault();
        if (roomId()) {
            window.location.href = `/room/${roomId()}`;
        }
    };

    return (
        <div class="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-16">
            <h1 class="font-display text-4xl font-semibold text-[color:var(--dashboard-ink)] mb-8">
                Quiz Party
            </h1>
            <form onSubmit={joinRoom} class="glass-panel w-full space-y-4 p-6">
                <input
                    type="text"
                    placeholder="Enter room name"
                    value={roomId()}
                    onInput={(e) => setRoomId(e.currentTarget.value)}
                    class="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--dashboard-accent)]"
                />
                <button
                    type="submit"
                    disabled={!roomId()}
                    class="rounded-full bg-[color:var(--dashboard-accent)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Join Room
                </button>
            </form>
            <div class="mt-8 text-sm text-slate-500">
                <Link to="/home" class="hover:text-slate-800">
                    Demo Home
                </Link>
            </div>
        </div>
    );
}
