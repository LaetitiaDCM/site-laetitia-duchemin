/* Calendrier de l'Avent et lutin farceur (décembre).
   Un seul fichier, chargé sur toutes les pages du site et dans l'appli.
   - Actif du 30 novembre (annonce) au 31 décembre, puis du 1er au 7 janvier (message et feu d'artifice du Nouvel An). Le reste de l'année, il ne fait rien.
   - Rien n'est envoyé : les cases trouvées et le choix « ne pas jouer » restent sur le téléphone (localStorage).
   - Aperçu à une date donnée : ajouter ?avent=2026-12-05 à l'adresse (gardé pendant la visite).
   Pour modifier un message ou un outil : uniquement le tableau JOURS ci-dessous. */
(function(){
'use strict';

/* ---------- Les 24 jours (+ le 25) ----------
   p : page où le lutin se cache · n : nom de la page · m : message du lutin
   a : outil adulte [identifiant de la fiche, titre] · e : outil enfant (null si aucun pour l'instant) */
var JOURS = [
 {p:'/les-emotions/', n:'Les émotions', m:"J'ai mélangé les étiquettes de toutes les émotions. La colère s'appelle maintenant Ginette. Et chez vous, quel temps fait-il ?", a:{t:'La météo intérieure', audio:'meteo', yt:'https://youtu.be/dUy8nwuoZFs'}, e:{t:'La météo de mes émotions', fiche:'la-meteo-de-mes-emotions', audio:'meteo-enf', yt:'https://youtu.be/ySpO8y1OvaU'}},
 {p:'/anxiete/', n:'Anxiété et angoisse', m:"J'ai voulu faire peur à l'inquiétude. Elle m'a sorti une liste de 37 catastrophes possibles. J'ai perdu. On respire ?", a:{t:'La respiration consciente', audio:'resp', yt:'https://youtu.be/Aog8HDxqDs0', fiche:'exercices-de-respiration'}, e:{t:'Le souffle magique', audio:'souffle', yt:'https://youtu.be/PnJ4EvUzA5c', fiche:'respirer-en-jouant'}},
 {p:'/estime-de-soi/', n:'Estime de soi', m:"J'ai caché votre miroir et laissé un mot dessus : « Ici vit quelqu'un qui fait de son mieux. »", a:['me-parler-comme-a-un-ami','Me parler comme à un·e ami·e'], e:{"t": "Ma petite voix gentille", "fiche": "ma-petite-voix-gentille", "pdfOnly": true}},
 {p:'/syndrome-de-l-imposteur/', n:"Syndrome de l'imposteur", m:"Confidence : je ne suis pas un vrai lutin, juste un dessin. Et pourtant, je fais très bien mon travail de lutin.", a:{"t": "Mes 5 moments positifs du jour", "fiche": "mes-5-moments-positifs"}, e:{"t": "Mes 3 petits bonheurs", "fiche": "mes-3-petits-bonheurs"}},
 {p:'/validation-emotionnelle/', n:'Validation émotionnelle', m:"Un petit lutin pleurait : son bonnet était trop grand. On ne lui a pas dit « c'est rien ». On lui a dit « c'est vexant, hein ». Il a souri.", a:{"t": "Valider ma propre émotion", "fiche": "valider-ma-propre-emotion", "pdfOnly": true}, e:{"t": "Mon émotion a le droit d'être là", "fiche": "mon-emotion-a-le-droit-d-etre-la", "pdfOnly": true}},
 {p:'/theorie-polyvagale/', n:'Théorie polyvagale', m:"J'ai demandé à votre nerf vague pourquoi il s'appelait comme ça. Il n'a pas répondu : il était au calme, sous un plaid.", a:{"t": "L'échelle de mes états", "fiche": "echelle-des-etats"}, e:{"t": "L'ascenseur de mon corps", "fiche": "l-ascenseur-de-mon-corps", "pdfOnly": true}},
 {p:'/fenetre-de-tolerance/', n:'Fenêtre de tolérance', m:"J'ai ouvert la fenêtre de tolérance pour aérer. Ne vous penchez pas trop : on reste là où c'est confortable.", a:{"t": "Le body-scan", "audio": "body", "yt": "https://youtu.be/QeoTge2MyZM"}, e:{"t": "Le petit rayon de lumière", "audio": "rayon", "yt": "https://youtu.be/aR-LaYQ7fno"}},
 {p:'/crise-d-angoisse/', n:"Crise d'angoisse", m:"J'ai compté les objets bleus autour de moi : quatre, dont mon bonnet. Et vous, combien en voyez-vous ?", a:{"t": "L'ancrage 5-4-3-2-1", "fiche": "ancrage-5-4-3-2-1"}, e:{"t": "Le détective des 5 sens", "fiche": "le-detective-des-5-sens", "pdfOnly": true}},
 {p:'/affirmation-de-soi/', n:'Affirmation de soi', m:"Aujourd'hui, j'ai dit non à une troisième part de bûche. Bon, j'y ai pensé. C'est déjà un début.", a:{"t": "Parler en « je »", "fiche": "parler-en-je"}, e:{"t": "Mon message en « je »", "fiche": "mon-message-en-je", "pdfOnly": true}},
 {p:'/confiance-en-soi/', n:'Confiance en soi', m:"J'ai voulu grimper seul tout en haut du sapin. Je suis tombé deux fois. La troisième, j'ai vu l'étoile de très près.", a:{"t": "Les qualités que les autres voient en moi", "fiche": "les-qualites-que-les-autres-voient-en-moi", "pdfOnly": true}, e:{"t": "Le bocal de mes qualités", "fiche": "le-bocal-de-mes-qualites", "pdfOnly": true}},
 {p:'/declencheurs-emotionnels/', n:'Déclencheurs émotionnels', m:"Mon déclencheur à moi : la musique de Noël dans les magasins dès novembre. Et vous, qu'est-ce qui vous fait grimper au plafond ?", a:{"t": "Mes petites lueurs", "fiche": "mes-petites-lueurs"}, e:{"t": "La chasse aux petites lueurs", "fiche": "la-chasse-aux-petites-lueurs", "pdfOnly": true}},
 {p:'/honte-et-culpabilite/', n:'Honte et culpabilité', m:"J'ai mangé un chocolat qui n'était pas à moi. J'aurais pu me cacher sous le tapis. J'ai préféré dire pardon et en rapporter deux.", a:{"t": "Je ne suis pas mon erreur", "fiche": "je-ne-suis-pas-mon-erreur", "pdfOnly": true}, e:{"t": "Les 3 R du lutin", "fiche": "les-3-r-du-lutin", "pdfOnly": true}},
 {p:'/pleine-conscience-sensible-au-trauma/', n:'Pleine Conscience Sensible au Trauma', m:"J'ai mangé un carré de chocolat en pleine conscience : trois minutes. Pendant ce temps, le lutin d'à côté a mangé la tablette.", a:{"t": "Un carré de chocolat en pleine conscience", "fiche": "un-carre-de-chocolat-en-pleine-conscience", "pdfOnly": true}, e:{"t": "Le chocolat magique", "fiche": "le-chocolat-magique", "pdfOnly": true}},
 {p:'/addictions/', n:'Addictions', m:"Une envie terrible de manger toutes les guimauves. Je l'ai regardée monter, monter… puis redescendre, comme une vague. J'en ai mangé une. Une seule.", a:{"t": "Surfer sur la frustration", "fiche": "surfer-sur-la-frustration", "pdfOnly": true}, e:{"t": "Le surfeur de l'envie", "fiche": "le-surfeur-de-l-envie", "pdfOnly": true}},
 {p:'/relation-saine/', n:'Relation saine', m:"J'ai demandé au renne s'il était d'accord pour tirer le traîneau. Il a dit oui, avec des pauses carottes. On a signé.", a:{"t": "Mes besoins fondamentaux", "fiche": "mes-besoins-fondamentaux"}, e:{"t": "Ce dont j'ai besoin pour grandir", "fiche": "ce-dont-j-ai-besoin-pour-grandir", "pdfOnly": true}},
 {p:'/co-regulation/', n:'Co-régulation', m:"Quand je suis grognon, la lutine respire tout doucement à côté de moi. Au bout d'un moment, je respire comme elle. C'est malin.", a:{"t": "Mes appuis de co-régulation", "fiche": "mes-appuis-de-co-regulation", "pdfOnly": true}, e:{"t": "Mon équipe pour retrouver mon calme", "fiche": "mon-equipe-pour-retrouver-mon-calme", "pdfOnly": true}},
 {p:'/hypersensibilite/', n:'Hypersensibilité', m:"J'ai baissé la radio, éteint un néon et coupé l'étiquette qui gratte dans votre pull. Ne me remerciez pas.", a:{"t": "Des outils pour apaiser ses émotions", "fiche": "regulation-emotionnelle"}, e:{"t": "Ma boîte d'apaisement", "fiche": "ma-boite-d-apaisement", "audio": "chat", "yt": "https://youtu.be/5w36c3fY5QI"}},
 {p:'/eft/', n:'EFT clinique', m:"J'ai tapoté sur ma tête en disant : « Même si j'ai renversé toutes les paillettes, je m'accepte comme je suis. » Il y en a encore partout. Mais je m'accepte.", a:{"t": "L'EFT clinique", "fiche": "eft-clinique"}, e:{"t": "Les tapotements du lutin (avec un adulte)", "fiche": "les-tapotements-du-lutin", "pdfOnly": true}},
 {p:'/le-corps-en-psychotherapie/', n:'Le corps en psychothérapie', m:"Étirements de lutin : bras vers le ciel, pieds dans la neige, et un bâillement de renne pour finir.", a:{"t": "Quatre postures pour habiter mon corps", "fiche": "quatre-postures-pour-habiter-mon-corps", "pdfOnly": true}, e:{"t": "Le yoga des animaux", "fiche": "le-yoga-des-animaux", "pdfOnly": true}},
 {p:'/resilience/', n:'Résilience', m:"Une boule du sapin s'est fêlée. On a mis de la colle dorée dans la fissure. C'est devenu ma préférée.", a:{"t": "Ma boule de Noël kintsugi", "fiche": "ma-boule-de-noel-kintsugi", "pdfOnly": true}, e:{"t": "Ma boule de Noël kintsugi (à faire en famille)", "fiche": "ma-boule-de-noel-kintsugi", "pdfOnly": true}},
 {p:'/attachement-secure/', n:'Attachement sécure', m:"Je pars faire des bêtises toute la journée. Je sais que je peux revenir me réchauffer près du feu, même après une bêtise.", a:{"t": "Ma base et mon refuge", "fiche": "ma-base-et-mon-refuge", "pdfOnly": true}, e:{"t": "Je pars et je reviens", "fiche": "je-pars-et-je-reviens", "pdfOnly": true}},
 {p:'/peur-de-l-abandon/', n:"Peur de l'abandon", m:"Mes copains lutins sont partis en tournée. Pendant qu'ils sont loin, je garde un de leurs bonnets sur mon lit. Ils reviennent jeudi.", a:{"t": "Traverser l'absence", "fiche": "traverser-l-absence"}, e:{"t": "Quand quelqu'un me manque", "fiche": "quand-quelqu-un-me-manque", "pdfOnly": true}},
 {p:'/ifs/', n:'IFS, les parts de soi', m:"Une part de moi veut ranger l'atelier. Une autre veut tout recouvrir de peinture. Je les ai écoutées toutes les deux. On a rangé… la peinture.", a:{"t": "Mes parts qui se disputent", "fiche": "mes-parts-qui-se-disputent", "pdfOnly": true}, e:{"t": "Mon farceur et mon sage", "fiche": "mon-farceur-et-mon-sage", "pdfOnly": true}},
 {p:'/regulation-emotionnelle/', n:'Régulation émotionnelle', m:"Ce soir, je ne fais pas de farce. Pour certains, Noël rime avec solitude, absence ou souvenirs lourds. Si c'est votre cas, vous avez le droit de vivre cette soirée à votre façon, et demain je vous laisse un cadeau pour vous poser.", a:{"t": "Le contenant (audio, 7 minutes)", "mp3": "le-contenant-adulte", "yt": "https://youtu.be/c7OHQYArgFs"}, e:{"t": "Le coffre à soucis (audio, 7 minutes)", "img": "coffre-a-soucis", "mp3": "coffre-a-soucis-enfant", "yt": "https://youtu.be/8bfqQXrxqgw", "note": "Pour l'adulte qui accompagne : si l'enfant a envie de parler de ce qu'il a déposé, accueillez sa parole sans la juger, mettez des mots sur ce qu'il ressent et cherchez une solution ensemble si c'est possible. C'est lui qui décide quand ouvrir son coffre."}}
];
/* Le 25 : le cadeau. Renseigner les liens des deux audios quand ils sont en ligne (YouTube non répertorié ou /appli/). */
var CADEAU = {
 m:"Joyeux Noël ! Mon cadeau : un lieu rien qu'à vous, à retrouver chaque fois que vous en avez besoin, que ce jour soit doux ou difficile.",
 adulte:{"t": "Le lieu sûr (audio, 15 minutes)", "img": "calin-papillon-adulte", "mp3": "le-lieu-sur-adulte", "yt": "https://youtu.be/jnF730aSTFk"},
 enfant:{"t": "Mon refuge (audio, 6 minutes)", "img": ["mon-refuge", "calin-papillon-enfant"], "mp3": "mon-refuge-enfant", "yt": "https://youtu.be/2bWg6ysqRiw"}
};
/* Le 30 novembre : l'annonce de l'arrivée des lutins (accueil du site et de l'appli). */
var ARRIVEE = "Demain, deux petits lutins farceurs s'installent sur le site. Du 1er au 24 décembre, ils se cacheront chaque jour sur une page différente. Trouvez-les pour ouvrir la case du jour : de quoi sourire, et un petit outil à essayer, pour les adultes et pour les enfants.";

/* Nouvel An : décompte du 26 au 31 décembre, puis message et feu d'artifice du 1er au 7 janvier. */
var NOUVEL_AN = [
 "Les lutins sont repartis, et une nouvelle année commence. Je vous souhaite qu'elle vous apporte de la douceur, des liens qui font du bien et des moments où vous vous sentez en sécurité.",
 "Prendre soin de sa santé mentale ne passe pas forcément par de grandes résolutions. Ce sont souvent de petits gestes, répétés à son rythme : une pause pour respirer, une émotion accueillie, une aide demandée quand c'est trop lourd.",
 "Si les fêtes ont été difficiles, vous n'avez rien à rattraper. Chaque jour peut être un nouveau départ, sans attendre le 1er janvier."
];
var AIDE = '/exercices/#apaiser'; /* « Besoin d'aide maintenant » */

/* ---------- Date du jour (ou date d'aperçu) ---------- */
var KEY='ld-avent', DAY=0, PRE=false, NY=0, OFFSET=0, YEAR=0, store={found:[],off:false};
try{var s=JSON.parse(localStorage.getItem(KEY)||'{}'); store.found=s.found||[]; store.off=!!s.off}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}}
(function(){
  var d=new Date(), q=(location.search.match(/[?&]avent=(\d{4}-\d{2}-\d{2})/)||[])[1];
  try{ if(q) sessionStorage.setItem('ld-avent-date',q); else q=sessionStorage.getItem('ld-avent-date') }catch(e){}
  if(q){var t=q.split('-'); d=new Date(+t[0],+t[1]-1,+t[2])}
  if(d.getMonth()===11) DAY=d.getDate();
  else if(d.getMonth()===10&&d.getDate()===30) PRE=true;
  else if(d.getMonth()===0&&d.getDate()<=7) NY=d.getFullYear();
  OFFSET=q?d.getTime()-new Date(new Date().setHours(0,0,0,0)).getTime():0; /* aperçu : on garde l'heure réelle */
  YEAR=d.getFullYear();
})();
if(!DAY&&!PRE&&!NY) { window.AVENT=null; return; }

