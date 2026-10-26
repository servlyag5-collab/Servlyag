import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

const REASONS = [
  { id: 'spam', label: 'Spam' }, { id: 'fake', label: 'Fake or misleading' },
  { id: 'offensive', label: 'Offensive' }, { id: 'scam', label: 'Scam or fraud' }, { id: 'other', label: 'Something else' },
];

// A small "Report" link that opens a short form. Reports go to the owner's Admin dashboard.
export function ReportButton({ targetType, targetId, label = 'Report' }: {
  targetType: 'listing' | 'review' | 'user'; targetId: string; label?: string;
}) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);

  function start() {
    if (!session) return router.push({ pathname: '/login', params: { mode: 'in' } });
    setOpen(true); setSent(false); setReason(''); setDetails(''); setMsg('');
  }
  async function send() {
    if (!reason) return setMsg('Please choose a reason.');
    setBusy(true); setMsg('');
    const { error } = await supabase.from('reports').insert({ reporter_id: session!.user.id, target_type: targetType, target_id: targetId, reason, details: details.trim() });
    setBusy(false);
    if (error) return setMsg(error.message);
    setSent(true);
  }

  return (
    <>
      <Pressable onPress={start} hitSlop={6}>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' }}>{label}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,33,43,0.35)', justifyContent: 'center', padding: 16 }} onPress={() => setOpen(false)}>
          <Pressable style={[ui.card, { width: '100%', maxWidth: 480, alignSelf: 'center' }]}>
            {sent ? (
              <>
                <Text style={ui.h2}>Thanks for telling us</Text>
                <Text style={ui.muted}>Our team will review it. If it breaks our rules, we'll remove it.</Text>
                <Pressable style={[ui.btn, ui.primary]} onPress={() => setOpen(false)}><Text style={[ui.btnText, { color: '#fff' }]}>Done</Text></Pressable>
              </>
            ) : (
              <>
                <Text style={ui.h2}>Report {targetType === 'user' ? 'this person' : `this ${targetType}`}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {REASONS.map((r) => {
                    const on = reason === r.id;
                    return (
                      <Pressable key={r.id} onPress={() => { setReason(r.id); setMsg(''); }}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: on ? colors.blue : colors.border, backgroundColor: on ? colors.blue : '#fff' }}>
                        <Text style={{ fontWeight: '700', color: on ? '#fff' : colors.ink }}>{r.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput style={[ui.field, { height: 90, paddingTop: 14, textAlignVertical: 'top' }]} multiline maxLength={1000}
                  placeholder="Anything else we should know? (optional)" value={details} onChangeText={setDetails} />
                {!!msg && <Text style={ui.error}>{msg}</Text>}
                <View style={ui.row}>
                  <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={() => setOpen(false)}><Text style={[ui.btnText, { color: colors.ink }]}>Cancel</Text></Pressable>
                  <Pressable style={[ui.btn, { flex: 1, backgroundColor: colors.red }]} onPress={send} disabled={busy}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Send report</Text>}
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
