import { translator } from "@solid-primitives/i18n";
import { createFileRoute } from "@tanstack/solid-router";
import { createResource, createSignal, For, Show } from "solid-js";
import { setLocaleWithStorage, Locale, fetchDictionary } from "~/i18n";

export const Route = createFileRoute("/")({
    component: Index,
});

function Header(props: {
    locale: Locale;
    setLocale: (locale: Locale) => void;
}) {
    return (
        <header class="mx-auto flex max-w-6xl justify-end px-6 pt-6">
            <div class="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                <button
                    onClick={() => setLocaleWithStorage("en", props.setLocale)}
                    class={
                        props.locale === "en"
                            ? "text-slate-900"
                            : "hover:text-slate-900"
                    }
                >
                    EN
                </button>
                <span class="text-slate-300">•</span>
                <button
                    onClick={() => setLocaleWithStorage("id", props.setLocale)}
                    class={
                        props.locale === "id"
                            ? "text-slate-900"
                            : "hover:text-slate-900"
                    }
                >
                    ID
                </button>
            </div>
        </header>
    );
}

function Index() {
    const [locale, setLocale] = createSignal<Locale>("en");

    const [dict] = createResource(locale, fetchDictionary);

    const t = translator(dict);

    return (
        <div class="min-h-screen">
            <Header locale={locale()} setLocale={setLocale} />

            <section class="mx-auto max-w-4xl px-6 py-16 text-center">
                <h1 class="font-display text-4xl text-[color:var(--dashboard-ink)] md:text-5xl mb-6">
                    {t("heroTitle")}
                </h1>
                <p class="text-slate-600 mb-10 text-lg">{t("heroSubtitle")}</p>
                <a
                    href="http://wa.me/6282160421987"
                    target="_blank"
                    class="inline-block rounded-full bg-[color:var(--dashboard-accent)] px-8 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]"
                >
                    {t("ctaWhatsApp")}
                </a>
                <a
                    href="#location"
                    class="inline-block px-6 py-4 text-lg font-medium text-slate-600 transition hover:text-slate-900"
                >
                    {t("ctaVisit")}
                </a>
            </section>

            <section class="mx-auto max-w-5xl px-6 py-12">
                <h2 class="font-display text-2xl text-[color:var(--dashboard-ink)] mb-8 text-center">
                    {t("galleryTitle")}
                </h2>
                <div class="glass-panel p-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Show when={true}>
                            <For each={[1, 2, 3, 4, 5, 6]}>
                                {() => (
                                    <div class="aspect-square rounded-2xl border border-white/70 bg-white/70 text-slate-400 flex items-center justify-center">
                                        Photo
                                    </div>
                                )}
                            </For>
                        </Show>
                    </div>
                </div>
                <div class="mt-8 flex justify-center gap-8 text-sm text-slate-600">
                    <a
                        href="https://instagram.com"
                        target="_blank"
                        class="hover:text-slate-900"
                    >
                        {t("socialInstagram")}
                    </a>
                    <a
                        href="http://wa.me/6282160421987"
                        target="_blank"
                        class="hover:text-slate-900"
                    >
                        {t("socialWhatsApp")}
                    </a>
                    <a
                        href="https://youtube.com"
                        target="_blank"
                        class="hover:text-slate-900"
                    >
                        {t("socialYouTube")}
                    </a>
                </div>
            </section>

            <section id="location" class="mx-auto max-w-4xl px-6 py-16">
                <h2 class="font-display text-2xl text-[color:var(--dashboard-ink)] mb-4 text-center">
                    {t("locationTitle")}
                </h2>
                <p class="text-slate-600 text-center mb-8">
                    {t("locationAddress")}
                </p>
                <div class="glass-panel p-6">
                    <div class="aspect-[4/3] rounded-2xl border border-white/70 bg-white/70 flex items-center justify-center text-slate-400">
                        Google Maps Embed
                    </div>
                </div>
            </section>

            <footer class="mx-auto max-w-5xl px-6 pb-16">
                <div class="glass-panel p-10 text-center">
                    <p class="mb-2">{t("footerEmail")}</p>
                    <p class="text-slate-500 text-sm">{t("footerCopyright")}</p>
                </div>
            </footer>
        </div>
    );
}
