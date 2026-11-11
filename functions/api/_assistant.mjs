/*
 * Assistant d'un site statique : route POST /api/chat d'un Worker Cloudflare qui sert le site en assets statiques.
 * Module générique du skill assistant-site-statique, né du prototype d'un site client (préproduction, 26/10/2026).
 * Runtime : Cloudflare Workers (fetch, Request, Response, AbortSignal.timeout), ou Node >= 18 pour le banc d'essai.
 * Dépendances : aucune.
 *
 * Ce que reçoit le modèle, en trois niveaux, tous construits au build dans /_assistant/index.json (lu par le binding
 * ASSETS, jamais servi au public) :
 *   1. la fiche de connaissances, toujours présente et mise en cache (préfixe stable : consignes puis fiche) ;
 *   2. le détail des pages que la conversation vise (page consultée, ou nom cité dans la question ou la précédente) ;
 *   3. quelques passages retrouvés par un classement BM25 dans le texte des pages.
 * La réponse passe ensuite les interdits du site (règles de forme et de fond) et les gardes par sujet (un montant dans
 * la réponse à une question sur les sanctions, par exemple) : une réponse qui en enfreint un est remplacée par un repli
 * qui renvoie vers les pages et vers un humain. Les adresses de pages citées entre parenthèses deviennent les sources
 * quand la page existe ; une adresse inventée est retirée du texte. Aucune conversation n'est stockée : les journaux ne
 * portent que des compteurs.
 *
 * Intégration dans le Worker du site (module téléversé à côté de index.js) :
 *   import { traiterChat, PREFIXE_PRIVE } from "./assistant-worker.mjs";
 *   if (path === "/api/chat") return traiterChat(request, env, { dev });
 *   if (path.startsWith(PREFIXE_PRIVE)) return new Response("Not found", { status: 404 });
 * L'export par défaut est un Worker minimal (route, index fermé, assets, préproduction fermée aux moteurs) : il sert au
 * banc d'essai et à un site qui n'a pas d'autre logique côté Worker.
 * Secret : ANTHROPIC_API_KEY, secret classique du Worker (« Variables et secrets », type Secret). Liaison facultative :
 * ASSISTANT_LIMITE (limitation de débit, binding ratelimit). Sans le secret, la route répond 503 et la fenêtre affiche
 * les contacts directs.
 * Le build (construire-index-assistant.mjs) importe normaliser() et termes() de ce module : une seule normalisation
 * pour l'index et pour la question, jamais deux copies à garder identiques.
 */

export const CHEMIN_INDEX = "/_assistant/index.json";
export const PREFIXE_PRIVE = "/_assistant/";
const API = "https://api.anthropic.com/v1/messages";
const DELAI_API_MS = 25000;
// Corps de requête plafonné et lu par morceaux : une conversation légitime (10 messages au plus, 600 caractères par
// question, 2 500 par réponse) tient sous 40 Ko. Porté du durcissement du prototype (27/10/2026).
const CORPS_MAX = 65536;
const CTRL = new RegExp("[" + String.fromCharCode(0) + "-" + String.fromCharCode(31) + "]+", "g");
const TIRET_LONG = String.fromCharCode(0x2014);
const TIRET_DEMI = String.fromCharCode(0x2013);

// Mots sans valeur de recherche, écrits déjà normalisés (minuscules, sans accent).
export const VIDES = ("le la les un une des du de et ou en au aux ce ces cet cette se sa son ses sur dans par pour pas plus ne que qui quoi dont "
  + "est sont etre ete avoir ai as avons avez ont il ils elle elles on nous vous je tu me te lui leur leurs mon ma mes ton ta tes "
  + "notre nos votre vos quel quelle quels quelles comment combien pourquoi quand ceci cela ca tout tous toute toutes tres bien "
  + "aussi mais donc ni car si avec sans sous entre chez vers apres avant depuis pendant comme meme autre autres faire fait fais "
  + "peut peux peuvent puis doit dois doivent faut va vais vont ici bonjour merci svp oui non deja encore alors ainsi chaque "
  + "y a d l j c s n m t qu jusqu lorsque puisque voici voila celui celle ceux celles").split(/\s+/).filter(Boolean);

