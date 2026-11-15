import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert, Modal, FlatList, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBar } from '@/components/BottomNavBar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
import { Lux, SERIF, LuxButton, LuxBackHeader } from '@/components/lux';

const PREFIXES = ['', 'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
const SUFFIXES = ['', 'Jr.', 'Sr.', 'II', 'III', 'MD', 'PhD', 'Esq.'];

export default function ContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const { user } = useAuth();

  const [prefix, setPrefix] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [bdMonth, setBdMonth] = useState('');
  const [bdDay, setBdDay] = useState('');
  const [bdYear, setBdYear] = useState('');
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const [relation, setRelation] = useState('');

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [prefixOpen, setPrefixOpen] = useState(false);
  const [suffixOpen, setSuffixOpen] = useState(false);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from('recipient_contacts')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          // Parse stored display_name back into parts on edit
          const parts = (data.display_name ?? '').split(' ');
          setFirstName(parts[0] ?? '');
          setLastName(parts.slice(1).join(' ') ?? '');
          setEmail(data.email ?? '');
          const rawPhone = data.phone ?? '';
          setPhone(rawPhone);
          setPhoneDisplay(formatPhone(rawPhone));
          setRelation(data.relation ?? '');
          if (data.birthday) {
            const [y, m, d] = data.birthday.split('-');
            setBdYear(y ?? ''); setBdMonth(m ?? ''); setBdDay(d ?? '');
          }
        }
        setLoading(false);
      });
  }, [id]);

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    setPhoneDisplay(formatPhone(digits));
  }

  function buildDisplayName() {
    return [prefix, firstName.trim(), lastName.trim(), suffix]
      .filter(Boolean)
      .join(' ');
  }

  function birthdayToISO(): string | null {
    if (!bdMonth && !bdDay && !bdYear) return null;
    const m = bdMonth.padStart(2, '0');
    const d = bdDay.padStart(2, '0');
    const y = bdYear;
    if (y.length !== 4 || !m || !d) return null;
    const date = new Date(`${y}-${m}-${d}T00:00:00`);
    if (isNaN(date.getTime())) return null;
    return `${y}-${m}-${d}`;
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Name required', 'Please enter both a first and last name.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      Alert.alert('Contact info required', 'Please enter an email or phone number.');
      return;
    }

    setSaving(true);

    const payload = {
      display_name: buildDisplayName(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      birthday: birthdayToISO(),
      relation: relation.trim() || null,
      owner_user_id: user!.id,
    };

    const { error } = isNew
      ? await supabase.from('recipient_contacts').insert(payload)
      : await supabase.from('recipient_contacts').update(payload).eq('id', id);

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    router.back();
  }

  async function handleDelete() {
    Alert.alert(
      'Remove contact',
      `Remove ${buildDisplayName()} from your address book? This won't affect gifts already sent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await supabase.from('recipient_contacts').delete().eq('id', id);
            router.back();
          },
        },
      ]
    );
  }

  const bg = require('../../../../assets/background.png');

  if (loading) {
    return (
      <ImageBackground source={bg} style={{ flex: 1 }} resizeMode="cover">
        <View style={styles.centered}><ActivityIndicator color={Brand.gold} /></View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={bg} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1 }}>
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >

        <LuxBackHeader
          onBack={() => router.back()}
          title={isNew ? 'New Person' : 'Edit Person'}
        />

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          {/* Name section */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Name</Text>

            {/* Prefix + Suffix row */}
            <View style={styles.row}>
              <DropdownPicker
                value={prefix}
                placeholder="Prefix"
                options={PREFIXES}
                isOpen={prefixOpen}
                onOpen={() => { setPrefixOpen(true); setSuffixOpen(false); }}
                onClose={() => setPrefixOpen(false)}
                onSelect={v => { setPrefix(v); setPrefixOpen(false); }}
                style={{ flex: 1 }}
              />
              <DropdownPicker
                value={suffix}
                placeholder="Suffix"
                options={SUFFIXES}
                isOpen={suffixOpen}
                onOpen={() => { setSuffixOpen(true); setPrefixOpen(false); }}
                onClose={() => setSuffixOpen(false)}
                onSelect={v => { setSuffix(v); setSuffixOpen(false); }}
                style={{ flex: 1 }}
              />
            </View>

            {/* First / Last */}
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, minWidth: 0 }]}
                placeholder="First name *"
                placeholderTextColor={Brand.muted}
                selectionColor={Brand.gold}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <TextInput
                style={[styles.input, { flex: 1, minWidth: 0 }]}
                placeholder="Last name *"
                placeholderTextColor={Brand.muted}
                selectionColor={Brand.gold}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <Field label="Email" value={email} onChangeText={setEmail} placeholder="their@email.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" value={phoneDisplay} onChangeText={handlePhoneChange} placeholder="(555) 000-0000" keyboardType="phone-pad" />
          <Text style={styles.consentNote}>
            They'll receive a text or email when you send them a gift.
          </Text>
          <Field label="Relation" value={relation} onChangeText={setRelation} placeholder="mom, friend, coworker…" autoCapitalize="none" />

          {/* Birthday */}
          <View style={styles.fieldWrapper}>
            <View style={styles.birthdayRow}>
              <Text style={styles.fieldLabel}>Birthday</Text>
              {!!(bdMonth || bdDay || bdYear) && (
                <TouchableOpacity onPress={() => { setBdMonth(''); setBdDay(''); setBdYear(''); }}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.birthdayInputs}>
              <TextInput
                style={[styles.input, styles.bdSegment]}
                placeholder="MM"
                placeholderTextColor={Brand.muted}
                selectionColor={Brand.gold}
                value={bdMonth}
                onChangeText={v => {
                  const n = v.replace(/\D/g, '').slice(0, 2);
                  setBdMonth(n);
                  if (n.length === 2) dayRef.current?.focus();
                }}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="next"
              />
              <Text style={styles.bdSep}>/</Text>
              <TextInput
                ref={dayRef}
                style={[styles.input, styles.bdSegment]}
                placeholder="DD"
                placeholderTextColor={Brand.muted}
                selectionColor={Brand.gold}
                value={bdDay}
                onChangeText={v => {
                  const n = v.replace(/\D/g, '').slice(0, 2);
                  setBdDay(n);
                  if (n.length === 2) yearRef.current?.focus();
                }}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="next"
              />
              <Text style={styles.bdSep}>/</Text>
              <TextInput
                ref={yearRef}
                style={[styles.input, styles.bdYear]}
                placeholder="YYYY"
                placeholderTextColor={Brand.muted}
                selectionColor={Brand.gold}
                value={bdYear}
                onChangeText={v => setBdYear(v.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
              />
            </View>
          </View>

          <LuxButton
            title={isNew ? 'Add person' : 'Save changes'}
            onPress={handleSave}
            loading={saving}
            style={{ marginTop: 8 }}
          />

          {!isNew && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Remove Contact</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
    </KeyboardAvoidingView>
    <BottomNavBar />
    </View>
    </ImageBackground>
  );
}

// ─── Dropdown picker ──────────────────────────────────────────────────────────

interface DropdownProps {
  value: string;
  placeholder: string;
  options: string[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (v: string) => void;
  style?: object;
}

function DropdownPicker({ value, placeholder, options, isOpen, onOpen, onClose, onSelect, style }: DropdownProps) {
  return (
    <View style={style}>
      <TouchableOpacity style={styles.dropdownTrigger} onPress={onOpen}>
        <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.dropdownChevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
          <View style={styles.modalSheet}>
            <FlatList
              data={options}
              keyExtractor={item => item || '__none__'}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.optionRow} onPress={() => onSelect(item)}>
                  <Text style={[styles.optionText, item === value && styles.optionSelected]}>
                    {item || `No ${placeholder.toLowerCase()}`}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Simple text field ────────────────────────────────────────────────────────

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={Brand.muted} selectionColor={Brand.gold} {...props} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { paddingHorizontal: 22, paddingTop: 8, gap: 20, paddingBottom: 60 },
  fieldWrapper: { gap: 8 },
  fieldLabel: { color: 'rgba(217,180,90,0.8)', fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: 'rgba(217,180,90,0.38)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, color: Lux.cream,
  },
  dropdownTrigger: {
    backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: 'rgba(217,180,90,0.38)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownValue: { color: Lux.cream, fontSize: 15 },
  dropdownPlaceholder: { color: Lux.faint, fontSize: 15 },
  dropdownChevron: { color: Lux.gold, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0B1A10', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.3)',
    paddingVertical: 8, maxHeight: 340,
  },
  optionRow: { paddingHorizontal: 24, paddingVertical: 14 },
  optionText: { color: Lux.cream, fontSize: 18, fontFamily: SERIF },
  optionSelected: { color: Lux.goldBright },
  birthdayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  birthdayInputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bdSegment: { width: 58, textAlign: 'center', paddingHorizontal: 8 },
  bdYear: { width: 80, textAlign: 'center', paddingHorizontal: 8 },
  bdSep: { color: Brand.muted, fontSize: 20, marginBottom: 2 },
  clearText: { color: Brand.gold, fontSize: 13 },
  consentNote: {
    color: Brand.muted, fontSize: 11, fontStyle: 'italic',
    marginTop: -6, marginBottom: 2,
  },
  deleteButton: { alignItems: 'center', paddingVertical: 12 },
  deleteButtonText: { color: Lux.danger, fontSize: 15, fontWeight: '600' },
});
