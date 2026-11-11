// Pages Function : /_assistant/* n'est jamais servi au public.
//
// L'index de l'assistant (consignes du modèle, fiche de connaissances) est un fichier statique du dépôt, lu par
// functions/api/chat.js à travers le binding ASSETS. Une route de fonction passe avant les fichiers statiques : sans
// elle, /_assistant/index.json serait téléchargeable par tous.

export function onRequest() {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
