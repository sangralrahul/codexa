/** Window events the app chrome listens for (so any component can open these without props). */
export const COMMAND_MENU_EVENT = "codexa:command-menu";
export const SHORTCUTS_EVENT = "codexa:shortcuts";

/** Opens the ⌘K command menu. */
export function openCommandMenu() {
  window.dispatchEvent(new CustomEvent(COMMAND_MENU_EVENT));
}

/** Opens the keyboard shortcuts sheet. */
export function openShortcuts() {
  window.dispatchEvent(new CustomEvent(SHORTCUTS_EVENT));
}
