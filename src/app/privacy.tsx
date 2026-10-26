import { LegalPage } from '../components/LegalPage';
import { PRIVACY } from '../lib/legal';

// Privacy Policy (open to everyone). Edit the text in src/lib/legal.ts.
export default function Privacy() {
  return <LegalPage title="Privacy Policy" sections={PRIVACY} />;
}
