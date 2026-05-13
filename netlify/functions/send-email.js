const emailjs = require('@emailjs/nodejs');

const ALLOWED_ORIGINS = ['https://adom.digital', 'https://www.adom.digital'];

const METIER_WHITELIST  = ['Macon','Plombier','Electricien','Carreleur','Menuisier','Peintre','Couvreur','Platrier','Chauffagiste','Autre artisan'];
const SITE_WHITELIST    = ["Non, je n'en ai jamais eu",'Oui, mais il est a refaire','Oui, j\'ai juste besoin de maintenance'];
const BUDGET_WHITELIST  = ['','Moins de 500 euros','500 a 1000 euros','Plus de 1000 euros'];
const SOURCE_WHITELIST  = ['','Google','Bouche a oreille','Reseaux sociaux','Autre'];

// In-memory IP rate limiting: max 3 requests per 60 seconds per IP
const ipMap = new Map();
const IP_WINDOW_MS  = 60_000;
const IP_MAX_HITS   = 3;

function checkIpRate(ip) {
  const now  = Date.now();
  const entry = ipMap.get(ip) || { count: 0, since: now };
  if (now - entry.since > IP_WINDOW_MS) {
    entry.count = 1;
    entry.since = now;
  } else {
    entry.count += 1;
  }
  ipMap.set(ip, entry);
  // Evict stale entries occasionally to avoid memory growth
  if (ipMap.size > 10_000) {
    for (const [k, v] of ipMap) {
      if (now - v.since > IP_WINDOW_MS) ipMap.delete(k);
    }
  }
  return entry.count > IP_MAX_HITS;
}

function sanitize(str, max) {
  return String(str || '').replace(/<[^>]*>/g, '').replace(/[<>"'`]/g, '').trim().slice(0, max);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function validatePhone(phone) {
  return /^[\d\s+\-().]{7,20}$/.test(phone);
}

function json(statusCode, headers, payload) {
  return {
    statusCode,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  'https://adom.digital',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options':       'nosniff',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, headers, { error: 'Method Not Allowed' });
  }

  // Origin check
  const origin = event.headers.origin || event.headers.referer || '';
  if (!ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    return json(403, headers, { error: 'Forbidden' });
  }

  // IP rate limiting
  const ip = (event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (checkIpRate(ip)) {
    return json(429, headers, { error: 'Too many requests' });
  }

  // Parse body
  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return json(400, headers, { error: 'Invalid JSON' });
  }

  // Timer check: submitted in < 3s → bot
  const now    = Date.now();
  const formTs = parseInt(data._ts, 10) || 0;
  if (formTs > 0 && (now - formTs) < 3000) {
    return json(429, headers, { error: 'Submission too fast' });
  }

  // Honeypot checks (silent 200 so bots think they succeeded)
  if (data._honey || data._trap || data._gotcha) {
    return json(200, headers, { ok: true });
  }

  // Sanitize
  const prenom       = sanitize(data.prenom,       50);
  const email        = sanitize(data.email,        100);
  const telephone    = sanitize(data.telephone,     20).replace(/[^\d\s+\-()]/g, '');
  const ville        = sanitize(data.ville,         60);
  const metier       = sanitize(data.metier,        50);
  const site_existant = sanitize(data.site_existant, 100);
  const budget       = sanitize(data.budget,        50);
  const source       = sanitize(data.source,        50);
  const message      = sanitize(data.message,      500);
  const style_site   = sanitize(data.style_site,    80);
  const priorite_site = sanitize(data.priorite_site, 80);
  const couleur_site = sanitize(data.couleur_site,   80);

  // Required fields
  if (!prenom || !email || !telephone || !ville || !metier || !site_existant) {
    return json(400, headers, { error: 'Missing required fields' });
  }

  // Format validation
  if (!validateEmail(email)) {
    return json(400, headers, { error: 'Invalid email' });
  }
  if (!validatePhone(telephone)) {
    return json(400, headers, { error: 'Invalid phone' });
  }

  // Whitelist validation
  if (!METIER_WHITELIST.includes(metier)) {
    return json(400, headers, { error: 'Invalid metier' });
  }
  if (!SITE_WHITELIST.includes(site_existant)) {
    return json(400, headers, { error: 'Invalid site_existant' });
  }
  if (!BUDGET_WHITELIST.includes(budget)) {
    return json(400, headers, { error: 'Invalid budget' });
  }
  if (!SOURCE_WHITELIST.includes(source)) {
    return json(400, headers, { error: 'Invalid source' });
  }

  // Send via EmailJS
  try {
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      {
        prenom, email, telephone, ville, metier,
        site_existant, budget, source, message,
        style_site, priorite_site, couleur_site,
        sent_at: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
      },
      {
        publicKey:  process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY,
      }
    );

    return json(200, headers, { ok: true });
  } catch (err) {
    console.error('EmailJS error:', err);
    return json(500, headers, { error: 'Send error' });
  }
};
