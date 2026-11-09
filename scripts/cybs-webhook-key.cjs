// Creates the CyberSource TEST webhook "digital signature key" (POST /kms/egress/v2/keys-sym).
// Run it yourself in a terminal:  node scripts/cybs-webhook-key.cjs
//
// It asks for your TEST REST key (Key Management > REST - Shared Secret): the key ID and the shared
// secret. They are typed in hidden, used once, and never saved or sent anywhere except CyberSource.
// The new key is shown ONCE on screen: copy the Key ID and Key into your password manager, then close
// the terminal. Nothing is written to disk. Don't run it again unless you want a new key: a new key
// replaces the old one.
const crypto = require('crypto');
const readline = require('readline');

const HOST = 'apitest.cybersource.com'; // test (sandbox) only
const PATH = '/kms/egress/v2/keys-sym';
const DEFAULT_ORG = 'servlyag_1793983604';

function ask(question, hidden) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.startsWith(question)) rl.output.write(question); else rl.output.write(s.includes('\n') ? '\n' : '*'); };
    }
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a.trim()); });
  });
}

function signedHeaders(org, keyId, secret, body, dateHeader) {
  const date = new Date().toUTCString();
  const digest = 'SHA-256=' + crypto.createHash('sha256').update(body, 'utf8').digest('base64');
  const lines = [
    `host: ${HOST}`,
    `${dateHeader}: ${date}`,
    `request-target: post ${PATH}`,
    `digest: ${digest}`,
    `v-c-merchant-id: ${org}`,
  ].join('\n');
  const sig = crypto.createHmac('sha256', Buffer.from(secret, 'base64')).update(lines, 'utf8').digest('base64');
  return {
    'content-type': 'application/json',
    host: HOST,
    date,
    'v-c-date': date,
    'v-c-merchant-id': org,
    digest,
    signature: `keyid="${keyId}", algorithm="HmacSHA256", headers="host ${dateHeader} request-target digest v-c-merchant-id", signature="${sig}"`,
  };
}

(async () => {
  console.log('CyberSource TEST: create the webhook digital signature key\n');
  const org = (await ask(`Organization ID [${DEFAULT_ORG}]: `)) || DEFAULT_ORG;
  const keyId = await ask('REST key ID (Key Management > REST - Shared Secret): ');
  const secret = await ask('REST shared secret (hidden): ', true);
  if (!keyId || !secret) { console.log('Key ID and shared secret are both needed. Nothing was sent.'); process.exit(1); }

  const body = JSON.stringify({
    clientRequestAction: 'CREATE',
    keyInformation: { provider: 'nrtd', tenant: org, keyType: 'sharedSecret', organizationId: org, expiryDuration: '365' },
  });

  let res, text;
  // CyberSource's guide names the signed date header both "date" and "v-c-date"; try one, then the other
  // only if the first is refused as not authorised (so a key is never created twice).
  for (const dateHeader of ['date', 'v-c-date']) {
    res = await fetch(`https://${HOST}${PATH}`, { method: 'POST', headers: signedHeaders(org, keyId, secret, body, dateHeader), body });
    text = await res.text();
    if (res.status !== 401) break;
  }

  let data = {};
  try { data = JSON.parse(text); } catch {}
  const k = data.keyInformation || {};
  if (res.ok && k.keyId && k.key) {
    console.log('\nSuccess. Copy these two into your password manager NOW (shown only this once):\n');
    console.log(`  Webhook Key ID : ${k.keyId}`);
    console.log(`  Webhook Key    : ${k.key}`);
    if (k.expirationDate) console.log(`  Expires        : ${k.expirationDate}`);
    console.log('\nDon\'t share them in chat or email. Then close this terminal window.');
  } else {
    console.log(`\nCyberSource said no (HTTP ${res.status}). No key was saved.`);
    // Show only CyberSource's reason, never the keys.
    console.log('Reason:', data.message || data.reason || (data.errorInformation && data.errorInformation.message) || data.status || text.slice(0, 300));
    console.log('\nCheck: the REST key is a TEST key, is Active, and the key ID and secret were copied exactly.');
    process.exit(1);
  }
})();
