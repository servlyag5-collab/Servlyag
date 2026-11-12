import { SELLER } from './receipt';

// DRAFT legal text for Servly AG. Have a lawyer in Antigua and Barbuda review it before launch.
// Edit the words here; the Privacy Policy and Terms screens show whatever is in these lists.
// Each section is a heading and one or more paragraphs.
export const LEGAL_UPDATED = 'November 2026';
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
    'Call button taps: when anyone taps Call on a listing or business profile, we record which business and listing, and when, to count how many people contacted each business. We do not record who tapped, their phone number, or anything about the call itself.',
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
    'Service providers who help us run Servly (hosting and database: Supabase; notifications: Expo; emails such as password resets: Resend; the payment provider once connected) process data only on our behalf.',
    'We may share information if the law requires it, or to protect the safety of users.',
  ] },
  { heading: 'How long we keep it', body: [
    'We keep your information while your account is open. When you delete your account, your profile, listings, photos, messages and bookings, and the reviews of your listings, are deleted. Reviews you wrote about other businesses stay on their listings without your name (shown as "Customer"), so their customers can still see them. Payment records are kept without your name for our accounting and legal obligations.',
  ] },
  { heading: 'Your choices and rights', body: [
    'You can view and edit your details in Account, hide your phone number, block other users, and delete your account at any time (Account > Delete my account).',
    `You can ask us for a copy of your information or ask us to correct it by contacting ${CONTACT}.`,
  ] },
  { heading: 'Security', body: [
    'Card payments: you type your card details on the secure payment page of our payment provider (CyberSource, a Visa company, through Antigua Commercial Bank), over an encrypted (HTTPS) connection. Servly never sees, receives or stores your full card number or security code. If you choose automatic monthly payments, the provider keeps your card as a secure token, and Servly only keeps the card type and its last 4 digits to show you which card is used.',
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
    'Merchants pay a monthly subscription (Starter, Growth or Business) and may upgrade to bookings (the booking app). Prices are shown in the app in Eastern Caribbean dollars (XCD). Each payment covers one month; listings are hidden when a plan ends until it is renewed.',
    'Plans renew monthly until cancelled. How to cancel, and when payments can be refunded, is explained in our Refund and Cancellation Policy, which is part of these terms.',
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
    'Misleading listings: search tags, titles or descriptions for services the business does not offer, for example adding unrelated tags so a listing shows up in more searches. Such listings may be hidden, suspended or removed, and repeated misuse can lead to the account being closed.',
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

// Refund and Cancellation Policy (servlyag.com/refunds). Owner's rules (Oct 2026): no refund once a month
// has started; cancel by turning automatic payments off on Account (v33, 2026-11-10) or through Contact
// support; a failed automatic payment is retried for 3 days; billing mistakes reported within 30 days are refunded.
export const REFUNDS: Section[] = [
  { heading: 'About this policy', body: [
    'This policy covers payments made to Servly AG: monthly merchant plans (Starter, Growth and Business) and the bookings upgrade (the booking app). Prices are in Eastern Caribbean dollars (XCD).',
    'Servly does not take payment for the services merchants offer. If you paid a merchant for a haircut, a delivery or any other service, refunds for that service are between you and the merchant.',
  ] },
  { heading: 'How monthly plans work', body: [
    'Each payment covers one month, starting when the plan is activated. When you pay by card, the card is saved securely by our payment provider (Servly never sees the full card number) and charged automatically on each renewal date (the end date shown on your Account page), until automatic payments are turned off or the plan is cancelled.',
    'If an automatic payment does not go through, we try the card again on each of the next 3 days and let you know each time. Your listings stay visible during those 3 days. If no payment goes through, the plan ends and the listings are hidden from customers until it is renewed.',
  ] },
  { heading: 'Delivery', body: [
    'Servly plans are a digital service: nothing is shipped. Your plan starts as soon as your payment is confirmed (usually within a minute), and your listings become visible to customers straight away. Your receipt is on your Account page and can be downloaded as a PDF.',
  ] },
  { heading: 'Exchanges', body: [
    'Plans can\'t be exchanged for another plan or for money. You can change plan at any time on the Plan screen: a bigger plan starts straight away; a smaller plan starts when the month you have paid for ends.',
  ] },
  { heading: 'Cancelling', body: [
    `You can cancel at any time: on your Account page, turn off "Pay automatically each month". You can also open the ☰ menu > Contact support and choose Billing, or email ${CONTACT}, and we will confirm your cancellation.`,
    'To avoid the next charge, please turn automatic payments off (or cancel) before your renewal date (shown on your Account page). After you cancel, your plan keeps working until the end of the month you have paid for. Then it ends and your listings are hidden. Your account and listings are kept, so you can renew later.',
  ] },
  { heading: 'Refunds', body: [
    'Once a month has started, the payment for that month is not refundable, including for unused days or features, unless the law requires otherwise.',
    'This also applies if listings are hidden or removed because they broke our Terms of Service.',
  ] },
  { heading: 'Billing mistakes', body: [
    `If you were charged by mistake (for example charged twice, charged after we confirmed your cancellation, or charged the wrong amount), tell us within 30 days of the charge through Contact support or ${CONTACT}. We will refund the amount charged by mistake.`,
    'Refunds go back to the card or account you paid with. Your bank may take several business days to show it.',
    'If something looks wrong on your statement, please contact us before disputing the charge with your bank. We can usually fix it faster.',
  ] },
  { heading: 'Price changes', body: [
    'If a plan price changes, we will tell merchants before the new price applies to their next payment.',
  ] },
  { heading: 'Law and contact', body: [
    `This policy is governed by the laws of Antigua and Barbuda and does not affect any rights you have under that law. We may update it and will show the new date at the top. Questions? Contact ${CONTACT}.`,
  ] },
];

// Public Plans and pricing page (servlyag.com/pricing), for visitors and the bank's review. Visitors can't
// read the tiers table, so the prices are written here: KEEP IN STEP with the tiers and addons tables
// (Starter 50, Growth 100, Business 170, bookings upgrade 25 XCD a month).
export const PRICING: Section[] = [
  { heading: 'What Servly is', body: [
    'Servly AG is a marketplace for local services in Antigua and Barbuda. Customers search and contact businesses for free. Businesses pay a monthly plan to list their services.',
    'All prices are in Eastern Caribbean dollars (XCD). Each payment covers one month of the plan.',
  ] },
  { heading: 'Starter: 50 XCD per month', body: [
    '1 service listing, with up to 5 photos, prices and opening hours.',
    'A public business profile, customer messages in the app, and a Call button.',
    'Optional bookings upgrade: +25 XCD per month.',
  ] },
  { heading: 'Growth: 100 XCD per month', body: [
    'Up to 2 service listings.',
    'Everything in Starter, plus priority placement in search results.',
    'Optional bookings upgrade: +25 XCD per month.',
  ] },
  { heading: 'Business: 170 XCD per month', body: [
    'Up to 4 service listings.',
    'Everything in Growth, with top placement in search results.',
    'Bookings included: customers book you right in the app.',
  ] },
  { heading: 'Bookings upgrade: 25 XCD per month', body: [
    'Send customers a booking with a date and time from the chat; they confirm in the app, and both get reminders before the day. Included in Business; an upgrade for Starter and Growth.',
  ] },
  { heading: 'Paying', body: [
    'Pay by Visa or Mastercard on our payment provider\'s secure page (CyberSource, through Antigua Commercial Bank). Servly never sees your card number.',
    'Your plan renews every month on its renewal date. You can turn automatic payments off at any time on your Account page. There is no refund once a month has started; see our Refund and Cancellation Policy.',
    'To choose a plan, create a free account in the Servly app or on servlyag.com, then open Plan.',
  ] },
  { heading: 'Who can use Servly', body: [
    'Plans are for businesses and self-employed people offering services in Antigua and Barbuda. Servly sells a digital listing service only: no goods are sold or shipped, so there are no export restrictions.',
  ] },
];

// Contact page (servlyag.com/contact). SUPPORT_PHONE: add the business number when it is ready.
export const SUPPORT_PHONE = '';
export const CONTACT_PAGE: Section[] = [
  { heading: 'Servly AG', body: [
    SELLER.address,
    ...(SUPPORT_PHONE ? [`Phone: ${SUPPORT_PHONE}`] : []),
    `Email: ${SELLER.email}`,
  ] },
  { heading: 'Help with your account or plan', body: [
    'In the app, open the ☰ menu and choose Contact support. We reply in the app, usually within one business day.',
    `You can also email us at ${SELLER.email}.`,
  ] },
  { heading: 'Questions about a service you booked', body: [
    'Services are provided by the businesses listed on Servly, not by Servly. Please contact the business first, using Send a note or Call on its listing.',
  ] },
];