// Libellés du message envoyé au modèle, dans la langue de l'index (index.langue, « fr » quand l'index ne la porte pas).
// Ajoutés le 06/11/2026 pour l'assistant anglais de MKZ : le texte français envoyé est resté identique au caractère près.
const LIBELLES = {
  fr: {
    passage: (t, u, s) => `Passage de la page « ${t} » (${u})${s ? ", section « " + s + " »" : ""} :`,
    aucun: "Aucun passage trouvé.",
    pageVue: "Page consultée par le visiteur : ",
    inconnue: "inconnue",
    sources: "Les pages ci-dessous sont les plus proches de votre question, et ",
  },
  en: {
    passage: (t, u, s) => `Excerpt from the page "${t}" (${u})${s ? ", section \"" + s + "\"" : ""}:`,
    aucun: "No excerpt found.",
    pageVue: "Page the visitor is viewing: ",
    inconnue: "unknown",
    sources: "The pages below are the closest to your question, and ",
  },
};

export function normaliser(t) {
  return String(t || "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

// Termes d'un texte : mots normalisés de deux caractères ou plus, hors mots vides, pluriel en s ou x retiré au-delà de 4 lettres.
export function termes(t, vides) {
  const out = [];
  for (let m of normaliser(t).split(" ")) {
    if (m.length < 2 || vides.has(m)) continue;
    if (m.length > 4 && /[sx]$/.test(m)) m = m.slice(0, -1);
    out.push(m);
  }
  return out;
}

export function estHoteTechnique(hote) {
  return /\.(workers|pages)\.dev$/i.test(hote) || /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(hote);
}

function json(obj, statut, extra) {
  return new Response(JSON.stringify(obj), { status: statut || 200, headers: Object.assign({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, extra || {}) });
}

// Index chargés une fois par isolat, un par chemin : un site à deux langues (MKZ, 06/11/2026) a deux index, et un seul
// emplacement les ferait relire à chaque bascule de langue.
const caches = new Map();

// Corps lu par morceaux, abandonné dès qu'il dépasse max octets (null) : un envoi sans Content-Length n'est jamais
// mis en mémoire en entier.
async function lireCorps(request, max) {
  const annonce = Number(request.headers.get("content-length") || 0);
  if (annonce > max) return null;
  if (!request.body) return "";
  const lecteur = request.body.getReader();
  const dec = new TextDecoder();
  let n = 0;
  let s = "";
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) { try { await lecteur.cancel(); } catch (e) { /* déjà fermé */ } return null; }
    s += dec.decode(value, { stream: true });
  }
  return s + dec.decode();
}

async function chargerIndex(env, origine, chemin) {
  if (caches.has(chemin)) return caches.get(chemin);
  if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") return null;
  let j;
  try {
    const r = await env.ASSETS.fetch(new Request(origine + chemin));
    if (!r.ok) return null;
    j = await r.json();
  } catch (e) { return null; }
  if (!j || !Array.isArray(j.pages) || !Array.isArray(j.blocs) || !j.consignes || !j.connaissances) return null;
  j.videsSet = new Set(j.vides);
  j.regles = (j.interdits || []).map((i) => ({ re: new RegExp(i.s, i.f), pourquoi: i.pourquoi || "", bloquant: i.bloquant !== false }));
  j.gardesRe = (j.gardes || []).map((g) => ({ nom: g.nom, q: new RegExp(g.q.s, g.q.f), r: new RegExp(g.r.s, g.r.f) }));
  j.parAdresse = new Map(j.pages.map((p) => [p.u, p]));
  j.blocGaranti = j.reglages.pagesBlocGaranti ? new RegExp(j.reglages.pagesBlocGaranti) : null;
  if (caches.size >= 4) caches.clear();
  caches.set(chemin, j);
  return j;
}

// Classement BM25 des blocs. Question courante (poids 1), question précédente (0,4) pour suivre le fil, synonymes au poids
// du mot (à 0,6, « compris dans la commission » ne retrouvait plus la page des tarifs, mesuré sur le prototype) ; les blocs
// de la page consultée gagnent 30 %, et une page qui correspond à pagesBlocGaranti garde au moins son meilleur bloc pour
// qu'« ici » ait un sens (pas l'accueil : son bloc d'ouverture revenait à chaque question). Trois blocs par page au plus.
function chercherPassages(index, question, precedente, page) {
  const R = index.reglages;
  const poids = new Map();
  const ajouter = (txt, w) => {
    for (const t of termes(txt, index.videsSet)) {
      poids.set(t, Math.max(poids.get(t) || 0, w));
      for (const s of index.synonymes[t] || []) poids.set(s, Math.max(poids.get(s) || 0, w));
    }
  };
  ajouter(precedente, 0.4);
  ajouter(question, 1);
  const N = index.blocs.length;
  const k1 = 1.2, b = 0.75;
  const scores = new Map();
  for (const [t, w] of poids) {
    const post = index.termes[t];
    if (!post) continue;
    const df = post.length / 2;
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    for (let i = 0; i < post.length; i += 2) {
      const bi = post[i], tf = post[i + 1], dl = index.blocs[bi].n;
      scores.set(bi, (scores.get(bi) || 0) + w * idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / index.moy)));
    }
  }
  const pi = index.pages.findIndex((p) => p.u === page);
  if (pi >= 0) for (const [bi, s] of scores) if (index.blocs[bi].p === pi) scores.set(bi, s * 1.3);
  const tries = [...scores].sort((a, c) => c[1] - a[1]);
  const choisis = [];
  const parPage = {};
  let total = 0;
  for (const [bi] of tries) {
    const bl = index.blocs[bi];
    if ((parPage[bl.p] || 0) >= 3 || (total + bl.x.length > R.caracteresPassages && choisis.length)) continue;
    choisis.push(bl);
    parPage[bl.p] = (parPage[bl.p] || 0) + 1;
    total += bl.x.length;
    if (choisis.length >= R.passages) break;
  }
  if (pi >= 0 && index.blocGaranti && index.blocGaranti.test(page) && !choisis.some((bl) => bl.p === pi)) {
    const meilleur = tries.find(([bi]) => index.blocs[bi].p === pi);
    const bloc = meilleur ? index.blocs[meilleur[0]] : index.blocs.find((bl) => bl.p === pi);
    if (bloc) { if (choisis.length >= R.passages) choisis.pop(); choisis.push(bloc); }
  }
  return choisis;
}