var isApp = location.pathname.indexOf('/appli/')===0;
function found(n){return store.found.indexOf(n)>-1}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}).replace(/« /g,'«\u00a0').replace(/ (»|\?|!|:|;)/g,'\u00a0$1')}
function pdf(id){return '/avent/fiches/affiche-'+id+'-noel.pdf'} /* versions « Calendrier de l'Avent 2026 · Jour N » des fiches */
function path(){var p=location.pathname; return p.charAt(p.length-1)==='/'?p:p+'/'}

/* ---------- Images (dossier /avent/) ---------- */
var IMG='/avent/', ORN=['case-bois','case-boule','case-etoile','case-coeur'];
var DIM={"bandeau":[1200,214],"coffre-a-soucis":[600,433],"mon-refuge":[600,400],"calin-papillon-adulte":[600,440],"calin-papillon-enfant":[600,635],"case-bois":[154,160],"case-boule":[130,160],"case-cadeau":[178,160],"case-coeur":[162,160],"case-etoile":[144,160],"lutin-cache":[220,300],"peek-lutin":[480,294],"peek-lutine":[480,274],"scenes/arrivee":[1200,675],"scenes/depart":[1200,675],"scenes/j01":[720,406],"scenes/j02":[720,788],"scenes/j03":[720,720],"scenes/j04":[720,720],"scenes/j05":[720,720],"scenes/j06":[720,720],"scenes/j07":[720,720],"scenes/j08":[720,720],"scenes/j09":[720,720],"scenes/j10":[720,720],"scenes/j11":[720,720],"scenes/j12":[720,720],"scenes/j13":[720,720],"scenes/j14":[720,720],"scenes/j15":[720,720],"scenes/j16":[720,720],"scenes/j17":[720,720],"scenes/j18":[720,720],"scenes/j19":[720,720],"scenes/j20":[720,720],"scenes/j21":[720,720],"scenes/j22":[720,720],"scenes/j23":[720,720],"scenes/j24":[720,720],"side-lutin":[300,311],"side-lutine":[300,498],"top-lutin":[280,448],"top-lutine":[280,449]};
var CAP={"calin-papillon-adulte":"Le câlin papillon : croisez les bras sur la poitrine, posez les mains sur les épaules, puis tapotez lentement, une main après l’autre.","calin-papillon-enfant":"Le câlin papillon : croise les bras sur ta poitrine, pose tes mains sur tes épaules et tapote doucement, une main après l’autre."};
function scene(n){ return DIM['scenes/j'+(n<10?'0':'')+n] ? pic('scenes/j'+(n<10?'0':'')+n,'av-pic') : ''; }
function pic(n,cls,lazy){return '<img src="'+IMG+n+'.webp" alt="" width="'+DIM[n][0]+'" height="'+DIM[n][1]+'"'+(cls?' class="'+cls+'"':'')+(lazy?' loading="lazy"':'')+' decoding="async">'}

