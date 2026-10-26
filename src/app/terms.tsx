import { LegalPage } from '../components/LegalPage';
import { TERMS } from '../lib/legal';

// Terms of Service (open to everyone). Edit the text in src/lib/legal.ts.
export default function Terms() {
  return <LegalPage title="Terms of Service" sections={TERMS} />;
}
