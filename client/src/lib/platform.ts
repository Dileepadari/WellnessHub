/**
 * Which modifier key this machine uses for application shortcuts.
 *
 * The palette shortcut handler accepts either Meta or Control, so it works
 * everywhere. The hint beside the search button did not: it was hard-coded to
 * the Mac symbol, which told every Linux and Windows user the wrong key.
 */

/** Reads the platform without touching the deprecated navigator.platform first. */
export function isApplePlatform(nav: Navigator = navigator): boolean {
  const modern = (nav as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const name = modern?.platform ?? nav.platform ?? '';
  return /mac|iphone|ipad|ipod/i.test(name);
}

/** The label to print for the primary shortcut modifier, e.g. "Ctrl" or "Cmd". */
export function shortcutModifier(nav: Navigator = navigator): string {
  return isApplePlatform(nav) ? 'Cmd' : 'Ctrl';
}
