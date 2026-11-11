// Pages Function : POST /api/chat, l'assistant du site (skill assistant-site-statique de MKZ, 11/11/2026).
//
// Ordre : (1) message de détresse : réponse fixe avec les numéros d'urgence du site, sans modèle ni clé
// (_urgences.mjs) ; (2) plafond quotidien de réponses (_plafond-assistant.mjs) ; (3) l'assistant (_assistant.mjs,
// copie du module du skill : ne pas le retoucher ici, corriger le skill puis recopier) ; (4) filet : une question grave
// dont la réponse ne porte pas le 3114 reçoit la phrase d'urgence du site en plus.
// Le modèle reçoit la fiche de connaissances construite depuis les pages du site dans /_assistant/index.json, lue par
// le binding ASSETS et jamais servie au public (functions/_assistant/[[chemin]].js répond 404).
// Secret : ANTHROPIC_API_KEY, variable chiffrée du projet Pages (Aperçu pour les préversions, Production pour le site) ;
// « mkz-chatbot », le nom choisi par Mickaël pour la même clé sur le site MKZ, est lu en secours (clé du compte MKZ,
// décision du 11/11/2026).
// Sans clé, la route répond 503 et ne coûte rien ; la réponse d'urgence, elle, marche toujours.
// Aucune conversation n'est gardée par le site : la conversation vit dans la page du visiteur, les journaux ne portent
// que des compteurs. Diagnostic (« mesure ») sur les préversions *.pages.dev seulement, jamais sur le domaine du site.

import { traiterChat, estHoteTechnique } from "./_assistant.mjs";
import { avecPlafond } from "./_plafond-assistant.mjs";
import { derniereQuestion, repondreSiUrgence, completerSiDetresse } from "./_urgences.mjs";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const env = context.env || {};
  const question = context.request.method === "POST" ? await derniereQuestion(context.request) : null;
  const urgence = await repondreSiUrgence(context.request, question);
  if (urgence) return urgence;
  const attendre = typeof context.waitUntil === "function" ? (p) => context.waitUntil(p) : undefined;
  const secret = env.ANTHROPIC_API_KEY ? "ANTHROPIC_API_KEY" : "mkz-chatbot";
  const reponse = await avecPlafond(context.request, env, () => traiterChat(context.request, env, { dev: estHoteTechnique(url.hostname), secret }), { attendre });
  return completerSiDetresse(question, reponse);
}
