import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LEGAL_UPDATED, type Section } from '../lib/legal';
import { colors, ui } from '../lib/theme';
import { TopBar } from './Menu';

// Shows a legal document (Privacy Policy or Terms) from src/lib/legal.ts.
export function LegalPage({ title, sections }: { title: string; sections: Section[] }) {
  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
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
      </ScrollView>
    </SafeAreaView>
  );
}
