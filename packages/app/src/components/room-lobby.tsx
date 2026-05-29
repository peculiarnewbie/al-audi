import {
    Show,
    For,
    Component,
    createSignal,
    createEffect,
    onMount,
} from "solid-js";
import type { Player } from "~/game/schemas";

export const RoomLobby: Component<{
    roomId: string;
    playerId: string | null;
    name: string;
    setName: (name: string) => void;
    players: Player[];
    isHost: boolean;
    isJoined: boolean;
    onJoin: (name: string) => void;
    onLeave: () => void;
    onStart: () => void;
}> = (props) => {
    const [isEditing, setIsEditing] = createSignal(false);
    let inputRef: HTMLInputElement | undefined;

    onMount(() => {
        if (!props.isJoined) setIsEditing(true);
    });

    createEffect(() => {
        if (isEditing()) {
            inputRef?.focus();
        }
    });

    const handleRenameClick = () => {
        setIsEditing(true);
    };

    const handleSaveName = () => {
        if (props.name) {
            props.onJoin(props.name);
            setIsEditing(false);
        }
    };

    return (
        <div class="mx-auto max-w-3xl px-6 py-12">
            <div class="glass-panel p-6 space-y-4">
                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Live room
                </div>
                <h1 class="font-display text-2xl font-semibold text-[color:var(--dashboard-ink)]">
                    Room: {props.roomId}
                </h1>
                <Show when={props.playerId}>
                    <p class="text-sm text-slate-500">ID: {props.playerId}</p>
                </Show>

                <div class="space-y-3">
                    <div class="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Your name"
                            value={props.name}
                            onInput={(e) =>
                                props.setName(e.currentTarget.value)
                            }
                            disabled={!isEditing()}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && props.name) {
                                    handleSaveName();
                                }
                            }}
                            class="flex-1 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--dashboard-accent)] disabled:opacity-50"
                        />
                        <Show
                            when={props.isJoined}
                            fallback={
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        props.name && props.onJoin(props.name);
                                    }}
                                    disabled={!props.name}
                                    class="rounded-full bg-[color:var(--dashboard-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:opacity-60"
                                >
                                    Join
                                </button>
                            }
                        >
                            <Show
                                when={isEditing()}
                                fallback={
                                    <button
                                        onClick={handleRenameClick}
                                        class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-white"
                                    >
                                        Rename
                                    </button>
                                }
                            >
                                <button
                                    onClick={handleSaveName}
                                    disabled={!props.name}
                                    class="rounded-full bg-[color:var(--dashboard-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:opacity-60"
                                >
                                    Save
                                </button>
                            </Show>
                        </Show>
                    </div>
                    <div class="flex gap-2">
                        <Show
                            when={!props.isJoined}
                            fallback={
                                <button
                                    onClick={() => {
                                        props.onLeave();
                                        setIsEditing(true);
                                    }}
                                    class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-white"
                                >
                                    Leave
                                </button>
                            }
                        >
                            <button
                                onClick={props.onLeave}
                                class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-white"
                            >
                                Cancel
                            </button>
                        </Show>
                        <Show when={props.isHost}>
                            <button
                                onClick={props.onStart}
                                disabled={props.players.length < 2}
                                class="rounded-full bg-[color:var(--dashboard-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:opacity-60"
                            >
                                Start
                            </button>
                        </Show>
                    </div>

                    <div class="border-t border-white/70 pt-3 mt-4">
                        <h2 class="font-semibold text-[color:var(--dashboard-ink)] mb-2">
                            Players ({props.players.length})
                        </h2>
                        <Show when={props.isHost}>
                            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                                Host
                            </span>
                        </Show>
                        <ul class="space-y-1 mt-2">
                            <For each={props.players}>
                                {(p) => (
                                    <li class="flex items-center gap-2">
                                        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-xs text-slate-600">
                                            {p.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span class="text-sm text-slate-700">
                                            {p.name}
                                            {p.id === props.playerId && (
                                                <span class="text-slate-400 text-xs">
                                                    {" "}
                                                    (You)
                                                </span>
                                            )}
                                        </span>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
