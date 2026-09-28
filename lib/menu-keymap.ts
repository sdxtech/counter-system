export type MenuKeyBinding = { menu_position: number; numpad_digit: number };

export const MAX_MENU_POSITIONS = 6;
export const MENU_POSITIONS = Array.from({ length: MAX_MENU_POSITIONS }, (_, index) => index + 1);

export const SHORTCUT_DIGITS = Array.from({ length: 10 }, (_, digit) => digit);

// Both physical digit rows share one mapping; modifiers are filtered by callers.
export function getTakeKeyDigit(code: string): number | null {
  return /^(?:Numpad|Digit)[0-9]$/.test(code) ? Number(code.slice(-1)) : null;
}
