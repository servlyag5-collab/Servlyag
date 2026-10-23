import { Redirect } from 'expo-router';

// The old one-way notes inbox. Merchants' messages now live in Messages (merchant view),
// so this route only forwards there in case an old link points here.
export default function Inbox() {
  return <Redirect href="/messages" />;
}
