import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, ImageBackground,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Brand } from '@/constants/brand';
import { BottomNavBar } from '@/components/BottomNavBar';

const BG = require('../../../assets/background.png');

const HUB_BUTTONS = [
  { label: 'YOUR PEOPLE', icon: 'people-outline', route: '/people'         },
  { label: 'SEND A GIFT', icon: 'gift-outline',   route: '/send/recipient' },
  { label: 'YOUR GIFTS',  icon: 'list-outline',   route: '/gifts'          },
  { label: 'YOU',         icon: 'person-outline', route: '/profile'        },
] as const;

interface UpcomingContact { id: string; display_name: string; days: number }

function daysUntilBirthday(birthday: string): number {
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [, m, d] = birthday.split('-').map(Number);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < todayMid) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.ceil((next.getTime() - todayMid.getTime()) / 86400000);
}

export default function HomeScreen() {
  const router = useRouter();
  const [upcoming, setUpcoming]       = useState<UpcomingContact | null>(null);
  const [momentLoading, setMomentLoading] = useState(true);
  const [hasContacts, setHasContacts] = useState(true);

  // Refetch every time the screen gains focus so a just-added contact shows up
  useFocusEffect(
    useCallback(() => {
      supabase
        .from('recipient_contacts')
        .select('id, display_name, birthday')
        .not('birthday', 'is', null)
        .then(({ data }) => {
          if (!data || data.length === 0) {
            setHasContacts(false);
            setMomentLoading(false);
            return;
          }
          let soonest: UpcomingContact | null = null;
          for (const c of data) {
            if (!c.birthday) continue;
            const days = daysUntilBirthday(c.birthday);
            if (days <= 30 && (!soonest || days < soonest.days)) {
              soonest = { id: c.id, display_name: c.display_name, days };
            }
          }
          setUpcoming(soonest);
          setMomentLoading(false);
        });
    }, [])
  );

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Contextual moment card ── */}
          <View style={styles.momentCard}>
            {momentLoading ? (
              <ActivityIndicator color={Brand.gold} size="small" />
            ) : upcoming ? (
              <View style={styles.momentRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.momentEyebrow}>YOUR MOMENT</Text>
                  <Text style={styles.momentText}>
                    {upcoming.display_name}'s birthday is in{' '}
                    <Text style={styles.momentGold}>
                      {upcoming.days === 0 ? 'today 🎂' : `${upcoming.days}d`}
                    </Text>
                  </Text>
                </View>
                {/* REPLACE WITH CUSTOM ASSET LATER */}
                <TouchableOpacity
                  style={styles.momentBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/send/recipient',
                      params: { prefilledId: upcoming.id, prefilledName: upcoming.display_name },
                    })
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.momentBtnText}>Send Gift</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.momentEmpty}>
                Add someone to Your People to never miss a moment
              </Text>
            )}
          </View>

          {/* ── Wordmark ── */}
          <View style={styles.wordmarkBlock}>
            <Text style={styles.wordmark}>DeLacroix</Text>
            <Text style={styles.tagline}>it's from the heart</Text>
            <View style={styles.divider} />
          </View>

          {/* ── 2×2 hub grid ── */}
          <View style={styles.grid}>
            {HUB_BUTTONS.map(btn => (
              // REPLACE WITH CUSTOM ASSET LATER
              <TouchableOpacity
                key={btn.route}
                style={styles.hubBtn}
                onPress={() => router.push(btn.route)}
                activeOpacity={0.7}
              >
                <Ionicons name={btn.icon} size={34} color="#D4AF37" />
                <Text style={styles.hubLabel}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <BottomNavBar />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: 20, paddingTop: 8, gap: 24, paddingBottom: 48 },

  momentCard: {
    backgroundColor: 'rgba(28, 43, 30, 0.78)',
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.35)',
    borderRadius: 14, padding: 16, minHeight: 62, justifyContent: 'center',
  },
  momentRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  momentEyebrow:  { color: 'rgba(212,175,55,0.55)', fontSize: 10, letterSpacing: 1.5 },
  momentText:     { color: Brand.cream, fontSize: 15, lineHeight: 21 },
  momentGold:     { color: Brand.gold, fontWeight: '700' },
  momentEmpty:    { color: Brand.muted, fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  momentBtn:      { backgroundColor: '#D4AF37', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  momentBtnText:  { color: '#1B3A2B', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  wordmarkBlock: { alignItems: 'center', gap: 8 },
  wordmark:      { fontFamily: 'ui-serif', fontSize: 38, color: Brand.gold, letterSpacing: 3 },
  tagline:       { color: 'rgba(212,175,55,0.65)', fontSize: 13, fontStyle: 'italic', letterSpacing: 1 },
  divider:       { width: 48, height: 1, backgroundColor: 'rgba(212,175,55,0.4)', marginTop: 8 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  hubBtn: {
    width: '47.5%', height: 140,
    backgroundColor: 'rgba(212, 175, 55, 0.10)',
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.35)',
    borderRadius: 16, padding: 16,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  hubLabel: {
    color: Brand.gold, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, fontFamily: 'ui-serif',
  },
});
