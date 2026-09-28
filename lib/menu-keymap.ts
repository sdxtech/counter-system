export type MenuKeyBinding = { menu_item_id: string; numpad_digit: number };

export const NUMPAD_DIGITS = Array.from({ length: 10 }, (_, digit) => digit);

// Physical numpad keys also keep these codes when Num Lock is off.
export function getNumpadDigit(code: string): number | null {
  return /^Numpad[0-9]$/.test(code) ? Number(code.slice(-1)) : null;
}
