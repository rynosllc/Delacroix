import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/context/auth';
import { GiftStripeProvider } from '@/lib/payments';

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    // Public routes — no account required: recipient claim pages, and the
    // password-reset landing page (its session arrives via the URL hash).
    const inPublicRoute = segments[0] === 'claim' || segments[0] === 'reset-password';

    if (inPublicRoute) return;

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [session, loading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GiftStripeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </GiftStripeProvider>
  );
}
