# CLAUDE.md — ADOM Digital

## Contexte du projet

Site vitrine + landing page commerciale d'ADOM Digital, agence solo de création
de sites pour artisans du BTP (maçons, plombiers, électriciens, etc.) basée à
Troyes (Aube, 10). Le fondateur, Aimerick Domingues, est Entrepreneur Individuel,
non soumis à TVA (Art. 293B CGI).

Positionnement : spécialiste sites pour artisans et pros du BTP à Troyes/Aube —
pas une agence généraliste. Proximité locale et connaissance du métier BTP
comme argument différenciant principal.

## Stack technique

- Site statique HTML/CSS/JS, sans framework ni étape de build, hébergé sur Netlify, déployé via GitHub
- Styles communs : `assets/site.css` ; scripts communs : `assets/site.js` (cookies, formulaires, devis interactif)
- Démo : `assets/demo.js` (estimateur de prix + assistant à réponses préparées), données dans `demo/macon/*.json`.
  Réutilisable pour chaque client : seules la grille et les réponses JSON changent.
- Formulaires : `netlify/functions/send-email.js` (EmailJS). Liste des champs unique dans
  `netlify/functions/lib/schema.js` : toute modification d'un formulaire HTML passe aussi par ce fichier.
- Anti-spam : champ piège `_piege`, délai minimal de 3 s (`_ts`), limite par IP, nettoyage des entrées
- Polices auto-hébergées dans `/fonts/` (aucun appel à Google Fonts)
- Google Analytics optionnel, chargé uniquement après consentement (`GA_ID` dans `assets/site.js`)
- Plus de GSAP : la seule animation est le tracé des traits de cote au chargement
- Tests : `npm test` (formulaires front/back, estimateur, assistant)

## Design system

La page se lit comme un devis. Élément signature : les traits de cote `|<---- 14 jours ---->|`,
réservés aux chiffres qui engagent (délai, prix, garantie), tracés une fois, fixes si
`prefers-reduced-motion`.

- Couleurs (variables dans `:root`, n'en ajouter aucune) :
  --calque #F3F5F4 (fond), --ardoise #1C262B (texte, fonds sombres), --cordeau #1F4E9C
  (boutons, liens, focus), --surligneur #F2B705 (un chiffre clé par écran, jamais de texte jaune
  sur fond clair), --beton #5F676C (texte secondaire, traits de cote), --valide #2E7D4F,
  --reserve #B42318. --trait #C9CFCC sert uniquement aux filets décoratifs.
- Typographie : Archivo largeur 125, poids 800 pour les titres ; Atkinson Hyperlegible Next pour
  le texte. Échelle (px) : 12 légal, 14 légende, 16 texte mobile, 18 texte bureau, 22 intertitre,
  28 titre de section, 40 titre de page, clamp(40px, 6vw, 72px) pour le titre d'accueil
- Espacements en multiples de 4px (4/8/12/16/24/32/48/64/88)
- Angles quasi droits (4px), pas de cartes arrondies en grille, pas de flèche dans les boutons
- Focus : contour 3px Bleu cordeau, décalé de 2px (jaune sur fond sombre)
- Logo provisoire : « ADOM » en Archivo étendu 800 + trait de cote fin dessous
- Le site démo d'un artisan a sa propre charte (variables redéfinies dans son CSS) : c'est
  le site du client, pas celui d'ADOM

## Offre commerciale actuelle (à refléter fidèlement sur le site)

Prix HT, TVA non applicable (art. 293 B du CGI).
- Pack Google : 290 € — fiche Google complète, photos de chantier, QR code d'avis, sollicitation
  des 10 premiers avis. Déduit du prix du site s'il est commandé dans les 3 mois
- Essentiel : 790 € — Pack Google + site d'une page, textes rédigés, 14 jours, 1 cycle de retouches
- Pro : 1 290 € — Pack Google + site jusqu'à 5 pages + estimateur de prix + 3 mois de Suivi
  offerts, 3 cycles de retouches
- Suivi Chantiers : 39 €/mois, sans engagement — hébergement, 1 modification et 1 publication
  Google par mois, relance d'avis, bilan mensuel des appels
- Module Autonomie : +190 € (le client modifie textes et photos)
- Module Assistant : prix [À COMPLÉTER] — réponses préparées ; une IA ne sera branchée qu'après
  validation d'Aimerick et chiffrage du coût d'API
- Espace Client et Relance Devis : retirés de l'offre de lancement

Les modules sont des options du socle, jamais vendus seuls, proposés une fois la douleur
du client identifiée.

Estimateur : toujours une fourchette, jamais un prix ferme, avec la mention « Estimation
indicative, non contractuelle. Seul un devis après visite engage l'artisan. »
Assistant : libellé visible « Assistant automatique » ; le mot « IA » n'apparaît que si une IA
répond réellement, avec la mention exigée par l'article 50 de l'AI Act.

## Règles fixes — ne jamais déroger

- Jamais le nom complet d'un client affiché publiquement (RGPD) — utiliser
  initiale + nom de famille ou juste le prénom, comme dans les témoignages actuels
- Toujours RGPD complet : bandeau cookies CNIL avec choix granulaires,
  mentions légales, politique de confidentialité, politique cookies
- Toujours SEO local : title moins de 60 caractères, meta description 150-160
  caractères, Schema.org LocalBusiness + FAQ + Service, ciblage Troyes/Aube (10)
- Jamais de dénigrement de la concurrence (agences, DIY) — comparatifs factuels
  uniquement, jamais de mots dévalorisants
- Jamais de jargon technique visible côté client final (Netlify, GitHub, JSON,
  API restent invisibles dans les textes marketing)
- Toute information inconnue s'écrit `[À COMPLÉTER : …]` (classe `.a-completer`, visible exprès) ;
  ne jamais inventer SIRET, adresse, avis, réalisation ou chiffre
- Garantie 14 jours affichée : si le délai n'est pas tenu, le solde (70%) n'est
  pas dû — ne jamais retirer cet engagement sans validation explicite d'Aimerick

## Commandes utiles

- Déploiement : push sur GitHub, Netlify redéploie automatiquement
- Pas de build step particulier si le site reste en HTML/CSS/JS statique

## Ce que Claude Code doit toujours faire avant de livrer

- Lancer `npm test` et vérifier le rendu à 375, 768 et 1280 px sans défilement horizontal
- Vérifier l'accessibilité de base (contraste, focus visible, aria-labels)
- Vérifier que toute nouvelle section respecte le design system ci-dessus,
  sans improviser de nouvelles couleurs ou polices
