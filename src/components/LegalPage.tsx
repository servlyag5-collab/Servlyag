import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LEGAL_UPDATED, type Section } from '../lib/legal';
import { colors, fonts, ui } from '../lib/theme';
import { TopBar } from './Menu';
import { WideSplit } from './WideSplit';

// Shows a legal document (Privacy Policy, Terms or Refund Policy) from src/lib/legal.ts.
// Computers: the text on the left, an "On this page" list of its sections on the right.
export function LegalPage({ title, sections }: { title: string; sections: Section[] }) {
  const contents = (
    <View style={[ui.card, { gap: 10 }]}>
      <Text style={{ fontFamily: fonts.title, fontSize: 18, color: colors.ink }}>On this page</Text>
      {sections.map((s) => <Text key={s.heading} style={{ color: colors.muted, fontSize: 15, lineHeight: 21 }}>{s.heading}</Text>)}
    </View>
  );
  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        <WideSplit aside={contents}>
          <Text style={ui.h1}>{title}</Text>
          <Text style={ui.muted}>Last updated: {LEGAL_UPDATED}</Text>
          <View style={{ backgroundColor: '#FFFBEA', borderColor: colors.gold, borderWidth: 1, borderRadius: 12, padding: 12 }}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>DRAFT: to be reviewed by a lawyer before Servly launches.</Text>
          </View>
          {sections.map((s) => (
            <View key={s.heading} style={{ gap: 6 }}>
              <Text style={[ui.h2, { fontSize: 20, marginTop: 8 }]}>{s.heading}</Text>
              {s.body.map((p, i) => <Text key={i} style={[ui.muted, { color: colors.ink }]}>{p}</Text>)}
            </View>
          ))}
        </WideSplit>
      </ScrollView>
    </SafeAreaView>
  );
}
