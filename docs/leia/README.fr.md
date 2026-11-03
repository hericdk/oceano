<p align="center"><img src="../imagens/cara.gif" width="320" alt="Cara, la navigatrice d'Oceano, en train de cligner des yeux"></p>

> Salut ! Moi, c'est Cara, ta navigatrice. La première d'un navigateur avec des agents d'IA intégrés dès le départ. Et devine quoi : le premier fait en vibe coding aussi 😉

<p align="center"><a href="../../README.md">Português</a> · <a href="README.en.md">English</a> · <a href="README.es.md">Español</a> · <b>Français</b> · <a href="README.it.md">Italiano</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.zh.md">中文</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.zh-Hant.md">繁體中文</a> · <a href="README.bn.md">বাংলা</a> · <a href="README.ur.md">اردو</a> · <a href="README.te.md">తెలుగు</a> · <a href="README.mr.md">मराठी</a> · <a href="README.ta.md">தமிழ்</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.ha.md">Hausa</a> · <a href="README.am.md">አማርኛ</a> · <a href="README.yo.md">Yorùbá</a> · <a href="README.zu.md">isiZulu</a> · <a href="README.so.md">Soomaali</a> · <a href="README.ne.md">नेपाली</a> · <a href="README.my.md">မြန်မာ</a> · <a href="README.km.md">ខ្មែរ</a> · <a href="README.lo.md">ລາວ</a> · <a href="README.fil.md">Filipino</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.ps.md">پښتو</a> · <a href="README.fa.md">فارسی</a> · <a href="README.ht.md">Kreyòl ayisyen</a> · <a href="README.mg.md">Malagasy</a></p>

# Oceano

Un navigateur minimaliste, ouvert et en pixel art, pour celles et ceux qui jouent, créent et programment.
Basé sur Chromium, avec un comptage anonyme de l'usage seulement si tu l'autorises, avec des thèmes et des mods en Lua (le langage créé à la PUC-Rio),
une page d'accueil qui est un bureau de fenêtres au-dessus d'une mer pixelisée, et des outils de création
à l'intérieur du navigateur lui-même.

