import { Linking } from 'react-native';
import { supabase } from './supabase';

// Call a business: count the tap (v29, shown to the owner in Admin), then open the phone's dialer.
// Servly can't see whether the call connects; it only knows Call was tapped. The count never blocks or
// slows the call, and a business tapping its own Call button isn't counted.
export function callBusiness(phone: string, merchantId: string, serviceId: string | null, viewerId?: string) {
  if (viewerId !== merchantId) {
    supabase.rpc('record_call_tap', { p_merchant: merchantId, p_service: serviceId }).then(() => {}, () => {});
  }
  return Linking.openURL(`tel:${phone}`);
}