/* ---------- Styles ---------- */
var css=
'.av{margin:0 auto;max-width:1080px;padding:0 16px}'+
'.av-box{position:relative;overflow:hidden;background:linear-gradient(180deg,#1b1140 0%,#22135e 100%);border:1px solid rgba(217,166,72,.55);border-radius:20px;padding:0 16px 14px;margin:28px 0;color:#f3ecdf;box-shadow:0 10px 30px rgba(27,17,64,.25)}'+
'.av-banner{display:block;width:calc(100% + 32px);max-width:none;height:auto;margin:0 -16px 10px;aspect-ratio:1200/214;object-fit:cover}'+
'.av h2{font-family:var(--serif,Georgia,serif);font-size:clamp(1.6rem,5vw,2.2rem);font-weight:500;text-align:center;margin:0 0 6px;color:#ecd096}'+
'.av p{line-height:1.55;margin:6px 0}'+
'.av-box p{color:#e6e0f2}'+
'.av .av-hint{text-align:center;max-width:38em;margin-left:auto;margin-right:auto}'+
'.av h2{text-wrap:balance}'+
'.av-grid{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px 4px;padding:0;margin:16px 0 8px}'+
'.av-door{position:relative;width:100%;aspect-ratio:1;min-height:56px;display:flex;align-items:center;justify-content:center;border:0;border-radius:14px;background:transparent;padding:4px;cursor:pointer}'+
'.av-door img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;transition:transform .25s,filter .25s}'+
'.av-door span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:600 clamp(1.1rem,3.6vw,1.4rem) var(--serif,Georgia,serif);color:#fff;text-shadow:0 1px 2px #1b1140,0 0 6px #1b1140,0 0 10px #1b1140}'+
'.av-door[disabled]{cursor:default}'+
'.av-door[disabled] img{filter:grayscale(.6) brightness(.7);opacity:.7}'+
'.av-door[disabled] span{color:rgba(255,255,255,.65)}'+
'.av-door.is-today img{filter:drop-shadow(0 0 8px rgba(236,208,150,.95)) drop-shadow(0 0 16px rgba(217,166,72,.7))}'+
'.av-door:not([disabled]):hover img,.av-door:not([disabled]):focus-visible img{transform:scale(1.08) rotate(-3deg)}'+
'.av-door.is-open::after{content:"✓";position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:#d9a648;color:#1b1140;font:700 .75rem/20px var(--sans,system-ui,sans-serif);text-align:center}'+
'.av-door:focus-visible{outline:2px solid #ecd096;outline-offset:2px}'+
'@media (prefers-reduced-motion:reduce){.av img{transition:none !important;transform:none !important}}'+
'.av-row{display:flex;flex-wrap:wrap;gap:4px 16px;justify-content:center;align-items:center;margin-top:6px}'+
'.av a,.av .av-link{color:var(--link,#0f2a86)}'+
'.av-box a,.av-box .av-link,.av-dlg a,.av-dlg .av-link{color:#ecd096}'+
'.av-link{background:none;border:0;padding:0 4px;font:inherit;text-decoration:underline;cursor:pointer;min-height:44px;display:inline-flex;align-items:center}'+
'.av-row a,.av-help a{min-height:44px;display:inline-flex;align-items:center}'+
'.av-help a[href^="tel:"]{min-width:44px;justify-content:center}'+
'.av-help a{text-decoration:underline;text-underline-offset:3px}'+
'.av-help a:hover,.av .av-link:hover{text-decoration-thickness:2px}'+
'.av-hint a{display:inline-block;padding:10px 0;margin:-10px 0}'+
'.av-host{position:relative}'+
'.av-peek{position:absolute;top:0;width:110px;min-height:44px;padding:0;border:0;background:transparent;cursor:pointer;z-index:2;overflow:hidden}'+
'.av-fx{position:fixed;z-index:40;padding:0;border:0;background:transparent;cursor:pointer;transition:transform 1.4s cubic-bezier(.25,.8,.35,1)}'+
'.av-fx img{display:block;width:100%;height:auto}'+
'.av-top{right:10px;width:64px;transform:translateY(-105%)}'+
'.av-top.in{transform:translateY(0);animation:avSway 6s ease-in-out 1.6s infinite;transform-origin:50% 0}'+
'@keyframes avSway{0%,100%{transform:rotate(0)}50%{transform:rotate(3deg)}}'+
'.av-side{left:0;bottom:14vh;width:72px;transform:translateX(-105%)}'+
'.av-side.in{transform:translateX(0)}'+
'.av-side.av-right{left:auto;right:0;transform:translateX(105%) scaleX(-1)}'+
'.av-side.av-right.in{transform:translateX(0) scaleX(-1)}'+
'.av-fx:focus-visible{outline:2px solid #ecd096;outline-offset:2px}'+
'@media (min-width:900px){.av-top{width:96px;right:6vw}.av-side{width:110px}}'+
'@media (prefers-reduced-motion:reduce){.av-fx{transition:none;animation:none !important}}'+
'.av-pk{position:relative;display:block;transform:translateY(102%);transform-origin:50% 100%}'+
'.av-pk img{display:block;width:100%;height:auto}'+
'.av-pk-lutine .av-pk img{margin-bottom:-2px}'+
'.av-peek.shown .av-pk{transform:none}'+
'.av-peek.up .av-pk{animation:avUp 1.1s cubic-bezier(.25,.8,.35,1) both}'+
'.av-peek.idle .av-pk{transform:none;animation:avLook 7s ease-in-out infinite}'+
'@keyframes avUp{0%{transform:translateY(102%)}100%{transform:translateY(0)}}'+
'@keyframes avLook{0%,60%,100%{transform:translateY(0)}70%{transform:translateY(5%)}80%{transform:translateY(0)}88%{transform:translateY(3%)}94%{transform:translateY(0)}}'+
'.av-peek:focus-visible{outline:2px solid #ecd096;outline-offset:2px}'+
'@media (prefers-reduced-motion:reduce){.av-pk{animation:none !important;transform:none !important}}'+
'.av-lutin{float:right;margin:0 0 8px 14px;width:96px;min-height:44px;display:block;border:0;background:transparent;cursor:pointer;padding:0}'+
'.av-lutin img{display:block;width:100%;height:auto;transition:transform .3s;transform-origin:bottom center}'+
'.av-lutin:hover img,.av-lutin:focus-visible img{transform:rotate(-6deg) scale(1.05)}'+
'@media (prefers-reduced-motion:reduce){.av-lutin img{transition:none;transform:none !important}}'+
'.av-dlg{border:1px solid rgba(217,166,72,.6);border-radius:20px;padding:0;max-width:min(520px,calc(100vw - 32px));max-height:calc(100dvh - 32px);width:100%;background:linear-gradient(180deg,#1b1140,#22135e);color:#f3ecdf;box-shadow:0 20px 60px rgba(0,0,0,.45)}'+
'.av-dlg::backdrop{background:rgba(18,12,38,.6)}'+
'.av-in{padding:12px 18px 14px}'+
'.av-in h2{margin-top:0}'+
'.av-wide{display:block;width:100%;height:auto;margin:6px 0 8px;border-radius:14px}'+
'.av-countbox{text-align:center;margin:6px 0 14px}'+
'.av-countt{margin:0 0 6px;font:500 1.15rem/1.3 var(--serif,Georgia,serif);color:#ecd096;letter-spacing:.04em}'+
'.av-count{display:flex;justify-content:center;gap:clamp(4px,1.5vw,8px);flex-wrap:nowrap}'+
'.av-cu{display:flex;flex-direction:column;align-items:center;flex:1 1 0;min-width:0;max-width:78px;padding:8px 2px 6px;border:1px solid rgba(217,166,72,.55);border-radius:12px;background:rgba(13,8,48,.55)}'+
'.av-cu b{font:500 clamp(1.35rem,6.5vw,1.9rem)/1 var(--serif,Georgia,serif);color:#f3ecdf;font-variant-numeric:tabular-nums}'+
'.av-cu small{margin-top:4px;font-size:.8125rem;letter-spacing:0;color:#d8d1ea}'+
'.av-fw-hero{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}'+
'.av-fwzone{position:relative;height:clamp(170px,32vw,260px);margin:0 -16px 4px;border-radius:19px 19px 0 0;overflow:hidden;background:radial-gradient(1.5px 1.5px at 12% 22%,#fff8 50%,transparent 51%),radial-gradient(1.5px 1.5px at 33% 64%,#fff6 50%,transparent 51%),radial-gradient(1px 1px at 56% 18%,#fff9 50%,transparent 51%),radial-gradient(1.5px 1.5px at 78% 40%,#fff7 50%,transparent 51%),radial-gradient(1px 1px at 90% 12%,#fff8 50%,transparent 51%),radial-gradient(1px 1px at 22% 82%,#fff5 50%,transparent 51%),radial-gradient(1px 1px at 67% 76%,#fff6 50%,transparent 51%),linear-gradient(180deg,#0d0830 0%,#1b1140 100%)}'+
'.av-year{position:absolute;left:0;right:0;bottom:12%;text-align:center;font:500 clamp(3.2rem,12vw,5.5rem)/1 var(--serif,Georgia,serif);letter-spacing:.08em;color:#ecd096;text-shadow:0 0 18px rgba(236,208,150,.45)}'+
'.av-fw{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}'+
'.av-sign{font-style:italic;color:#ecd096 !important}'+
'.av-pic{display:block;width:min(260px,70%);height:auto;margin:8px auto 4px;border-radius:16px}'+
'.av-head{display:block;width:110px;height:auto;margin:6px auto 0}'+
'.av-scene{display:block;width:calc(100% + 36px);max-width:none;height:auto;margin:-12px -18px 10px}'+
'.av-msg{font-family:var(--serif,Georgia,serif);font-size:1.22rem;font-style:italic;text-align:center;color:#fff !important}'+
'.av-tools{display:grid;gap:10px;margin:14px 0}'+
'.av-tool{background:rgba(255,255,255,.06);border:1px solid rgba(217,166,72,.35);border-radius:12px;padding:10px 12px;color:#f3ecdf}'+
'.av-tool b{display:block;font:500 .78rem var(--sans,system-ui,sans-serif);letter-spacing:.08em;text-transform:uppercase;color:#ecd096}'+
'.av-tool a{min-height:44px;display:inline-flex;align-items:center}'+
'.av-tool audio{display:block;width:100%;margin:8px 0 2px;min-height:44px}'+
'.av-tool .av-ill{display:block;width:100%;max-width:220px;height:auto;margin:8px auto 4px;border-radius:12px}'+
'.av-steps{margin:8px 0 2px;padding-left:1.3em;line-height:1.5}'+
'.av-steps li{margin:4px 0}'+
'.av-dlg p{color:#e6e0f2}'+
'.av-close{position:absolute;top:4px;right:4px;width:44px;height:44px;border:0;border-radius:50%;background:rgba(27,17,64,.6);font-size:1.6rem;line-height:1;cursor:pointer;color:#fff;z-index:1}'+
'.av-help{font-size:.92rem;text-align:center;color:#d8d1ea !important}'+
'.av-off{text-align:center;font-size:.95rem;margin:20px 0;color:var(--ink,#1d1b3b)}';
var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

