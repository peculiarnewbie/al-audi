import { Link, createFileRoute } from "@tanstack/solid-router";
import { fetchPost } from "../utils/posts";
import { PostErrorComponent } from "~/components/PostError";

export const Route = createFileRoute("/posts_/$postId/deep")({
    loader: async ({ params: { postId } }) =>
        fetchPost({
            data: postId,
        }),
    errorComponent: PostErrorComponent,
    component: PostDeepComponent,
});

function PostDeepComponent() {
    const post = Route.useLoaderData();

    return (
        <div class="space-y-2 text-slate-600">
            <Link
                to="/posts"
                class="inline-block text-sm text-slate-900 underline"
            >
                ← All Posts
            </Link>
            <h4 class="font-display text-2xl font-semibold text-[color:var(--dashboard-ink)]">
                {post().title}
            </h4>
            <div class="text-sm">{post().body}</div>
        </div>
    );
}
