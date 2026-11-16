/**
 * Static demo build (GitHub Pages). Set by `npm run build:demo`; inlined at
 * build time, so the regular server build never ships demo code paths.
 */
export const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

/** Sub-path the static demo is served from, e.g. "/pre-wedding-photoshoot". Empty for the normal app. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix a root-relative public asset (like "/photos/06.jpg") with the base path. */
export const asset = (src: string) => (BASE_PATH && src.startsWith("/") && !src.startsWith(BASE_PATH + "/") ? BASE_PATH + src : src);

export const DEMO_MESSAGE = "This is a read-only demo with sample data — changes aren’t saved.";
