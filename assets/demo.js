/* ADOM Digital — démonstration : estimateur de prix et assistant à réponses préparées.
   Réutilisable sur chaque site client : seules les données JSON changent. */
(function () {
  'use strict';

  function charger(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function el(tag, attrs, texte) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (texte != null) e.textContent = texte;
    return e;
  }
  function euros(n) { return n.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' €'; }
  var compteur = 0;
  function uid(p) { compteur += 1; return p + '-' + compteur; }

  /* ===============================================================
     Estimateur de prix
     Calcul : quantité × prix unitaire (bas / haut), plancher au
     forfait minimum, majorations éventuelles, puis déplacement.
     Résultat toujours en fourchette, jamais en prix ferme.
  =============================================================== */
  function estimer(grille, travauxId, quantite, zoneId, majorationsIds) {
    var t = grille.travaux.filter(function (x) { return x.id === travauxId; })[0];
    var z = grille.zones.filter(function (x) { return x.id === zoneId; })[0];
    if (!t || !z) return { erreur: 'Choisissez un type de travaux et une commune.' };
    if (!isFinite(quantite) || quantite <= 0) return { erreur: 'Indiquez une quantité supérieure à 0.' };
    if (t.unite === 'ouverture' && Math.round(quantite) !== quantite) return { erreur: 'Indiquez un nombre entier d\'ouvertures.' };
    if (quantite > t.max) {
      return { horsGrille: true, message: 'Au-delà de ' + t.max + ' ' + t.unite + ', ce chantier est chiffré uniquement après visite. Demandez un devis précis.' };
    }
    var bas = Math.max(quantite * t.bas, t.minimum);
    var haut = Math.max(quantite * t.haut, t.minimum * t.haut / t.bas);
    var majBas = 0, majHaut = 0;
    (grille.majorations || []).forEach(function (m) {
      if (majorationsIds.indexOf(m.id) !== -1) { majBas += m.bas; majHaut += m.haut; }
    });
    bas = bas * (1 + majBas) + z.deplacement;
    haut = haut * (1 + majHaut) + z.deplacement;
    var a = grille.arrondi || 50;
    return {
      bas: Math.floor(bas / a) * a,
      haut: Math.ceil(haut / a) * a,
      travaux: t,
      zone: z,
      quantite: quantite,
    };
  }
  window.ADOMEstimer = estimer; // exposé pour les tests

  function initialiserEstimateur(racine) {
    var source = racine.getAttribute('data-source');
    var cibleDevis = racine.getAttribute('data-cible-devis');

    charger(source).then(function (grille) {
      racine.innerHTML = '';
      var form = el('form', { class: 'estimateur', novalidate: '' });
      var idT = uid('est-travaux'), idQ = uid('est-quantite'), idC = uid('est-commune');

      var cT = el('div', { class: 'champ' });
      cT.appendChild(el('label', { for: idT }, 'Type de travaux'));
      var sT = el('select', { id: idT, name: 'travaux' });
      grille.travaux.forEach(function (t) { sT.appendChild(el('option', { value: t.id }, t.libelle)); });
      cT.appendChild(sT);

      var cQ = el('div', { class: 'champ' });
      var lQ = el('label', { for: idQ });
      cQ.appendChild(lQ);
      var iQ = el('input', { id: idQ, name: 'quantite', type: 'number', inputmode: 'decimal', min: '0', step: 'any', required: '' });
      cQ.appendChild(iQ);

      var cC = el('div', { class: 'champ' });
      cC.appendChild(el('label', { for: idC }, 'Commune du chantier'));
      var sC = el('select', { id: idC, name: 'commune' });
      grille.zones.forEach(function (z) {
        var g = el('optgroup', { label: z.libelle });
        z.communes.forEach(function (c) { g.appendChild(el('option', { value: z.id + '|' + c }, c)); });
        sC.appendChild(g);
      });
      cC.appendChild(sC);

      var ligne = el('div', { class: 'champs-2' });
      ligne.appendChild(cQ); ligne.appendChild(cC);

      form.appendChild(cT);
      form.appendChild(ligne);

      var majCases = [];
      (grille.majorations || []).forEach(function (m) {
        var idA = uid('est-maj');
        var lab = el('label', { class: 'consentement', for: idA });
        var cb = el('input', { type: 'checkbox', id: idA, value: m.id });
        lab.appendChild(cb);
        lab.appendChild(el('span', null, m.libelle));
        form.appendChild(lab);
        majCases.push(cb);
      });

      var btn = el('button', { type: 'submit', class: 'btn' }, 'Voir la fourchette de prix');
      form.appendChild(btn);

      var resultat = el('div', { class: 'estimation', 'aria-live': 'polite' });
      form.appendChild(resultat);
      racine.appendChild(form);

      function majUnite() {
        var t = grille.travaux.filter(function (x) { return x.id === sT.value; })[0];
        lQ.textContent = 'Quantité (' + t.uniteLongue + ')';
        iQ.step = t.unite === 'ouverture' ? '1' : 'any';
        iQ.placeholder = t.unite === 'ouverture' ? 'ex. 1' : 'ex. 25';
      }
      sT.addEventListener('change', function () { majUnite(); resultat.innerHTML = ''; });
      majUnite();

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var parts = sC.value.split('|');
        var q = parseFloat(String(iQ.value).replace(',', '.'));
        var r = estimer(grille, sT.value, q, parts[0], majCases.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }));
        resultat.innerHTML = '';

        if (r.erreur) {
          iQ.setAttribute('aria-invalid', 'true');
          resultat.appendChild(el('p', { class: 'erreur-champ' }, r.erreur));
          iQ.focus();
          return;
        }
        iQ.removeAttribute('aria-invalid');
        if (r.horsGrille) {
          resultat.appendChild(el('p', { class: 'estimation-hors' }, r.message));
          return;
        }

        resultat.appendChild(el('p', { class: 'estimation-titre' }, r.travaux.libelle + ' · ' + String(r.quantite).replace('.', ',') + ' ' + r.travaux.unite + ' · ' + parts[1]));
        var cote = el('div', { class: 'cote estimation-cote' });
        cote.appendChild(el('span', { class: 'cote-ligne', 'aria-hidden': 'true' }));
        cote.appendChild(el('span', { class: 'cote-valeur' }, euros(r.bas) + ' à ' + euros(r.haut) + ' HT'));
        cote.appendChild(el('span', { class: 'cote-ligne', 'aria-hidden': 'true' }));
        resultat.appendChild(cote);
        resultat.appendChild(el('p', { class: 'legende' }, 'Inclus : ' + r.travaux.inclus + (r.zone.deplacement ? ' Déplacement : ' + euros(r.zone.deplacement) + '.' : ' Déplacement offert.')));
        resultat.appendChild(el('p', { class: 'legende' }, grille.tva));
        resultat.appendChild(el('p', { class: 'mention-estimation' }, 'Estimation indicative, non contractuelle. Seul un devis après visite engage l\'artisan.'));

        var resume = r.travaux.libelle + ', ' + String(r.quantite).replace('.', ',') + ' ' + r.travaux.unite + ', ' + parts[1] + ' : estimation ' + euros(r.bas) + ' à ' + euros(r.haut) + ' HT';
        if (cibleDevis) {
          var a = el('a', { class: 'btn btn-second', href: cibleDevis }, 'Demander un devis précis');
          a.addEventListener('click', function () {
            try { sessionStorage.setItem('adom-estimation', resume); } catch (err) { /* ignoré */ }
            var champ = document.querySelector('[name="travaux_estimes"]');
            if (champ) champ.value = resume;
          });
          resultat.appendChild(a);
        }
      });

      // Préremplissage du formulaire de devis si l'estimation vient d'une autre page
      var champDevis = document.querySelector('[name="travaux_estimes"]');
      if (champDevis && !champDevis.value) {
        try { champDevis.value = sessionStorage.getItem('adom-estimation') || ''; } catch (err) { /* ignoré */ }
      }
    }).catch(function () {
      racine.innerHTML = '';
      racine.appendChild(el('p', null, 'L\'estimateur n\'a pas pu se charger. Rechargez la page.'));
    });
  }

  /* ===============================================================
     Assistant à réponses préparées
     getAnswer() est le seul point à remplacer pour brancher plus
     tard une IA (appel à une fonction serveur), sans toucher à l'UI.
  =============================================================== */
  function normaliser(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function creerMoteur(base) {
    var index = base.reponses.map(function (r) {
      return { r: r, mots: r.motsCles.map(normaliser) };
    });
    function getAnswer(question) {
      var mots = normaliser(question).split(' ').filter(function (m) { return m.length > 1; });
      var meilleur = null, score = 0;
      index.forEach(function (it) {
        var s = 0;
        it.mots.forEach(function (k) {
          if (mots.some(function (m) { return m === k || (k.length > 3 && m.indexOf(k) === 0) || (m.length > 4 && k.indexOf(m) === 0); })) s += 1;
        });
        if (s > score) { score = s; meilleur = it.r; }
      });
      return Promise.resolve(meilleur ? { id: meilleur.id, texte: meilleur.reponse } : { id: null, texte: base.inconnu });
    }
    return getAnswer;
  }
  window.ADOMCreerMoteur = creerMoteur; // exposé pour les tests

  function initialiserAssistant(racine) {
    var source = racine.getAttribute('data-source');
    var cibleDevis = racine.getAttribute('data-cible-devis');

    charger(source).then(function (base) {
      var getAnswer = creerMoteur(base);
      var deja = {};
      racine.innerHTML = '';

      var idEntree = uid('assistant-question');
      racine.appendChild(el('p', { class: 'assistant-etiquette' }, 'Assistant automatique · réponses préparées par l\'artisan'));
      var fil = el('div', { class: 'assistant-fil', role: 'log', 'aria-live': 'polite', 'aria-label': 'Échanges avec l\'assistant' });
      fil.appendChild(el('p', { class: 'bulle bulle-artisan' }, 'Bonjour. Posez votre question sur nos travaux, nos délais ou nos garanties.'));
      racine.appendChild(fil);

      var sugg = el('div', { class: 'assistant-suggestions' });
      racine.appendChild(sugg);

      var form = el('form', { class: 'assistant-form' });
      form.appendChild(el('label', { for: idEntree, class: 'sr' }, 'Votre question'));
      var entree = el('input', { id: idEntree, type: 'text', maxlength: '200', autocomplete: 'off', placeholder: 'Ex. : êtes-vous assuré en décennale ?' });
      form.appendChild(entree);
      form.appendChild(el('button', { type: 'submit', class: 'btn btn-petit' }, 'Envoyer'));
      racine.appendChild(form);

      function suggestions() {
        sugg.innerHTML = '';
        var ids = base.suggestions.filter(function (id) { return !deja[id]; });
        if (ids.length < 3) {
          base.reponses.forEach(function (r) { if (!deja[r.id] && ids.indexOf(r.id) === -1) ids.push(r.id); });
        }
        ids.slice(0, 3).forEach(function (id) {
          var r = base.reponses.filter(function (x) { return x.id === id; })[0];
          var b = el('button', { type: 'button', class: 'puce' }, r.question);
          b.addEventListener('click', function () { poser(r.question); });
          sugg.appendChild(b);
        });
      }

      function poser(texte) {
        texte = String(texte || '').trim().slice(0, 200);
        if (!texte) return;
        fil.appendChild(el('p', { class: 'bulle bulle-visiteur' }, texte));
        getAnswer(texte).then(function (rep) {
          var p = el('p', { class: 'bulle bulle-artisan' }, rep.texte);
          if (!rep.id && cibleDevis) {
            p.appendChild(document.createTextNode(' '));
            p.appendChild(el('a', { href: cibleDevis }, 'Aller au formulaire'));
          }
          fil.appendChild(p);
          if (rep.id) deja[rep.id] = true;
          fil.scrollTop = fil.scrollHeight;
          suggestions();
        });
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        poser(entree.value);
        entree.value = '';
      });
      suggestions();
    }).catch(function () {
      racine.innerHTML = '';
      racine.appendChild(el('p', null, 'L\'assistant n\'a pas pu se charger. Rechargez la page.'));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-estimateur]'), initialiserEstimateur);
    Array.prototype.forEach.call(document.querySelectorAll('[data-assistant]'), initialiserAssistant);
  });
})();