// Détail des pages que la conversation vise : page consultée d'abord, puis les pages dont un nom figure dans la question
// ou dans la question précédente (noms normalisés au build), detailsMax au plus.
function chercherDetails(index, question, precedente, page) {
  const texte = " " + normaliser(question + " " + precedente) + " ";
  const max = index.reglages.detailsMax;
  const choisis = (index.details || []).filter((d) => d.u === page);
  for (const d of index.details || []) {
    if (choisis.length >= max) break;
    if (!choisis.includes(d) && d.noms.some((n) => texte.includes(" " + n + " "))) choisis.push(d);
  }
  return choisis.slice(0, max);
}

// Historique envoyé par la page : alternance visiteur / assistant, finissant par une question du visiteur.
function lireHistorique(messages, R) {
  if (!Array.isArray(messages) || !messages.length || messages.length > 40) return { erreur: "Conversation illisible" };
  if (messages.some((m) => !m || (m.role !== "user" && m.role !== "assistant"))) return { erreur: "Conversation illisible" };
  const msgs = messages.slice(-R.historiqueMax).map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content.replace(CTRL, " ").trim() : "" }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs.some((m) => !m.content)) return { erreur: "Conversation illisible" };
  for (let i = 0; i < msgs.length; i++) if (msgs[i].role !== (i % 2 ? "assistant" : "user")) return { erreur: "Conversation illisible" };
  if (msgs[msgs.length - 1].role !== "user") return { erreur: "Conversation illisible" };
  // Toutes les questions envoyées au modèle, pas seulement la dernière : sur le prototype, une question ancienne de 5 000
  // caractères passait et était facturée (prouvé le 27/10/2026).
  if (msgs.some((m) => m.role === "user" && m.content.length > R.questionMax)) return { erreur: `Question trop longue : ${R.questionMax} caractères au plus` };
  for (const m of msgs) if (m.role === "assistant") m.content = m.content.slice(0, R.reponseMax);
  return { msgs };
}

