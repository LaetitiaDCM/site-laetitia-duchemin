/* Accueil guidé du site de Laetitia Duchemin : les questions fréquentes publiées sur les pages, sans IA et sans envoi
   (11/11/2026, à la place de l'assistant par IA de la pull request n° 18, que Laetitia n'a pas validé pour une raison
   RGPD : des visiteurs y auraient écrit des données de santé).
   Runtime : navigateur, jamais Node (fetch natif ; cible de contrôle déclarée Node 18 pour fetch). Dépendances : aucune.
   Chargé par <script data-accueil-guide defer ...> posé par construire-accueil-guide.mjs. À la première ouverture, la
   fenêtre lit un seul fichier du site (data-donnees : questions, réponses, motifs de détresse), comme une image ; ensuite
   plus aucune requête. Ce que le visiteur clique ou tape reste dans la page : rien n'est envoyé, rien n'est écrit sur
   son appareil. La partie RECHERCHE, entre ses deux marqueurs, est rejouée telle quelle par banc-accueil.mjs. */
(function () {
  "use strict";
  var script = document.currentScript || document.querySelector("script[data-accueil-guide]");
  if (!script || !window.fetch || !document.body || document.getElementById("assistant-panneau")) return;
  var lire = function (nom, defaut) { var v = script.getAttribute("data-" + nom); return v == null || v === "" ? defaut : v; };
  var INSECABLE = String.fromCharCode(160);

  /* RECHERCHE:debut */
  var RECHERCHE = (function () {
    // Même normalisation que le module de l'assistant : minuscules, sans accents, ponctuation en espaces.
    function normaliser(t) {
      return String(t || "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/\p{M}+/gu, "")
        .replace(/[^a-z0-9]+/g, " ").trim();
    }
    // Mots de deux caractères ou plus, hors mots vides, pluriel en s ou x retiré au-delà de 4 lettres.
    function termes(t, vides) {
      var out = [];
      normaliser(t).split(" ").forEach(function (m) {
        if (m.length < 2 || vides[m]) return;
        if (m.length > 4 && /[sx]$/.test(m)) m = m.slice(0, -1);
        out.push(m);
      });
      return out;
    }
    function preparer(d) {
      var vides = {};
      (d.vides || []).forEach(function (m) { vides[m] = true; });
      var syn = {};
      Object.keys(d.synonymes || {}).forEach(function (cle) {
        var k = termes(cle, vides)[0];
        if (!k) return;
        var liste = syn[k] || [];
        (d.synonymes[cle] || []).forEach(function (v) { termes(v, vides).forEach(function (m) { liste.push(m); }); });
        syn[k] = liste;
      });
      // La question pèse double : c'est elle que le visiteur reconnaît.
      var docs = d.questions.map(function (q) {
        var t = termes(q.question + " " + q.question + " " + q.reponse, vides);
        var f = {};
        t.forEach(function (m) { f[m] = (f[m] || 0) + 1; });
        return { f: f, n: t.length };
      });
      var df = {};
      docs.forEach(function (x) { Object.keys(x.f).forEach(function (m) { df[m] = (df[m] || 0) + 1; }); });
      var moy = docs.reduce(function (s, x) { return s + x.n; }, 0) / (docs.length || 1);
      // Un motif que ce navigateur ne sait pas lire (assertion arrière sur un vieux Safari) est écarté, les autres restent.
      var motifs = [];
      ((d.urgence && d.urgence.motifs) || []).forEach(function (m) { try { motifs.push(new RegExp(m.source, m.flags)); } catch (e) { /* écarté */ } });
      var grave = null;
      try { if (d.urgence && d.urgence.grave) grave = new RegExp(d.urgence.grave.source, d.urgence.grave.flags); } catch (e) { grave = null; }
      return { d: d, vides: vides, syn: syn, docs: docs, df: df, moy: moy, motifs: motifs, grave: grave };
    }
    // BM25 sur la question et sa réponse ; synonymes au poids 0,5. Rend les rangs des n meilleures questions.
    // Une question n'est proposée que si elle couvre au moins la moitié des mots de la recherche, un mot étant couvert
    // par lui-même ou par l'un de ses synonymes : un seul mot commun ne suffisait pas (« Donne-moi une recette de
    // crêpes » proposait une question sur l'emprise par « donne », mesuré le 11/11/2026), et aucun seuil de score ne
    // séparait les bonnes propositions des mauvaises.
    function chercher(ix, q, n) {
      var poids = {};
      var mots = [];
      termes(q, ix.vides).forEach(function (m) { if (!poids[m]) mots.push(m); poids[m] = 1; });
      var couvrants = {};
      mots.forEach(function (m) {
        couvrants[m] = [m].concat(ix.syn[m] || []);
        (ix.syn[m] || []).forEach(function (s) { if (!poids[s]) poids[s] = 0.5; });
      });
      var N = ix.docs.length, k1 = 1.2, b = 0.75;
      var res = [];
      ix.docs.forEach(function (x, i) {
        var couverts = mots.filter(function (m) { return couvrants[m].some(function (c) { return x.f[c]; }); }).length;
        if (!mots.length || couverts * 2 < mots.length) return;
        var s = 0;
        Object.keys(poids).forEach(function (m) {
          var f = x.f[m] || 0;
          if (!f) return;
          var idf = Math.log(1 + (N - ix.df[m] + 0.5) / (ix.df[m] + 0.5));
          s += poids[m] * idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * x.n / ix.moy));
        });
        if (s > 0) res.push({ i: i, s: s });
      });
      res.sort(function (a, c) { return c.s - a.s; });
      return res.slice(0, n || 3).map(function (r) { return r.i; });
    }
    function texteTeste(t) { return " " + normaliser(String(t || "").slice(0, 4000)) + " "; }
    function estUrgence(ix, t) {
      var x = texteTeste(t);
      return ix.motifs.some(function (m) { m.lastIndex = 0; return m.test(x); });
    }
    function estSujetGrave(ix, t) {
      if (!ix.grave) return false;
      ix.grave.lastIndex = 0;
      return ix.grave.test(texteTeste(t));
    }
    return { normaliser: normaliser, termes: termes, preparer: preparer, chercher: chercher, estUrgence: estUrgence, estSujetGrave: estSujetGrave };
  })();
  /* RECHERCHE:fin */

  var cfg = {
    titre: lire("titre", "Questions fréquentes"),
    accueil: lire("accueil", ""),
    mention: lire("mention", ""),
    mentionLienMots: lire("mention-lien-mots", ""),
    mentionLienHref: lire("mention-lien-href", ""),
    donnees: lire("donnees", "/assistant/accueil.json"),
    lienTexte: lire("lien-texte", ""),
    lienHref: lire("lien-href", ""),
    telephone: lire("telephone", ""),
    telephoneBrut: lire("telephone-brut", ""),
    urgenceTexte: lire("urgence-texte", ""),
    urgenceNumeros: lire("urgence-numeros", "").split(",").map(function (s) { return s.trim(); }).filter(function (n) { return /^[0-9]{2,6}( [0-9]{2,4})?$/.test(n); })
  };
  var T = {
    lanceur: "Une question ?", fermer: "Fermer les questions fréquentes", fil: "Questions et réponses",
    placeholder: "Chercher une question", chercher: "Chercher", etiquette: "Chercher parmi les questions du site",
    chargement: "Je rassemble les questions du site", surPage: "Sur cette page", pratiques: "Questions pratiques",
    autres: "Autres questions de cette page", toutes: "Toutes les questions", proches: "Les questions du site les plus proches :",
    aucune: "Je ne trouve pas de question proche parmi celles du site. Vous pouvez parcourir les pages, ou prendre rendez-vous.",
    lirePage: "À lire sur la page : ", echec: "Les questions n'ont pas pu se charger. Rechargez la page, ou utilisez le contact direct.",
    contact: " Contact direct : "
  };

  function el(tag, attrs, enfants) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k) || attrs[k] == null || attrs[k] === false) continue;
      if (k === "texte") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    }
    (enfants || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  var ICONES = {
    bulle: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 6v2h2V9H7zm4 0v2h2V9h-2zm4 0v2h2V9h-2z\"/></svg>",
    fermer: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M18.3 5.7 12 12l6.3 6.3-1.4 1.4-6.3-6.3-6.3 6.3-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z\"/></svg>",
    chercher: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z\"/></svg>"
  };
  // Typographie à l'affichage : espace insécable entre un nombre et son unité, et devant « : ; ? ! ».
  function typo(t) {
    return String(t).replace(/(\d) (?=(€|%|h(?![a-zà-ÿ])|min(?![a-zà-ÿ])|ans?(?![a-zà-ÿ])|séances?(?![a-zà-ÿ])))/g, "$1" + INSECABLE)
      .replace(/ ([:;?!»])/g, INSECABLE + "$1").replace(/« /g, "«" + INSECABLE);
  }

  // ---------- Interface
  var lanceur = el("button", { type: "button", "class": "assistant-lanceur", "aria-expanded": "false", "aria-controls": "assistant-panneau", html: ICONES.bulle }, [el("span", { "class": "assistant-lanceur-texte", texte: T.lanceur })]);
  var titre = el("h2", { id: "assistant-titre", "class": "assistant-titre", texte: cfg.titre });
  var fermer = el("button", { type: "button", "class": "assistant-fermer", "aria-label": T.fermer, html: ICONES.fermer });
  function mentionNoeud() {
    if (!cfg.mention) return null;
    var i = cfg.mentionLienMots && cfg.mentionLienHref ? cfg.mention.indexOf(cfg.mentionLienMots) : -1;
    if (i < 0) return el("p", { "class": "assistant-mention", texte: cfg.mention });
    return el("p", { "class": "assistant-mention" }, [cfg.mention.slice(0, i), el("a", { href: cfg.mentionLienHref, texte: cfg.mentionLienMots }), cfg.mention.slice(i + cfg.mentionLienMots.length)]);
  }
  var entete = el("div", { "class": "assistant-entete" }, [el("div", null, [titre, mentionNoeud()]), fermer]);
  var fil = el("div", { "class": "assistant-fil", role: "log", "aria-live": "polite", "aria-label": T.fil });
  var champ = el("input", { id: "accueil-recherche", type: "search", "class": "assistant-champ", maxlength: "200", placeholder: T.placeholder, autocomplete: "off", enterkeyhint: "search" });
  var bouton = el("button", { type: "submit", "class": "assistant-envoyer", "aria-label": T.chercher, html: ICONES.chercher });
  var saisie = el("form", { "class": "assistant-saisie", role: "search" }, [el("label", { "for": "accueil-recherche", "class": "assistant-sr", texte: T.etiquette }), champ, bouton]);
  var lienAction = cfg.lienHref && cfg.lienTexte ? el("a", { "class": "assistant-action assistant-action-lien", href: cfg.lienHref, target: "_blank", rel: "noopener", texte: cfg.lienTexte }) : null;
  var actions = el("div", { "class": "assistant-actions" }, [lienAction, cfg.urgenceNumeros.length ? ligneUrgence() : null]);
  var panneau = el("section", { id: "assistant-panneau", "class": "assistant-panneau accueil-guide", role: "dialog", "aria-labelledby": "assistant-titre", hidden: true }, [entete, fil, saisie, actions]);
  document.body.appendChild(lanceur);
  document.body.appendChild(panneau);

  function message(role, enfants, classe) {
    var m = el("div", { "class": "assistant-msg assistant-msg-" + role + (classe ? " " + classe : "") }, enfants);
    fil.appendChild(m);
    return m;
  }
  // Montre un échange par son début : la question du visiteur en haut du fil, la réponse dessous.
  function montrer(noeud) { fil.scrollTop = Math.max(0, noeud.offsetTop - fil.offsetTop - 12); }
  function ligneUrgence() {
    var enfants = [cfg.urgenceTexte + " "];
    cfg.urgenceNumeros.forEach(function (n, i) {
      if (i) enfants.push(" · ");
      enfants.push(el("a", { href: "tel:" + n.replace(/ /g, ""), "class": "assistant-appel", texte: n }));
    });
    return el("p", { "class": "assistant-urgence" }, enfants);
  }
  // Numéros désignés par les données (réponse d'urgence) en liens d'appel ; aucun autre numéro n'est mis en lien.
  function avecAppels(t, appels) {
    t = typo(t);
    if (!appels || !appels.length) return [t];
    var noeuds = [];
    var re = new RegExp("(^|[^0-9])(" + appels.map(function (a) { return a.replace(/ /g, "[ " + INSECABLE + "]"); }).join("|") + ")(?![0-9])", "g");
    var dernier = 0, m;
    while ((m = re.exec(t))) {
      var debut = m.index + m[1].length;
      if (debut > dernier) noeuds.push(t.slice(dernier, debut));
      noeuds.push(el("a", { href: "tel:" + m[2].replace(/[^0-9]/g, ""), "class": "assistant-appel", texte: m[2] }));
      dernier = debut + m[2].length;
    }
    if (dernier < t.length) noeuds.push(t.slice(dernier));
    return noeuds;
  }

  // ---------- Données : lues une fois, à la première ouverture
  var ix = null;
  var chargement = null;
  function chemin() { var p = location.pathname; return /\/$/.test(p) ? p : p + "/"; }
  function charger() {
    if (chargement) return chargement;
    var attente = message("assistant", [el("p", { texte: T.chargement }), el("span", { "class": "assistant-points", "aria-hidden": "true" })], "assistant-attente");
    chargement = fetch(cfg.donnees, { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (d) {
        ix = RECHERCHE.preparer(d);
        fil.removeChild(attente);
        afficherMenu(true);
      })
      .catch(function () {
        if (attente.parentNode) fil.removeChild(attente);
        chargement = null;
        var enfants = [T.echec];
        if (cfg.telephone && cfg.telephoneBrut) enfants.push(T.contact, el("a", { href: "tel:" + cfg.telephoneBrut, texte: cfg.telephone.replace(/ /g, INSECABLE) }), ".");
        message("assistant", [el("p", null, enfants), cfg.urgenceNumeros.length ? ligneUrgence() : null], "assistant-erreur");
      });
    return chargement;
  }

  // ---------- Menu : questions de la page consultée, puis questions pratiques
  function boutonQuestion(id, libelle, classe) {
    var q = ix.d.questions[id];
    var b = el("button", { type: "button", "class": classe || "accueil-question", texte: typo(libelle || q.question) });
    b.addEventListener("click", function () { poser(id); });
    return b;
  }
  function liste(ids) {
    var ul = el("ul", { "class": "accueil-liste" });
    ids.forEach(function (id) { ul.appendChild(el("li", null, [boutonQuestion(id)])); });
    return ul;
  }
  function afficherMenu(premier) {
    var bloc = [];
    if (premier && cfg.accueil) bloc.push(el("p", { texte: typo(cfg.accueil) }));
    var ici = ix.d.pages[chemin()] || [];
    if (ici.length) bloc.push(el("p", { "class": "accueil-groupe", texte: T.surPage }), liste(ici));
    var pastilles = el("div", { "class": "assistant-suggestions" });
    ix.d.pratiques.forEach(function (p) { if (ici.indexOf(p.id) < 0) pastilles.appendChild(boutonQuestion(p.id, p.libelle, "assistant-suggestion")); });
    bloc.push(el("p", { "class": "accueil-groupe", texte: T.pratiques }), pastilles);
    var m = message("assistant", bloc, "accueil-menu");
    if (!premier) montrer(m);
    return m;
  }

  // ---------- Une question : la question en bulle du visiteur, la réponse publiée, le lien vers sa page
  var vues = {};
  function poser(id) {
    var q = ix.d.questions[id];
    vues[id] = true;
    var question = message("visiteur", [el("p", { texte: typo(q.question) })]);
    var lien = el("a", { href: q.page + (q.ancre ? "#" + q.ancre : ""), texte: q.titrePage });
    // Lien vers la page déjà ouverte : la fenêtre se ferme, la page défile jusqu'à ses questions fréquentes.
    lien.addEventListener("click", function () { if (q.page === chemin()) fermerPanneau(true); });
    var enfants = q.reponse.split("\n").filter(Boolean).map(function (l) { return el("p", { texte: typo(l) }); });
    enfants.push(el("p", { "class": "accueil-source" }, [T.lirePage, lien]));
    var autres = (ix.d.pages[q.page] || []).filter(function (i) { return i !== id && !vues[i]; }).slice(0, 3);
    if (autres.length) enfants.push(el("p", { "class": "accueil-groupe", texte: T.autres }), liste(autres));
    var toutes = el("button", { type: "button", "class": "assistant-suggestion", texte: T.toutes });
    toutes.addEventListener("click", function () { afficherMenu(false); });
    enfants.push(el("div", { "class": "assistant-suggestions" }, [toutes]));
    message("assistant", enfants);
    montrer(question);
  }

  // ---------- Recherche dans le navigateur
  function rechercher(texte) {
    texte = String(texte || "").trim().slice(0, 200);
    if (!texte || !ix) return;
    champ.value = "";
    var demande = message("visiteur", [el("p", { texte: texte })]);
    var u = ix.d.urgence;
    if (RECHERCHE.estUrgence(ix, texte)) {
      // Réponse fixe aux messages de détresse : les phrases d'urgence publiées sur le site, numéros en liens d'appel.
      var blocs = u.reponse.map(function (l) { return el("p", null, avecAppels(l, u.appels)); });
      var ul = el("ul", { "class": "assistant-sources-liste" });
      u.sources.forEach(function (s) { ul.appendChild(el("li", null, [el("a", { href: s.url, texte: s.titre })])); });
      blocs.push(el("div", { "class": "assistant-sources" }, [el("p", { texte: typo("Sources :") }), ul]));
      message("assistant", blocs, "accueil-urgence");
      montrer(demande);
      return;
    }
    var ids = RECHERCHE.chercher(ix, texte, 3);
    var enfants = ids.length ? [el("p", { texte: T.proches }), liste(ids)] : [el("p", { texte: T.aucune })];
    if (RECHERCHE.estSujetGrave(ix, texte)) enfants.push(el("p", { "class": "accueil-rappel" }, avecAppels(u.rappel, u.appels)));
    message("assistant", enfants);
    montrer(demande);
  }
  saisie.addEventListener("submit", function (e) { e.preventDefault(); rechercher(champ.value); });

  // ---------- Ouverture et fermeture
  function ouvrir() {
    panneau.hidden = false;
    lanceur.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("assistant-ouvert");
    var p = ix ? Promise.resolve() : charger();
    p.then(function () {
      if (panneau.hidden) return;
      var premier = fil.querySelector(".accueil-question, .assistant-suggestion");
      (premier || fermer).focus({ preventScroll: true });
    });
  }
  function fermerPanneau(sansFocus) {
    panneau.hidden = true;
    lanceur.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("assistant-ouvert");
    if (!sansFocus) lanceur.focus({ preventScroll: true });
  }
  lanceur.addEventListener("click", function () { if (panneau.hidden) ouvrir(); else fermerPanneau(); });
  fermer.addEventListener("click", function () { fermerPanneau(); });
  panneau.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); fermerPanneau(); } });
})();
