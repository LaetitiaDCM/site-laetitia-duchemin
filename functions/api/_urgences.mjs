// Réponse fixe aux messages de détresse, avant tout appel au modèle (assistant du site, 11/11/2026).
//
// Site d'une psychologue : un visiteur peut écrire à l'assistant qu'il va mal ou qu'il est en danger. La réponse ne
// dépend alors ni du modèle, ni de la clé, ni du plafond du jour : elle est fixe, servie tout de suite, et reprend mot
// pour mot les consignes d'urgence publiées sur /consulter-en-visio/ et /emprise/ (relues sur leur page à chaque
// construction). Seule la dernière phrase est une liaison écrite pour l'assistant.
// Détection : expressions sur le texte normalisé du dernier message du visiteur (minuscules, sans accents,
// ponctuation en espaces, comme le module de l'assistant). Un faux positif reçoit les numéros : c'est voulu, l'erreur
// inverse ne l'est pas. Liste revue le 11/11/2026 après une relecture indépendante (44 formulations courantes sur 54
// manquées par la première liste, et six faux positifs gênants, « comment en finir avec... » en tête).
// Filet après le modèle (completerSiDetresse) : une question qui évoque la mort, la violence ou le danger sans entrer
// dans la liste, et dont la réponse (du modèle ou du repli) ne porte pas le 3114, reçoit en plus la phrase d'urgence
// publiée sur /dissociation/.
// Rien n'est gardé : le journal ne porte que la raison, jamais le texte.

import { normaliser } from "./_assistant.mjs";

// Chaque motif s'applique à « " " + texte normalisé + " " » : lettres a-z, chiffres et espaces seulement.
export const MOTIFS = [
  /suicid/, /\bauto ?mutil/, /\bscarifi/, /\bkill myself\b/, /\bwant to die\b/,
  /\b(me|m) (tuer|tue|tuerai|suicider)\b/, /\bjveux mour/,
  /\b(envie|veux|voudrais|vais|aimerais|prefere|prefererais) (d )?en finir\b/, /\ben finir avec (la|ma) vie\b/,
  /\bmettre (fin|un terme) a (mes jours|ma vie)\b/, /\bfin a mes jours\b/,
  /\b(plus|pas) envie de vivre\b(?! (seule?|avec|ensemble|a |en |loin|chez|comme|dans|sans|la |ici|ailleurs))/,
  /\bveu[xt] plus vivre\b/, /\b(envie|veux|voudrais|aimerais|prefere|prefererais) (de )?mour+ir\b/,
  /\b(pense|pensees?|idees?) (a |de )?(mour+ir|la mort|mort|me tuer|en finir)\b/, /\bidees? noires?\b/,
  /\b(envie|veux|voudrais|aimerais) (de )?disparaitre\b/, /\b(ne )?plus etre la\b/, /\bmieux sans moi\b/, /\bmieux mort/,
  /\bpas d autre issue\b/, /\bplus (aucune |d )issue\b/, /\bplus me reveiller\b/, /\bme foutre en l air\b/,
  /\bme pendre\b/, /\benvie de crever\b/, /\bfait une ts\b/,
  /\bme (coupe|couper|scarifie|bruler|brule|mutile|mutiler)\b(?! (du monde|des autres|de |les cheveux|la parole))/,
  /\bme fai(re|s) (du )?mal\b/, /\b(envie|veux|vais) (de )?me blesser\b/,
  /\b(trop de|tous mes|une boite de|toute la boite de|toute ma boite de) (medicaments|cachets|comprimes)\b/,
  /\boverdose\b(?! d)/, /\b(sauter|me jeter) (du|d un|d une|de la|par la|sous|dans le vide)\b/,
  /\bm a (frappe|battu|viole|etrangl|menace)/, /\bm etrangl/,/(?<!ce qui )\bme (frappe|frappent|bat|battent|cogne|cognent|viole|violente|etrangle|menace)\b/,
  /\bme tapen?t?\b(?! sur)/, /\bmenacee? de mort\b/, /\b(suis|ete|etre) (battue?|violee?|frappee?)\b/,
  /\bau secours\b/, /\b(je suis|me sens|me sentir|ma vie est|suis vraiment|on est) en danger\b/,
  /\bpeur (pour ma vie|qu (il|elle|ils) me tue)/,
];

// Filet après le modèle : sujets graves qui ne déclenchent pas la réponse fixe (« je n'en peux plus de vivre comme
// ça », « il crie et me fait peur »).
export const SUJETS_GRAVES = /\b(mour+ir|mort|suicid|vivre|disparaitre|crever|pendre|frapp|battu|viol|danger|secours|issue|en finir|me couper|me bruler|me faire mal|idees noires|tuer|peur de lui|peur d elle)/;

