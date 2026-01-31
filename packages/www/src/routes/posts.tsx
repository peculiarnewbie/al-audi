import { Link, Outlet, createFileRoute } from "@tanstack/solid-router";
import { fetchPosts } from "../utils/posts";

export const Route = createFileRoute("/posts")({
    loader: async () => fetchPosts(),
    component: PostsComponent,
});

function PostsComponent() {
    const posts = Route.useLoaderData();

    return (
        <div class="mx-auto max-w-5xl px-6 py-12 grid gap-6 lg:grid-cols-[260px_1fr]">
            <div class="glass-panel p-4">
                <div class="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">
                    Posts
                </div>
                <ul class="space-y-1">
                    {[
                        ...posts(),
                        { id: "i-do-not-exist", title: "Non-existent Post" },
                    ].map((post) => {
                        return (
                            <li class="whitespace-nowrap">
                                <Link
                                    to="/posts/$postId"
                                    params={{
                                        postId: String(post.id),
                                    }}
                                    class="block rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-white/70 hover:text-slate-900"
                                    activeProps={{
                                        class: "bg-white/90 text-slate-900 font-semibold",
                                    }}
                                >
                                    <div>{post.title.substring(0, 20)}</div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div class="glass-panel p-6 min-h-[200px]">
                <Outlet />
            </div>
        </div>
    );
}
