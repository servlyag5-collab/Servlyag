import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/Menu';
import { colors, ui } from '../lib/theme';

// Placeholder until the booking app is built. The menu only shows this to merchants with
// booking switched on (Business tier, or the paid add-on).
export default function Bookings() {
  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        <Text style={ui.h1}>Bookings</Text>
        <View style={ui.card}>
          <Text style={{ color: colors.blue, fontWeight: '800', letterSpacing: 2, fontSize: 13 }}>COMING SOON</Text>
          <Text style={ui.h2}>Your booking app is switched on</Text>
          <Text style={ui.muted}>Soon customers will pick a date and time here, and you will confirm, decline or suggest another time.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
