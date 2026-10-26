import { SELLER } from './receipt';

// DRAFT legal text for Servly AG. Have a lawyer in Antigua and Barbuda review it before launch.
// Edit the words here; the Privacy Policy and Terms screens show whatever is in these lists.
// Each section is a heading and one or more paragraphs.
export const LEGAL_UPDATED = 'October 2026';
const CONTACT = SELLER.email || 'our support team (Contact support in the app)';

export type Section = { heading: string; body: string[] };

export const PRIVACY: Section[] = [
  { heading: 'Who we are', body: [
    `${SELLER.name} ("Servly", "we") runs the Servly AG marketplace app and website from ${SELLER.address}. This policy explains what personal information we collect, why, and the choices you have.`,
  ] },
  { heading: 'What we collect', body: [
    'Account details: your name or business name, email address and password (stored scrambled; we can never see it).',
    'Business details (merchants): business name, description, phone or WhatsApp number, listings, prices, locations and photos you upload.',
    'Messages and bookings: the notes and messages you exchange with other users, booking dates and times, and any phone number you choose to share in a conversation.',
    'Reviews and reports: star ratings, comments, replies, and reports you send about listings, reviews or users.',
    'Payments (merchants): which plan you paid for, the amount, the date and the payment reference. Card details are handled by the payment provider, never by Servly.',
    'Device information: if you allow notifications, a notification address for your device so we can send you message and booking alerts.',
  ] },
  { heading: 'How we use it', body: [
    'To run the marketplace: show listings, connect customers with merchants, deliver messages, manage bookings and send reminders.',
    'To manage merchant plans, receipts and support requests.',
    'To keep Servly safe: investigate reports, remove harmful content, and prevent fraud and abuse.',
    'We do not sell your personal information.',
  ] },
  { heading: 'Who can see your information', body: [
    'Public: listings, business names and descriptions, prices, locations, photos, reviews and merchant replies. A merchant\'s phone number is public only if they turn on "Show my phone number to customers".',
    'Only the two people in a conversation can read its messages and bookings.',
    'Service providers who help us run Servly (hosting and database: Supabase; notifications: Expo; email and payments providers once connected) process data only on our behalf.',
    'We may share information if the law requires it, or to protect the safety of users.',
  ] },
  { heading: 'How long we keep it', body: [
    'We keep your information while your account is open. When you delete your account, your profile, listings, photos, messages, bookings and reviews are deleted. Payment records are kept without your name for our accounting and legal obligations.',
  ] },
  { heading: 'Your choices and rights', body: [
    'You can view and edit your details in Account, hide your phone number, block other users, and delete your account at any time (Account > Delete my account).',
    `You can ask us for a copy of your information or ask us to correct it by contacting ${CONTACT}.`,
  ] },
  { heading: 'Security', body: [
    'Your data is stored with Supabase, protected by access rules that limit each person to their own information. No system is perfectly secure, so please use a strong, unique password.',
  ] },
  { heading: 'Children', body: [
    'Servly is not intended for children under 16. Please do not create an account if you are under 16.',
  ] },
  { heading: 'Changes and contact', body: [
    `We may update this policy and will show the new date at the top. Questions? Contact ${CONTACT}.`,
  ] },
];

export const TERMS: Section[] = [
  { heading: 'About these terms', body: [
    `These terms are an agreement between you and ${SELLER.name} for using the Servly AG app and website. By creating an account or using Servly, you agree to them.`,
  ] },
  { heading: 'What Servly is', body: [
    'Servly is a marketplace that connects customers with independent local service providers ("merchants"). Servly does not provide the services listed and is not a party to agreements between customers and merchants.',
    'Merchants are responsible for their services, prices, availability, licences and the accuracy of their listings. Customers should agree the details of any job directly with the merchant.',
  ] },
  { heading: 'Your account', body: [
    'You must give accurate information, keep your password private, and be at least 16 years old. You are responsible for activity on your account.',
  ] },
  { heading: 'Merchant plans', body: [
    'Merchants pay a monthly subscription (Starter, Growth or Business) and may add the booking app. Prices are shown in the app in Eastern Caribbean dollars (XCD). Each payment covers one month; listings are hidden when a plan ends until it is renewed.',
    'Unless the law requires otherwise, subscription payments are not refundable for a month already started.',
  ] },
  { heading: 'Bookings', body: [
    'Merchants can send a booking for a customer to confirm. A confirmed booking is an arrangement between the customer and the merchant. Merchants may cancel bookings; Servly is not responsible for missed, cancelled or changed appointments.',
  ] },
  { heading: 'Reviews', body: [
    'Reviews must be honest and about a real experience with the listing. Do not post reviews for your own business, offer rewards for reviews, or post false, abusive or private information. We may remove reviews that break these rules.',
  ] },
  { heading: 'What is not allowed', body: [
    'Illegal services, scams, spam, fake listings or reviews, harassment, hate, sexual content, or sharing other people\'s personal information without permission.',
    'Trying to get around plan limits or Servly\'s security, or using Servly to contact people for unrelated marketing.',
  ] },
  { heading: 'Reports, blocking and removal', body: [
    'You can report listings, reviews and users, and block people you don\'t want to hear from. We may hide content, suspend or close accounts that break these terms.',
  ] },
  { heading: 'Liability', body: [
    'Servly is provided "as is". To the extent allowed by law, Servly is not liable for the quality, safety or legality of services listed, for disputes between users, or for indirect losses.',
  ] },
  { heading: 'Ending your account', body: [
    'You can delete your account at any time in Account > Delete my account. We may close accounts that break these terms.',
  ] },
  { heading: 'Law and contact', body: [
    `These terms are governed by the laws of Antigua and Barbuda. We may update them and will show the new date at the top. Questions? Contact ${CONTACT}.`,
  ] },
];
