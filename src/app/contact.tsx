import { LegalPage } from '../components/LegalPage';
import { CONTACT_PAGE } from '../lib/legal';

// Contact us (open to everyone): business name, address, email, and phone once added. Text in src/lib/legal.ts.
export default function Contact() {
  return <LegalPage title="Contact us" sections={CONTACT_PAGE} draft={false} />;
}
