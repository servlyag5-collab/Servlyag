import { supabase } from './supabase';

// One conversation = one customer + one listing. Both sides can send messages.
export type Conversation = {
  id: string; service_id: string; customer_id: string; merchant_id: string; contact: string | null;
  last_message: string; last_message_at: string; customer_read_at: string | null; merchant_read_at: string | null;
};
// kind 'review_request' = the merchant asking for a review (shows a Leave a review button);
// 'booking' = a booking card (booking_id); 'booking_reminder' = an automatic reminder before a booking.
export type Message = {
  id: string; conversation_id: string; sender_id: string; body: string; created_at: string;
  kind?: 'text' | 'review_request' | 'booking' | 'booking_reminder'; booking_id?: string | null;
};

// Unread for me when something arrived after I last read it.
export function isUnread(c: Conversation, uid: string) {
  const read = c.customer_id === uid ? c.customer_read_at : c.merchant_read_at;
  return !!c.last_message && (!read || new Date(c.last_message_at) > new Date(read));
}

// A unique live-updates channel name. Supabase hands back an existing channel when a name is reused,
// and adding listeners to an already-started channel crashes, so every screen visit gets its own name.
export const channelName = (base: string) => `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// 7-digit local numbers get the Antigua and Barbuda code (1-268).
export const phoneDigits = (c: string) => { const d = c.replace(/\D/g, ''); return d.length === 7 ? `1268${d}` : d; };

// The customer's conversation about a listing, if there is one.
export async function findConversation(serviceId: string, uid: string) {
  const { data } = await supabase.from('conversations').select('id').eq('service_id', serviceId).eq('customer_id', uid).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// Find or start the customer's conversation about a listing, then send the first (or next) message.
export async function sendFromListing(serviceId: string, uid: string, body: string, contact: string) {
  let id = await findConversation(serviceId, uid);
  if (!id) {
    const r = await supabase.from('conversations').insert({ service_id: serviceId, customer_id: uid, contact: contact || null }).select('id').single();
    if (r.error) {
      id = await findConversation(serviceId, uid); // started at the same moment on another device
      if (!id) throw new Error(r.error.message);
    } else id = r.data.id as string;
  } else if (contact) {
    await supabase.from('conversations').update({ contact }).eq('id', id);
  }
  const m = await supabase.from('messages').insert({ conversation_id: id, sender_id: uid, body }).select('id').single();
  if (m.error) throw new Error(m.error.message);
  return id;
}