/* ---------- Fenêtre d'une case ---------- */
var dlg;
/* Un outil : [identifiant de fiche, titre] ou {t:titre, fiche:identifiant, audio:identifiant de l'audio dans l'appli, yt:lien YouTube} */
function tool(t){ return Array.isArray(t)?{t:t[1],fiche:t[0]}:t; }
function toolHTML(label,t){
  if(!t) return '';
  t=tool(t); var L=[];
  if(t.audio) L.push(isApp?'<button type="button" class="av-link" data-av-play="'+t.audio+'">Écouter l’audio</button>'
                           :'<a href="'+esc(t.yt||'/appli/#ecouter')+'" target="_blank" rel="noopener">Écouter l’audio</a>');
  if(t.fiche&&t.pdfOnly) L.push('<a href="'+pdf(t.fiche)+'" target="_blank" rel="noopener">Télécharger la fiche</a>');
  else if(t.fiche&&isApp){ L.push('<a href="#" data-av-fiche="'+t.fiche+'">Ouvrir la fiche</a>'); L.push('<a href="'+pdf(t.fiche)+'" target="_blank" rel="noopener">Télécharger la fiche de Noël</a>'); }
  else if(t.fiche) L.push('<a href="'+pdf(t.fiche)+'" target="_blank" rel="noopener">Télécharger la fiche</a>');
  if(!isApp&&((t.fiche&&!t.pdfOnly)||t.audio)) L.push('<a href="/appli/#'+(t.fiche?'fiche='+t.fiche:'ecouter')+'">Dans l’appli</a>');
  var ill=[].concat(t.img||[]).map(function(k){var c=CAP[k];return '<img class="av-ill" src="'+IMG+k+'.webp" alt="'+(c?esc(c):'')+'" width="'+DIM[k][0]+'" height="'+DIM[k][1]+'" loading="lazy" decoding="async">'+(c?'<p class="av-help" style="text-align:center;margin-top:0">'+esc(c)+'</p>':'')}).join('');
  var au=t.mp3?'<audio controls preload="none" src="'+IMG+'audio/'+t.mp3+'.mp3">'+'</audio>':'';
  if(t.mp3&&t.yt) L.push('<a href="'+esc(t.yt)+'" target="_blank" rel="noopener">Voir la vidéo</a>');
  var nt=t.note?'<p class="av-help" style="text-align:left">'+esc(t.note)+'</p>':'';
  var st=t.steps?'<ol class="av-steps">'+t.steps.map(function(s){return '<li>'+esc(s)+'</li>'}).join('')+'</ol>':'';
  return '<div class="av-tool"><b>'+label+'</b>'+esc(t.t)+ill+au+st+nt+(L.length?'<br>'+L.join(' · '):'')+'</div>';
}
function helpHTML(){
  return '<p class="av-help">'+esc('Besoin d’aide maintenant ?')+' '+
    (isApp?'<a href="#" data-av-sos="1">Outils d’apaisement</a>':'<a href="'+AIDE+'">Outils d’apaisement</a>')+
    ' · <a href="tel:3114">3114</a> · <a href="tel:15">15</a></p>';
}
function openDay(n){
  if(!dlg){
    dlg=document.createElement('dialog'); dlg.className='av av-dlg'; dlg.setAttribute('aria-labelledby','avDlgT');
    document.body.appendChild(dlg);
    dlg.addEventListener('click',function(e){ if(e.target===dlg) dlg.close(); });
  }
  var html;
  if(n===25){
    var au = toolHTML('Pour les adultes',CADEAU.adulte)+toolHTML('Pour les enfants',CADEAU.enfant);
    html=pic('scenes/depart','av-scene')+'<h2 id="avDlgT">25 décembre</h2><p class="av-msg">'+esc(CADEAU.m)+'</p><div class="av-tools">'+(au||'<p>Les audios arrivent très bientôt.</p>')+'</div>';
  } else {
    var j=JOURS[n-1];
    html=scene(n)+'<h2 id="avDlgT">Case du '+(n===1?'1er':n)+' décembre</h2><p class="av-msg">'+esc(j.m)+'</p>'+
      '<div class="av-tools">'+toolHTML('Pour les adultes',j.a)+toolHTML('Pour les enfants',j.e)+'</div>';
  }
  dlg.innerHTML='<div class="av-in" style="position:relative"><button type="button" class="av-close" aria-label="Fermer">×</button>'+html+helpHTML()+
    '<div class="av-row">'+(isApp||path()==='/'?'':'<a href="/#avent">Le calendrier</a>')+'<button type="button" class="av-link" data-av-off="1">Je préfère ne pas jouer</button></div></div>';
  dlg.querySelector('.av-close').onclick=function(){dlg.close()};
  if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open','');
  dlg.querySelector('.av-close').focus();
}

