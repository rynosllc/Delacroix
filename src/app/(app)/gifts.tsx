import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '@/constants/brand';
import { BottomNavBar } from '@/components/BottomNavBar';

const BG = require('../../../assets/background.png');

const TABS = ['SENT', 'RECEIVED', 'SCHEDULED'] as const;
type Tab = typeof TABS[number];

const EMPTY_STATES: Record<Tab, { icon: string; text: string }> = {
  SENT:      { icon: '🎁', text: 'Your sent gifts will appear here' },
  RECEIVED:  { icon: '💝', text: 'Gifts sent to you will appear here' },
  SCHEDULED: { icon: '📅', text: 'Your scheduled gifts will appear here' },
};

export default function GiftsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('SENT');
  const { icon, text } = EMPTY_STATES[activeTab];

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1 }}>
        <View style={[styles.content, { paddingTop: insets.top }]}>

          <View style={styles.header}>
            <Text style={styles.title}>Your Gifts</Text>
          </View>

          {/* Tab bar */}
          <View style={styles.tabBar}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={styles.tabBtn}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                  {tab}
                </Text>
                {activeTab === tab && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Empty state */}
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{icon}</Text>
            <Text style={styles.emptyText}>{text}</Text>
          </View>

        </View>
        <BottomNavBar />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header:  { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title:   { fontFamily: 'ui-serif', fontSize: 26, color: Brand.gold, letterSpacing: 1 },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: Brand.greenBorder,
    marginHorizontal: 20, marginBottom: 8,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabLabel:       { color: Brand.muted,  fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  tabLabelActive: { color: Brand.gold },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: '15%', right: '15%',
    height: 2, backgroundColor: Brand.gold, borderRadius: 1,
  },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 },
  emptyIcon:  { fontSize: 44, opacity: 0.45 },
  emptyText:  { color: Brand.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
});
