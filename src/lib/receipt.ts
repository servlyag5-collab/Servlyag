import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, flag } from './theme';

// Your business details, printed at the top of every receipt. Fill in what you'd like merchants to see.
export const SELLER = { name: 'Servly AG', address: 'Antigua and Barbuda', email: '', website: 'servly.ag' };

export type Payment = {
  id: string; tier_id: string; amount: number; currency: string; booking_addon: boolean;
  provider: string; provider_ref: string | null; paid_at: string; tiers: { name: string } | null;
};

export const receiptNumber = (p: Payment) => `SRV-${new Date(p.paid_at).getFullYear()}-${p.id.slice(0, 8).toUpperCase()}`;
export const money = (p: Payment) => `${p.currency} ${Number(p.amount).toFixed(2)}`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function receiptHtml(p: Payment, business: string, email: string) {
  const ribbon = flag.map((s) => `<div style="flex:${s.flex};background:${s.color}"></div>`).join('');
  const method = p.provider === 'manual' ? 'Manual payment' : esc(p.provider);
  const date = new Date(p.paid_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const row = (a: string, b: string) => `<tr><td>${a}</td><td style="text-align:right">${b}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${receiptNumber(p)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${colors.ink};margin:0;padding:32px;background:#fff}
  .ribbon{display:flex;height:6px;border-radius:3px;overflow:hidden;margin-bottom:24px}
  h1{margin:0;font-size:28px} .muted{color:${colors.muted};font-size:14px;line-height:1.5}
  table{width:100%;border-collapse:collapse;margin-top:24px;font-size:15px}
  td{padding:10px 0;border-bottom:1px solid ${colors.border}} .total td{font-weight:800;font-size:18px;border-bottom:none}
  .head{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}
  .tag{color:${colors.blue};font-weight:800;letter-spacing:2px;font-size:12px}
</style></head><body>
  <div class="ribbon">${ribbon}</div>
  <div class="head">
    <div><div class="tag">RECEIPT</div><h1>${esc(SELLER.name)}</h1>
      <div class="muted">${[SELLER.address, SELLER.email, SELLER.website].filter(Boolean).map(esc).join('<br>')}</div></div>
    <div class="muted" style="text-align:right">Receipt no. <b>${receiptNumber(p)}</b><br>Date: ${date}<br>Status: <b>Paid</b></div>
  </div>
  <div class="muted" style="margin-top:24px">Billed to<br><b style="color:${colors.ink}">${esc(business || 'Servly merchant')}</b>${email ? `<br>${esc(email)}` : ''}</div>
  <table>
    ${row(`${esc(p.tiers?.name ?? p.tier_id)} plan, 1 month`, '')}
    ${p.booking_addon ? row('Booking app add-on, 1 month', '') : ''}
    ${row('Payment method', method + (p.provider_ref ? ` (${esc(p.provider_ref)})` : ''))}
    <tr class="total"><td>Total paid</td><td style="text-align:right">${money(p)}</td></tr>
  </table>
  <p class="muted" style="margin-top:32px">Thank you for growing your business with Servly AG. Whatever you need, someone's ready.</p>
</body></html>`;
}

// Phones: make a PDF and open the share sheet (save to Files, WhatsApp, email). Web: open Print / Save as PDF.
export async function downloadReceipt(p: Payment, business: string, email: string) {
  const html = receiptHtml(p, business, email);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) throw new Error('Please allow pop-ups for this site to download your receipt.');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Receipt ${receiptNumber(p)}` });
  } else {
    await Print.printAsync({ uri });
  }
}
