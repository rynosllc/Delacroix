import { useLocalSearchParams } from 'expo-router';
import { ClaimScreen } from '@/components/ClaimScreen';

// Original link shape (/claim/<token>) — still honoured for gifts already sent.
export default function ClaimByPath() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <ClaimScreen token={token} />;
}
