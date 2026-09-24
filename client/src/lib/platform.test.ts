/**
 * Covers the modifier-key label across platforms.
 */
import { describe, it, expect } from 'vitest';
import { isApplePlatform, shortcutModifier } from './platform';

const nav = (platform: string, modern?: string) =>
  ({ platform, ...(modern ? { userAgentData: { platform: modern } } : {}) }) as Navigator;

describe('shortcutModifier', () => {
  it('names the Command key on a Mac', () => {
    expect(shortcutModifier(nav('MacIntel'))).toBe('Cmd');
  });

  it('names Control on Linux', () => {
    // The hint was hard-coded to the Mac symbol, so this was the wrong key for
    // most users even though the handler accepts either modifier.
    expect(shortcutModifier(nav('Linux x86_64'))).toBe('Ctrl');
  });

  it('names Control on Windows', () => {
    expect(shortcutModifier(nav('Win32'))).toBe('Ctrl');
  });

  it('prefers userAgentData over the deprecated platform string', () => {
    expect(isApplePlatform(nav('Linux x86_64', 'macOS'))).toBe(true);
    expect(isApplePlatform(nav('MacIntel', 'Windows'))).toBe(false);
  });

  it('treats iOS as Apple', () => {
    expect(isApplePlatform(nav('iPhone'))).toBe(true);
  });

  it('falls back to Control when the platform is unknown', () => {
    expect(shortcutModifier({} as Navigator)).toBe('Ctrl');
  });
});
