import { useCallback, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, ImageBackground, Animated,
  Platform, Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
import { BottomNavBar } from '@/components/BottomNavBar';

const BG = require('../../../assets/background.png');
const WORDMARK = require('../../../assets/images/ui/wordmark.png');
const SQUARE = require('../../../assets/images/ui/square.png');

const HUB_BUTTONS = [
  { label: 'YOUR PEOPLE', icon: 'people-outline', route: '/people'         },
  { label: 'SEND A GIFT', icon: 'gift-outline',   route: '/send/recipient' },
  { label: 'YOUR GIFTS',  icon: 'list-outline',   route: '/gifts'          },
  { label: 'YOU',         icon: 'person-outline', route: '/profile'        },
] as const;

interface UpcomingContact { id: string; display_name: string; days: number }

// Fête days: Valentine's and Bastille Day get the French tagline and a
// slightly warmer gold — unannounced, just there for a day.
function isFeteDay(): boolean {
  const now = new Date();
  const m = now.getMonth() + 1, d = now.getDate();
  return (m === 2 && d === 14) || (m === 7 && d === 14);
}

function isTodayMonthDay(isoDate: string): boolean {
  const [, m, d] = isoDate.split('-').map(Number);
  const now = new Date();
  return m === now.getMonth() + 1 && d === now.getDate();
}

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
  const { user } = useAuth();
  const [upcoming, setUpcoming]       = useState<UpcomingContact | null>(null);
  const [momentLoading, setMomentLoading] = useState(true);
  const [hasContacts, setHasContacts] = useState(true);
  const [ownBirthday, setOwnBirthday] = useState(false);
  const fete = isFeteDay();

  // Wordmark heart: five quiet taps on "DeLacroix" tie the divider into a
  // gold heart for a moment, then let it go.
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dividerScale = useRef(new Animated.Value(1)).current;
  const heartScale   = useRef(new Animated.Value(0)).current;

  function onWordmarkTap() {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1600);
    if (tapCount.current < 5) return;
    tapCount.current = 0;
    // Restart cleanly even if a previous play was interrupted
    dividerScale.stopAnimation();
    heartScale.stopAnimation();
    dividerScale.setValue(1);
    heartScale.setValue(0);
    Animated.sequence([
      Animated.timing(dividerScale, { toValue: 0, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(heartScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(1500),
      Animated.timing(heartScale, { toValue: 0, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(dividerScale, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }

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

      // The sender's own birthday flips the moment card for the day
      if (user) {
        supabase
          .from('users')
          .select('birthday')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setOwnBirthday(!!data?.birthday && isTodayMonthDay(data.birthday));
          });
      }
    }, [user?.id])
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
            ) : ownBirthday ? (
              <View style={{ gap: 4 }}>
                <Text style={styles.momentEyebrow}>YOUR MOMENT</Text>
                <Text style={styles.momentText}>
                  It's your moment today.{' '}
                  <Text style={styles.momentGold}>Someone should be gifting you.</Text> 🎂
                </Text>
              </View>
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
            <TouchableOpacity onPress={onWordmarkTap} activeOpacity={1}>
              <Image source={WORDMARK} style={styles.wordmarkImage} resizeMode="contain" />
            </TouchableOpacity>
            {fete && <Text style={styles.tagline}>c’est du fond du cœur</Text>}
            <View style={styles.dividerSlot}>
              <Animated.View style={[styles.divider, { transform: [{ scaleX: dividerScale }] }]} />
              <Animated.View
                style={[styles.dividerHeart, { transform: [{ scale: heartScale }] }]}
                pointerEvents="none"
              >
                <Ionicons name="heart" size={16} color={Brand.gold} />
              </Animated.View>
            </View>
          </View>

          {/* ── 2×2 hub grid ── */}
          <View style={styles.grid}>
            {HUB_BUTTONS.map(btn => (
              <TouchableOpacity
                key={btn.route}
                onPress={() => router.push(btn.route)}
                activeOpacity={0.7}
                style={styles.hubBtnTouch}
              >
                <ImageBackground
                  source={SQUARE}
                  style={styles.hubBtn}
                  imageStyle={styles.hubBtnImage}
                  resizeMode="stretch"
                >
                  <Ionicons name={btn.icon} size={34} color="#D4AF37" />
                  <Text
                    style={styles.hubLabel}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.15}
                  >
                    {btn.label}
                  </Text>
                </ImageBackground>
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
  // flexGrow + space-evenly spreads the three blocks through the available
  // height so the screen doesn't sit top-heavy above the nav pill
  scroll: {
    padding: 20, paddingTop: 8, paddingBottom: 24,
    gap: 24, flexGrow: 1, justifyContent: 'space-evenly',
  },

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
  wordmarkImage: { width: 280, height: 75 },
  tagline:       { color: 'rgba(212,175,55,0.65)', fontSize: 13, fontStyle: 'italic', letterSpacing: 1 },
  dividerSlot:   { height: 18, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  divider:       { width: 48, height: 1, backgroundColor: 'rgba(212,175,55,0.4)' },
  dividerHeart:  { position: 'absolute' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 22 },
  hubBtnTouch: { width: '47.5%' },
  hubBtn: {
    height: 168,
    // The gem frame occupies ~13% of each edge of the artwork — keep the
    // icon + label group well inside the stitched leather area.
    padding: 26,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  hubBtnImage: { width: '100%', height: '100%' },
  hubLabel: {
    color: Brand.gold, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, fontFamily: 'ui-serif',
  },
});
