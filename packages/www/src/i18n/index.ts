import { createSignal, createMemo, createResource } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import type * as en from "./en";
import type * as id from "./id";

export type Locale = "en" | "id";

const dictionaries = import.meta.glob("./*.ts");

export async function fetchDictionary(locale: Locale): Promise<en.Dict> {
    const dictionaryImport = dictionaries[`./${locale}.ts`];

    if (!dictionaryImport) {
        throw new Error(`Missing dictionary for locale: ${locale}`);
    }

    const dictModule = (await dictionaryImport()) as { dict: en.Dict };
    return i18n.flatten(dictModule.dict);
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

export function setLocaleWithStorage(
    newLocale: Locale,
    callback: (locale: Locale) => void,
) {
    if (typeof window !== "undefined") {
        localStorage.setItem("locale", newLocale);
    }
    callback(newLocale);
}
