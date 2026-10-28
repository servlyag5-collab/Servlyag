import { LegalPage } from '../components/LegalPage';
import { REFUNDS } from '../lib/legal';

// Refund and Cancellation Policy (open to everyone). Edit the text in src/lib/legal.ts.
export default function Refunds() {
  return <LegalPage title="Refund and Cancellation Policy" sections={REFUNDS} />;
}
