// Vérifie que les formulaires du site et la fonction d'envoi parlent la même langue.
// Lancer : node tests/formulaires.test.js
const fs = require('fs');
const path = require('path');
const Module = require('module');
const assert = require('assert');

const racine = path.join(__dirname, '..');
const { SCHEMAS, METIERS, FORMULES, TECHNIQUES } = require('../netlify/functions/lib/schema');

// EmailJS simulé : aucun email réel n'est envoyé pendant les tests
const envois = [];
const chargerOriginal = Module._load;
Module._load = function (req, ...rest) {
  if (req === '@emailjs/nodejs') return { send: async (...a) => { envois.push(a); return { status: 200 }; } };
  return chargerOriginal.call(this, req, ...rest);
};
const { handler } = require('../netlify/functions/send-email');

let echecs = 0;
function test(nom, fn) {
  return Promise.resolve().then(fn).then(
    () => console.log('ok   ' + nom),
    (e) => { echecs++; console.log('ÉCHEC ' + nom + '\n     ' + e.message); }
  );
}

function formulairesDe(fichier) {
  const html = fs.readFileSync(path.join(racine, fichier), 'utf8');
  const out = {};
  const re = /<form[^>]*data-formulaire="([^"]+)"[^>]*>([\s\S]*?)<\/form>/g;
  let m;
  while ((m = re.exec(html))) {
    const noms = new Set();
    for (const n of m[2].matchAll(/<(?:input|select|textarea)[^>]*\bname="([^"]+)"/g)) noms.add(n[1]);
    const options = {};
    for (const s of m[2].matchAll(/<select[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
      options[s[1]] = [...s[2].matchAll(/<option value="([^"]*)"/g)].map((o) => o[1]);
    }
    out[m[1]] = { noms, options };
  }
  return out;
}

const pages = { 'index.html': 'contact', 'audit/index.html': 'audit' };
const valides = {
  contact: { entreprise: 'Maçonnerie Dupuis', nom: 'P. Dupuis', metier: 'Maçon', commune: 'Troyes', telephone: '06 12 34 56 78', email: 'contact@exemple.fr', formule: 'Essentiel', message: 'Bonjour', consentement: 'oui' },
  audit: { entreprise: 'Toitures R.', nom: 'R. Martin', metier: 'Couvreur', commune: 'Romilly-sur-Seine', telephone: '0612345678', email: 'r@exemple.fr', fiche_google: 'https://maps.app.goo.gl/abc', consentement: 'oui' },
};

function evenement(corps, origin = 'https://adom.digital') {
  return { httpMethod: 'POST', headers: { origin, 'x-forwarded-for': String(Math.random()) }, body: JSON.stringify(corps) };
}

(async () => {
  process.env.URL = 'https://adom.digital';
  process.env.EMAILJS_SERVICE_ID = 's'; process.env.EMAILJS_TEMPLATE_ID = 't';
  process.env.EMAILJS_PUBLIC_KEY = 'p'; process.env.EMAILJS_PRIVATE_KEY = 'k';

  for (const [fichier, nom] of Object.entries(pages)) {
    const f = formulairesDe(fichier)[nom];
    await test(`${fichier} contient le formulaire « ${nom} »`, () => assert.ok(f));
    await test(`${nom} : champs du HTML = champs attendus par la fonction`, () => {
      const attendus = Object.keys(SCHEMAS[nom].champs).filter((c) => c !== 'src').sort();
      const html = [...f.noms].filter((c) => !TECHNIQUES.includes(c)).sort();
      assert.deepStrictEqual(html, attendus);
    });
    await test(`${nom} : liste des métiers identique`, () => assert.deepStrictEqual(f.options.metier.slice(1), METIERS));
    if (f.options.formule) {
      await test(`${nom} : liste des formules identique`, () => assert.deepStrictEqual([...f.options.formule].sort(), [...FORMULES].sort()));
    }
  }

  for (const nom of Object.keys(valides)) {
    const ok = { ...valides[nom], formulaire: nom, _ts: String(Date.now() - 10000), src: 'courrier' };
    await test(`${nom} : une demande valide est acceptée et envoyée`, async () => {
      const avant = envois.length;
      const r = await handler(evenement(ok));
      assert.strictEqual(r.statusCode, 200, r.body);
      assert.strictEqual(envois.length, avant + 1);
      assert.match(envois[envois.length - 1][2].details, /Canal : courrier/);
    });
    await test(`${nom} : champ piège rempli → 200 sans envoi`, async () => {
      const avant = envois.length;
      const r = await handler(evenement({ ...ok, _piege: 'spam' }));
      assert.strictEqual(r.statusCode, 200);
      assert.strictEqual(envois.length, avant);
    });
    await test(`${nom} : envoi trop rapide → refusé`, async () => {
      const r = await handler(evenement({ ...ok, _ts: String(Date.now()) }));
      assert.strictEqual(r.statusCode, 400);
    });
    await test(`${nom} : sans consentement → refusé`, async () => {
      const r = await handler(evenement({ ...ok, consentement: '' }));
      assert.strictEqual(r.statusCode, 400);
      assert.ok(JSON.parse(r.body).champs.consentement);
    });
    await test(`${nom} : métier inconnu → refusé`, async () => {
      const r = await handler(evenement({ ...ok, metier: '<script>' }));
      assert.strictEqual(r.statusCode, 400);
    });
    await test(`${nom} : balises HTML retirées`, async () => {
      const r = await handler(evenement({ ...ok, entreprise: '<b>Dupuis</b><img src=x onerror=alert(1)>' }));
      assert.strictEqual(r.statusCode, 200);
      assert.doesNotMatch(envois[envois.length - 1][2].details, /</);
    });
    await test(`${nom} : autre origine → 403`, async () => {
      const r = await handler(evenement(ok, 'https://pirate.example'));
      assert.strictEqual(r.statusCode, 403);
    });
  }

  await test('formulaire inconnu → refusé', async () => {
    const r = await handler(evenement({ formulaire: 'xxx', _ts: String(Date.now() - 10000) }));
    assert.strictEqual(r.statusCode, 400);
  });
  await test('téléphone trop court → refusé', async () => {
    const r = await handler(evenement({ ...valides.contact, telephone: '0612', formulaire: 'contact', _ts: String(Date.now() - 10000) }));
    assert.strictEqual(r.statusCode, 400);
  });

  console.log(echecs ? `\n${echecs} test(s) en échec` : '\nTous les tests de formulaires passent.');
  process.exit(echecs ? 1 : 0);
})();
