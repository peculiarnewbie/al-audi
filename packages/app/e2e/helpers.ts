import { execSync } from "node:child_process";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export function ab(...commands: string[]): string {
    const args = commands.map((c) => `'${c}'`).join(" ");
    return execSync(`agent-browser batch --json ${args}`, {
        encoding: "utf-8",
        timeout: 30_000,
    });
}

export function abOpen(url: string) {
    return ab(`["open", "${url}"]`);
}

export function abClick(ref: string) {
    return ab(`["click", "${ref}"]`);
}

export function abFill(ref: string, value: string) {
    return ab(`["fill", "${ref}", "${value}"]`);
}

export function abType(ref: string, value: string) {
    return ab(`["type", "${ref}", "${value}"]`);
}

export function abSnapshot(interactive = true) {
    const flag = interactive ? " -i" : "";
    return ab(`["snapshot"${flag}]`);
}

export function abScreenshot(path?: string) {
    const arg = path ? ` "${path}"` : "";
    return ab(`["screenshot"${arg}]`);
}

export function abWaitForText(text: string) {
    return ab(`["wait", "--text", "${text}"]`);
}

export function abWaitForUrl(pattern: string) {
    return ab(`["wait", "--url", "${pattern}"]`);
}

export function abGetText(ref: string) {
    return ab(`["get", "text", "${ref}"]`);
}

export function abPress(key: string) {
    return ab(`["press", "${key}"]`);
}

export function abClose() {
    try {
        ab('["close"]');
    } catch {
        // Ignore errors on close
    }
}

export function abEval(js: string) {
    return ab(`["eval", "${js}"]`);
}

export function baseUrl(path: string = "") {
    return `${BASE_URL}${path}`;
}
