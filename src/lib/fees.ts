// The sender covers card processing in full: the total is grossed up so that
// after Stripe's 2.9% + 30¢ the gift amount is left whole.
// Keep in sync with supabase/functions/create-gift (the server is the
// authority on what is actually charged).

function stripeFee(totalCents: number): number {
  return Math.round(totalCents * 0.029) + 30;
}

export function totalWithFeeCents(giftCents: number): number {
  let total = Math.ceil((giftCents + 30) / (1 - 0.029));
  while (total - stripeFee(total) < giftCents) total += 1;
  while (total - 1 - stripeFee(total - 1) >= giftCents) total -= 1;
  return total;
}

export function calcFee(amount: number): { fee: number; total: number } {
  const giftCents = Math.round(amount * 100);
  if (giftCents <= 0) return { fee: 0, total: 0 };
  const totalCents = totalWithFeeCents(giftCents);
  return { fee: (totalCents - giftCents) / 100, total: totalCents / 100 };
}
