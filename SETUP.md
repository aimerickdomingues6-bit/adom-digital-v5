# ADOM Digital — mise en route

## 1. Structure

```
index.html                  Accueil (devis interactif, démo, FAQ, contact)
audit/                      Page d'arrivée de l'audit gratuit (QR code du courrier, partenaires)
demo/macon/                 Site démo d'un maçon fictif (non indexé)
  grille.json               Grille de prix de l'estimateur
  faq-assistant.json        Réponses préparées de l'assistant
  demo-macon.css            Charte propre à l'artisan fictif
mentions-legales/ confidentialite/ cookies/ cgv/   Pages légales
404.html, robots.txt, sitemap.xml, og-image.png, favicon.svg
assets/site.css             Charte et composants
assets/site.js              Cookies, formulaires, devis interactif
assets/demo.js              Estimateur et assistant (réutilisables sur les sites clients)
fonts/                      Archivo et Atkinson Hyperlegible Next (licence OFL incluse)
netlify/functions/send-email.js   Envoi des formulaires
netlify/functions/lib/schema.js   Liste unique des champs de formulaire
tests/                      npm test
```

## 2. Déploiement Netlify

1. Netlify → Add new site → Import from GitHub → `adom-digital-v5`.
2. Aucun réglage de build : `netlify.toml` indique le dossier publié (`.`) et les fonctions.
3. Domaine : ajouter le domaine définitif, puis remplacer `https://adom.digital` partout
   (balises canonical et og, `sitemap.xml`, `robots.txt`) si le domaine est différent.

## 3. Variables d'environnement (Netlify → Site configuration → Environment variables)

| Variable | Rôle |
| --- | --- |
| `EMAILJS_SERVICE_ID` | Service EmailJS |
| `EMAILJS_TEMPLATE_ID` | Modèle d'email (voir ci-dessous) |
| `EMAILJS_PUBLIC_KEY` | Clé publique EmailJS |
| `EMAILJS_PRIVATE_KEY` | Clé privée EmailJS |
| `ORIGINES_AUTORISEES` | Facultatif : autres domaines autorisés à envoyer les formulaires, séparés par des virgules |

Sans les variables EmailJS, les formulaires affichent « L'envoi n'est pas encore configuré ».

Modèle EmailJS : objet `{{sujet}}`, corps `{{details}}` puis `Reçu le {{envoye_le}}`,
« Reply-To » = `{{reply_to}}`. Dans EmailJS → Account → Security, activer l'accès API
pour les applications non navigateur (la fonction appelle EmailJS depuis le serveur).

## 4. Suivre les canaux d'acquisition

Chaque canal a son lien vers la page audit, avec un code `src` :

| Canal | Lien à utiliser |
| --- | --- |
| Courrier avec audit imprimé (QR code) | `/audit/?src=courrier` |
| Vidéo avant/après de fiche Google | `/audit/?src=video` |
| Expert-comptable (un code par cabinet) | `/audit/?src=comptable-nomducabinet` |
| Chambre de métiers | `/audit/?src=cma` |

Le code arrive dans l'email de chaque demande (ligne « Canal »). Il est conservé pendant toute
la visite, même si le prospect passe par l'accueil avant de remplir le formulaire de contact.

## 5. Mesure d'audience (facultatif)

Renseigner `GA_ID` en haut de `assets/site.js`. Le bandeau cookies apparaît alors
automatiquement, et Google Analytics ne se charge qu'après acceptation. Sans `GA_ID`, aucun
cookie facultatif n'est déposé et le bandeau ne s'affiche que via « Gérer les cookies ».

## 6. Adapter la démo à un vrai client

1. Copier `demo/macon/` vers le site du client.
2. Remplacer `grille.json` par sa grille (prix HT bas et haut par unité, forfait minimum,
   quantité maximale, zones et frais de déplacement).
3. Faire relire et valider chaque réponse de `faq-assistant.json` par l'artisan.
4. Brancher plus tard une IA : remplacer uniquement `getAnswer()` dans `assets/demo.js` par un
   appel à une fonction serveur, et afficher la mention « assistant IA » (AI Act, art. 50).

## 7. Tests

```
npm test
```

Vérifie que les formulaires HTML et la fonction d'envoi utilisent les mêmes champs et les mêmes
valeurs, que le spam est rejeté, et que l'estimateur et l'assistant répondent correctement.

## 8. À compléter avant la mise en ligne

Rechercher `À COMPLÉTER` dans le dépôt : chaque occurrence est surlignée en jaune sur le site.

- Téléphone et email (pied de page, contact, mentions, CGV, confidentialité)
- Adresse, SIREN, SIRET, immatriculation (mentions légales, CGV)
- Assurance RC Pro (mentions légales)
- Marque INPI (mentions légales)
- Taux horaire hors devis (CGV art. 5), annexe sous-traitance RGPD (CGV art. 15)
- Prix du Module Assistant (accueil)
- Photo portrait et parcours (accueil, section « Qui je suis »)
- Dates de mise à jour des pages légales
- Domaine définitif, identifiant Google Analytics si utilisé
- Vérifier l'adresse de Netlify et le cadre de transfert des données (mentions, confidentialité)