// Texte rendu au visiteur : tirets longs convertis (le site n'en publie pas), gras et intertitres Markdown retirés.
function texteSortie(t) {
  return String(t)
    .replace(new RegExp("\\s[" + TIRET_LONG + TIRET_DEMI + "]\\s", "g"), ", ")
    .replace(new RegExp("[" + TIRET_LONG + TIRET_DEMI + "]", "g"), "-")
    .replace(/\*\*|__/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Clé de l'API Claude : secret classique du Worker (chaîne). Une liaison vers le Secrets Store du compte (objet lu par
// get()) est lue aussi, mais Cloudflare a refusé cette liaison au jeton de déploiement du prototype (code 10021) : le
// secret classique est la forme qui a marché.
async function cleAnthropic(env, nom) {
  const b = env[nom];
  if (!b) return "";
  if (typeof b === "string") return b.trim();
  if (typeof b.get === "function") { try { return String((await b.get()) || "").trim(); } catch (e) { return ""; } }
  return "";
}

// options : { dev, cheminIndex, secret, limiteur }. dev = hôte technique (préproduction) : cause d'un 503, jetons
// consommés, pages jointes et texte brut d'une réponse écartée sont renvoyés dans « mesure ». Jamais sur le site public.
export async function traiterChat(request, env, options) {
  const o = options || {};
  const dev = !!o.dev;
  const nomSecret = o.secret || "ANTHROPIC_API_KEY";
  const cheminIndex = o.cheminIndex || CHEMIN_INDEX;
  const url = new URL(request.url);
  const t0 = Date.now();
  const journal = (x) => console.log(JSON.stringify(Object.assign({ event: "assistant", ms: Date.now() - t0 }, x)));
  const indisponible = (cause) => json(Object.assign({ ok: false, indisponible: true, erreur: "L'assistant n'est pas disponible pour le moment" }, dev ? { mesure: { cause } } : {}), 503);
  if (request.method !== "POST") return json({ ok: false, erreur: "POST attendu" }, 405);
  if (request.headers.get("origin") !== url.origin) { journal({ statut: 403, raison: "origine" }); return json({ ok: false, erreur: "Origine refusée" }, 403); }
  if (!(request.headers.get("content-type") || "").includes("application/json")) return json({ ok: false, erreur: "JSON attendu" }, 415);
  const cle = await cleAnthropic(env, nomSecret);
  if (!cle) return indisponible(`secret ${nomSecret} absent du Worker ou illisible`);
  const limiteur = env[o.limiteur || "ASSISTANT_LIMITE"];
  if (limiteur && typeof limiteur.limit === "function") {
    const { success } = await limiteur.limit({ key: "assistant:" + (request.headers.get("cf-connecting-ip") || "inconnue") });
    if (!success) { journal({ statut: 429, raison: "debit" }); return json({ ok: false, erreur: "Beaucoup de questions d'affilée : patientez une minute" }, 429); }
  }
  let corps;
  let brut;
  try { brut = await lireCorps(request, CORPS_MAX); } catch (e) { return json({ ok: false, erreur: "Corps illisible" }, 400); }
  if (brut === null) { journal({ statut: 413, raison: "taille" }); return json({ ok: false, erreur: "Conversation trop longue" }, 413); }
  try { corps = JSON.parse(brut); } catch (e) { return json({ ok: false, erreur: "Corps illisible" }, 400); }
  if (!corps || typeof corps !== "object" || Array.isArray(corps)) return json({ ok: false, erreur: "Corps illisible" }, 400);
  const index = await chargerIndex(env, url.origin, cheminIndex);
  if (!index) { journal({ statut: 503, raison: "index" }); return indisponible(`index ${cheminIndex} introuvable ou illisible`); }
  const R = index.reglages;
  // Filtre anti-robots des formulaires : durée passée sur la page, mesurée par la fenêtre avec l'horloge du visiteur.
  // La fenêtre attend ce délai avant d'envoyer (data-delai-ms), sinon une suggestion cliquée tout de suite tombe ici.
  const duree = Number(corps && corps.duree);
  if (!Number.isFinite(duree) || duree < R.dureeMinMs) { journal({ statut: 422, raison: "duree" }); return json({ ok: false, erreur: "Rechargez la page puis réessayez" }, 422); }
  const h = lireHistorique(corps.messages, R);
  if (h.erreur) return json({ ok: false, erreur: h.erreur }, 422);

  // Adresse rangée sans barre finale, comme l'index (un site aux adresses /tarifs/ envoie location.pathname tel quel).
  const page = String(corps.page == null ? "" : corps.page).replace(CTRL, " ").trim().slice(0, 200).split("?")[0].split("#")[0].replace(/(.)\/+$/, "$1");
  const questions = h.msgs.filter((m) => m.role === "user");
  const question = questions[questions.length - 1].content;
  const precedente = questions.length > 1 ? questions[questions.length - 2].content : "";
  const passages = chercherPassages(index, question, precedente, page);
  const details = chercherDetails(index, question, precedente, page);
  const pageVue = index.parAdresse.get(page);
  const L = LIBELLES[index.langue] || LIBELLES.fr;
  const extraits = passages.map((bl) => `${L.passage(index.pages[bl.p].t, index.pages[bl.p].u, bl.s)}\n${bl.x}`).join("\n\n");
  const detailsTexte = details.length ? `<details_pages>\n${details.map((d) => d.texte).join("\n\n")}\n</details_pages>\n\n` : "";
  const messages = h.msgs.slice(0, -1).concat([{ role: "user", content: `${detailsTexte}<passages>\n${extraits || L.aucun}\n</passages>\n\n${L.pageVue}${pageVue ? pageVue.t + " (" + pageVue.u + ")" : page || L.inconnue}\n\n<question>\n${question}\n</question>` }]);
  // Consignes et fiche forment le préfixe stable de chaque requête : mis en cache (cache_control sur le dernier bloc
  // système), il n'est facturé en entier qu'à la première question d'une série rapprochée.
  const systeme = [
    { type: "text", text: index.consignes },
    { type: "text", text: index.connaissances, cache_control: { type: "ephemeral" } },
  ];
  const sourcesDe = (adresses) => [...new Set(adresses)].filter((u) => index.parAdresse.has(u)).map((u) => ({ titre: index.parAdresse.get(u).t, url: u }));
  const mesure = (x) => (dev ? { mesure: Object.assign({ details: details.map((d) => d.u), extraits: passages.map((bl) => index.pages[bl.p].u + (bl.s ? " : " + bl.s : "")), prefixeCaracteres: index.consignes.length + index.connaissances.length }, x) } : {});
  const repli = (raison, extra, brut) => {
    journal(Object.assign({ statut: 200, raison, passages: passages.length, page }, extra || {}));
    const sources = sourcesDe(passages.slice(0, 3).map((bl) => index.pages[bl.p].u)).slice(0, 2);
    const reponse = index.repli.replace("{sources}", sources.length ? L.sources : "");
    return json(Object.assign({ ok: true, filtre: raison, reponse, sources }, mesure(Object.assign({ brut: brut || "" }, extra || {}))));
  };
  // Préproduction seulement : réglage d'essai pour comparer la réflexion coupée à la réflexion par défaut. Mesuré sur le
  // prototype : moins cher et plus rapide, mais un montant d'amende donné malgré la consigne ; à ne pas garder.
  const essai = dev && corps.essai && corps.essai.reflexion === "coupee";

  let r, j;
  try {
    // Version d'API 2026-10-21 : temperature, top_p et top_k renvoient une erreur 400, quelle que soit leur valeur.
    const requete = { model: index.modele.id, max_tokens: index.modele.maxJetons, output_config: { effort: index.modele.effort }, system: systeme, messages };
    if (essai) requete.thinking = { type: "disabled" };
    r = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": cle, "anthropic-version": index.modele.versionApi },
      body: JSON.stringify(requete),
      signal: AbortSignal.timeout(DELAI_API_MS),
    });
    j = await r.json();
  } catch (e) {
    journal({ statut: 502, raison: "reseau", detail: String((e && e.name) || e).slice(0, 60) });
    return json({ ok: false, erreur: "La réponse n'a pas pu arriver" }, 502);
  }
  if (!r.ok) {
    journal({ statut: 502, raison: "api", api: r.status, type: j && j.error ? j.error.type : "" });
    return json({ ok: false, erreur: r.status === 429 || r.status === 529 ? "L'assistant est très sollicité, réessayez dans un instant" : "La réponse n'a pas pu arriver" }, 502);
  }
  const u = j.usage || {};
  const usage = { entree: u.input_tokens || 0, cacheEcrit: u.cache_creation_input_tokens || 0, cacheLu: u.cache_read_input_tokens || 0, sortie: u.output_tokens || 0, stop: j.stop_reason, reflexion: essai ? "coupee" : "defaut" };
  if (j.stop_reason === "refusal") return repli("refus", usage);
  // Réflexion active par défaut : la réponse commence par des blocs « thinking » ; seul le texte est gardé.
  let texte = texteSortie((j.content || []).filter((bl) => bl.type === "text").map((bl) => bl.text).join("\n"));
  // Réponse coupée par la limite de jetons : terminée à la dernière phrase complète plutôt qu'en plein mot.
  if (j.stop_reason === "max_tokens" && texte) {
    const fin = Math.max(texte.lastIndexOf(". "), texte.lastIndexOf(".\n"), texte.endsWith(".") ? texte.length - 1 : -1, texte.lastIndexOf(" ?"), texte.lastIndexOf(" !"));
    texte = fin >= 40 ? texte.slice(0, fin + 1).trim() : "";
    usage.coupe = true;
  }
  if (!texte) return repli("vide", usage);
  const regle = index.regles.find((x) => x.bloquant && x.re.test(texte));
  if (regle) return repli("regle", Object.assign({ regle: regle.pourquoi || regle.re.source.slice(0, 40) }, usage), texte);
  // Garde par sujet : la réponse se juge aussi selon la question posée (un montant quelconque en réponse à une question
  // sur les sanctions). Une règle de proximité seule (« amende » près du montant) laissait passer « les plafonds cités
  // sont de ... € » sur le prototype.
  const garde = index.gardesRe.find((g) => g.q.test(question) && g.r.test(texte));
  if (garde) return repli("garde", Object.assign({ garde: garde.nom }, usage), texte);
  const signales = index.regles.filter((x) => !x.bloquant && x.re.test(texte)).map((x) => x.pourquoi || x.re.source.slice(0, 40));
  // Adresses de pages citées : gardées si la page existe ; une adresse inconnue entre parenthèses est retirée du texte.
  // Une parenthèse peut citer plusieurs pages, « (/a, /b) » ou « (/a et /b) » : jusqu'au 11/11/2026, seule la forme à
  // une page était lue et la première page d'une liste sortait des sources (vu sur un site client le 07/11/2026,
  // dans la première réponse de son journal, corrigé là-bas puis porté ici). Dans une liste, les pages connues restent, les
  // inventées partent, et la parenthèse disparaît si aucune n'est connue ; une parenthèse toute connue reste telle quelle.
  const adresses = [];
  // Parenthèse doublée autour d'une adresse, « ((/a)) » : écrite par le modèle en recette le 11/11/2026, elle laissait
  // deux parenthèses nues autour du lien dans la fenêtre. Ramenée à une seule avant la lecture des adresses.
  texte = texte.replace(/\(\s*(\(\/[^()]*\))\s*\)/g, "$1");
  const sansBarre = (adr) => (adr.length > 1 ? adr.replace(/\/+$/, "") : adr);
  texte = texte.replace(/\s?\((\/[a-z0-9\-/]*(?:(?:\s*,\s*|\s+et\s+|\s+and\s+)\/[a-z0-9\-/]*)*)\)/g, (m, liste) => {
    const citees = liste.split(/\s*,\s*|\s+et\s+|\s+and\s+/);
    const connues = [...new Set(citees.map(sansBarre).filter((a) => index.parAdresse.has(a)))];
    adresses.push(...connues);
    if (!connues.length) return "";
    if (connues.length === citees.length) return m;
    return m.slice(0, m.indexOf("(")) + "(" + connues.join(", ") + ")";
  });
  for (const m of texte.matchAll(/(?:^|[\s«"'])(\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*)/g)) if (index.parAdresse.has(m[1])) adresses.push(m[1]);
  const sources = sourcesDe(adresses);
  journal(Object.assign({ statut: 200, tours: questions.length, passages: passages.length, details: details.length, sources: sources.length, page, signales: signales.length }, usage));
  return json(Object.assign({ ok: true, reponse: texte, sources }, mesure(Object.assign({ signales }, usage))));
}

// Worker minimal : route de l'assistant, index jamais servi, assets du site ; hôte technique fermé aux moteurs.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const dev = estHoteTechnique(url.hostname);
    const ferme = dev ? { "X-Robots-Tag": "noindex, nofollow" } : {};
    if (url.pathname === "/api/chat") return traiterChat(request, env, { dev });
    if (url.pathname.startsWith(PREFIXE_PRIVE)) return new Response("Not found", { status: 404, headers: Object.assign({ "content-type": "text/plain; charset=utf-8" }, ferme) });
    if (dev && url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n", { headers: Object.assign({ "content-type": "text/plain; charset=utf-8" }, ferme) });
    if (!env.ASSETS) return new Response("Not found", { status: 404, headers: ferme });
    const res = await env.ASSETS.fetch(request);
    if (!dev) return res;
    const r = new Response(res.body, res);
    r.headers.set("X-Robots-Tag", "noindex, nofollow");
    return r;
  },
};
