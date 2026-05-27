import { Link, createFileRoute } from "@tanstack/solid-router";
import { fetchPost } from "../utils/posts";
import { NotFound } from "~/components/NotFound";
import { PostErrorComponent } from "~/components/PostError";

export const Route = createFileRoute("/posts/$postId")({
    loader: ({ params: { postId } }) => fetchPost({ data: postId }),
    errorComponent: PostErrorComponent,
    component: PostComponent,
    notFoundComponent: () => {
        return <NotFound>Post not found</NotFound>;
    },
});

function PostComponent() {
    const post = Route.useLoaderData();

    return (
        <div class="space-y-2 text-slate-600">
            <h4 class="font-display text-2xl font-semibold text-[color:var(--dashboard-ink)]">
                {post().title}
            </h4>
            <div class="text-sm">{post().body}</div>
            <Link
                to="/posts/$postId/deep"
                params={{
                    postId: String(post().id),
                }}
                activeProps={{ class: "text-slate-900 font-semibold" }}
                class="inline-block text-sm text-slate-900 underline"
            >
                Deep View
            </Link>
        </div>
    );
}
