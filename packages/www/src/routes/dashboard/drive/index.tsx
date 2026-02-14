import { createFileRoute } from "@tanstack/solid-router";
import { For, Show, createSignal } from "solid-js";
import {
    getDriveAssets,
    getDriveFolders,
    type DriveAsset,
    type DriveFolder,
} from "~/server/drive";

export const Route = createFileRoute("/dashboard/drive/")({
    loader: async () => {
        const [folders, assets] = await Promise.all([
            getDriveFolders(),
            getDriveAssets(),
        ]);

        return { folders: folders.folders, assets: assets.assets };
    },
    component: DrivePage,
});

const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes)) {
        return "N/A";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }

    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
};

const getFileBadge = (contentType: string) => {
    if (contentType.startsWith("image/")) {
        return "IMG";
    }

    if (contentType.startsWith("audio/")) {
        return "AUD";
    }

    if (contentType === "application/pdf") {
        return "PDF";
    }

    return "FILE";
};

function DrivePage() {
    const initialData = Route.useLoaderData();
    const [folders, setFolders] = createSignal<DriveFolder[]>(
        initialData().folders,
    );
    const [assets, setAssets] = createSignal<DriveAsset[]>(
        initialData().assets,
    );
    const [currentFolderId, setCurrentFolderId] = createSignal<string | null>(
        null,
    );
    const [breadcrumbs, setBreadcrumbs] = createSignal<
        { id: string | null; name: string }[]
    >([{ id: null, name: "Drive" }]);
    const [isUploading, setIsUploading] = createSignal(false);
    const [showNewFolderModal, setShowNewFolderModal] = createSignal(false);
    const [newFolderName, setNewFolderName] = createSignal("");
    const [selectedFile, setSelectedFile] = createSignal<DriveAsset | null>(
        null,
    );

    const filteredFolders = () => {
        const parentId = currentFolderId();
        return folders().filter((folder) => folder.parentId === parentId);
    };

    const filteredAssets = () => {
        const folderId = currentFolderId();
        return assets().filter((asset) => asset.folderId === folderId);
    };

    const refreshData = async () => {
        const [nextFolders, nextAssets] = await Promise.all([
            getDriveFolders(),
            getDriveAssets(),
        ]);

        setFolders(nextFolders.folders);
        setAssets(nextAssets.assets);
    };

    const navigateToFolder = (folderId: string | null, name: string) => {
        setCurrentFolderId(folderId);

        if (folderId === null) {
            setBreadcrumbs([{ id: null, name: "Drive" }]);
            return;
        }

        const current = breadcrumbs();
        const existingIndex = current.findIndex(
            (crumb) => crumb.id === folderId,
        );

        if (existingIndex >= 0) {
            setBreadcrumbs(current.slice(0, existingIndex + 1));
            return;
        }

        setBreadcrumbs([...current, { id: folderId, name }]);
    };

    const handleFileUpload = async (files: FileList) => {
        setIsUploading(true);

        for (const file of Array.from(files)) {
            const formData = new FormData();
            formData.append("file", file);

            if (currentFolderId()) {
                formData.append("folderId", currentFolderId()!);
            }

            await fetch("/api/drive/media", {
                method: "POST",
                body: formData,
            });
        }

        setIsUploading(false);
        await refreshData();
    };

    const handleCreateFolder = async () => {
        const name = newFolderName().trim();

        if (!name) {
            return;
        }

        const body: { name: string; parentId?: string } = { name };

        if (currentFolderId()) {
            body.parentId = currentFolderId()!;
        }

        await fetch("/api/drive/folders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        setNewFolderName("");
        setShowNewFolderModal(false);
        await refreshData();
    };

    const handleDeleteAsset = async (id: string) => {
        await fetch(`/api/drive/media/${id}`, { method: "DELETE" });
        await refreshData();
    };

    const handleDeleteFolder = async (id: string) => {
        await fetch(`/api/drive/folders/${id}`, { method: "DELETE" });
        await refreshData();
    };

    return (
        <div class="mx-auto max-w-6xl space-y-8 px-6 py-12">
            <header class="space-y-2">
                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Teacher workspace
                </div>
                <h1
                    class="text-3xl font-semibold text-[color:var(--dashboard-ink)]"
                    style={{ "font-family": "'Fraunces', serif" }}
                >
                    Drive
                </h1>
                <p class="text-slate-600">
                    Upload and organize teaching resources.
                </p>
            </header>

            <div class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur">
                <div class="mb-6 flex flex-wrap items-center gap-4">
                    <div class="flex flex-wrap gap-2">
                        <For each={breadcrumbs()}>
                            {(crumb, index) => (
                                <>
                                    <Show when={index() > 0}>
                                        <span class="text-slate-400">/</span>
                                    </Show>
                                    <button
                                        type="button"
                                        class="text-sm font-medium transition hover:text-[color:var(--dashboard-accent)]"
                                        onClick={() =>
                                            navigateToFolder(
                                                crumb.id,
                                                crumb.name,
                                            )
                                        }
                                    >
                                        {crumb.name}
                                    </button>
                                </>
                            )}
                        </For>
                    </div>
                </div>

                <div class="mb-6 flex flex-wrap gap-3">
                    <label class="cursor-pointer rounded-full bg-[color:var(--dashboard-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]">
                        <span>
                            {isUploading() ? "Uploading..." : "Upload files"}
                        </span>
                        <input
                            type="file"
                            class="hidden"
                            multiple
                            accept="image/*,audio/*,application/pdf"
                            onChange={(event) => {
                                if (event.target.files) {
                                    void handleFileUpload(event.target.files);
                                }
                            }}
                            disabled={isUploading()}
                        />
                    </label>
                    <button
                        type="button"
                        class="rounded-full border border-slate-200 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                        onClick={() => setShowNewFolderModal(true)}
                    >
                        New folder
                    </button>
                </div>

                <div class="space-y-2">
                    <Show
                        when={
                            filteredFolders().length || filteredAssets().length
                        }
                    >
                        <div class="grid gap-2">
                            <For each={filteredFolders()}>
                                {(folder) => (
                                    <div class="group flex items-center justify-between rounded-xl border border-white/70 bg-white/60 p-4 transition hover:bg-white/80">
                                        <button
                                            type="button"
                                            class="flex items-center gap-3 text-left"
                                            onClick={() =>
                                                navigateToFolder(
                                                    folder.id,
                                                    folder.name,
                                                )
                                            }
                                        >
                                            <span class="rounded-md bg-[color:var(--dashboard-wash)] px-2 py-1 text-xs font-semibold text-slate-600">
                                                FOLDER
                                            </span>
                                            <span class="font-medium text-[color:var(--dashboard-ink)]">
                                                {folder.name}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            class="rounded-full px-3 py-1 text-xs text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                                            onClick={() =>
                                                void handleDeleteFolder(
                                                    folder.id,
                                                )
                                            }
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </For>
                            <For each={filteredAssets()}>
                                {(asset) => (
                                    <div class="group flex items-center justify-between rounded-xl border border-white/70 bg-white/60 p-4 transition hover:bg-white/80">
                                        <button
                                            type="button"
                                            class="flex flex-1 items-center gap-3 text-left"
                                            onClick={() =>
                                                setSelectedFile(asset)
                                            }
                                        >
                                            <span class="rounded-md bg-[color:var(--dashboard-wash)] px-2 py-1 text-xs font-semibold text-slate-600">
                                                {getFileBadge(
                                                    asset.contentType,
                                                )}
                                            </span>
                                            <div>
                                                <div class="font-medium text-[color:var(--dashboard-ink)]">
                                                    {asset.fileName}
                                                </div>
                                                <div class="text-xs text-slate-500">
                                                    {formatFileSize(
                                                        asset.fileSize,
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            class="rounded-full px-3 py-1 text-xs text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                                            onClick={() =>
                                                void handleDeleteAsset(asset.id)
                                            }
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>

                    <Show
                        when={
                            !filteredFolders().length &&
                            !filteredAssets().length
                        }
                    >
                        <div class="py-12 text-center text-slate-500">
                            <div>This folder is empty</div>
                            <div class="mt-1 text-sm">
                                Upload files or create a folder to get started
                            </div>
                        </div>
                    </Show>
                </div>
            </div>

            <Show when={selectedFile()}>
                <div
                    class="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm"
                    onClick={() => setSelectedFile(null)}
                />
                <div class="fixed right-0 top-0 z-50 h-full w-80 border-l border-slate-200 bg-white/95 shadow-xl backdrop-blur">
                    <div class="flex h-full flex-col overflow-hidden">
                        <div class="flex items-center justify-between border-b border-slate-100 p-4">
                            <h2 class="truncate text-sm font-semibold text-[color:var(--dashboard-ink)]">
                                Details
                            </h2>
                            <button
                                type="button"
                                class="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                onClick={() => setSelectedFile(null)}
                            >
                                <svg
                                    class="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4">
                            <Show
                                when={selectedFile()!.contentType.startsWith(
                                    "image/",
                                )}
                            >
                                <div class="mb-4 overflow-hidden rounded-xl border border-slate-200">
                                    <img
                                        src={`/api/drive/media/${selectedFile()!.id}`}
                                        alt={selectedFile()!.fileName}
                                        class="h-auto w-full object-contain"
                                    />
                                </div>
                            </Show>
                            <div class="space-y-4">
                                <div>
                                    <div class="mb-1 text-xs uppercase tracking-wider text-slate-400">
                                        Name
                                    </div>
                                    <div class="break-all text-sm font-medium text-[color:var(--dashboard-ink)]">
                                        {selectedFile()!.fileName}
                                    </div>
                                </div>
                                <div>
                                    <div class="mb-1 text-xs uppercase tracking-wider text-slate-400">
                                        Size
                                    </div>
                                    <div class="text-sm text-[color:var(--dashboard-ink)]">
                                        {formatFileSize(
                                            selectedFile()!.fileSize,
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div class="mb-1 text-xs uppercase tracking-wider text-slate-400">
                                        Type
                                    </div>
                                    <div class="text-sm text-[color:var(--dashboard-ink)]">
                                        {selectedFile()!.contentType}
                                    </div>
                                </div>
                                <div>
                                    <div class="mb-1 text-xs uppercase tracking-wider text-slate-400">
                                        Uploaded
                                    </div>
                                    <div class="text-sm text-[color:var(--dashboard-ink)]">
                                        {new Date(
                                            selectedFile()!.createdAt,
                                        ).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </div>
                                </div>
                                <div class="pt-4">
                                    <a
                                        href={`/api/drive/media/${selectedFile()!.id}`}
                                        download={selectedFile()!.fileName}
                                        class="flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--dashboard-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]"
                                    >
                                        <svg
                                            class="h-4 w-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                            />
                                        </svg>
                                        Download
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>

            <Show when={showNewFolderModal()}>
                <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
                    <div class="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-xl">
                        <h2 class="mb-4 text-xl font-semibold text-[color:var(--dashboard-ink)]">
                            Create new folder
                        </h2>
                        <input
                            type="text"
                            placeholder="Folder name"
                            class="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-[color:var(--dashboard-ink)] placeholder-slate-400 focus:border-[color:var(--dashboard-accent)] focus:outline-none"
                            value={newFolderName()}
                            onInput={(event) =>
                                setNewFolderName(event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    void handleCreateFolder();
                                }
                            }}
                        />
                        <div class="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                class="rounded-full border border-slate-200 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                                onClick={() => setShowNewFolderModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                class="rounded-full bg-[color:var(--dashboard-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]"
                                onClick={() => void handleCreateFolder()}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}
