import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/posts/")({
    component: PostsIndexComponent,
});

function PostsIndexComponent() {
    return <div class="text-sm text-slate-600">Select a post.</div>;
}