/* ---------- Nouvel An ---------- */
function now(){return new Date(Date.now()+OFFSET)}
function left(){ return new Date(YEAR+1,0,1)-now(); }
function pad(n){return (n<10?'0':'')+n}
function countInner(){
  var ms=Math.max(0,left()), d=Math.floor(ms/864e5), h=Math.floor(ms%864e5/36e5), m=Math.floor(ms%36e5/6e4), sec=Math.floor(ms%6e4/1e3);
  function u(v,l){return '<span class="av-cu"><b>'+pad(v)+'</b><small>'+l+'</small></span>'}
  return u(d,d>1?'jours':'jour')+u(h,'heures')+u(m,'minutes')+u(sec,'secondes');
}
function countLabel(){ var ms=Math.max(0,left()), d=Math.floor(ms/864e5), h=Math.floor(ms%864e5/36e5), m=Math.floor(ms%36e5/6e4); function pl(n,w){return n+' '+w+(n>1?'s':'')} return 'Avant '+(YEAR+1)+' : '+pl(d,'jour')+', '+pl(h,'heure')+' et '+pl(m,'minute'); }
function countHTML(){ return DAY>=26?'<div class="av-countbox"><p class="av-countt">Avant '+(YEAR+1)+'</p><div class="av-count" data-av-count role="timer" aria-label="'+countLabel()+'">'+countInner()+'</div></div>':''; }
function nyHTML(){
  return '<div class="av-box av-ny">'+(isApp?'<div class="av-fwzone" aria-hidden="true"><span class="av-year">'+NY+'</span><canvas class="av-fw"></canvas></div>':pic('bandeau','av-banner'))+
    '<h2>'+esc('Bonne année '+NY+' !')+'</h2>'+NOUVEL_AN.map(function(t){return '<p class="av-hint">'+esc(t)+'</p>'}).join('')+
    '<p class="av-hint av-sign">Laetitia Duchemin</p>'+
    (calm()?'':'<div class="av-row"><button type="button" class="av-link" data-av-fw="1">Revoir le feu d’artifice</button></div>')+helpHTML()+'</div>';
}
function calm(){return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)}
/* Feu d'artifice doux, dans le cadre du message seulement, sans son, 5 secondes au plus (au-delà, une animation lancée seule doit
   offrir une pause : critère 2.2.2 des WCAG, retouche du 25/11/2026) */
