// Envoi des formulaires du site (contact, audit) par EmailJS.
// Les champs acceptés sont définis une seule fois dans ./lib/schema.js.

const emailjs = require('@emailjs/nodejs');
const { SCHEMAS, valider } = require('./lib/schema');

const DELAI_MIN_MS = 3000;        // remplissage plus rapide = robot
const FENETRE_MS = 60_000;        // limite : 3 envois par minute et par IP
const MAX_PAR_FENETRE = 3;
const parIp = new Map();

function originesAutorisees() {
  return [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL, ...(process.env.ORIGINES_AUTORISEES || '').split(',')]
    .map((o) => (o || '').trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function tropDeRequetes(ip) {
  const maintenant = Date.now();
  const e = parIp.get(ip) || { n: 0, depuis: maintenant };
  if (maintenant - e.depuis > FENETRE_MS) { e.n = 0; e.depuis = maintenant; }
  e.n += 1;
  parIp.set(ip, e);
  if (parIp.size > 5000) {
    for (const [k, v] of parIp) if (maintenant - v.depuis > FENETRE_MS) parIp.delete(k);
  }
  return e.n > MAX_PAR_FENETRE;
}

function reponse(statusCode, corps, origine) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  };
  if (origine) {
    headers['Access-Control-Allow-Origin'] = origine;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers.Vary = 'Origin';
  }
  return { statusCode, headers, body: JSON.stringify(corps) };
}

exports.handler = async (event) => {
  const origine = (event.headers.origin || '').replace(/\/$/, '');
  const autorisees = originesAutorisees();
  // Les requêtes du même site n'envoient pas toujours Origin : on retombe sur Referer.
  const source = origine || (event.headers.referer || '').replace(/^(https?:\/\/[^/]+).*$/, '$1');
  const origineOk = autorisees.length === 0 || autorisees.includes(source);
  const cors = origineOk && origine ? origine : null;

  if (event.httpMethod === 'OPTIONS') return reponse(204, {}, cors);
  if (event.httpMethod !== 'POST') return reponse(405, { erreur: 'Méthode non autorisée' }, cors);
  if (!origineOk) return reponse(403, { erreur: 'Origine non autorisée' }, null);

  const ip = (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnue';
  if (tropDeRequetes(ip)) return reponse(429, { erreur: 'Trop de demandes. Réessayez dans une minute.' }, cors);

  if ((event.body || '').length > 10_000) return reponse(413, { erreur: 'Demande trop longue' }, cors);

  let donnees;
  try {
    donnees = JSON.parse(event.body || '{}');
  } catch {
    return reponse(400, { erreur: 'Format invalide' }, cors);
  }

  // Champ piège rempli : on répond « ok » sans rien envoyer, pour ne pas renseigner le robot.
  if (donnees._piege) return reponse(200, { ok: true }, cors);

  const ts = parseInt(donnees._ts, 10);
  if (!ts || Date.now() - ts < DELAI_MIN_MS) {
    return reponse(400, { erreur: 'Envoi trop rapide. Patientez quelques secondes et réessayez.' }, cors);
  }

  const nomFormulaire = String(donnees.formulaire || '');
  const resultat = valider(nomFormulaire, donnees);
  if (!resultat.ok) return reponse(400, { erreur: 'Certains champs sont à corriger.', champs: resultat.erreurs }, cors);

  const schema = SCHEMAS[nomFormulaire];
  const details = Object.entries(schema.champs)
    .map(([nom, def]) => `${def.libelle} : ${resultat.valeurs[nom] || '—'}`)
    .join('\n');

  if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID) {
    console.error('EmailJS non configuré : variables EMAILJS_* manquantes');
    return reponse(503, { erreur: "L'envoi n'est pas encore configuré. Appelez-nous directement." }, cors);
  }

  try {
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      {
        sujet: `${schema.sujet} — ${resultat.valeurs.entreprise}`,
        formulaire: nomFormulaire,
        details,
        reply_to: resultat.valeurs.email,
        envoye_le: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
      },
      { publicKey: process.env.EMAILJS_PUBLIC_KEY, privateKey: process.env.EMAILJS_PRIVATE_KEY }
    );
    return reponse(200, { ok: true }, cors);
  } catch (err) {
    console.error('Erreur EmailJS', err && err.status, err && err.text);
    return reponse(502, { erreur: "L'envoi a échoué. Réessayez ou appelez-nous." }, cors);
  }
};
