import { useCallback, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, ImageBackground, Animated,
  Platform, Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
import { BottomNavBar } from '@/components/BottomNavBar';

const BG = require('../../../assets/background.png');
const WORDMARK = require('../../../assets/images/ui/wordmark.png');

// Serif for display text — Baskerville reads as engraved on iOS; Georgia on
// Android/web. Baked assets stay the source of truth for anything critical.
const SERIF = Platform.select({ ios: 'Baskerville', default: 'Georgia' });

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

      // The sender's own birthday flips the moment row for the day
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
          {/* ── Wordmark ── */}
          <View style={styles.wordmarkBlock}>
            <TouchableOpacity onPress={onWordmarkTap} activeOpacity={1}>
              <Image source={WORDMARK} style={styles.wordmarkImage} resizeMode="contain" />
            </TouchableOpacity>
            <View style={styles.dividerSlot}>
              <Animated.View style={[styles.divider, { transform: [{ scaleX: dividerScale }] }]} />
              <Animated.View
                style={[styles.dividerHeart, { transform: [{ scale: heartScale }] }]}
                pointerEvents="none"
              >
                <Ionicons name="heart" size={16} color={Brand.gold} />
              </Animated.View>
            </View>
            {/* The wordmark bakes in the English tagline; fête days add the French one */}
            {fete && (
              <Text style={styles.tagline} maxFontSizeMultiplier={1.2}>
                c’est du fond du cœur
              </Text>
            )}
          </View>

          {/* ── Hero slot: baked envelope artwork drops in here when ready ── */}

          {/* ── Primary CTA: Send a Gift ── */}
          <TouchableOpacity
            onPress={() => router.push('/send/recipient')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F2D57A', '#D9B952', '#B8923A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText} maxFontSizeMultiplier={1.2}>
                SEND A GIFT
              </Text>
              <Ionicons name="chevron-forward" size={22} color="#1B3A2B" style={styles.ctaChevron} />
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Secondary pair: Your People / Your Gifts ── */}
          <View style={styles.pairRow}>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => router.push('/people')}
              activeOpacity={0.75}
            >
              <Ionicons name="people-outline" size={34} color={Brand.gold} />
              <View style={styles.outlineLabelRow}>
                <Text style={styles.outlineLabel} maxFontSizeMultiplier={1.2}>YOUR PEOPLE</Text>
                <Ionicons name="chevron-forward" size={14} color={Brand.gold} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => router.push('/gifts')}
              activeOpacity={0.75}
            >
              <Ionicons name="gift-outline" size={34} color={Brand.gold} />
              <View style={styles.outlineLabelRow}>
                <Text style={styles.outlineLabel} maxFontSizeMultiplier={1.2}>YOUR GIFTS</Text>
                <Ionicons name="chevron-forward" size={14} color={Brand.gold} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Up Next ── */}
          <View style={styles.upNext}>
            <View style={styles.upNextHeader}>
              <Text style={styles.upNextTitle} maxFontSizeMultiplier={1.2}>UP NEXT</Text>
              <View style={styles.upNextRule} />
            </View>

            {momentLoading ? (
              <View style={styles.row}>
                <ActivityIndicator color={Brand.gold} size="small" />
              </View>
            ) : ownBirthday ? (
              <View style={styles.row}>
                <View style={styles.rowChip}>
                  <Text style={styles.rowChipEmoji}>🎂</Text>
                </View>
                <View style={styles.rowDivider} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} maxFontSizeMultiplier={1.2}>Your Moment</Text>
                  <Text style={styles.rowSub} maxFontSizeMultiplier={1.2}>
                    SOMEONE SHOULD BE GIFTING YOU TODAY
                  </Text>
                </View>
              </View>
            ) : upcoming ? (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: '/send/recipient',
                    params: { prefilledId: upcoming.id, prefilledName: upcoming.display_name },
                  })
                }
              >
                <View style={styles.rowChip}>
                  <Text style={styles.rowChipEmoji}>🎂</Text>
                </View>
                <View style={styles.rowDivider} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} maxFontSizeMultiplier={1.2}>
                    {upcoming.display_name}’s Birthday
                  </Text>
                  <Text style={styles.rowSub} maxFontSizeMultiplier={1.2}>
                    {upcoming.days === 0 ? 'TODAY' : upcoming.days === 1 ? 'TOMORROW' : `IN ${upcoming.days} DAYS`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Brand.gold} />
              </TouchableOpacity>
            ) : !hasContacts ? (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.75}
                onPress={() => router.push('/people')}
              >
                <View style={styles.rowChip}>
                  <Ionicons name="person-add-outline" size={20} color={Brand.gold} />
                </View>
                <View style={styles.rowDivider} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} maxFontSizeMultiplier={1.2}>Add Your People</Text>
                  <Text style={styles.rowSub} maxFontSizeMultiplier={1.2}>NEVER MISS A MOMENT</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Brand.gold} />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => router.push('/send/recipient')}
            >
              <View style={styles.rowChip}>
                <Ionicons name="heart-outline" size={20} color={Brand.gold} />
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} maxFontSizeMultiplier={1.2}>Just Because</Text>
                <Text style={styles.rowSub} maxFontSizeMultiplier={1.2}>
                  A FRIEND COULD USE A SURPRISE
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Brand.gold} />
            </TouchableOpacity>
          </View>
        </ScrollView>
        <BottomNavBar />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: {
    padding: 20, paddingTop: 12, paddingBottom: 24,
    gap: 22, flexGrow: 1, justifyContent: 'space-evenly',
  },

  wordmarkBlock: { alignItems: 'center', gap: 6 },
  wordmarkImage: { width: 280, height: 75 },
  dividerSlot:   { height: 18, alignItems: 'center', justifyContent: 'center' },
  divider:       { width: 48, height: 1, backgroundColor: 'rgba(212,175,55,0.4)' },
  dividerHeart:  { position: 'absolute' },
  tagline: {
    color: 'rgba(212,175,55,0.75)', fontSize: 15, fontStyle: 'italic',
    letterSpacing: 1.5, fontFamily: SERIF,
  },

  cta: {
    borderRadius: 14, paddingVertical: 18, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#F7E7A8',
  },
  ctaText: {
    color: '#1B3A2B', fontSize: 21, fontWeight: '700',
    letterSpacing: 4, fontFamily: SERIF,
  },
  ctaChevron: { position: 'absolute', right: 18 },

  pairRow: { flexDirection: 'row', gap: 14 },
  outlineBtn: {
    flex: 1, alignItems: 'center', gap: 10,
    paddingVertical: 20, paddingHorizontal: 12,
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.65)',
    backgroundColor: 'rgba(28, 43, 30, 0.55)',
  },
  outlineLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  outlineLabel: { color: Brand.gold, fontSize: 13, fontWeight: '600', letterSpacing: 2 },

  upNext: { gap: 12 },
  upNextHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upNextTitle: { color: Brand.cream, fontSize: 13, fontWeight: '600', letterSpacing: 3 },
  upNextRule: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.3)' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(28, 43, 30, 0.72)',
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.28)',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, minHeight: 68,
  },
  rowChip: {
    width: 42, height: 42, borderRadius: 11,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.45)',
    backgroundColor: 'rgba(212,175,55,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  rowChipEmoji: { fontSize: 19 },
  rowDivider: { width: 1, height: 34, backgroundColor: 'rgba(212,175,55,0.3)' },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { color: Brand.cream, fontSize: 17, fontFamily: SERIF },
  rowSub: { color: 'rgba(212,175,55,0.6)', fontSize: 10, letterSpacing: 1.5 },
});