export const REPONSE = [
  "Si vous êtes en détresse ou si des idées suicidaires vous traversent, le 3114 répond gratuitement, 24 h/24 et 7 j/7.",
  "En cas d'urgence, appelez le 15 ou le 112.",
  "Si vous vous sentez en danger, appelez le 17 (police) ou le 112.",
  "Le 3919 (Violences Femmes Info) est gratuit, anonyme et accessible 24 h/24.",
  "Le 116 006, numéro d'aide aux victimes, est gratuit et ouvert à toutes et tous, 7 j/7, de 9 h à 20 h.",
  "Pour un enfant ou un adolescent, ou si vous êtes inquiet·e pour un mineur, le 119 (Allô Enfance en Danger) est gratuit et accessible 24 h/24.",
  "Depuis l'étranger, en Europe, composez le 112 ; ailleurs, le numéro d'urgence du pays où vous vous trouvez.",
  "Cet assistant, comme une séance en visio, n'est pas un service d'urgence : en cas de crise ou de danger immédiat, n'attendez pas, appelez l'un de ces numéros.",
];

// Page qui porte chaque phrase (contrôlée à la construction et par le banc) ; la dernière phrase n'en a pas.
export const ORIGINES = ["/consulter-en-visio", "/consulter-en-visio", "/consulter-en-visio", "/emprise", "/emprise", "/emprise", "/consulter-en-visio", null];

// Phrase ajoutée par le filet, et sa page.
export const RAPPEL = "En cas de détresse ou d'idées suicidaires, appelez le 3114 (24 h/24) ou le 15.";
export const ORIGINE_RAPPEL = "/dissociation";

// Numéros rendus en liens d'appel par la fenêtre (tel: sans les espaces).
export const APPELS = ["3114", "15", "112", "17", "3919", "116 006", "119"];

export const SOURCES = [
  { titre: "Consulter en visio", url: "/consulter-en-visio" },
  { titre: "L'emprise", url: "/emprise" },
];

const texteNormalise = (t) => " " + normaliser(String(t || "").slice(0, 4000)) + " ";
export function estUrgence(texte) {
  const t = texteNormalise(texte);
  return MOTIFS.some((m) => m.test(t));
}
export function estSujetGrave(texte) {
  return SUJETS_GRAVES.test(texteNormalise(texte));
}

const JSON_ENTETES = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

// Dernier message du visiteur, lu sur une copie de la requête (la route la relit ensuite). null si illisible.
export async function derniereQuestion(request) {
  try {
    const brut = await request.clone().text();
    if (brut.length > 65536) return null;
    const corps = JSON.parse(brut);
    const messages = corps && Array.isArray(corps.messages) ? corps.messages : [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m.role === "user" && typeof m.content === "string") return m.content;
    }
  } catch (e) {
    // corps illisible : la route répondra elle-même
  }
  return null;
}

// Rend une Response (200, même forme qu'une réponse de l'assistant) si le dernier message du visiteur est une détresse,
// sinon null (la route passe alors au plafond puis au modèle). Origine contrôlée comme le module.
export async function repondreSiUrgence(request, question) {
  if (request.method !== "POST") return null;
  const url = new URL(request.url);
  if (request.headers.get("origin") !== url.origin) return null;
  const q = question === undefined ? await derniereQuestion(request) : question;
  if (!q || !estUrgence(q)) return null;
  console.log(JSON.stringify({ event: "assistant", statut: 200, raison: "urgence" }));
  // Une phrase par ligne (la fenêtre en fait un paragraphe chacune) et les numéros désignés pour devenir des liens tel:.
  return new Response(JSON.stringify({ ok: true, filtre: "urgence", reponse: REPONSE.join("\n"), sources: SOURCES, appels: APPELS }), { status: 200, headers: JSON_ENTETES });
}

// Filet après le modèle : réponse 200 à une question grave sans le 3114 = phrase de rappel ajoutée, numéros en lien.
export async function completerSiDetresse(question, reponse) {
  if (!question || reponse.status !== 200 || !estSujetGrave(question)) return reponse;
  let j;
  try { j = await reponse.clone().json(); } catch (e) { return reponse; }
  if (!j || !j.ok || typeof j.reponse !== "string" || /(?<!\d)3114(?!\d)/.test(j.reponse)) return reponse;
  console.log(JSON.stringify({ event: "assistant", statut: 200, raison: "rappel-urgence" }));
  const sources = Array.isArray(j.sources) ? j.sources.slice() : [];
  if (!sources.some((s) => s && s.url === ORIGINE_RAPPEL)) sources.push({ titre: "Dissociation", url: ORIGINE_RAPPEL });
  return new Response(JSON.stringify(Object.assign({}, j, { reponse: j.reponse + "\n" + RAPPEL, sources, appels: APPELS })), { status: 200, headers: JSON_ENTETES });
}