function heroCanvas(){
  var hero=document.querySelector('.hero'); if(!hero) return null;
  var cv=hero.querySelector('.av-fw'); if(!cv){ cv=document.createElement('canvas'); cv.className='av-fw av-fw-hero'; cv.setAttribute('aria-hidden','true'); hero.insertBefore(cv,hero.firstChild); }
  return cv;
}
var fwRun=false;
function fireworks(root){
  if(fwRun) return;
  var cv=isApp?(root||document).querySelector('.av-fw'):heroCanvas(); if(!cv||calm()) return;
  fwRun=true;
  var zone=cv.parentNode, r=zone.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
  cv.width=r.width*dpr; cv.height=r.height*dpr;
  var c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  var W=r.width, H=r.height, parts=[], rockets=[], t0=performance.now(), last=t0, nextR=t0;
  /* zone des gerbes : tout le cadre dans l'appli ; sur l'accueil, au-dessus et autour du logo, jamais sur le texte */
  var Z={x0:0,x1:W,y0:0,y1:H}, mk=!isApp&&zone.querySelector('.mark');
  if(mk){ var m=mk.getBoundingClientRect(), mx=m.left-r.left, my=m.top-r.top, txt=zone.querySelectorAll('h1,.loc,.rule,.promise,.domains,.tarif,.btns'), tr=0, tt=H;
    txt.forEach(function(e){ var b=e.getBoundingClientRect(); if(b.width){ tr=Math.max(tr,b.right-r.left); tt=Math.min(tt,b.top-r.top); } });
    if(W<760) Z={x0:W*.04,x1:W*.96,y0:Math.max(6,my-30),y1:Math.min(my+m.height+20,tt-10)};
    else Z={x0:Math.max(tr+16,mx-m.width*.2),x1:Math.min(W,mx+m.width*1.2),y0:Math.max(6,my-m.height*.35),y1:my+m.height*.6}; }
  var ZW=Z.x1-Z.x0, ZH=Z.y1-Z.y0;
  var COLS=['#ecd096','#ffd27a','#f3ecdf','#c9b6f2','#9fb8ff','#f2b7c6','#a8e6cf'];
  function launch(){ var by=Z.y1; rockets.push({x:Z.x0+ZW*(.12+Math.random()*.76), y:by, vy:-(ZH*.022+Math.random()*ZH*.006), ty:Z.y0+ZH*(.12+Math.random()*.4), col:COLS[Math.random()*COLS.length|0]}); }
  function burst(x,y,col){ var n=56, sp=Math.min(ZW,ZH)*.016; for(var i=0;i<n;i++){ var a=Math.PI*2*i/n+Math.random()*.1, v=sp*(.45+Math.random()*.75); parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,col:Math.random()<.2?'#fffaf0':col}); } }
  (function frame(t){
    var dt=Math.min(32,t-last)/16, el=t-t0; last=t;
    c.globalCompositeOperation='destination-out'; c.fillStyle='rgba(0,0,0,.22)'; c.fillRect(0,0,W,H);
    c.save(); c.beginPath(); c.rect(Z.x0,Z.y0,ZW,ZH); c.clip();
    c.globalCompositeOperation='source-over';
    if(el<2800&&t>=nextR){ launch(); if(Math.random()<.35) launch(); nextR=t+380+Math.random()*420; }
    rockets=rockets.filter(function(k){ k.y+=k.vy*dt; c.globalAlpha=1; c.fillStyle=k.col; c.beginPath(); c.arc(k.x,k.y,2,0,7); c.fill(); if(k.y<=k.ty){ burst(k.x,k.y,k.col); return false } return true });
    parts=parts.filter(function(q){ q.x+=q.vx*dt; q.y+=q.vy*dt; q.vy+=.035*dt; q.vx*=.982; q.vy*=.985; q.life-=.0105*dt; if(q.life<=0) return false; c.globalAlpha=Math.max(0,Math.min(1,q.life*1.3,(Z.y1-q.y)/(ZH*.28),(q.x-Z.x0)/(ZW*.08),(Z.x1-q.x)/(ZW*.08))); c.fillStyle=q.col; c.beginPath(); c.arc(q.x,q.y,2.3*q.life+.6,0,7); c.fill(); return true });
    c.restore(); c.globalAlpha=1; c.globalCompositeOperation='source-over';
    if(el<5000&&(rockets.length||parts.length||el<2800)) requestAnimationFrame(frame); else { c.clearRect(0,0,W,H); fwRun=false; }
  })(t0);
}
setInterval(function(){
  document.querySelectorAll('[data-av-count]').forEach(function(x){ x.innerHTML=countInner(); if(new Date().getSeconds()===0) x.setAttribute('aria-label',countLabel()); });
  if(DAY>=31&&!NY&&now()>=new Date(YEAR+1,0,1)){ NY=YEAR+1; DAY=0; fwDone=true; refresh(); if(!store.off) setTimeout(function(){fireworks()},isApp?700:300); }
},1000);

