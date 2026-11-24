/* ADOM Digital — scripts communs : cookies, formulaires, devis interactif. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------
     Réglages à compléter avant la mise en ligne (voir SETUP.md)
  --------------------------------------------------------------- */
  var GA_ID = ''; // [À COMPLÉTER : identifiant Google Analytics G-XXXXXXX, ou laisser vide]
  var CLE_CONSENTEMENT = 'adom-consentement';
  var DUREE_CONSENTEMENT_MS = 1000 * 60 * 60 * 24 * 182; // 6 mois

  function lireStockage(cle, stockage) {
    try { return JSON.parse((stockage || localStorage).getItem(cle)); } catch (e) { return null; }
  }
  function ecrireStockage(cle, valeur, stockage) {
    try { (stockage || localStorage).setItem(cle, JSON.stringify(valeur)); } catch (e) { /* navigation privée */ }
  }

  /* ---------------------------------------------------------------
     Bandeau cookies (CNIL) : Accepter / Refuser / Personnaliser
     Le bandeau n'apparaît d'office que si une mesure d'audience est
     configurée (GA_ID). Le lien « Gérer les cookies » l'ouvre toujours.
  --------------------------------------------------------------- */
  function chargerAudience() {
    if (!GA_ID || window.__adomGa) return;
    window.__adomGa = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }

  function consentementValide() {
    var c = lireStockage(CLE_CONSENTEMENT);
    if (!c || typeof c.date !== 'number') return null;
    if (Date.now() - c.date > DUREE_CONSENTEMENT_MS) return null;
    return c;
  }

  function enregistrerConsentement(audience) {
    ecrireStockage(CLE_CONSENTEMENT, { audience: !!audience, date: Date.now() });
    if (audience) chargerAudience();
  }

  function construireBandeau() {
    var b = document.createElement('section');
    b.className = 'cookies';
    b.id = 'bandeau-cookies';
    b.setAttribute('aria-labelledby', 'cookies-titre');
    b.hidden = true;
    b.innerHTML =
      '<h2 id="cookies-titre">Cookies</h2>' +
      '<p>Ce site n\'utilise qu\'un seul type de cookie facultatif : la mesure d\'audience, pour savoir quelles pages sont lues. ' +
      'Vous pouvez l\'accepter ou le refuser, et changer d\'avis à tout moment. <a href="/cookies/">En savoir plus</a></p>' +
      '<form class="cookies-detail" hidden>' +
      '<fieldset class="cookies-choix"><legend class="sr">Choix des cookies</legend>' +
      '<label><input type="checkbox" checked disabled> <span><strong>Nécessaires</strong> : mémoriser votre choix. Toujours actifs.</span></label>' +
      '<label><input type="checkbox" name="audience"> <span><strong>Mesure d\'audience</strong> : pages vues, durée de visite, sans publicité.</span></label>' +
      '</fieldset>' +
      '<button type="submit" class="btn btn-petit">Enregistrer mes choix</button>' +
      '</form>' +
      '<div class="cookies-boutons">' +
      '<button type="button" class="btn" data-cookies="refuser">Tout refuser</button>' +
      '<button type="button" class="btn" data-cookies="accepter">Tout accepter</button>' +
      '<button type="button" class="btn btn-second btn-plein" data-cookies="personnaliser" aria-expanded="false">Personnaliser</button>' +
      '</div>';
    document.body.appendChild(b);

    var detail = b.querySelector('.cookies-detail');
    var perso = b.querySelector('[data-cookies="personnaliser"]');
    var caseAudience = detail.querySelector('[name="audience"]');

    function fermer() { b.hidden = true; }

    b.querySelector('[data-cookies="accepter"]').addEventListener('click', function () { enregistrerConsentement(true); fermer(); });
    b.querySelector('[data-cookies="refuser"]').addEventListener('click', function () { enregistrerConsentement(false); fermer(); });
    perso.addEventListener('click', function () {
      detail.hidden = !detail.hidden;
      perso.setAttribute('aria-expanded', String(!detail.hidden));
      if (!detail.hidden) caseAudience.focus();
    });
    detail.addEventListener('submit', function (e) {
      e.preventDefault();
      enregistrerConsentement(caseAudience.checked);
      fermer();
    });

    return {
      ouvrir: function () {
        var c = consentementValide();
        caseAudience.checked = !!(c && c.audience);
        b.hidden = false;
        b.querySelector('h2').setAttribute('tabindex', '-1');
        b.querySelector('h2').focus();
      },
      afficherSiBesoin: function () {
        var c = consentementValide();
        if (c) { if (c.audience) chargerAudience(); return; }
        if (GA_ID) b.hidden = false;
      },
    };
  }

  /* ---------------------------------------------------------------
     Canal d'arrivée (?src=courrier, ?src=comptable-x, ?src=cma…)
     conservé le temps de la visite et joint aux formulaires.
  --------------------------------------------------------------- */
  function canal() {
    var m = /[?&]src=([a-z0-9-]{1,40})/i.exec(location.search);
    if (m) { ecrireStockage('adom-src', m[1].toLowerCase(), sessionStorage); return m[1].toLowerCase(); }
    return lireStockage('adom-src', sessionStorage) || '';
  }

  /* ---------------------------------------------------------------
     Formulaires
  --------------------------------------------------------------- */
  var MESSAGES = {
    valueMissing: 'Ce champ est obligatoire.',
    typeMismatch: { email: 'Adresse email invalide.', url: 'Lien invalide (il doit commencer par https://).' },
    patternMismatch: 'Format invalide.',
    consentement: 'Merci de cocher la case pour que nous puissions vous répondre.',
  };

  function erreurPour(champ) {
    var v = champ.validity;
    if (champ.type === 'checkbox' && v.valueMissing) return MESSAGES.consentement;
    if (v.valueMissing) return MESSAGES.valueMissing;
    if (v.typeMismatch) return MESSAGES.typeMismatch[champ.type] || MESSAGES.patternMismatch;
    if (v.patternMismatch) return champ.getAttribute('data-erreur') || MESSAGES.patternMismatch;
    return '';
  }

  function afficherErreur(champ, message) {
    var id = champ.id + '-erreur';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('p');
      el.id = id;
      el.className = 'erreur-champ';
      var parent = champ.closest('.champ, .consentement') || champ.parentNode;
      if (parent.classList.contains('champ')) parent.appendChild(el);
      else parent.insertAdjacentElement('afterend', el);
    }
    el.textContent = message;
    el.hidden = !message;
    if (message) {
      champ.setAttribute('aria-invalid', 'true');
      var desc = (champ.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (desc.indexOf(id) === -1) desc.push(id);
      champ.setAttribute('aria-describedby', desc.join(' '));
    } else {
      champ.removeAttribute('aria-invalid');
    }
  }

  function initialiserFormulaire(form) {
    var nom = form.getAttribute('data-formulaire');
    var demo = form.hasAttribute('data-demo');
    var statut = form.querySelector('.statut');
    var bouton = form.querySelector('button[type="submit"]');
    var src = canal();

    function cache(n, v) {
      var i = form.querySelector('input[name="' + n + '"]');
      if (!i) { i = document.createElement('input'); i.type = 'hidden'; i.name = n; form.appendChild(i); }
      i.value = v;
    }
    cache('formulaire', nom);
    cache('_ts', String(Date.now()));
    if (form.querySelector('[name="src"]') || nom === 'audit' || nom === 'contact') cache('src', src);

    form.setAttribute('novalidate', '');
    Array.prototype.forEach.call(form.elements, function (champ) {
      if (!champ.willValidate) return;
      champ.addEventListener('blur', function () { if (champ.value || champ.type === 'checkbox') afficherErreur(champ, erreurPour(champ)); });
      champ.addEventListener('input', function () { if (champ.getAttribute('aria-invalid') === 'true') afficherErreur(champ, erreurPour(champ)); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var premier = null;
      Array.prototype.forEach.call(form.elements, function (champ) {
        if (!champ.willValidate || champ.name === '_piege') return;
        var msg = erreurPour(champ);
        afficherErreur(champ, msg);
        if (msg && !premier) premier = champ;
      });
      if (premier) {
        statut.className = 'statut ko';
        statut.textContent = 'Certains champs sont à corriger.';
        premier.focus();
        return;
      }

      if (demo) {
        statut.className = 'statut ok';
        statut.textContent = 'Démonstration : sur le vrai site, cette demande part directement chez l\'artisan, avec l\'estimation jointe. Rien n\'a été envoyé.';
        return;
      }

      var donnees = {};
      Array.prototype.forEach.call(form.elements, function (champ) {
        if (!champ.name) return;
        if (champ.type === 'checkbox') donnees[champ.name] = champ.checked ? 'oui' : '';
        else donnees[champ.name] = champ.value;
      });

      bouton.disabled = true;
      statut.className = 'statut';
      statut.textContent = 'Envoi en cours…';

      fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donnees),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, corps: j }; }); })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            cache('_ts', String(Date.now()));
            statut.className = 'statut ok';
            statut.textContent = form.getAttribute('data-merci') || 'Merci, votre demande est bien partie. Réponse sous 24 heures ouvrées.';
            if (window.gtag) window.gtag('event', 'generate_lead', { form_name: nom, canal: src || 'direct' });
            return;
          }
          if (res.corps && res.corps.champs) {
            Object.keys(res.corps.champs).forEach(function (n) {
              var c = form.querySelector('[name="' + n + '"]');
              if (c && c.id) afficherErreur(c, res.corps.champs[n]);
            });
          }
          statut.className = 'statut ko';
          statut.textContent = (res.corps && res.corps.erreur) || 'L\'envoi a échoué. Réessayez ou appelez-nous.';
        })
        .catch(function () {
          statut.className = 'statut ko';
          statut.textContent = 'Pas de connexion. Réessayez dans un instant, ou appelez-nous.';
        })
        .then(function () { bouton.disabled = false; });
    });
  }

  /* ---------------------------------------------------------------
     Devis interactif (page d'accueil)
  --------------------------------------------------------------- */
  var PACK_GOOGLE = [
    ['Fiche Google complète', 'Catégories, services, zone d\'intervention, horaires.'],
    ['Photos de chantier prises sur place', 'Je me déplace dans l\'Aube pour les prendre.'],
    ['QR code d\'avis à imprimer', 'Pour vos devis, factures et votre camion.'],
    ['Sollicitation de vos 10 premiers avis', 'Je prépare le message, vous l\'envoyez à vos clients.'],
  ];
  var FORMULES = {
    'Pack Google': {
      prix: 290,
      lignes: PACK_GOOGLE,
      note: 'Déduit du prix du site si vous le commandez dans les 3 mois.',
      options: false,
    },
    'Essentiel': {
      prix: 790,
      lignes: [
        ['Pack Google complet', 'Fiche, photos, QR code d\'avis, 10 premiers avis.'],
        ['Site d\'une page, lisible sur téléphone', 'Vos métiers, votre zone, vos chantiers, vos coordonnées.'],
        ['Textes rédigés pour vous', 'Après un entretien, vous relisez et vous validez.'],
        ['Formulaire de demande de devis', 'Les demandes arrivent directement dans votre boîte mail.'],
        ['Référencement local', 'Troyes et les communes où vous intervenez.'],
        ['Pages légales', 'Mentions légales, confidentialité, cookies.'],
        ['1 cycle de retouches', 'Une liste de corrections, traitée sous 3 jours ouvrés.'],
      ],
      note: 'Mise en ligne en 14 jours après réception de votre dossier complet.',
      options: true,
    },
    'Pro': {
      prix: 1290,
      lignes: [
        ['Pack Google complet', 'Fiche, photos, QR code d\'avis, 10 premiers avis.'],
        ['Site jusqu\'à 5 pages', 'Une page par métier ou par ville d\'intervention.'],
        ['Textes rédigés pour vous', 'Après un entretien, vous relisez et vous validez.'],
        ['Estimateur de prix en ligne', 'Vos tarifs, en fourchettes. Le client sait à quoi s\'attendre avant d\'appeler.'],
        ['Formulaire de devis prérempli', 'Vous recevez la demande avec l\'estimation et les mesures.'],
        ['Référencement local par ville', 'Une page pour chaque commune importante de votre zone.'],
        ['Pages légales', 'Mentions légales, confidentialité, cookies.'],
        ['3 mois de Suivi Chantiers offerts', 'Ensuite, vous le gardez seulement si vous le voulez.'],
        ['3 cycles de retouches', 'Chacun traité sous 3 jours ouvrés.'],
      ],
      note: 'Mise en ligne en 14 jours après réception de votre dossier complet.',
      options: true,
    },
  };

  function euros(n) {
    return n.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' €';
  }

  function initialiserDevis(devis) {
    var tbody = devis.querySelector('[data-devis-lignes]');
    var boutons = devis.querySelectorAll('[data-formule]');
    var options = devis.querySelectorAll('[data-option]');
    var zoneOptions = devis.querySelector('[data-devis-options]');
    var totalEl = devis.querySelector('[data-devis-total]');
    var mensuelEl = devis.querySelector('[data-devis-mensuel]');
    var acompteEl = devis.querySelector('[data-devis-acompte]');
    var noteEl = devis.querySelector('[data-devis-note]');
    var nomEl = devis.querySelector('[data-devis-nom]');
    var annonce = devis.querySelector('[data-devis-annonce]');
    var lien = devis.querySelector('[data-devis-commander]');
    var courante = 'Essentiel';

    function rendre(annoncer) {
      var f = FORMULES[courante];
      tbody.innerHTML = '';
      f.lignes.forEach(function (l, i) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td class="num"></td><td class="col-inclus"><strong></strong><span class="detail"></span></td><td class="prix">inclus</td>';
        tr.children[0].textContent = String(i + 1).padStart(2, '0');
        tr.children[1].firstChild.textContent = l[0];
        tr.children[1].lastChild.textContent = l[1];
        tbody.appendChild(tr);
      });

      var total = f.prix;
      var mensuel = 0;
      zoneOptions.hidden = !f.options;
      Array.prototype.forEach.call(options, function (o) {
        if (!f.options || !o.checked) return;
        total += parseInt(o.getAttribute('data-prix') || '0', 10);
        mensuel += parseInt(o.getAttribute('data-mensuel') || '0', 10);
      });

      nomEl.textContent = courante;
      totalEl.textContent = euros(total);
      acompteEl.textContent = 'Acompte de 30 % à la commande (' + euros(Math.round(total * 0.3)) + '), solde à la mise en ligne.';
      if (mensuel) {
        mensuelEl.hidden = false;
        mensuelEl.textContent = courante === 'Pro'
          ? 'Puis ' + euros(mensuel) + '/mois après les 3 mois de Suivi offerts, sans engagement.'
          : 'Puis ' + euros(mensuel) + '/mois, sans engagement.';
      } else {
        mensuelEl.hidden = true;
      }
      noteEl.textContent = f.note;
      lien.setAttribute('data-formule-choisie', courante);
      if (annoncer) annonce.textContent = 'Devis ' + courante + ' : total ' + euros(total) + ' hors taxes.';
    }

    Array.prototype.forEach.call(boutons, function (b) {
      b.addEventListener('click', function () {
        courante = b.getAttribute('data-formule');
        Array.prototype.forEach.call(boutons, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        rendre(true);
      });
    });
    Array.prototype.forEach.call(options, function (o) { o.addEventListener('change', function () { rendre(true); }); });

    lien.addEventListener('click', function () {
      var select = document.getElementById('contact-formule');
      if (select) select.value = courante;
    });

    rendre(false);
  }

  /* --------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    var bandeau = construireBandeau();
    bandeau.afficherSiBesoin();
    Array.prototype.forEach.call(document.querySelectorAll('[data-cookies-ouvrir]'), function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); bandeau.ouvrir(); });
    });

    Array.prototype.forEach.call(document.querySelectorAll('form[data-formulaire]'), initialiserFormulaire);
    var devis = document.querySelector('[data-devis]');
    if (devis) initialiserDevis(devis);

    Array.prototype.forEach.call(document.querySelectorAll('[data-annee]'), function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  });
})();
