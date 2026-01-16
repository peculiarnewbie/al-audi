import { createSignal, createMemo } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import { en } from "./en";
import { id } from "./id";

export type Locale = "en" | "id";

const dictionaries = {
    en: en,
    id: id,
};

function detectLocale(): Locale {
    if (typeof window === "undefined") return "id";

    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored && (stored === "en" || stored === "id")) {
        return stored;
    }

    const browserLang = navigator.language.split("-")[0];
    if (browserLang === "id" || browserLang === "in") {
        return "id";
    }

    return "id";
}

export const [locale, setLocale] = createSignal<Locale>(detectLocale());

export const dict = createMemo(() => i18n.flatten(dictionaries[locale()]));

export const t = (key: string, params?: Record<string, string | number>) =>
    i18n.translator(() => dict() as any)(key, params);

export function setLocaleWithStorage(newLocale: Locale) {
    if (typeof window !== "undefined") {
        localStorage.setItem("locale", newLocale);
    }
    setLocale(newLocale);
}