/* ---------- Le calendrier (accueil du site et de l'appli) ---------- */
function calendarHTML(){
  if(NY) return nyHTML();
  if(PRE){
    if(store.off) return '<p class="av-off">Le calendrier de l’Avent est masqué. <button type="button" class="av-link" data-av-on="1">L’afficher</button></p>';
    return '<div class="av-box">'+pic('bandeau','av-banner')+'<h2>Les lutins farceurs arrivent demain</h2>'+pic('scenes/arrivee','av-wide')+
      '<p class="av-hint">'+esc(ARRIVEE)+'</p>'+
      '<div class="av-row"><button type="button" class="av-link" data-av-off="1">Je préfère ne pas jouer</button></div>'+helpHTML()+'</div>';
  }
  if(store.off) return '<p class="av-off">Le calendrier de l’Avent est masqué. <button type="button" class="av-link" data-av-on="1">L’afficher</button></p>';
  var last=Math.min(DAY,25), doors='';
  for(var n=1;n<=24;n++){
    var cls='av-door'+(n===DAY?' is-today':'')+(found(n)?' is-open':'');
    doors+='<li><button type="button" class="'+cls+'" data-av-door="'+n+'"'+(n>DAY?' disabled aria-label="'+n+' décembre, pas encore ouverte"':' aria-label="'+n+' décembre'+(found(n)?', déjà trouvée':'')+'"')+'>'+pic(ORN[(n-1)%4],'',1)+'<span aria-hidden="true">'+n+'</span></button></li>';
  }
  doors+='<li><button type="button" class="av-door'+(DAY>=25?' is-today':'')+'" data-av-door="25"'+(DAY<25?' disabled aria-label="25 décembre, le cadeau, pas encore ouvert"':' aria-label="25 décembre, le cadeau"')+'>'+pic('case-cadeau','',1)+'<span aria-hidden="true">25</span></button></li>';
  var hint='';
  if(isApp){
    return '<div class="av-box">'+pic('bandeau','av-banner')+'<h2>Le calendrier de l’Avent</h2>'+
      '<p class="av-hint">Le lutin farceur a chamboulé l’appli : certains jours, il met un outil en tête des exercices. Ouvrez la case du jour pour sourire un peu et essayer l’outil. Et sur le site, il se cache sur une page différente chaque jour.</p>'+countHTML()+
      '<ul class="av-grid">'+doors+'</ul>'+
      '<div class="av-row"><button type="button" class="av-link" data-av-off="1">Je préfère ne pas jouer</button></div>'+helpHTML()+'</div>';
  }
  if(DAY<=24){
    var j=JOURS[DAY-1];
    hint = found(DAY)
      ? 'Bravo, vous avez trouvé le lutin aujourd’hui ! Revenez demain.'
      : 'Indice du jour : je me suis caché dans la page <a href="'+j.p+'">'+esc(j.n)+'</a>. Trouvez-moi pour ouvrir la case.';
  } else hint='Le cadeau du 25 vous attend dans la dernière case.';
  return '<div class="av-box">'+pic('bandeau','av-banner')+'<h2>Le calendrier de l’Avent</h2>'+
    '<p class="av-hint">Chaque jour, un petit lutin farceur se cache sur une page du site. En le trouvant, vous ouvrez la case : de quoi sourire, et un outil à essayer, pour les adultes et pour les enfants.</p>'+
    '<p class="av-hint"><strong>'+hint+'</strong></p>'+countHTML()+
    '<ul class="av-grid">'+doors+'</ul>'+
    '<div class="av-row">'+(DAY<=24&&!found(DAY)?'<button type="button" class="av-link" data-av-door="'+DAY+'" data-av-force="1">Ouvrir sans chercher</button>':'')+
    '<button type="button" class="av-link" data-av-off="1">Je préfère ne pas jouer</button></div>'+helpHTML()+'</div>';
}

