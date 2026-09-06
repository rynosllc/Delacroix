import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Brand } from '@/constants/brand';
import { BottomNavBar } from '@/components/BottomNavBar';

const BG = require('../../../../assets/background.png');

const DOCS = [
  { label: 'Privacy Policy', url: 'https://delacroix.expo.app/privacy.html' },
  { label: 'Terms of Use',   url: 'https://delacroix.expo.app/terms.html' },
];

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1 }}>
        <View style={[styles.content, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Terms & Privacy</Text>
          <Text style={styles.sub}>
            How DeLacroix handles your information, and the terms you agree to
            by using it.
          </Text>

          <View style={styles.card}>
            {DOCS.map((doc, i) => (
              <View key={doc.url}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => WebBrowser.openBrowserAsync(doc.url)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowLabel}>{doc.label}</Text>
                  <Text style={styles.rowChevron}>›</Text>
                </TouchableOpacity>
                {i < DOCS.length - 1 && <View style={styles.rowSep} />}
              </View>
            ))}
          </View>

          <Text style={styles.contact}>
            Questions? Contact us at ismael@rynosops.com
          </Text>
        </View>
        <BottomNavBar />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, gap: 16 },
  back:    { color: Brand.gold, fontSize: 16 },
  title:   { fontFamily: 'ui-serif', fontSize: 26, color: Brand.gold, letterSpacing: 1 },
  sub:     { color: Brand.cream, fontSize: 14, lineHeight: 20, opacity: 0.85 },

  card: {
    backgroundColor: 'rgba(36, 51, 39, 0.82)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 14, overflow: 'hidden', marginTop: 4,
  },
  row:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  rowLabel: { flex: 1, color: Brand.cream, fontSize: 15 },
  rowChevron: { color: Brand.gold, fontSize: 18 },
  rowSep:   { height: 1, backgroundColor: Brand.greenBorder, marginHorizontal: 16 },

  contact: { color: Brand.cream, fontSize: 13, opacity: 0.7, marginTop: 4 },
});
