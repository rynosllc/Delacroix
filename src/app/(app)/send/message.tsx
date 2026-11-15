import { useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet, SafeAreaView,
  ImageBackground, TextInput, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SendFlowHeader } from '@/components/SendFlowHeader';
import { Lux, SERIF, T, LuxButton, luxStyles } from '@/components/lux';

const BG = require('../../../../assets/background.png');

const AI_PROMPTS = [
  "What makes them special?",
  "What do you want them to feel?",
  "Share a memory together",
] as const;

const SAMPLE_MESSAGE =
  "Thinking of you today and every day. You bring so much warmth and light to everyone around you — I hope this small gift carries all the love and gratitude I have for you. 💛";

export default function MessageStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipientId: string; recipientName: string; occasion: string;
    message?: string; returnTo?: string;
  }>();

  const [tab, setTab] = useState<'self' | 'ai'>('self');
  const [message, setMessage] = useState(params.message ?? '');
  const [aiAnswers, setAiAnswers] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState('');

  function handleGenerate() {
    // AI not connected yet — show sample message
    setGenerated(SAMPLE_MESSAGE);
    setMessage(SAMPLE_MESSAGE);
  }

  function onNext() {
    const finalMsg = message.trim() || generated.trim();
    const messageSource =
      generated && finalMsg === generated.trim() ? 'ai_generated' : 'manual';
    const { returnTo, ...rest } = params;
    if (returnTo === 'review') {
      router.replace({
        pathname: '/send/review',
        params: { ...rest, message: finalMsg, messageSource },
      });
      return;
    }
    router.push({
      pathname: '/send/photo',
      params: { ...rest, message: finalMsg, messageSource },
    });
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SendFlowHeader
            step={3}
            title="Your message"
            subtitle={params.recipientName ? `To ${params.recipientName}` : undefined}
            onBack={() => router.back()}
          />

          <View style={styles.body}>
            {/* Tab toggle */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'self' && styles.tabBtnActive]}
                onPress={() => setTab('self')}
                activeOpacity={0.7}
              >
                <T style={[styles.tabLabel, tab === 'self' && styles.tabLabelActive]}>
                  WRITE IT MYSELF
                </T>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'ai' && styles.tabBtnActive]}
                onPress={() => setTab('ai')}
                activeOpacity={0.7}
              >
                <T style={[styles.tabLabel, tab === 'ai' && styles.tabLabelActive]}>
                  HELP ME WRITE IT
                </T>
              </TouchableOpacity>
            </View>

            {tab === 'self' ? (
              <TextInput
                style={styles.textArea}
                placeholder="Write from the heart…"
                placeholderTextColor={Lux.faint}
                selectionColor={Lux.gold}
                multiline
                numberOfLines={6}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
                maxFontSizeMultiplier={1.25}
              />
            ) : (
              <View style={styles.aiSection}>
                <T style={luxStyles.hint}>Answer a few prompts and we’ll craft a message.</T>
                {AI_PROMPTS.map(prompt => (
                  <View key={prompt} style={styles.aiPromptBlock}>
                    <T style={luxStyles.eyebrow}>{prompt.toUpperCase()}</T>
                    <TextInput
                      style={luxStyles.input}
                      placeholder="Your answer…"
                      placeholderTextColor={Lux.faint}
                      selectionColor={Lux.gold}
                      value={aiAnswers[prompt] ?? ''}
                      onChangeText={v => setAiAnswers(p => ({ ...p, [prompt]: v }))}
                      maxFontSizeMultiplier={1.25}
                    />
                  </View>
                ))}

                <LuxButton title="Generate message" variant="outline" onPress={handleGenerate} />

                {generated ? (
                  <View style={styles.generatedCard}>
                    <T style={luxStyles.eyebrow}>YOUR MESSAGE</T>
                    <TextInput
                      style={styles.generatedText}
                      multiline
                      value={message || generated}
                      onChangeText={setMessage}
                      selectionColor={Lux.gold}
                      textAlignVertical="top"
                      maxFontSizeMultiplier={1.25}
                    />
                  </View>
                ) : null}
              </View>
            )}

            <LuxButton
              title="Next"
              chevron
              onPress={onNext}
              disabled={!message && !generated}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 40 },
  body:   { paddingHorizontal: 22, gap: 18 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1, borderColor: Lux.hairline,
    borderRadius: 14, padding: 4, gap: 4,
  },
  tabBtn:        { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  tabBtnActive:  { backgroundColor: 'rgba(217,180,90,0.14)', borderWidth: 1, borderColor: 'rgba(217,180,90,0.45)' },
  tabLabel:      { color: Lux.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  tabLabelActive:{ color: Lux.goldBright },

  textArea: {
    ...luxStyles.input,
    padding: 18, fontSize: 18, lineHeight: 26,
    fontFamily: SERIF, minHeight: 190,
  },

  aiSection:     { gap: 16 },
  aiPromptBlock: { gap: 8 },
  generatedCard: { ...luxStyles.card, padding: 16, gap: 8 },
  generatedText: { color: Lux.cream, fontSize: 17, lineHeight: 25, minHeight: 90, fontFamily: SERIF },
});
