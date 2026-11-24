// Liste unique des champs de formulaire, partagée entre le site et la fonction d'envoi.
// tests/formulaires.test.js vérifie que chaque <form data-formulaire> du site
// envoie exactement ces champs, avec ces valeurs.

const METIERS = [
  'Maçon',
  'Couvreur',
  'Charpentier',
  'Plombier',
  'Chauffagiste',
  'Électricien',
  'Menuisier',
  'Carreleur',
  'Peintre',
  'Plaquiste',
  'Terrassier',
  'Paysagiste',
  'Autre métier du bâtiment',
];

const FORMULES = ['', 'Pack Google', 'Essentiel', 'Pro', 'Je ne sais pas encore'];

// type : text | email | tel | url | enum | consent | slug
const SCHEMAS = {
  contact: {
    sujet: 'Nouvelle demande de contact',
    champs: {
      entreprise:   { type: 'text',  requis: true,  max: 80,  libelle: 'Entreprise' },
      nom:          { type: 'text',  requis: true,  max: 60,  libelle: 'Nom' },
      metier:       { type: 'enum',  requis: true,  valeurs: METIERS, libelle: 'Métier' },
      commune:      { type: 'text',  requis: true,  max: 60,  libelle: 'Commune' },
      telephone:    { type: 'tel',   requis: true,  libelle: 'Téléphone' },
      email:        { type: 'email', requis: true,  max: 100, libelle: 'Email' },
      formule:      { type: 'enum',  requis: false, valeurs: FORMULES, libelle: 'Formule envisagée' },
      message:      { type: 'text',  requis: false, max: 1000, libelle: 'Message' },
      src:          { type: 'slug',  requis: false, max: 40,  libelle: 'Canal' },
      consentement: { type: 'consent', requis: true, libelle: 'Consentement' },
    },
  },
  audit: {
    sujet: "Demande d'audit gratuit de fiche Google",
    champs: {
      entreprise:    { type: 'text',  requis: true,  max: 80,  libelle: 'Entreprise' },
      nom:           { type: 'text',  requis: true,  max: 60,  libelle: 'Nom' },
      metier:        { type: 'enum',  requis: true,  valeurs: METIERS, libelle: 'Métier' },
      commune:       { type: 'text',  requis: true,  max: 60,  libelle: 'Commune' },
      telephone:     { type: 'tel',   requis: true,  libelle: 'Téléphone' },
      email:         { type: 'email', requis: true,  max: 100, libelle: 'Email' },
      fiche_google:  { type: 'url',   requis: false, max: 300, libelle: 'Lien de la fiche Google' },
      src:           { type: 'slug',  requis: false, max: 40,  libelle: 'Canal' },
      consentement:  { type: 'consent', requis: true, libelle: 'Consentement' },
    },
  },
};

// Champs techniques envoyés par tous les formulaires, jamais transmis par email.
const TECHNIQUES = ['formulaire', '_ts', '_piege'];

function nettoyer(valeur, max) {
  return String(valeur == null ? '' : valeur)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>`]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max || 200);
}

// Retourne { ok: true, valeurs } ou { ok: false, erreurs: { champ: message } }
function valider(nomFormulaire, donnees) {
  const schema = SCHEMAS[nomFormulaire];
  if (!schema) return { ok: false, erreurs: { formulaire: 'Formulaire inconnu' } };

  const erreurs = {};
  const valeurs = {};
  for (const [nom, def] of Object.entries(schema.champs)) {
    let v = nettoyer(donnees[nom], def.max || 200);

    if (def.type === 'consent') {
      if (v !== 'oui') erreurs[nom] = 'Merci de cocher la case de consentement.';
      valeurs[nom] = v;
      continue;
    }
    if (!v) {
      if (def.requis) erreurs[nom] = 'Ce champ est obligatoire.';
      valeurs[nom] = '';
      continue;
    }
    if (def.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      erreurs[nom] = 'Adresse email invalide.';
    }
    if (def.type === 'tel') {
      v = v.replace(/[^\d\s+().-]/g, '');
      if ((v.match(/\d/g) || []).length < 10 || v.length > 20) erreurs[nom] = 'Numéro de téléphone invalide.';
    }
    if (def.type === 'url' && !/^https?:\/\/[^\s]+$/i.test(v)) {
      erreurs[nom] = 'Lien invalide (il doit commencer par https://).';
    }
    if (def.type === 'enum' && !def.valeurs.includes(v)) {
      erreurs[nom] = 'Valeur non reconnue.';
    }
    if (def.type === 'slug') {
      v = v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, def.max);
    }
    valeurs[nom] = v;
  }
  return Object.keys(erreurs).length ? { ok: false, erreurs } : { ok: true, valeurs };
}

module.exports = { SCHEMAS, METIERS, FORMULES, TECHNIQUES, valider, nettoyer };
