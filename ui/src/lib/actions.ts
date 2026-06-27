/**
 * Tiny in-app action bus. Both the native OS menu (via Tauri "fv-menu" events,
 * bridged in App) and the in-window menu bar dispatch the same action ids here,
 * so there is one place that handles each command.
 */
export type FvActionId =
  | "menu_new" | "menu_import" | "menu_settings" | "menu_lock"
  | "menu_manual" | "menu_shortcuts" | "menu_about";

export function fvAction(id: string) {
  window.dispatchEvent(new CustomEvent("fv-action", { detail: id }));
}

export function onFvAction(cb: (id: string) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent).detail as string);
  window.addEventListener("fv-action", handler);
  return () => window.removeEventListener("fv-action", handler);
}
