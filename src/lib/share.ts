import { Linking, Platform, Share } from 'react-native';

// Gifts travel as a link the sender texts from their own phone.
// The /claim/?t= form is a real static page (HTTP 200), which is what lets
// Messages show a link preview; /claim/<token> keeps working for older
// links. The slash before "?" matters: the host answers 404 without it.
const CLAIM_BASE = 'https://delacroix.expo.app/claim/?t=';

export function claimUrl(token: string): string {
  return `${CLAIM_BASE}${token}`;
}

export function giftMessage(token: string, opensOn?: Date | null): string {
  const link = claimUrl(token);
  if (opensOn && opensOn.getTime() > Date.now()) {
    const day = opensOn.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    return `I sent you something special 🎁 It opens on ${day}:\n${link}`;
  }
  return `I sent you something special 🎁 Open it here:\n${link}`;
}

function smsDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

// Opens Messages with the recipient and the gift text already filled in.
// Falls back to the share sheet when there is no usable number.
export async function textGift(phone: string | null | undefined, message: string): Promise<void> {
  const to = phone ? smsDigits(phone) : null;
  if (to && Platform.OS !== 'web') {
    const sep = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${to}${sep}body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // No SMS app (e.g. iPad without Messages) — use the share sheet instead
    }
  }
  await shareGift(message);
}

export async function shareGift(message: string): Promise<void> {
  await Share.share({ message }).catch(() => {});
}
