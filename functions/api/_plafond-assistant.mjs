// Plafond quotidien des réponses de l'assistant (POST /api/chat), repris du site MKZ (06/11/2026) le 11/11/2026.
//
// Pourquoi ici et pas dans _assistant.mjs : le module du skill limite le débit par un binding « ratelimit » que les
// Pages Functions n'ont pas (absent de la liste des bindings Pages, doc lue le 06/11/2026), et la zone en offre Free
// n'a droit qu'à UNE règle de limite (10 s fixes). Ce plafond borne la facture : au plus ASSISTANT_MAX_JOUR réponses
// par jour (variable du projet Pages, 300 par défaut). La vraie borne de dépense reste le plafond posé sur l'espace de
// travail de la clé chez Anthropic.
//
// Compteur : clé « assistant:<AAAA-MM-JJ> » (jour UTC) dans le KV ASSISTANT_QUOTA s'il est lié au projet, lue avant
// la question, écrite après une réponse 200 seulement (seule une réponse 200 a appelé le modèle). Lecture puis
// écriture sans verrou : deux questions simultanées peuvent n'en compter qu'une, le dépassement reste de quelques
// unités. Sans KV, ou KV en erreur, compteur en mémoire de l'isolat (approché), jamais l'absence de plafond.
// Plafond atteint : 429 avec « indisponible », que la fenêtre affiche avec le téléphone de la config.

export const CLE_PREFIXE = "assistant:";
export const MAX_DEFAUT = 300;
const memoire = new Map();

export function jourUtc(date) {
  return (date || new Date()).toISOString().slice(0, 10);
}

export function maxJour(env) {
  const n = Number(env && env.ASSISTANT_MAX_JOUR);
  return Number.isInteger(n) && n > 0 ? n : MAX_DEFAUT;
}

async function lire(kv, cle) {
  if (kv && typeof kv.get === "function") {
    try {
      const v = await kv.get(cle);
      return { n: Number(v) || 0, kv: true };
    } catch (e) {
      // KV injoignable : on retombe sur la mémoire de l'isolat.
    }
  }
  return { n: memoire.get(cle) || 0, kv: false };
}

// traiter : fonction qui rend la réponse de l'assistant (Promise<Response>).
// options : { maintenant: () => Date, attendre: (promesse) => void } (attendre = context.waitUntil).
export async function avecPlafond(request, env, traiter, options) {
  const o = options || {};
  if (request.method !== "POST") return traiter();
  const kv = env && env.ASSISTANT_QUOTA;
  const max = maxJour(env);
  const cle = CLE_PREFIXE + jourUtc(o.maintenant ? o.maintenant() : undefined);
  const lu = await lire(kv, cle);
  if (lu.n >= max) {
    console.log(JSON.stringify({ event: "assistant", statut: 429, raison: "plafond-jour", compte: lu.n, max }));
    return new Response(JSON.stringify({ ok: false, indisponible: true, erreur: "L'assistant a atteint sa limite de questions pour aujourd'hui" }), {
      status: 429,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const reponse = await traiter();
  if (reponse.status === 200) {
    const n = lu.n + 1;
    memoire.set(cle, Math.max(memoire.get(cle) || 0, n));
    if (lu.kv) {
      const ecriture = kv.put(cle, String(n), { expirationTtl: 172800 }).catch(() => {});
      if (typeof o.attendre === "function") o.attendre(ecriture);
      else await ecriture;
    }
  }
  return reponse;
}
