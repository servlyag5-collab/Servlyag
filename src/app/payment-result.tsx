import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

// Old address for the payment result: it now shows on the Plan screen (owner's choice, 2026-11-08).
export default function PaymentResult() {
  const { status, order } = useLocalSearchParams<{ status?: string; order?: string }>();
  const q = new URLSearchParams({ payment: status ?? 'error', ...(order ? { order } : {}) }).toString();
  return <Redirect href={`/plan?${q}` as Href} />;
}
