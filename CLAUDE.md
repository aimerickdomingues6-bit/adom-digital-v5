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

- Site statique, hébergé sur Netlify, déployé via GitHub
- Animations au scroll : GSAP
- Pas de framework JS lourd — HTML/CSS/JS, structure réutilisable d'un client à l'autre
- Formulaire de contact avec anti-spam (honeypot), sanitization des inputs
- Google Analytics + Google Fonts (déclarés dans le bandeau cookies)

## Design system

- Couleurs : --t: #2DD4BF (turquoise), --t2: #20b2a0, --n: #0D1117 (noir),
  --n2: #0A0E15, --n3: #161B22, --w: #FFFFFF, --cr: #F4F1EB (crème),
  --tx: #1A1A1A, --s: #64748B, --error: #EF4444, --success: #22C55E
- Typographie : Syne pour les titres (poids forts, souvent 800), échelle
  clamp(36px,5.5vw,62px) pour le hero jusqu'à 12px pour les mentions légales
- Espacements en multiples de 4px (4/8/12/16/24/32/48/64/88px)
- Border-radius : 12px boutons/inputs, 20px cartes, 28px cartes larges, 9999px pills
- Ombres douces, jamais dures — glow turquoise 0 0 0 3px rgba(45,212,191,.15)
  pour les états focus

## Offre commerciale actuelle (à refléter fidèlement sur le site)

Socle — Site vitrine
- Essentiel : 490€ HT, livraison 14 jours, 1 cycle de retouches
- Pro + Présence Locale : 890€ HT, Google Business + avis clients + Analytics,
  3 mois de maintenance offerts, 3 cycles de retouches
- Maintenance mensuelle : 29€/mois, sans engagement

Modules optionnels (à ajouter au socle, jamais vendus seuls)
- Module Autonomie (CMS) : +190€, le client modifie textes/photos lui-même
- Module Relance Devis : +150€ + 15€/mois, email automatique avec urgence/réduction
- Module Espace Client : +690€ + 39€/mois, suivi devis/commandes, jamais de
  facturation interne (toujours un lien vers l'outil de facturation certifié
  du client — obligation légale liée à la réforme facturation électronique)

Ne jamais présenter les modules comme un menu figé imposé — toujours comme des
ajouts optionnels au socle, à proposer une fois la douleur du client identifiée.

## Règles fixes — ne jamais déroger

- Jamais le nom complet d'un client affiché publiquement (RGPD) — utiliser
  initiale + nom de famille ou juste le prénom, comme dans les témoignages actuels
- Toujours RGPD complet : bandeau cookies CNIL avec choix granulaires,
  mentions légales, politique de confidentialité, politique cookies
- Toujours SEO local : title moins de 60 caractères, meta description 150-160
  caractères, Schema.org LocalBusiness + FAQ + Service, ciblage Troyes/Aube (10)
- Jamais de dénigrement de la concurrence (agences, DIY) — comparatifs factuels
  uniquement, jamais de mots dévalorisants
- Jamais de jargon technique visible côté client final (GSAP, Netlify, GitHub
  restent invisibles dans les textes marketing)
- Garantie 14 jours affichée : si le délai n'est pas tenu, le solde (70%) n'est
  pas dû — ne jamais retirer cet engagement sans validation explicite d'Aimerick

## Commandes utiles

- Déploiement : push sur GitHub, Netlify redéploie automatiquement
- Pas de build step particulier si le site reste en HTML/CSS/JS statique

## Ce que Claude Code doit toujours faire avant de livrer

- Vérifier que les nouveaux textes/contenus ne cassent pas les animations
  GSAP (longueur de texte, ratio d'image)
- Vérifier l'accessibilité de base (contraste, focus visible, aria-labels)
- Vérifier que toute nouvelle section respecte le design system ci-dessus,
  sans improviser de nouvelles couleurs ou polices
