import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WideSplit } from '../../components/WideSplit';
import { TopBar } from '../../components/Menu';
import { Stars } from '../../components/Stars';
import { useMode } from '../../lib/mode';
import { customerName, type PersonNames } from '../../lib/names';
import { canReview } from '../../lib/reviews';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, ui } from '../../lib/theme';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
type Svc = { title: string; merchant_id: string; profiles: { display_name: string } | null };

// Write (or edit) my one review of a LISTING. Only customers who messaged about it can review.
export default function WriteReview() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const session = useSession();
  const uid = session?.user.id;
  const [asBusiness, setAsBusiness] = useState(useMode() === 'merchant'); // a saved review keeps the name it was posted with
  const [me, setMe] = useState<PersonNames>(null);
  const [svc, setSvc] = useState<Svc | null>(null);
  const [state, setState] = useState<'loading' | 'own' | 'not-customer' | 'ready'>('loading');
  const [existing, setExisting] = useState<string | null>(null); // my review's id, if I already wrote one
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!uid) return;
    Promise.all([
      supabase.from('services').select('title,merchant_id,profiles(display_name)').eq('id', serviceId).maybeSingle(),
      canReview(serviceId, uid),
      supabase.from('reviews').select('id,rating,comment,as_business').eq('service_id', serviceId).eq('customer_id', uid).maybeSingle(),
      supabase.from('profiles').select('display_name,screen_name').eq('id', uid).maybeSingle(),
    ]).then(([s, ok, r, p]) => {
      setMe(p.data as PersonNames);
      const service = s.data as unknown as Svc | null;
      setSvc(service);
      if (service?.merchant_id === uid) return setState('own');
      if (r.data) { setExisting(r.data.id); setAsBusiness(r.data.as_business); setRating(r.data.rating); setComment(r.data.comment); return setState('ready'); }
      setState(ok ? 'ready' : 'not-customer');
    });
  }, [serviceId, uid]);

  async function save() {
    if (!rating) return setMsg('Tap the stars to choose a rating.');
    setBusy(true); setMsg('');
    const { error } = existing
      ? await supabase.from('reviews').update({ rating, comment: comment.trim() }).eq('id', existing)
      : await supabase.from('reviews').insert({ service_id: serviceId, merchant_id: svc?.merchant_id, customer_id: uid, rating, comment: comment.trim(), as_business: asBusiness });
    setBusy(false);
    if (error) return setMsg(error.code === '23505' ? 'You have already reviewed this listing.' : error.message);
    router.back();
  }

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        <WideSplit>
        <Text style={ui.h1}>{existing ? 'Edit your review' : 'Write a review'}</Text>
        {!!svc && (
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{svc.title}</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.blue }}>{svc.profiles?.display_name || 'Servly merchant'}</Text>
          </View>
        )}
        {state === 'loading' && <ActivityIndicator color={colors.blue} />}
        {state === 'own' && <Text style={ui.muted}>You can't review your own listing.</Text>}
        {state === 'not-customer' && (
          <Text style={ui.muted}>Reviews come from real customers. Send a note about this listing first, then you can leave a review.</Text>
        )}
        {state === 'ready' && (
          <View style={ui.card}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>How was this service?</Text>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Stars value={rating} size={40} onChange={(v) => { setRating(v); setMsg(''); }} />
              <Text style={{ color: colors.muted, fontWeight: '700', minHeight: 20 }}>{WORDS[rating]}</Text>
            </View>
            <TextInput style={[ui.field, { height: 120, paddingTop: 14, textAlignVertical: 'top' }]} multiline maxLength={1000}
              placeholder="Tell others about the service (optional)" value={comment} onChangeText={setComment} />
            <Text style={[ui.muted, { fontSize: 14 }]}>Your review shows as <Text style={{ fontWeight: '800', color: colors.ink }}>{customerName(me, asBusiness, 'you')}</Text>.</Text>
            <Text style={[ui.muted, { fontSize: 14 }]}>You can review each listing once. You can come back and edit your review any time.</Text>
            {!!msg && <Text style={ui.error}>{msg}</Text>}
            <Pressable style={[ui.btn, ui.primary]} onPress={save} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>{existing ? 'Save changes' : 'Post review'}</Text>}
            </Pressable>
          </View>
        )}
        </WideSplit>
      </ScrollView>
    </SafeAreaView>
  );
}