function onDoor(n,force){
  if(isApp) force=true; /* dans l'appli, la case du jour s'ouvre directement */
  if(n===25 || n<DAY || found(n) || force){ if(n<=24&&!found(n)&&(force||n===DAY)){store.found.push(n);save();refresh()} openDay(n); return; }
  location.href=JOURS[n-1].p; /* aujourd'hui, pas encore trouvé : aller chercher le lutin */
}

/* ---------- Le lutin caché dans la page du jour ---------- */
function hideLutin(){
  if(isApp||store.off||DAY>24) return;
  var here=path(), n=0;
  for(var i=0;i<DAY;i++) if(JOURS[i].p===here) n=i+1; /* jour actuel, ou jour passé à rattraper */
  if(!n||found(n)) return;
  var main=document.querySelector('main'); if(!main) return;
  var label='Le lutin farceur se cache ici : ouvrir la case du '+(n===1?'1er':n)+' décembre';
  function catchIt(el){ if(!found(n)){store.found.push(n);save()} el.remove(); openDay(n); }
  /* Les cachettes tournent selon les jours : derrière le bouton, la tête en bas sous le menu, ou sur le côté de l'écran */
  var mode=['cta','top','side'][n%3];
  var who0=(n%2===0)?'lutin':'lutine';
  if((mode==='top'||mode==='side')&&DIM[mode+'-'+who0]){
    var calm0=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fx=document.createElement('button'); fx.type='button'; fx.className='av-fx av-'+mode+((mode==='side'&&n%4<2)?' av-right':'');
    fx.setAttribute('aria-label',label); fx.innerHTML=pic(mode+'-'+who0);
    fx.onclick=function(){catchIt(fx)};
    if(mode==='top'){ var hd=document.querySelector('.site-header,header'); fx.style.top=((hd?hd.getBoundingClientRect().bottom:0)-2)+'px'; }
    document.body.appendChild(fx);
    if(calm0) fx.classList.add('in'); else setTimeout(function(){ fx.classList.add('in'); },2500);
    return;
  }
  /* 1) Le lutin se cache derrière le premier bouton de rendez-vous de la page */
  var who=(n%2===0&&DIM['peek-lutin'])?'lutin':'lutine';
  var cta=main.querySelector('.btns .btn.solid');
  if(cta&&DIM['peek-'+who]){
    var host=cta.parentNode; host.classList.add('av-host');
    var peek=document.createElement('button'); peek.type='button'; peek.className='av-peek av-pk-'+who;
    peek.setAttribute('aria-label',label);
    peek.innerHTML='<span class="av-pk">'+pic('peek-'+who)+'</span>';
    peek.onclick=function(){catchIt(peek)};
    function place(){ host.style.paddingTop='';
      var prev=host.previousElementSibling, cr0=cta.getBoundingClientRect(), need=peek.offsetHeight-1;
      if(prev){ var gap=cr0.top-prev.getBoundingClientRect().bottom; if(gap<need+6) host.style.paddingTop=(need+6-gap)+'px'; }
      var hr=host.getBoundingClientRect(), cr=cta.getBoundingClientRect();
      peek.style.left=Math.round(cr.left-hr.left+cr.width/2-55)+'px';
      peek.style.top=Math.round(cr.top-hr.top-peek.offsetHeight+1)+'px'; }
    var calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    host.appendChild(peek); var im=peek.querySelector('img'); if(im&&!im.complete) im.addEventListener('load',place); place();
    addEventListener('resize',place);
    if(calm||!('IntersectionObserver' in window)){ peek.classList.add('shown'); return; }
    /* Il sort de derrière le bouton quand celui-ci apparaît à l'écran, puis reste immobile */
    var io=new IntersectionObserver(function(es){
      if(!es[0].isIntersecting) return; io.disconnect();
      setTimeout(function(){ peek.classList.add('up'); },350);
    },{threshold:.9});
    io.observe(cta);
    return;
  }
  /* 2) Sinon : caché derrière sa bûche, dans le texte */
  var hs=main.querySelectorAll('h2'), h=hs[Math.min(1,hs.length-1)];
  var spot=h?(h.nextElementSibling||h):main.firstElementChild; if(!spot) return;
  var b=document.createElement('button'); b.type='button'; b.className='av-lutin';
  b.setAttribute('aria-label',label); b.innerHTML=pic('lutin-cache');
  b.onclick=function(){catchIt(b)};
  spot.parentNode.insertBefore(b,spot);
}

/* ---------- Mise en place ---------- */
var box, fwDone=false;
function refresh(){ if(box) box.innerHTML=calendarHTML(); if(window.AVENT&&AVENT.onchange) AVENT.onchange(); }
document.addEventListener('click',function(e){
  var el=e.target.closest('[data-av-door],[data-av-off],[data-av-on],[data-av-fw]'); if(!el) return;
  if(el.dataset.avFw){ if(!isApp){ var hr=document.querySelector('.hero'); if(hr) hr.scrollIntoView({behavior:calm()?'auto':'smooth'}); setTimeout(function(){fireworks()},isApp?0:700); } else fireworks(el.closest('.av-box').parentNode); return; }
  var d=el.dataset;
  if(d.avOff){store.off=true;save(); if(dlg&&dlg.open) dlg.close(); document.querySelectorAll('.av-lutin,.av-peek,.av-fx').forEach(function(x){x.remove()}); refresh(); return}
  if(d.avOn){store.off=false;save();refresh();hideLutin();return}
  if(d.avDoor) onDoor(+d.avDoor,!!d.avForce);
});

if(!isApp){
  var slot=document.getElementById('avent');
  if(slot){ slot.className='av'; box=slot; box.innerHTML=calendarHTML(); }
  if(NY&&!store.off&&document.querySelector('.hero')) setTimeout(function(){fireworks()},900);
  hideLutin();
}

/* Pour l'appli : elle affiche le calendrier dans son accueil et met l'outil du jour en tête. */
window.AVENT={
  day:DAY, off:function(){return store.off},
  html:function(){ if(NY&&!store.off&&!fwDone){ fwDone=true; setTimeout(function(){fireworks()},600); } return '<div class="av">'+calendarHTML()+'</div>'},
  today:function(){ if(store.off||!DAY||DAY>24) return []; var j=JOURS[DAY-1]; return [j.a&&tool(j.a).fiche, j.e&&tool(j.e).fiche].filter(Boolean); },
  open:openDay, onchange:null
};
})();
