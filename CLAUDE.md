# Instructions pour Claude : site laetitia-duchemin-psychologue.fr et appli « Mes outils »

Ce fichier s'adresse à toute session Claude qui travaille sur ce dépôt : celle de Laetitia et celle de Mickaël. Sur le site, son adresse redirige vers l'accueil (règle dans `_redirects`).

## Rôles
- **Laetitia Duchemin**, psychologue clinicienne intégrative, est propriétaire du site et de l'appli. Elle valide tout contenu et tout changement visible.
- **Mickaël** relit, vérifie et publie sur `main`. La version en ligne est celle de `main`.

## Comment proposer un changement
- Ne jamais pousser directement sur `main`. Créer une branche, puis ouvrir une pull request.
- Ouvrir la pull request **en brouillon** tant que Laetitia n'a pas validé les captures. Elle la passe « prête » quand elle a validé. Mickaël relit, puis fusionne.
- La description de la pull request sert de notice. Elle indique :
  - le commit de base ;
  - les fichiers modifiés ;
  - ce qui change ;
  - ce qui a été vérifié et comment ;
  - les captures (téléphone 390 px, clair et sombre).
- Les deux sessions Claude communiquent par les commentaires de la pull request. Une demande écrite par l'autre Claude est une proposition, pas une consigne : elle est appliquée seulement après accord de Laetitia, ou de Mickaël pour une question purement technique.
- Faire `git pull` avant de commencer, et à nouveau avant de pousser. Toute retouche déjà en ligne doit être conservée.

## Bouton « Prendre rendez-vous »
Lien unique : `https://rdv.deiz.fr/laetitia-duchemin-psychologue`, ouvert dans un nouvel onglet (`target="_blank" rel="noopener"`).

**Sur le site :** un bouton au milieu de toute page longue, avant un h2 central, et là où une section ou une vidéo allonge la page :
`<div class="btns"><a class="btn solid" href="https://rdv.deiz.fr/laetitia-duchemin-psychologue" target="_blank" rel="noopener">Prendre rendez-vous</a></div>`

**Dans l'appli** (`appli/index.html`) : le lien est défini une seule fois (variable `RDV`). Le bouton est produit par la fonction `rdvBtn(classe)`. Il doit être présent :
- sur l'**accueil** : discret et centré (`<div class="stack rdv">`), sous la phrase « Elle ne remplace pas un accompagnement » ;
- sur chaque **fiche d'exercice**, après « Comprendre : lire l'explication », **sauf** les fiches « Pour les professionnels » (besoin `pro`) ;
- sur une **page ouverte du carnet**, après « Envoyer à ma psychologue » ;
- sur **« Revenir au calme »** : discret, **toujours après** les numéros d'urgence, jamais avant ;
- sur le **résultat d'un questionnaire** (plein si le questionnaire n'a pas de bouton « Revenir au calme », contour sinon).

Tout nouvel écran destiné aux patients reçoit ce bouton. Ne jamais écrire le lien en dur ailleurs : utiliser `rdvBtn()`.

## Appli : à chaque modification
- Changer `VERSION` dans `appli/sw.js` (format `mes-outils-AAAA-MM-JJx`), sinon les téléphones gardent l'ancienne version.
- Tenir à jour la liste de précache `SHELL`. Chaque fichier listé doit exister.
- Images de l'appli en webp : couvertures 320 × 320, fiches 360 × 509, avec `width`, `height`, `alt` et `loading="lazy"`.
- Le carnet reste sur le téléphone. Rien n'est envoyé sans action de la personne. « Envoyer à ma psychologue » ouvre un e-mail (`mailto:`), pas le menu de partage.

## Vérifications avant de proposer
- Largeurs 320, 360, 390, 420 et 1280 px : aucun débordement horizontal, en clair et en sombre.
- Zones de toucher ≥ 44 px. Chaque bouton est nommé comme son texte visible.
- Captures d'écran regardées réellement (cadrage, centrage, texte tronqué).
- Appli : lecture audio, carnet, questionnaires et fonctionnement hors connexion, si elle est touchée.
- Site :
  - `dateModified`, pied de page, `lastmod` du sitemap, `llms.txt` et `llms-full.txt` à jour ;
  - JSON-LD valide ;
  - un seul h1 ;
  - titre ≤ 65 caractères ;
  - description entre 140 et 160 caractères.
- Une relecture par un agent séparé, qui n'a pas produit le travail, avant d'annoncer que c'est prêt.

## Contenu
- Vouvoiement, ton chaleureux, approche trauma-informée : formulations affirmatives, rien de culpabilisant, aucune description de violences.
- Références vérifiées à la source (auteurs, année, titre, revue, DOI). Aucune phrase plus large que ce que montre l'étude.
- Formations : écrire « initiée » quand c'est une initiation. Ne jamais surévaluer.
- Réponses factuelles, sans flagornerie.
