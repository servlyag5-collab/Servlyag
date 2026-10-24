import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../../components/Menu';
import { Stars } from '../../components/Stars';
import { canReview } from '../../lib/reviews';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, ui } from '../../lib/theme';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

// Write (or edit) my one review of a merchant. Only customers who have messaged them can review.
export default function WriteReview() {
  const { merchantId } = useLocalSearchParams<{ merchantId: string }>();
  const session = useSession();
  const uid = session?.user.id;
  const [name, setName] = useState('');
  const [state, setState] = useState<'loading' | 'own' | 'not-customer' | 'ready'>('loading');
  const [existing, setExisting] = useState<string | null>(null); // my review's id, if I already wrote one
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!uid) return;
    supabase.from('profiles').select('display_name').eq('id', merchantId).maybeSingle().then(({ data }) => setName(data?.display_name ?? ''));
    if (uid === merchantId) return setState('own');
    Promise.all([
      canReview(merchantId, uid),
      supabase.from('reviews').select('id,rating,comment').eq('merchant_id', merchantId).eq('customer_id', uid).maybeSingle(),
    ]).then(([ok, r]) => {
      if (r.data) { setExisting(r.data.id); setRating(r.data.rating); setComment(r.data.comment); return setState('ready'); }
      setState(ok ? 'ready' : 'not-customer');
    });
  }, [merchantId, uid]);

  async function save() {
    if (!rating) return setMsg('Tap the stars to choose a rating.');
    setBusy(true); setMsg('');
    const { error } = existing
      ? await supabase.from('reviews').update({ rating, comment: comment.trim() }).eq('id', existing)
      : await supabase.from('reviews').insert({ merchant_id: merchantId, customer_id: uid, rating, comment: comment.trim() });
    setBusy(false);
    if (error) return setMsg(error.code === '23505' ? 'You have already reviewed this merchant.' : error.message);
    router.back();
  }

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        <Text style={ui.h1}>{existing ? 'Edit your review' : 'Write a review'}</Text>
        {!!name && <Text style={{ fontSize: 18, fontWeight: '700', color: colors.blue }}>{name}</Text>}
        {state === 'loading' && <ActivityIndicator color={colors.blue} />}
        {state === 'own' && <Text style={ui.muted}>You can't review your own business.</Text>}
        {state === 'not-customer' && (
          <Text style={ui.muted}>Reviews come from real customers. Send this merchant a note about one of their services first, then you can leave a review.</Text>
        )}
        {state === 'ready' && (
          <View style={ui.card}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>How was your experience?</Text>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Stars value={rating} size={40} onChange={(v) => { setRating(v); setMsg(''); }} />
              <Text style={{ color: colors.muted, fontWeight: '700', minHeight: 20 }}>{WORDS[rating]}</Text>
            </View>
            <TextInput style={[ui.field, { height: 120, paddingTop: 14, textAlignVertical: 'top' }]} multiline maxLength={1000}
              placeholder="Tell others about the service (optional)" value={comment} onChangeText={setComment} />
            <Text style={[ui.muted, { fontSize: 14 }]}>You can review each merchant once. You can come back and edit your review any time.</Text>
            {!!msg && <Text style={ui.error}>{msg}</Text>}
            <Pressable style={[ui.btn, ui.primary]} onPress={save} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>{existing ? 'Save changes' : 'Post review'}</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