> **État :** en développement. → macOS (Apple Silicon) · Windows · Linux: [Releases](https://github.com/hericdk/oceano/releases/latest)

## Pourquoi il existe

> Oceano ne veut pas être juste un navigateur de plus. Il veut être un endroit où les gens créent, apprennent et montrent ce dont ils rêvent.

Oceano est fait de pixels, ce n'est pas la vraie mer, mais il veut donner la même sensation quand on la regarde : l'
immensité, la liberté, l'horizon plein de possibilités. Où est-ce que je peux aller ? Jusqu'où est-ce que je peux grandir ?
Où est-ce que j'arrive à aller ? Il existe pour aider les gens à répondre à ça, et c'est pour ça qu'il est gratuit.

Il est fait pour celles et ceux qui créent et qui filment des vidéos, surtout pour les débutants : présenter une
activité à soi, une idée, un rêve, faire un vlog. Chaque outil doit apprendre quelque chose, et la communauté
(des groupes d'échange de connaissances, au rythme d'un forum) doit aider chacun à grandir. C'est la prémisse
qui guide tout le projet : lis le [manifeste](../MANIFESTO.md).

Les navigateurs se sont mis à se ressembler et sont pleins de choses que personne n'a demandées. Oceano veut le
contraire : petit, beau, vérifiable et fait pour être bricolé. Ne pas collecter vaut mieux que protéger ;
tout reste sur ton ordinateur ; aucun compte n'est obligatoire.

C'est un projet à moyen et long terme. L'idée est de m'y consacrer pendant de nombreuses années, comme
Sean Murray s'est consacré à No Man's Sky : sortir tôt, écouter celles et ceux qui l'utilisent et continuer à l'améliorer, version
après version, jusqu'à devenir le navigateur qu'il promet d'être. Et le faire de façon ouverte, pour que d'autres
personnes puissent l'étudier, s'en inspirer et porter les idées plus loin.

La vision complète est dans [`docs/VISAO.md`](../VISAO.md).

### Quatre questions, avec les réponses de celui qui l'a créé

**Est-ce que ça apprend quelque chose à celles et ceux qui l'utilisent ?**

Je croyais qu'apprendre la musique était difficile. Avec un synthétiseur, j'ai découvert que non. Je veux donner un accès égal pour que d'autres personnes puissent apprendre aussi.

**Est-ce que ça marche pour les débutants et ça rend bien dans une vidéo ?**

Oui ! Et plus il y aura de gens qui feront des vidéos pour montrer ce qu'on peut faire ici, plus il y en aura qui commenceront à créer quelque chose d'unique et de libre.

**Est-ce que ça respecte la vie privée et l'accessibilité ?**

C'est un principe de base depuis le début. Les deux sont importantes et nécessaires, et je compte sur le soutien de tout le monde pour les premiers tests de cette bêta.

**Est-ce que ça rapproche les gens les uns des autres ?**

Dans le futur, qui sait ? Un forum de discussion dans le style de Reddit serait très positif. Et on a déjà un outil graphique d'ambiance 3D qui pèse très peu : toute la scène de la mer, avec le ciel, le phare et la pluie, tient dans 29 Ko de code. Ça ouvre un énorme potentiel pour rapprocher les gens 👀

> Nous avons un potentiel incroyable pour créer quelque chose de nouveau, sûr, interconnecté, libre et pensé pour aider les personnes qui l'utiliseront, comme symbole de gratitude, d'empathie et d'échange. Et je compte garder tout ça sans publicité.

## Ce qui existe déjà

| Dossier | Quoi | Comment lancer |
|---|---|---|
| [`simulador/`](../../simulador/) | Toute l'interface qui tourne dans une page : onglets, bureau, thèmes, mods en Lua/Teal, bande sonore, Strudel, PICO-8, rappel de boire de l'eau | `python3 simulador/serve.py 5216` puis ouvre http://localhost:5216 |
| [`app/`](../../app/) | MVP en Electron : la même interface avec de vrais onglets (Chromium), des profils isolés, un bloqueur, un mini lecteur | `cd app && npm install && npm start` |
| [`extensao/`](../../extensao/) | Oceano Lite : le nouvel onglet d'Oceano en extension Chrome | voir `extensao/README.md` |
| [`docs/`](../) | Vision et plan | — |

Quelques trucs qu'on peut faire aujourd'hui :

- **Page d'accueil en bureau :** des fenêtres que tu fais glisser, réduis et fermes au-dessus de la mer avec le phare ; chaque profil a son bureau.
- **Thèmes** (`oceano-tema/1`, JSON seulement) qui changent les couleurs, la pixelisation et même l'heure du jour de la mer.
- **Mods en Lua 5.4 / Teal** dans un bac à sable avec des permissions déclarées.
- **Groupes d'onglets** enregistrés sur la page d'accueil, fermés pour ne pas consommer de mémoire.
- **Recherche avec IA** (optionnelle, avec ta propre clé) qui répond en une ligne et indique les bons sites.
- **Musique :** bande sonore générative et live coding avec Strudel via [Stave](https://stave.live) (timeline, grille, piano roll, mixeur, visuels), avec un mode « en direct » et un fond transparent sur la mer.
- **Les bases d'un navigateur :** historique, favoris, recherche dans la page, zoom, clic droit, téléchargements, impression, onglets qui reviennent et liste dans précédent et suivant.
- **Deux écrans d'accueil :** l'océan avec un phare et l'île, avec des icônes pour changer, un ciel qui varie et la météo de ta ville (optionnelle).
- **Thèmes de la communauté :** voir [`docs/TEMAS.md`](../TEMAS.md). **Mods :** [`docs/MODS.md`](../MODS.md). **Sécurité :** [`docs/SEGURANCA.md`](../SEGURANCA.md).
- **Vie privée vérifiable :** `oceano://rede` montre chaque connexion du navigateur lui-même.

## Le chat

<p><img src="../imagens/gato.gif" width="240" alt="Le chat d'Oceano qui travaille sur l'ordinateur"></p>

Si tu préfères, ton avatar peut être le chat. Tu peux aussi créer le tien, en pixel, en maillage ou en 3D.

## Enregistrer l'écran en toute sécurité

Oceano a été pensé pour apparaître dans des vidéos et des lives. Les informations locales (sites que tu as ouverts, adresses,
règles de proxy) apparaissent cachées derrière un bloc pixelisé avec un cadenas. Quand tu cliques, Oceano te prévient que
cela fait partie de tes données de sécurité et ne les montre que si tu confirmes ; quand tu fermes le navigateur, tout redevient
caché. Les parties qui ont besoin d'un serveur local, comme l'éditeur d'avatar, sont activées et
désactivées par Oceano lui-même et ne parlent qu'à ton ordinateur.

## Accessibilité

L'accessibilité passe avant le style. Tout thème doit être facile à lire : contraste minimal de 4,5:1 pour le texte
(WCAG AA), des états qui ne dépendent pas que de la couleur et un contour de focus visible. L'éditeur de thèmes vérifie le
contraste en direct et te prévient avant d'enregistrer. Si tu crées des thèmes, lis le
[guide d'accessibilité](../ACESSIBILIDADE-TEMAS.md).

## Licence

Le code d'Oceano est un **logiciel libre**, sous la [GNU GPL v3.0 ou ultérieure](../../LICENSE) :
tu peux l'utiliser, l'étudier, le modifier et le distribuer ; quiconque distribue une version modifiée doit
garder le code ouvert, sous la même licence.

- **Les mods et les thèmes sont à toi.** Les mods (scripts Lua/Teal qui utilisent l'API de mods) et les thèmes (fichiers
  `oceano-tema`) ne sont pas considérés comme des œuvres dérivées d'Oceano et peuvent avoir n'importe quelle licence.
  Voir la permission supplémentaire dans [`AVISOS.md`](../../AVISOS.md).
- **Les parties tierces** gardent leurs licences (MIT, BSD, MPL-2.0, Apache-2.0, AGPL-3.0…).
  La liste complète, avec ce que demande chacune, est dans [`AVISOS.md`](../../AVISOS.md).

## Crédits

Oceano est construit sur le travail de beaucoup de monde. En particulier :

- **[Stave](https://stave.live)** de Mrityunjay Bhardwaj ([code sur GitHub](https://github.com/MrityunjayBhardwaj/Stave), AGPL-3.0) : le studio de musique dans Oceano (`oceano://stave`), avec timeline, grille, piano roll, mixeur et visuels. Dans Oceano, il a gagné le mode « en direct », le fond transparent et l'enregistrement vidéo avec la musique.
- **[Strudel](https://strudel.cc)** de Felix Roos, Alex McLean et la communauté ([code](https://codeberg.org/uzu/strudel), AGPL-3.0) : le langage de musique par le code qui fait tourner Stave.
- **[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)** de shinshin86 (MIT) : l'avatar animé de la Navigatrice et l'éditeur d'avatar.
- **Lua** (PUC-Rio), **Teal** (Hisham Muhammad), **three.js**, **Chromium** et **Electron**.
- **Modèle 3D du robot quadrupède** (`simulador/robo/modelos/quadrupede.3mf`), licence BY-NC, selon les données du fichier lui-même : il est utilisé **uniquement sur le robot Quadrupède**, et pas sur les autres robots. Il n'est pas sous la GPL d'Oceano et ne peut pas avoir d'usage commercial.

- **[Whisper](https://github.com/openai/whisper)** d'OpenAI (MIT), dans la conversion ONNX de [onnx-community](https://huggingface.co/onnx-community/whisper-base) (Apache-2.0) : la transcription vocale, qui tourne sur l'ordinateur et n'est téléchargée que si la personne le demande.
- **[Open-Meteo](https://open-meteo.com)** : la météo et la recherche de villes, sans clé et sans compte.

La liste complète, avec les licences, est dans [`AVISOS.md`](../../AVISOS.md) et sur la page À propos de la Navigatrice.

## Auteur

Créé par **@hericdk** · Instagram [@hericdk](https://instagram.com/hericdk)

Les comptes officiels d'Oceano ne sont pas encore nés.
