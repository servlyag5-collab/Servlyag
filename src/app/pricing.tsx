import { LegalPage } from '../components/LegalPage';
import { PRICING } from '../lib/legal';

// Plans and pricing (open to everyone, for visitors and the bank's review). Edit the text in src/lib/legal.ts.
export default function Pricing() {
  return <LegalPage title="Plans and pricing" sections={PRICING} draft={false} />;
}
