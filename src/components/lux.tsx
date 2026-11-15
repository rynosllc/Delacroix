import { ReactNode } from 'react';
import {
  View, Text, TextProps, TouchableOpacity, StyleSheet, ActivityIndicator,
  Platform, StyleProp, ViewStyle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// The DeLacroix look, taken from the approved home artwork: near-black green
// leather, warm gold line work, cream serif type, glass cards.
export const Lux = {
  gold: '#D9B45A',
  goldBright: '#F2D57A',
  goldDeep: '#B8923A',
  cream: '#F1E3BD',
  muted: 'rgba(241,227,189,0.6)',
  faint: 'rgba(241,227,189,0.35)',
  ink: '#14291C',
  glass: 'rgba(255,255,255,0.035)',
  hairline: 'rgba(217,180,90,0.18)',
  line: 'rgba(217,180,90,0.45)',
  danger: '#E07A6E',
} as const;

export const SERIF = Platform.select({ ios: 'Baskerville', default: 'Georgia' });

// Text capped against large Dynamic Type so layouts hold on every phone.
export function T(props: TextProps) {
  return <Text maxFontSizeMultiplier={1.25} {...props} />;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type MciName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// ── Buttons ────────────────────────────────────────────────────────────────

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'gold' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  chevron?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function LuxButton({
  title, onPress, variant = 'gold', disabled, loading, chevron, style,
}: ButtonProps) {
  const inactive = disabled || loading;
  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={inactive}
        activeOpacity={0.7}
        style={[styles.outlineBtn, inactive && styles.btnDisabled, style]}
        accessibilityRole="button"
      >
        {loading
          ? <ActivityIndicator color={Lux.gold} />
          : <T style={styles.outlineText}>{title.toUpperCase()}</T>}
        {chevron && !loading && (
          <Ionicons name="chevron-forward" size={16} color={Lux.gold} style={styles.btnChevron} />
        )}
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
      style={[styles.goldShadow, inactive && styles.btnDisabled, style]}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={['#F6E3A1', '#DDBB5C', '#B98F38']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.goldBtn}
      >
        <View style={styles.goldInset} pointerEvents="none" />
        {loading
          ? <ActivityIndicator color={Lux.ink} />
          : <T style={styles.goldText}>{title.toUpperCase()}</T>}
        {chevron && !loading && (
          <Ionicons name="chevron-forward" size={20} color={Lux.ink} style={styles.btnChevron} />
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Chips, rows, section headers ───────────────────────────────────────────

export function LuxChip({
  icon, mci, size = 42, children,
}: { icon?: IconName; mci?: MciName; size?: number; children?: ReactNode }) {
  return (
    <View style={[styles.chip, { width: size, height: size, borderRadius: size / 2 }]}>
      {children
        ?? (mci
          ? <MaterialCommunityIcons name={mci} size={size * 0.5} color={Lux.gold} />
          : <Ionicons name={icon ?? 'ellipse-outline'} size={size * 0.48} color={Lux.gold} />)}
    </View>
  );
}

export function LuxSectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <T style={styles.sectionTitle}>{title.toUpperCase()}</T>
      <View style={styles.sectionRule} />
    </View>
  );
}

interface RowProps {
  title: string;
  sub?: string;
  icon?: IconName;
  mci?: MciName;
  /** Show this person's initials in the chip instead of an icon. */
  initialsOf?: string;
  onPress?: () => void;
  right?: ReactNode;
  titleColor?: string;
}

export function LuxRow({ title, sub, icon, mci, initialsOf, onPress, right, titleColor }: RowProps) {
  const body = (
    <>
      {initialsOf !== undefined
        ? <LuxInitials name={initialsOf} />
        : <LuxChip icon={icon} mci={mci} />}
      <View style={styles.rowDivider} />
      <View style={styles.rowBody}>
        <T style={[styles.rowTitle, titleColor ? { color: titleColor } : null]} numberOfLines={1}>
          {title}
        </T>
        {sub ? <T style={styles.rowSub} numberOfLines={1}>{sub.toUpperCase()}</T> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={Lux.gold} /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      {body}
    </TouchableOpacity>
  );
}

// Initials inside a chip, for people.
export function LuxInitials({ name, size = 42 }: { name: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  return (
    <LuxChip size={size}>
      <T style={{ color: Lux.gold, fontSize: size * 0.36, fontFamily: SERIF }}>{initials}</T>
    </LuxChip>
  );
}

// Top bar for detail screens: round back button, optional centred title and
// an optional text action on the right.
export function LuxBackHeader({
  onBack, title, actionLabel, onAction, right,
}: {
  onBack: () => void; title?: string;
  actionLabel?: string; onAction?: () => void; right?: ReactNode;
}) {
  return (
    <View style={styles.backHeader}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={20} color={Lux.gold} />
      </TouchableOpacity>
      {title ? <T style={styles.backTitle} numberOfLines={1}>{title}</T> : <View style={{ flex: 1 }} />}
      <View style={styles.backRight}>
        {right ?? (actionLabel && onAction ? (
          <TouchableOpacity onPress={onAction} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <T style={styles.backAction}>{actionLabel.toUpperCase()}</T>
          </TouchableOpacity>
        ) : null)}
      </View>
    </View>
  );
}

// Screen title used by the tab screens (Your Gifts, Your People…).
export function LuxTitle({ children }: { children: string }) {
  return (
    <View style={styles.titleBlock}>
      <T style={styles.title}>{children}</T>
      <View style={styles.titleRuleRow}>
        <View style={styles.titleRule} />
        <Ionicons name="heart" size={9} color={Lux.gold} />
        <View style={styles.titleRule} />
      </View>
    </View>
  );
}

export const luxStyles = StyleSheet.create({
  card: {
    backgroundColor: Lux.glass,
    borderWidth: 1, borderColor: Lux.hairline,
    borderRadius: 16,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.38)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 16, color: Lux.cream,
  },
  eyebrow: { color: 'rgba(217,180,90,0.75)', fontSize: 10, letterSpacing: 2 },
  hint: { color: Lux.muted, fontSize: 14, fontStyle: 'italic', textAlign: 'center', fontFamily: SERIF },
});

const styles = StyleSheet.create({
  goldShadow: {
    borderRadius: 14,
    shadowColor: '#E9C766', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 12, elevation: 6,
  },
  goldBtn: {
    height: 56, borderRadius: 14, paddingHorizontal: 44,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FBEBB5',
  },
  goldInset: {
    position: 'absolute', left: 3, right: 3, top: 3, bottom: 3,
    borderRadius: 11, borderWidth: 1, borderColor: 'rgba(122,90,28,0.38)',
  },
  goldText: {
    color: Lux.ink, fontSize: 17, fontWeight: '700',
    letterSpacing: 3, fontFamily: SERIF,
  },
  outlineBtn: {
    height: 54, borderRadius: 14, paddingHorizontal: 40,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(217,180,90,0.75)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  outlineText: { color: Lux.gold, fontSize: 13, fontWeight: '600', letterSpacing: 2.5 },
  btnChevron: { position: 'absolute', right: 16 },
  btnDisabled: { opacity: 0.4 },

  chip: {
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.22)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
  },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTitle: { color: Lux.gold, fontSize: 13, letterSpacing: 3.5, fontFamily: SERIF },
  sectionRule: { flex: 1, height: 1, backgroundColor: Lux.line },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Lux.glass,
    borderWidth: 1, borderColor: Lux.hairline,
    borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, minHeight: 62,
  },
  rowDivider: { width: 1, height: 30, backgroundColor: 'rgba(217,180,90,0.55)' },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { color: Lux.cream, fontSize: 17, fontFamily: SERIF, letterSpacing: 0.3 },
  rowSub: { color: 'rgba(217,180,90,0.7)', fontSize: 10, letterSpacing: 2 },

  backHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.3)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
  },
  backTitle: {
    flex: 1, textAlign: 'center',
    color: Lux.cream, fontSize: 20, fontFamily: SERIF, letterSpacing: 0.5,
  },
  backRight: { minWidth: 40, alignItems: 'flex-end' },
  backAction: { color: Lux.gold, fontSize: 12, fontWeight: '600', letterSpacing: 2 },

  titleBlock: { alignItems: 'center', gap: 8, paddingTop: 14, paddingBottom: 10 },
  title: { color: Lux.cream, fontSize: 28, fontFamily: SERIF, letterSpacing: 1 },
  titleRuleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRule: { width: 46, height: 1, backgroundColor: Lux.line },
});
