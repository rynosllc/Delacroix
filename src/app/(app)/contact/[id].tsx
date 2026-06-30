import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';

export default function ContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [relation, setRelation] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from('recipient_contacts')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name ?? '');
          setEmail(data.email ?? '');
          setPhone(data.phone ?? '');
          setBirthday(data.birthday ?? '');
          setRelation(data.relation ?? '');
        }
        setLoading(false);
      });
  }, [id]);

  async function handleSave() {
    if (!displayName.trim()) {
      Alert.alert('Name required', 'Please enter a name for this contact.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      Alert.alert('Contact info required', 'Please enter an email or phone number.');
      return;
    }

    setSaving(true);

    const payload = {
      display_name: displayName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      birthday: birthday.trim() || null,
      relation: relation.trim() || null,
      owner_user_id: user!.id,
    };

    const { error } = isNew
      ? await supabase.from('recipient_contacts').insert(payload)
      : await supabase.from('recipient_contacts').update(payload).eq('id', id);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    router.back();
  }

  async function handleDelete() {
    Alert.alert(
      'Remove contact',
      `Remove ${displayName} from your address book? This won't affect gifts already sent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('recipient_contacts').delete().eq('id', id);
            router.back();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Brand.gold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerBack}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isNew ? 'New Contact' : 'Edit Contact'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field label="Name *" value={displayName} onChangeText={setDisplayName} placeholder="Full name" autoCapitalize="words" />
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="their@email.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" />
          <Field label="Relation" value={relation} onChangeText={setRelation} placeholder="mom, friend, coworker…" autoCapitalize="none" />
          <Field label="Birthday" value={birthday} onChangeText={setBirthday} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={Brand.green} />
              : <Text style={styles.saveButtonText}>{isNew ? 'Add Contact' : 'Save Changes'}</Text>
            }
          </TouchableOpacity>

          {!isNew && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Remove Contact</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={Brand.muted}
        selectionColor={Brand.gold}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.green,
  },
  centered: {
    flex: 1,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.greenBorder,
  },
  headerBack: {
    color: Brand.gold,
    fontSize: 17,
    width: 60,
  },
  headerTitle: {
    color: Brand.cream,
    fontSize: 17,
    fontFamily: 'ui-serif',
  },
  form: {
    padding: 24,
    gap: 20,
    paddingBottom: 60,
  },
  fieldWrapper: {
    gap: 6,
  },
  fieldLabel: {
    color: Brand.muted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Brand.greenMid,
    borderWidth: 1,
    borderColor: Brand.greenBorder,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: Brand.cream,
  },
  saveButton: {
    backgroundColor: Brand.gold,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Brand.green,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: '#C0392B',
    fontSize: 15,
  },
});
