// A cash amount whose digits are all the same — $5.55, $77.77, $999 —
// counts as a lucky number and earns a quiet sparkle in the send flow.
export function isLuckyAmount(amountStr: string): boolean {
  const digits = (amountStr ?? '').replace(/\D/g, '');
  return digits.length >= 2 && /^(\d)\1+$/.test(digits) && parseFloat(amountStr) >= 5;
}
