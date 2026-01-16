import { createFileRoute } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { t, locale, setLocaleWithStorage } from "~/utils/i18n";

export const Route = createFileRoute("/")({
    component: Index,
});

function Header() {
    return (
        <header class="flex justify-end px-6 py-4">
            <div class="flex gap-3 text-stone-600 text-sm">
                <button
                    onClick={() => setLocaleWithStorage("en")}
                    class={
                        locale() === "en"
                            ? "text-stone-900 font-medium cursor-pointer"
                            : "hover:text-stone-900 cursor-pointer"
                    }
                >
                    EN
                </button>
                <span class="text-stone-300">|</span>
                <button
                    onClick={() => setLocaleWithStorage("id")}
                    class={
                        locale() === "id"
                            ? "text-stone-900 font-medium cursor-pointer"
                            : "hover:text-stone-900 cursor-pointer"
                    }
                >
                    ID
                </button>
            </div>
        </header>
    );
}

function Index() {
    return (
        <div class="min-h-screen bg-[#FDFBF7]">
            <Header />

            <section class="max-w-4xl mx-auto px-6 py-16 text-center">
                <h1 class="font-serif text-4xl md:text-5xl text-stone-800 mb-6">
                    {t("heroTitle")}
                </h1>
                <p class="text-stone-600 mb-10 text-lg">{t("heroSubtitle")}</p>
                <a
                    href="http://wa.me/6282160421987"
                    target="_blank"
                    class="inline-block bg-stone-800 text-white px-8 py-4 rounded-lg font-medium text-lg hover:bg-stone-700 transition-colors"
                >
                    {t("ctaWhatsApp")}
                </a>
                <a
                    href="#location"
                    class="inline-block text-stone-600 px-6 py-4 font-medium text-lg hover:text-stone-900 transition-colors"
                >
                    {t("ctaVisit")}
                </a>
            </section>

            <section class="max-w-5xl mx-auto px-6 py-12">
                <h2 class="font-serif text-2xl text-stone-800 mb-8 text-center">
                    {t("galleryTitle")}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Show when={true}>
                        <For each={[1, 2, 3, 4, 5, 6]}>
                            {() => (
                                <div class="aspect-square bg-stone-200 rounded-lg flex items-center justify-center text-stone-400">
                                    Photo
                                </div>
                            )}
                        </For>
                    </Show>
                </div>
                <div class="flex justify-center gap-8 text-stone-600 text-sm">
                    <a
                        href="https://instagram.com"
                        target="_blank"
                        class="hover:text-stone-900"
                    >
                        {t("socialInstagram")}
                    </a>
                    <a
                        href="http://wa.me/6282160421987"
                        target="_blank"
                        class="hover:text-stone-900"
                    >
                        {t("socialWhatsApp")}
                    </a>
                    <a
                        href="https://youtube.com"
                        target="_blank"
                        class="hover:text-stone-900"
                    >
                        {t("socialYouTube")}
                    </a>
                </div>
            </section>

            <section id="location" class="max-w-4xl mx-auto px-6 py-16">
                <h2 class="font-serif text-2xl text-stone-800 mb-4 text-center">
                    {t("locationTitle")}
                </h2>
                <p class="text-stone-600 text-center mb-8">
                    {t("locationAddress")}
                </p>
                <div class="aspect-[4/3] bg-stone-200 rounded-lg flex items-center justify-center text-stone-400 mb-8">
                    Google Maps Embed
                </div>
            </section>

            <footer class="bg-stone-800 text-stone-300 py-12 mt-12">
                <div class="max-w-4xl mx-auto px-6 text-center">
                    <p class="mb-2">{t("footerEmail")}</p>
                    <p class="text-stone-500 text-sm">{t("footerCopyright")}</p>
                </div>
            </footer>
        </div>
    );
}
