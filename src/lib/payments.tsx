import { ReactNode } from 'react';

// Web fallback — @stripe/stripe-react-native is native-only, so on web the
// provider is a pass-through and the payment sheet reports unavailability.
// Metro picks payments.native.tsx on iOS/Android.

export function GiftStripeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export type PaymentResult = { ok: boolean; canceled?: boolean; error?: string };

export function usePaymentSheet(): (clientSecret: string) => Promise<PaymentResult> {
  return async () => ({
    ok: false,
    error: 'Cash gifts are sent from the DeLacroix iOS app.',
  });
}
