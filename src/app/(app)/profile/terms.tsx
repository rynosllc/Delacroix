import { View, StyleSheet, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { BottomNavBar } from '@/components/BottomNavBar';
import { Lux, SERIF, T, LuxRow, LuxBackHeader } from '@/components/lux';

const BG = require('../../../../assets/background.png');

const DOCS = [
  { label: 'Privacy Policy', icon: 'shield-checkmark-outline' as const, url: 'https://delacroix.expo.app/privacy.html' },
  { label: 'Terms of Use',   icon: 'document-text-outline' as const,    url: 'https://delacroix.expo.app/terms.html' },
];

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <LuxBackHeader onBack={() => router.back()} title="Terms & Privacy" />

          <View style={styles.content}>
            <T style={styles.sub}>
              How DeLacroix handles your information, and the terms you agree to
              by using it.
            </T>

            {DOCS.map(doc => (
              <LuxRow
                key={doc.url}
                icon={doc.icon}
                title={doc.label}
                onPress={() => WebBrowser.openBrowserAsync(doc.url)}
              />
            ))}

            <T style={styles.contact}>Questions? Contact us at ismael@rynosops.com</T>
          </View>
        </View>
        <BottomNavBar />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, gap: 12, paddingTop: 6 },
  sub: {
    color: Lux.muted, fontSize: 15, lineHeight: 22, fontStyle: 'italic',
    fontFamily: SERIF, textAlign: 'center', marginBottom: 8,
  },
  contact: { color: Lux.muted, fontSize: 13, textAlign: 'center', marginTop: 10 },
});
