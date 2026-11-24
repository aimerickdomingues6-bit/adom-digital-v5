// Vérifie le calcul de l'estimateur et le moteur de l'assistant de démonstration.
// Lancer : node tests/estimateur.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const racine = path.join(__dirname, '..');
const contexte = { window: {}, document: { addEventListener() {} }, Promise, console };
vm.createContext(contexte);
vm.runInContext(fs.readFileSync(path.join(racine, 'assets/demo.js'), 'utf8'), contexte);
const estimer = contexte.window.ADOMEstimer;
const creerMoteur = contexte.window.ADOMCreerMoteur;
const grille = JSON.parse(fs.readFileSync(path.join(racine, 'demo/macon/grille.json'), 'utf8'));
const faq = JSON.parse(fs.readFileSync(path.join(racine, 'demo/macon/faq-assistant.json'), 'utf8'));

let echecs = 0;
async function test(nom, fn) {
  try { await fn(); console.log('ok   ' + nom); } catch (e) { echecs++; console.log('ÉCHEC ' + nom + '\n     ' + e.message); }
}

(async () => {
  for (const t of grille.travaux) {
    await test(`${t.id} : fourchette cohérente pour une quantité courante`, () => {
      const q = t.unite === 'ouverture' ? 1 : 20;
      const r = estimer(grille, t.id, q, 'z1', []);
      assert.ok(r.bas > 0 && r.haut > r.bas, JSON.stringify(r));
      assert.strictEqual(r.bas % 50, 0); assert.strictEqual(r.haut % 50, 0);
      assert.ok(r.bas >= t.minimum);
    });
    await test(`${t.id} : 0, négatif, vide → erreur`, () => {
      for (const q of [0, -5, NaN]) assert.ok(estimer(grille, t.id, q, 'z1', []).erreur);
    });
    await test(`${t.id} : 10 000 → hors grille`, () => {
      assert.ok(estimer(grille, t.id, 10000, 'z1', []).horsGrille);
    });
    await test(`${t.id} : très petite quantité → forfait minimum, fourchette non nulle`, () => {
      const q = t.unite === 'ouverture' ? 1 : 0.5;
      const r = estimer(grille, t.id, q, 'z1', []);
      assert.ok(r.haut > r.bas);
    });
  }
  await test('déplacement et accès difficile augmentent la fourchette', () => {
    const a = estimer(grille, 'dalle', 30, 'z1', []);
    const b = estimer(grille, 'dalle', 30, 'z3', ['acces']);
    assert.ok(b.bas > a.bas && b.haut > a.haut);
  });
  await test('ouverture : nombre décimal refusé', () => {
    assert.ok(estimer(grille, 'ouverture', 1.5, 'z1', []).erreur);
  });
  await test('travaux inconnus → erreur', () => {
    assert.ok(estimer(grille, 'piscine', 10, 'z1', []).erreur);
  });

  const repondre = creerMoteur(faq);
  const cas = [
    ['Vous êtes assuré en décennale ?', 'decennale'],
    ['quel délai pour commencer', 'delai'],
    ['Vous allez jusqu\'à Romilly ?', 'zone'],
    ['combien de temps dure le chantier', 'duree'],
    ['faut il un permis de construire pour un mur', 'autorisation'],
    ['ACOMPTE ?', 'acompte'],
    ['on peut couler en hiver avec le gel', 'saison'],
  ];
  for (const [q, id] of cas) {
    await test(`assistant : « ${q} » → ${id}`, async () => {
      const r = await repondre(q);
      assert.strictEqual(r.id, id, r.texte);
    });
  }
  await test('assistant : question hors sujet → réponse « je n\'ai pas la réponse »', async () => {
    const r = await repondre('quelle est la capitale du Pérou');
    assert.strictEqual(r.id, null);
  });
  await test('assistant : chaque suggestion existe', () => {
    for (const id of faq.suggestions) assert.ok(faq.reponses.some((r) => r.id === id), id);
  });

  console.log(echecs ? `\n${echecs} test(s) en échec` : '\nTous les tests de l\'estimateur et de l\'assistant passent.');
  process.exit(echecs ? 1 : 0);
})();
