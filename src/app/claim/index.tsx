import { useLocalSearchParams } from 'expo-router';
import { ClaimScreen } from '@/components/ClaimScreen';

// Current link shape (/claim?t=<token>). This is a real static page, so it
// answers with HTTP 200 and its preview tags — which is what lets Messages
// show the gift card when the sender texts the link.
export default function ClaimByQuery() {
  const { t } = useLocalSearchParams<{ t?: string }>();
  return <ClaimScreen token={typeof t === 'string' ? t : undefined} />;
}
