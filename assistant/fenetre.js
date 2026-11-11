/* Assistant d'un site statique : fenêtre de questions-réponses (skill assistant-site-statique).
   Runtime : navigateur, jamais Node (fetch et Promise natifs ; cible de contrôle déclarée Node 18 pour fetch). Dépendances : aucune.
   Chargée par une balise <script data-assistant defer ...> produite par baliseFenetre() (construire-index-assistant.mjs).
   Envoie les questions à /api/chat (même origine : aucune adresse tierce à ouvrir dans la CSP) et, si data-rappel-api est
   posé, les demandes de rappel au point d'entrée des formulaires du site (ou à Web3Forms avec data-rappel-format=
   "web3forms" : son adresse s'ouvre alors dans connect-src). La conversation ne vit qu'en mémoire : rien
   n'est écrit sur l'appareil du visiteur, rien n'est conservé après la fermeture de la page.
   Délai : le Worker refuse une question posée moins de 3 s après l'ouverture de la page (filtre anti-robots des
   formulaires) ; la fenêtre attend data-delai-ms depuis le chargement avant le premier envoi, sinon une suggestion
   cliquée tout de suite affiche « Rechargez la page » (vu sur le prototype). */
(function () {
  "use strict";
  var script = document.currentScript || document.querySelector("script[data-assistant]");
  if (!script || !window.fetch || !document.body || document.getElementById("assistant-panneau")) return;
  var t0 = Date.now();
  var lire = function (nom, defaut) { var v = script.getAttribute("data-" + nom); return v == null || v === "" ? defaut : v; };
  // Textes de la fenêtre selon data-langue (« fr » par défaut). Anglais ajouté le 06/11/2026 (MKZ) ; les textes français
  // sont ceux d'avant, mot pour mot. La transcription envoyée avec une demande de rappel reste en français : c'est le
  // propriétaire du site qui la lit.
  var TEXTES = {
    fr: {
      lanceur: "Une question ?", fermer: "Fermer l'assistant", conversation: "Conversation", badge: "IA",
      placeholder: "Posez votre question", envoyerQuestion: "Envoyer la question", votreQuestion: "Votre question",
      rappele: function (p) { return "Être rappelé" + (p ? " par " + p : ""); },
      sources: "Sources :", contactDirect: " Contact direct : ", ou: " ou ", accueil: "accueil",
      recherche: "Je cherche dans les pages du site",
      indisponible: "L'assistant n'est pas disponible pour le moment.",
      // Un message du serveur qui dit déjà quoi faire (« Rechargez la page puis réessayez ») n'est pas suivi d'un second
      // « Réessayez » (vu en relecture le 11/11/2026).
      erreur: function (statut, j) { var m = j && j.erreur ? j.erreur + ". " : "La réponse n'a pas pu arriver. "; return /essayez/i.test(m) ? m.trim() : m + "Réessayez dans un instant."; },
      connexion: "La réponse n'a pas pu arriver. Vérifiez votre connexion.",
      proposition: function (p) { return "Pour un avis sur votre situation, " + (p || "l'équipe") + " peut vous rappeler avec le fil de cette conversation."; },
      envoyerDemande: "Envoyer ma demande", annuler: "Annuler", donneesPerso: "données personnelles",
      coordonnees: function (p) { return "Laissez vos coordonnées : " + (p || "nous") + " vous recontacte, avec le fil de cette conversation."; },
      prenom: "Prénom", email: "E-mail", telephone: "Téléphone (facultatif)", siteWeb: "Site web",
      envoiEnCours: "Envoi en cours…", envoiImpossible: "envoi impossible",
      merci: function (p) { return "Merci, votre demande est envoyée. " + (p || "Nous") + " vous recontacte."; },
      echec: function (m) { return "L'envoi a échoué (" + m + "). Réessayez, ou utilisez le contact direct."; },
      rappelSujet: "Demande de rappel depuis l'assistant du site",
      consentement: "J'accepte d'être recontacté au sujet de ma demande."
    },
    en: {
      lanceur: "A question?", fermer: "Close the assistant", conversation: "Conversation", badge: "AI",
      placeholder: "Ask your question", envoyerQuestion: "Send the question", votreQuestion: "Your question",
      rappele: function (p) { return "Get a call back" + (p ? " from " + p : ""); },
      sources: "Sources:", contactDirect: " Direct contact: ", ou: " or ", accueil: "home",
      recherche: "Searching the pages of this site",
      indisponible: "The assistant is not available right now.",
      // Les messages d'erreur du serveur sont en français : en anglais, le statut suffit à dire quoi faire.
      erreur: function (statut) {
        if (statut === 429) return "Too many questions in a row: please wait a minute, then try again.";
        if (statut === 413) return "This conversation is too long: please reload the page to start a new one.";
        if (statut === 422) return "Please reload the page, then ask your question again.";
        return "The answer could not get through. Please try again in a moment.";
      },
      connexion: "The answer could not get through. Please check your connection.",
      proposition: function (p) { return "For advice on your situation, " + (p || "the team") + " can call you back with this conversation in hand."; },
      envoyerDemande: "Send my request", annuler: "Cancel", donneesPerso: "personal data",
      coordonnees: function (p) { return "Leave your details: " + (p || "we") + " will get back to you, with this conversation in hand."; },
      prenom: "First name", email: "Email", telephone: "Phone (optional)", siteWeb: "Website",
      envoiEnCours: "Sending…", envoiImpossible: "sending failed",
      merci: function (p) { return "Thank you, your request has been sent. " + (p || "We") + " will get back to you."; },
      echec: function (m) { return "Sending failed (" + m + "). Please try again, or use the direct contact."; },
      rappelSujet: "Call-back request from the site assistant",
      consentement: "I agree to be contacted about my request."
    }
  };
  var T = TEXTES[lire("langue", "fr")] || TEXTES.fr;
  var cfg = {
    titre: lire("titre", "Assistant"),
    accueil: lire("accueil", ""),
    mention: lire("mention", ""),
    prenom: lire("prenom", ""),
    telephone: lire("telephone", ""),
    telephoneBrut: lire("telephone-brut", ""),
    whatsapp: lire("whatsapp", ""),
    api: lire("api", "/api/chat"),
    rappelApi: lire("rappel-api", ""),
    // « web3forms » : la demande part du navigateur vers Web3Forms (clé publique d'accès), comme le formulaire de contact
    // d'un site statique qui n'a pas de point d'entrée à lui. Vide : corps générique vers le point d'entrée du site.
    rappelFormat: lire("rappel-format", ""),
    rappelCle: lire("rappel-cle", ""),
    rappelSujet: lire("rappel-sujet", T.rappelSujet),
    // Sites dont les adresses finissent par une barre (/tarifs/) : le Worker cite /tarifs, le lien pointe /tarifs/ (sinon
    // chaque clic passe par une redirection).
    barreFinale: lire("barre-finale", "") === "1",
    consentement: lire("consentement", T.consentement),
    donneesPersonnelles: lire("donnees-personnelles", ""),
    delai: parseInt(lire("delai-ms", "3200"), 10) || 0,
    questionMax: parseInt(lire("question-max", "600"), 10) || 600,
    historiqueMax: parseInt(lire("historique", "10"), 10) || 10,
    // Liens de la barre sous la saisie (data-actions, liste séparée par des virgules). MKZ, 07/11/2026 : « rappel »
    // seul, la bulle WhatsApp du site étant juste à côté ; WhatsApp et téléphone restent proposés quand une réponse
    // n'arrive pas (contactsDirects).
    actions: lire("actions", "rappel,whatsapp,telephone").split(",").map(function (s) { return s.trim(); }),
    lienTexte: lire("lien-texte", ""),
    lienHref: lire("lien-href", ""),
    urgenceTexte: lire("urgence-texte", ""),
    urgenceNumeros: (lire("urgence-texte", "") ? lire("urgence-numeros", "") : "").split(",").map(function (s) { return s.trim(); }).filter(function (n) { return /^[0-9]{2,6}( [0-9]{2,4})?$/.test(n); }),
    mentionLienMots: lire("mention-lien-mots", ""),
    mentionLienHref: lire("mention-lien-href", ""),
    suggestions: []
  };
  try { cfg.suggestions = JSON.parse(lire("suggestions", "[]")); } catch (e) { cfg.suggestions = []; }

  var historique = []; // { role: "user" | "assistant", content }
  var enCours = false;
  var reponses = 0;
  var rappelPropose = false;

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
    envoyer: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3 20.5 21 12 3 3.5 3 10l12 2-12 2z\"/></svg>"
  };
  function signaler(nom) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: nom });
    if (typeof window.gtag === "function") window.gtag("event", nom);
  }

  // ---------- Interface
  var lanceur = el("button", { type: "button", "class": "assistant-lanceur", "aria-expanded": "false", "aria-controls": "assistant-panneau", html: ICONES.bulle }, [el("span", { "class": "assistant-lanceur-texte", texte: T.lanceur })]);
  var titre = el("h2", { id: "assistant-titre", "class": "assistant-titre" }, [cfg.titre + " ", el("span", { "class": "assistant-badge", texte: T.badge })]);
  var fermer = el("button", { type: "button", "class": "assistant-fermer", "aria-label": T.fermer, html: ICONES.fermer });
  // Mention avec un lien posé sur quelques-uns de ses mots (data-mention-lien-mots, 11/11/2026) : le
  // lien vers la page qui dit ce que deviennent les questions, sans ajouter de ligne à l'en-tête.
  function mentionNoeud() {
    if (!cfg.mention) return null;
    var i = cfg.mentionLienMots && cfg.mentionLienHref ? cfg.mention.indexOf(cfg.mentionLienMots) : -1;
    if (i < 0) return el("p", { "class": "assistant-mention", texte: cfg.mention });
    return el("p", { "class": "assistant-mention" }, [cfg.mention.slice(0, i), el("a", { href: cfg.mentionLienHref, texte: cfg.mentionLienMots }), cfg.mention.slice(i + cfg.mentionLienMots.length)]);
  }
  var entete = el("div", { "class": "assistant-entete" }, [el("div", null, [titre, mentionNoeud()]), fermer]);
  var fil = el("div", { "class": "assistant-fil", role: "log", "aria-live": "polite", "aria-label": T.conversation });
  var suggestions = el("div", { "class": "assistant-suggestions" });
  cfg.suggestions.forEach(function (s) {
    var b = el("button", { type: "button", "class": "assistant-suggestion", texte: s });
    b.addEventListener("click", function () { envoyer(s); });
    suggestions.appendChild(b);
  });
  if (!cfg.suggestions.length) suggestions.hidden = true;
  var champ = el("textarea", { id: "assistant-question", "class": "assistant-champ", rows: "1", maxlength: String(cfg.questionMax), placeholder: T.placeholder, autocomplete: "off" });
  var bouton = el("button", { type: "submit", "class": "assistant-envoyer", "aria-label": T.envoyerQuestion, html: ICONES.envoyer });
  var saisie = el("form", { "class": "assistant-saisie" }, [el("label", { "for": "assistant-question", "class": "assistant-sr", texte: T.votreQuestion }), champ, bouton]);
  var boutonRappel = cfg.rappelApi && cfg.actions.indexOf("rappel") > -1 ? el("button", { type: "button", "class": "assistant-action", texte: T.rappele(cfg.prenom) }) : null;
  var lienWa = cfg.whatsapp && cfg.actions.indexOf("whatsapp") > -1 ? el("a", { "class": "assistant-action", href: cfg.whatsapp, target: "_blank", rel: "noopener", texte: "WhatsApp" }) : null;
  var lienTel = cfg.telephone && cfg.telephoneBrut && cfg.actions.indexOf("telephone") > -1 ? el("a", { "class": "assistant-action", href: "tel:" + cfg.telephoneBrut, texte: cfg.telephone }) : null;
  // Action « lien » (11/11/2026, site d'une psychologue) : un lien vers une page externe, ici la prise de rendez-vous,
  // à la place d'un formulaire de rappel qui ferait voyager par mail une conversation sur la santé du visiteur.
  var lienAction = cfg.lienHref && cfg.lienTexte && cfg.actions.indexOf("lien") > -1 ? el("a", { "class": "assistant-action assistant-action-lien", href: cfg.lienHref, target: "_blank", rel: "noopener", texte: cfg.lienTexte }) : null;
  var actions = el("div", { "class": "assistant-actions" }, [lienAction, boutonRappel, lienWa, lienTel, cfg.urgenceNumeros.length ? ligneUrgence() : null]);
  var panneau = el("section", { id: "assistant-panneau", "class": "assistant-panneau", role: "dialog", "aria-labelledby": "assistant-titre", hidden: true }, [entete, fil, saisie, actions]);
  document.body.appendChild(lanceur);
  document.body.appendChild(panneau);

  function defilerEnBas() { fil.scrollTop = fil.scrollHeight; }
  function message(role, enfants, classe) {
    var m = el("div", { "class": "assistant-msg assistant-msg-" + role + (classe ? " " + classe : "") }, enfants);
    fil.appendChild(m);
    defilerEnBas();
    return m;
  }
  if (cfg.accueil) message("assistant", [el("p", { texte: cfg.accueil })]);
  // Suggestions dans le fil, sous l'accueil : posées entre le fil et la saisie, elles ne laissaient au fil que 81 px sur
  // un portable de 654 px de haut, et l'accueil s'y lisait coupé (mesuré sur le prototype le 26/10/2026).
  if (cfg.suggestions.length) fil.appendChild(suggestions);

  // ---------- Ouverture et fermeture
  function ouvrir() {
    panneau.hidden = false;
    lanceur.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("assistant-ouvert");
    // Avant la première question, le fil s'ouvre en haut : l'accueil se lit depuis sa première ligne.
    if (fil.querySelector(".assistant-msg-visiteur")) defilerEnBas();
    else fil.scrollTop = 0;
    champ.focus({ preventScroll: true });
    signaler("assistant_ouverture");
  }
  function fermerPanneau() {
    panneau.hidden = true;
    lanceur.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("assistant-ouvert");
    lanceur.focus({ preventScroll: true });
  }
  lanceur.addEventListener("click", function () { if (panneau.hidden) ouvrir(); else fermerPanneau(); });
  fermer.addEventListener("click", fermerPanneau);
  panneau.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); fermerPanneau(); } });

  // ---------- Rendu d'une réponse : texte simple ; les adresses de pages citées (/tarifs) deviennent des liens quand le
  // Worker les a reconnues (liste des sources), jamais une adresse qu'il n'a pas validée.
  // « (/) » (l'accueil cité) devient un lien nommé « accueil » : le motif d'adresse exige une lettre après la barre, et
  // la réponse affichait « (/) » en texte brut (vu en capture sur le site d'une psychologue le 11/11/2026).
  var MOTIF = /(\/[a-z][a-z0-9\-]*(?:\/[a-z0-9\-]+)*)|(\(\/\))/gi;
  // Typographie à l'affichage seulement (le texte gardé dans l'historique reste celui du serveur) : espace insécable
  // entre un nombre et son unité (« 70 € », « 1 h ») et, en français, devant « : ; ? ! » ; jamais dans un lien.
  var INSECABLE = String.fromCharCode(160);
  function typo(t) {
    t = t.replace(/(\d) (?=(€|%|h(?![a-zà-ÿ])|min(?![a-zà-ÿ])|ans?(?![a-zà-ÿ])|séances?(?![a-zà-ÿ])))/g, "$1" + INSECABLE);
    if (lire("langue", "fr") === "fr") t = t.replace(/ ([:;?!»])/g, INSECABLE + "$1").replace(/« /g, "«" + INSECABLE);
    return t;
  }
  function lien(u) {
    if (!cfg.barreFinale || u === "/" || /\/$/.test(u) || /\.[a-z0-9]{2,5}$/i.test(u)) return u;
    return u + "/";
  }
  function enLigne(texte, parAdresse) {
    var noeuds = [];
    var dernier = 0;
    var m;
    MOTIF.lastIndex = 0;
    while ((m = MOTIF.exec(texte))) {
      if (m[2]) {
        var accueil = parAdresse["/"];
        if (!accueil) continue;
        if (m.index > dernier) ajouterTexte(noeuds, texte.slice(dernier, m.index));
        noeuds.push("(", el("a", { href: "/", title: accueil.titre, texte: T.accueil }), ")");
        dernier = m.index + m[0].length;
        continue;
      }
      var s = parAdresse[m[1]];
      var avant = m.index ? texte.charAt(m.index - 1) : " ";
      if (!s || !/[\s(«"']/.test(avant)) continue;
      if (m.index > dernier) ajouterTexte(noeuds, texte.slice(dernier, m.index));
      noeuds.push(el("a", { href: lien(s.url), title: s.titre, texte: m[1] }));
      dernier = m.index + m[0].length;
    }
    if (dernier < texte.length) ajouterTexte(noeuds, texte.slice(dernier));
    return noeuds;
  }
  // Numéros d'appel désignés par le serveur dans « appels » (réponse d'urgence d'un site de santé, 11/11/2026) : liens
  // tel:, pour appeler en un toucher depuis un téléphone. Seuls des numéros courts en chiffres, et seulement ceux que
  // le serveur liste : aucun numéro trouvé dans le texte n'est mis en lien de lui-même.
  var appels = [];
  function ajouterTexte(noeuds, t) {
    t = typo(t);
    if (!appels.length) { noeuds.push(t); return; }
    var re = new RegExp("(^|[^0-9])(" + appels.join("|") + ")(?![0-9])", "g");
    var dernier = 0;
    var m;
    while ((m = re.exec(t))) {
      var debut = m.index + m[1].length;
      if (debut > dernier) noeuds.push(t.slice(dernier, debut));
      noeuds.push(el("a", { href: "tel:" + m[2].replace(/ /g, ""), "class": "assistant-appel", texte: m[2] }));
      dernier = debut + m[2].length;
    }
    if (dernier < t.length) noeuds.push(t.slice(dernier));
  }
  // Numéro court, ou en deux groupes comme « 116 006 ».
  var NUMERO = /^[0-9]{2,6}( [0-9]{2,4})?$/;
  function rendreReponse(texte, sources, numeros) {
    appels = (numeros || []).map(String).filter(function (n) { return NUMERO.test(n); });
    var parAdresse = {};
    (sources || []).forEach(function (s) { parAdresse[s.url] = s; });
    var blocs = [];
    var liste = null;
    texte.split("\n").forEach(function (ligne) {
      var l = ligne.trim();
      if (!l) { liste = null; return; }
      var puce = l.match(/^[-*]\s+(.*)$/);
      if (puce) {
        if (!liste) { liste = el("ul"); blocs.push(liste); }
        liste.appendChild(el("li", null, enLigne(puce[1], parAdresse)));
      } else {
        liste = null;
        blocs.push(el("p", null, enLigne(l, parAdresse)));
      }
    });
    if (sources && sources.length) {
      var ul = el("ul", { "class": "assistant-sources-liste" });
      sources.forEach(function (s) { ul.appendChild(el("li", null, [el("a", { href: lien(s.url), texte: s.titre })])); });
      blocs.push(el("div", { "class": "assistant-sources" }, [el("p", { texte: T.sources }), ul]));
    }
    return blocs;
  }
  function contactsDirects(texte) {
    var enfants = [texte];
    var liens = [];
    if (cfg.whatsapp) liens.push(el("a", { href: cfg.whatsapp, target: "_blank", rel: "noopener", texte: "WhatsApp" }));
    if (cfg.telephone && cfg.telephoneBrut) liens.push(el("a", { href: "tel:" + cfg.telephoneBrut, texte: cfg.telephone }));
    if (liens.length) {
      enfants.push(T.contactDirect);
      liens.forEach(function (a, i) { if (i) enfants.push(T.ou); enfants.push(a); });
      enfants.push(".");
    }
    // Site de santé : les numéros d'urgence aussi dans les messages d'erreur (une panne ne doit pas laisser un visiteur
    // en détresse sans numéro, relecture du 11/11/2026).
    return cfg.urgenceNumeros.length ? el("div", null, [el("p", null, enfants), ligneUrgence()]) : el("p", null, enfants);
  }
  // Ligne d'urgence (data-urgence-texte, data-urgence-numeros) : numéros en liens d'appel, sous la saisie en permanence
  // et dans chaque message d'erreur.
  function ligneUrgence() {
    var enfants = [cfg.urgenceTexte + " "];
    cfg.urgenceNumeros.forEach(function (n, i) {
      if (i) enfants.push(" · ");
      enfants.push(el("a", { href: "tel:" + n.replace(/ /g, ""), "class": "assistant-appel", texte: n }));
    });
    return el("p", { "class": "assistant-urgence" }, enfants);
  }

  // ---------- Questions
  function envoyer(question) {
    question = String(question || "").trim().slice(0, cfg.questionMax);
    if (!question || enCours) return;
    message("visiteur", [el("p", { texte: question })]);
    historique.push({ role: "user", content: question });
    suggestions.hidden = true;
    champ.value = "";
    ajusterChamp();
    enCours = true;
    bouton.disabled = true;
    var attente = message("assistant", [el("p", { texte: T.recherche }), el("span", { "class": "assistant-points", "aria-hidden": "true" })], "assistant-attente");
    signaler("assistant_question");
    new Promise(function (ok) { setTimeout(ok, Math.max(0, cfg.delai - (Date.now() - t0))); })
      .then(function () {
        return fetch(cfg.api, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ messages: historique.slice(-cfg.historiqueMax), page: location.pathname, duree: String(Date.now() - t0) })
        });
      })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { statut: r.status, j: j }; }); })
      .then(function (res) {
        fil.removeChild(attente);
        if (res.statut === 200 && res.j && res.j.ok && res.j.reponse) {
          historique.push({ role: "assistant", content: res.j.reponse });
          var recue = message("assistant", rendreReponse(res.j.reponse, res.j.sources, res.j.appels));
          // Réponse plus haute que le fil : on la montre par son début, pas par sa fin (la réponse d'urgence d'un site de
          // santé commençait par le 3114, caché sous l'en-tête après le défilement en bas, vu en capture le 11/11/2026).
          if (recue.offsetHeight > fil.clientHeight - 24) fil.scrollTop = Math.max(0, recue.offsetTop - fil.offsetTop - 12);
          reponses++;
          if (reponses === 2) proposerRappel();
          return;
        }
        historique.pop();
        if (res.j && res.j.indisponible) message("assistant", [contactsDirects(T.indisponible)], "assistant-erreur");
        else message("assistant", [contactsDirects(T.erreur(res.statut, res.j))], "assistant-erreur");
      })
      .catch(function () {
        if (attente.parentNode) fil.removeChild(attente);
        historique.pop();
        message("assistant", [contactsDirects(T.connexion)], "assistant-erreur");
      })
      .then(function () {
        enCours = false;
        bouton.disabled = false;
        if (!panneau.hidden) champ.focus({ preventScroll: true });
      });
  }
  // Hauteur en border-box : scrollHeight ne compte pas les bordures ; sans elles, une barre de défilement apparaît
  // dans un champ d'une ligne (mesuré à 375 px : scrollHeight 48 pour une zone utile de 47).
  function ajusterChamp() {
    champ.style.height = "auto";
    champ.style.height = Math.min(champ.scrollHeight + champ.offsetHeight - champ.clientHeight, 128) + "px";
  }
  champ.addEventListener("input", ajusterChamp);
  champ.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); envoyer(champ.value); }
  });
  saisie.addEventListener("submit", function (e) { e.preventDefault(); envoyer(champ.value); });

  // ---------- Demande de rappel : le point d'entrée des formulaires du site, avec le fil de la conversation en message.
  // Corps envoyé : { kind: "contact", prenom, nom, email, telephone, consent, website, message, page, url, referrer, duree } ;
  // l'adapter ici si le point d'entrée du site attend d'autres champs. Réponse attendue : { ok, redirect? }.
  function proposerRappel() {
    if (rappelPropose || !cfg.rappelApi) return;
    rappelPropose = true;
    var b = el("button", { type: "button", "class": "assistant-suggestion", texte: T.rappele(cfg.prenom) });
    b.addEventListener("click", ouvrirRappel);
    message("assistant", [el("p", { texte: T.proposition(cfg.prenom) }), b]);
  }
  function transcription() {
    var t = historique.map(function (m) { return (m.role === "user" ? "Visiteur : " : "Assistant : ") + m.content.replace(/\s+/g, " "); }).join(" | ");
    var entete = "Demande envoyée depuis l'assistant du site. ";
    var place = 1950 - entete.length;
    return entete + (t.length > place ? "(début coupé) " + t.slice(t.length - place + 14) : t);
  }
  var formRappel = null;
  function ouvrirRappel() {
    if (formRappel && formRappel.parentNode) { formRappel.querySelector("input").focus(); return; }
    var id = function (n) { return "assistant-rappel-" + n; };
    var erreur = el("p", { "class": "assistant-erreur-form", role: "alert", hidden: true });
    var envoi = el("button", { type: "submit", "class": "assistant-bouton", texte: T.envoyerDemande });
    var annuler = el("button", { type: "button", "class": "assistant-action", texte: T.annuler });
    var consentement = [el("input", { type: "checkbox", name: "consent", required: true }), " " + cfg.consentement];
    if (cfg.donneesPersonnelles) consentement.push(" (", el("a", { href: cfg.donneesPersonnelles, texte: T.donneesPerso }), ")");
    formRappel = el("form", { "class": "assistant-rappel", novalidate: true }, [
      el("p", { texte: T.coordonnees(cfg.prenom) }),
      el("label", { "for": id("prenom"), texte: T.prenom }),
      el("input", { id: id("prenom"), name: "prenom", type: "text", required: true, autocomplete: "given-name", maxlength: "80" }),
      el("label", { "for": id("email"), texte: T.email }),
      el("input", { id: id("email"), name: "email", type: "email", required: true, autocomplete: "email", maxlength: "120" }),
      el("label", { "for": id("telephone"), texte: T.telephone }),
      el("input", { id: id("telephone"), name: "telephone", type: "tel", autocomplete: "tel", maxlength: "40" }),
      el("label", { "class": "assistant-consent" }, consentement),
      el("div", { "class": "assistant-hp", "aria-hidden": "true" }, [el("label", null, [T.siteWeb, el("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off" })])]),
      erreur,
      el("div", { "class": "assistant-rappel-boutons" }, [envoi, annuler])
    ]);
    annuler.addEventListener("click", function () { fil.removeChild(formRappel); formRappel = null; champ.focus({ preventScroll: true }); });
    formRappel.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!formRappel.checkValidity()) { formRappel.reportValidity(); return; }
      var v = function (n) { var i = formRappel.querySelector("[name=\"" + n + "\"]"); return i.type === "checkbox" ? (i.checked ? "oui" : "") : i.value; };
      envoi.disabled = true;
      envoi.textContent = T.envoiEnCours;
      erreur.hidden = true;
      var w3f = cfg.rappelFormat === "web3forms";
      // Web3Forms : champ piège rempli = robot ; rien ne part, la fenêtre fait comme si (même comportement que le site).
      var envoiRappel = w3f && v("website")
        ? Promise.resolve({ ok: true, j: { success: true } })
        : fetch(cfg.rappelApi, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(w3f
            ? { access_key: cfg.rappelCle, subject: cfg.rappelSujet, from_name: cfg.titre, name: v("prenom"), email: v("email"), telephone: v("telephone") || "non renseigné", consentement: v("consent"), page: location.pathname, message: transcription() }
            : { kind: "contact", prenom: v("prenom"), nom: "", email: v("email"), telephone: v("telephone"), consent: v("consent"), website: v("website"), message: transcription(), page: location.pathname + " (assistant)", url: location.href, referrer: document.referrer || "", duree: String(Date.now() - t0) })
        }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); });
      envoiRappel
        .then(function (res) {
          if (w3f && res.ok && res.j && res.j.success !== true) res.ok = false;
          if (!res.ok || !res.j || res.j.ok === false) throw new Error((res.j && (res.j.error || res.j.erreur || (w3f && res.j.message))) || T.envoiImpossible);
          signaler("assistant_rappel");
          if (res.j.redirect) { location.href = res.j.redirect; return; }
          fil.removeChild(formRappel);
          formRappel = null;
          message("assistant", [el("p", { texte: T.merci(cfg.prenom) })]);
        })
        .catch(function (err) {
          envoi.disabled = false;
          envoi.textContent = T.envoyerDemande;
          erreur.textContent = T.echec(err.message);
          erreur.hidden = false;
        });
    });
    fil.appendChild(formRappel);
    defilerEnBas();
    formRappel.querySelector("input").focus({ preventScroll: true });
  }
  if (boutonRappel) boutonRappel.addEventListener("click", ouvrirRappel);
})();
