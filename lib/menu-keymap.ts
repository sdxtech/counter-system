export type MenuKeyBinding = { menu_position: number; numpad_digit: number };

export const MAX_MENU_POSITIONS = 6;
export const MENU_POSITIONS = Array.from({ length: MAX_MENU_POSITIONS }, (_, index) => index + 1);

export const NUMPAD_DIGITS = Array.from({ length: 10 }, (_, digit) => digit);

// Physical numpad keys also keep these codes when Num Lock is off.
export function getNumpadDigit(code: string): number | null {
  return /^Numpad[0-9]$/.test(code) ? Number(code.slice(-1)) : null;
}
