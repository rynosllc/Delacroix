import { useCallback, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Animated,
  Platform, Image, Pressable, useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
import { BottomNavBar } from '@/components/BottomNavBar';

// One baked image carries the whole top of the screen: monogram, wordmark,
// tagline, envelope, the SEND A GIFT plate and the People / Gifts buttons.
// Tap zones below are positioned in the artwork's own pixel space.
const HOME_ART = require('../../../assets/images/ui/home-art.png');
const ART_W = 863;
const ART_H = 1225;
const ZONES = {
  wordmark: { x: 200, y: 255, w: 465, h: 95 },
  send:     { x: 105, y: 843, w: 652, h: 117 },
  people:   { x: 58,  y: 1015, w: 357, h: 185 },
  gifts:    { x: 447, y: 1015, w: 357, h: 185 },
};
const HEART = { x: 431, y: 372 };

// Matches the artwork's own backdrop so the baked image has no visible seam.
const BG_EDGE = '#040F06';
const BG_CENTER = '#09150A';

const SERIF = Platform.select({ ios: 'Baskerville', default: 'Georgia' });

interface UpcomingContact { id: string; display_name: string; days: number }

// Fête days: Valentine's and Bastille Day get the French tagline —
// unannounced, just there for a day.
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
  const { width: windowW } = useWindowDimensions();
  const [upcoming, setUpcoming]       = useState<UpcomingContact | null>(null);
  const [momentLoading, setMomentLoading] = useState(true);
  const [hasContacts, setHasContacts] = useState(true);
  const [ownBirthday, setOwnBirthday] = useState(false);
  const fete = isFeteDay();

  // Absolute point sizes from the window width — percentages and aspectRatio
  // have both misbehaved on device, so the art box is computed outright.
  const artW = Math.min(windowW || 375, 500);
  const scale = artW / ART_W;
  const artH = ART_H * scale;
  const zone = (z: { x: number; y: number; w: number; h: number }) => ({
    position: 'absolute' as const,
    left: z.x * scale, top: z.y * scale, width: z.w * scale, height: z.h * scale,
  });

  // Wordmark heart: five quiet taps on "DeLacroix" and the little heart
  // beneath it swells gold for a moment, then lets go.
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartScale = useRef(new Animated.Value(0)).current;

  function onWordmarkTap() {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1600);
    if (tapCount.current < 5) return;
    tapCount.current = 0;
    // Restart cleanly even if a previous play was interrupted
    heartScale.stopAnimation();
    heartScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(1500),
      Animated.timing(heartScale, { toValue: 0, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
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
    <LinearGradient
      colors={[BG_EDGE, BG_CENTER, BG_EDGE]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Baked artwork + tap zones ── */}
          <View style={{ width: artW, height: artH, alignSelf: 'center' }}>
            <Image
              source={HOME_ART}
              style={{ width: artW, height: artH }}
              resizeMode="cover"
              accessibilityLabel="DeLacroix — it's from the heart"
            />
            {/* Soften the artwork's top edge into the status-bar area */}
            <LinearGradient
              colors={[BG_EDGE, 'rgba(4,15,6,0)']}
              style={styles.topFade}
              pointerEvents="none"
            />

            <Pressable style={zone(ZONES.wordmark)} onPress={onWordmarkTap} />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.eggHeart,
                { left: HEART.x * scale - 14, top: HEART.y * scale - 14, transform: [{ scale: heartScale }] },
              ]}
            >
              <Ionicons name="heart" size={28} color="#F2D57A" />
            </Animated.View>

            <TouchableOpacity
              style={zone(ZONES.send)}
              onPress={() => router.push('/send/recipient')}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Send a gift"
            />
            <TouchableOpacity
              style={zone(ZONES.people)}
              onPress={() => router.push('/people')}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Your people"
            />
            <TouchableOpacity
              style={zone(ZONES.gifts)}
              onPress={() => router.push('/gifts')}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Your gifts"
            />
          </View>

          {/* ── Up Next ── */}
          <View style={styles.upNext}>
            {fete && (
              <Text style={styles.feteLine} maxFontSizeMultiplier={1.2}>
                c’est du fond du cœur
              </Text>
            )}
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
                  <MaterialCommunityIcons name="cake-variant-outline" size={22} color={GOLD} />
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
                  <MaterialCommunityIcons name="cake-variant-outline" size={22} color={GOLD} />
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
                <Ionicons name="chevron-forward" size={18} color={GOLD} />
              </TouchableOpacity>
            ) : !hasContacts ? (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.75}
                onPress={() => router.push('/people')}
              >
                <View style={styles.rowChip}>
                  <Ionicons name="person-add-outline" size={20} color={GOLD} />
                </View>
                <View style={styles.rowDivider} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} maxFontSizeMultiplier={1.2}>Add Your People</Text>
                  <Text style={styles.rowSub} maxFontSizeMultiplier={1.2}>NEVER MISS A MOMENT</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={GOLD} />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => router.push('/send/recipient')}
            >
              <View style={styles.rowChip}>
                <Ionicons name="heart-outline" size={21} color={GOLD} />
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} maxFontSizeMultiplier={1.2}>Just Because</Text>
                <Text style={styles.rowSub} maxFontSizeMultiplier={1.2}>
                  A FRIEND COULD USE A SURPRISE
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={GOLD} />
            </TouchableOpacity>
          </View>
        </ScrollView>
        <BottomNavBar />
      </SafeAreaView>
    </LinearGradient>
  );
}

const GOLD = '#D9B45A';

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 20, flexGrow: 1 },

  topFade:  { position: 'absolute', left: 0, right: 0, top: 0, height: 26 },
  eggHeart: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  upNext: { paddingHorizontal: 26, paddingTop: 18, gap: 10 },
  feteLine: {
    color: 'rgba(217,180,90,0.75)', fontSize: 14, fontStyle: 'italic',
    letterSpacing: 1.5, fontFamily: SERIF, textAlign: 'center', marginBottom: 4,
  },
  upNextHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  upNextTitle: {
    color: GOLD, fontSize: 13, letterSpacing: 3.5, fontFamily: SERIF,
  },
  upNextRule: { flex: 1, height: 1, backgroundColor: 'rgba(217,180,90,0.45)' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.16)',
    borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, minHeight: 62,
  },
  rowChip: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.18)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
  },
  rowDivider: { width: 1, height: 30, backgroundColor: 'rgba(217,180,90,0.55)' },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { color: '#F1E3BD', fontSize: 17, fontFamily: SERIF, letterSpacing: 0.3 },
  rowSub: { color: 'rgba(217,180,90,0.7)', fontSize: 10, letterSpacing: 2 },
});
