import { ReactElement } from 'react';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import type { PaymentResult } from './payments';

// Native payment sheet. The sandbox publishable key wins while it exists;
// remove the _TEST env var to go live.
const PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST ||
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  '';

export function GiftStripeProvider({ children }: { children: ReactElement }) {
  return (
    <StripeProvider
      publishableKey={PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.delacroix.app"
    >
      {children}
    </StripeProvider>
  );
}

export function usePaymentSheet(): (clientSecret: string) => Promise<PaymentResult> {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  return async (clientSecret: string) => {
    const init = await initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      merchantDisplayName: 'DeLacroix',
      style: 'alwaysDark',
      returnURL: 'delacroix://stripe-redirect',
      applePay: { merchantCountryCode: 'US' },
      appearance: {
        colors: {
          primary: '#D4AF37',
          background: '#1C2B1E',
          componentBackground: '#243327',
          componentText: '#F5ECD7',
          primaryText: '#F5ECD7',
          secondaryText: '#9A8C7A',
          placeholderText: '#9A8C7A',
        },
      },
    });
    if (init.error) return { ok: false, error: init.error.message };

    const result = await presentPaymentSheet();
    if (result.error) {
      if (result.error.code === 'Canceled') return { ok: false, canceled: true };
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  };
}
