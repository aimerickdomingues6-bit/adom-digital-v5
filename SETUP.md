# ADOM Digital V5 — Setup & Configuration

## 1. Structure des fichiers

```
adom-digital-v5/
├── index.html                        ← Site complet (CSS + JS inline)
├── netlify/
│   └── functions/
│       └── send-email.js             ← Fonction Netlify pour l'envoi d'email
└── SETUP.md                          ← Ce fichier
```

## 2. Déploiement Netlify

### Option A — Drag & Drop (le plus simple)
1. Aller sur https://app.netlify.com
2. Glisser le dossier `adom-digital-v5/` dans la zone de dépôt
3. Netlify crée automatiquement le site + détecte les Functions

### Option B — CLI Netlify
```bash
npm install -g netlify-cli
netlify deploy --dir . --functions netlify/functions --prod
```

## 3. Variables d'environnement Netlify

Dans Netlify → Site settings → Environment variables, ajouter :

| Nom de la variable       | Description                                      |
|--------------------------|--------------------------------------------------|
| `EMAILJS_SERVICE_ID`     | ID du service EmailJS (ex: `service_xxxxxxx`)   |
| `EMAILJS_TEMPLATE_ID`    | ID du template EmailJS (ex: `template_xxxxxxx`) |
| `EMAILJS_PUBLIC_KEY`     | Clé publique EmailJS (Account → API Keys)       |
| `EMAILJS_PRIVATE_KEY`    | Clé privée EmailJS (Account → API Keys)         |

## 4. Configuration EmailJS

1. Créer un compte sur https://emailjs.com
2. **Service** : Connecter votre boîte Gmail/Outlook/SMTP personnalisé
3. **Template** : Créer un template avec ces variables :
   - `{{prenom}}` — Prénom du prospect
   - `{{email}}` — Email du prospect
   - `{{telephone}}` — Téléphone
   - `{{ville}}` — Ville / CP
   - `{{metier}}` — Corps de métier
   - `{{site_existant}}` — A-t-il déjà un site ?
   - `{{budget}}` — Budget approximatif
   - `{{source}}` — Comment il vous a trouvé
   - `{{message}}` — Description du projet
   - `{{style_site}}` — Style configurateur
   - `{{priorite_site}}` — Priorité configurateur
   - `{{couleur_site}}` — Couleurs configurateur
   - `{{sent_at}}` — Date et heure d'envoi

4. **Clés API** : Account → API Keys → noter Public Key + Private Key
5. **Installation de la dépendance Netlify Function** :
   - Créer un fichier `package.json` à la racine :
   ```json
   {
     "name": "adom-digital",
     "version": "1.0.0",
     "dependencies": {
       "@emailjs/nodejs": "^4.0.3"
     }
   }
   ```
   - Netlify installe automatiquement les dépendances lors du déploiement

## 5. Configuration Calendly

1. Créer un compte sur https://calendly.com
2. Créer un type d'événement "Appel découverte 15 min"
3. Dans `index.html`, remplacer toutes les occurrences de :
   `https://calendly.com/adom-digital/15min`
   par votre URL Calendly personnelle

## 6. Personnalisation à compléter dans index.html

Rechercher et remplacer les placeholders suivants :
- `[A completer]` → Votre adresse postale
- `[SIREN a completer]` → Votre numéro SIREN
- `[Email a completer]` → Votre email professionnel
- `[Telephone a completer]` → Votre numéro de téléphone

## 7. Headers HTTP recommandés (fichier _headers Netlify)

Créer un fichier `_headers` à la racine pour renforcer la sécurité :

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' images.unsplash.com data:; connect-src 'self'; frame-ancestors 'none';
```

## 8. Image OG (recommandé)

Créer une image `og-image.jpg` de 1200×630px et la placer à la racine.
Format : Logo ADOM + tagline sur fond sombre (#0D1117).

## 9. Checklist avant mise en ligne

- [ ] Variables d'environnement Netlify configurées
- [ ] Template EmailJS créé et testé
- [ ] URL Calendly remplacée dans index.html
- [ ] Mentions légales complétées (SIREN, adresse, email, téléphone)
- [ ] Image og-image.jpg créée et uploadée
- [ ] Domaine adom.digital configuré dans Netlify
- [ ] HTTPS actif (automatique avec Netlify)
- [ ] Test formulaire en production (1 envoi réel)
- [ ] Test Google PageSpeed Insights (viser 90+)
- [ ] Soumettre le sitemap à Google Search Console
