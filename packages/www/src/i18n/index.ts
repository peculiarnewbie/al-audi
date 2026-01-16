import { createSignal, createMemo, createResource } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import type * as en from "./en";
import type * as id from "./id";

export type Locale = "en" | "id";

async function fetchDictionary(locale: Locale): Promise<en.Dict> {
    const dict: en.Dict = (await import(`./${locale}.ts`)).dict;
    return i18n.flatten(dict);
}

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

export const [locale, setLocale] = createSignal<Locale>("en");

const [dict] = createResource(locale, fetchDictionary);

export const t = i18n.translator(dict);

export function setLocaleWithStorage(newLocale: Locale) {
    if (typeof window !== "undefined") {
        localStorage.setItem("locale", newLocale);
    }
    setLocale(newLocale);
}
