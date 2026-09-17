# Cartographie de l'interface — Arbitrage Strongman 2026 (FIBDA)

Document de référence pour reconstruire l'interface à l'identique (React/Next.js +
Tailwind) sans accès au fichier source. Il décrit **les écrans**, pas le code :
chaque bouton est rattaché au nom de la méthode ou de la valeur produite par
`renderVals()` dans `app.jsx`, pour que le portage garde le même vocabulaire.

Titre de la page : `Arbitrage Strongman 2026 — FIBDA`.

---

## 1. Charte graphique

### 1.1 Palette

| Rôle | Hex | Usage |
|---|---|---|
| Fond général | `#FCFAF6` | `body`, fond de tous les champs de saisie au repos |
| Encre principale | `#141210` | texte courant, cartes « noires » (plateau, écrans géants), boutons Jour J |
| Vert FIBDA | `#0B9237` | action principale (valider, enregistrer, importer), liens, pastille « auto-enregistré » |
| Vert foncé | `#03562A` | titres verts, fil d'Ariane, libellés secondaires verts, bouton « Exporter la compétition » |
| Orange FIBDA | `#EC6D23` | accent de marque : mot souligné des titres, dossards, bandeau démo, chiffres clés, bande tricolore |
| Orange sombre | `#BC4F14` | texte sur fond orange clair, badges « Invité », alertes douces |
| Rouge alerte | `#C4361F` | bouton de confirmation destructif, chronomètre en fin de temps |
| Rouge texte | `#A6371C` | texte des messages d'erreur, boutons destructifs à bord clair |
| Ambre | `#E8A317` / `#8A5A0B` | bord et texte des encadrés d'avertissement (medley, sans catégorie, suspension) |
| Blanc | `#FFFFFF` | fond des cartes |

Neutres (du plus clair au plus foncé) :
`#F5F1E8` (fond d'entête de liste, placeholder photo) · `#F0EBE1` (séparateurs
internes, pastilles inactives) · `#E7E1D6` (bord de carte) · `#DDD6C9` (bord de
champ) · `#C4BCAC` (texte désactivé) · `#B8B0A2` (bord pointillé, bouton inactif)
· `#8A8378` (libellés secondaires) · `#6E675C` (texte gris foncé) · `#4A443B`
(paragraphes).

Fonds d'états :
- erreur : `#FBEFEA` sur bord `#E9CFC4`, texte `#A6371C`
- avertissement : `#FFF6E8` sur bord `#F0D8B0`, texte `#8A5A0B`
- succès / information : `rgba(11,146,55,.07)` sur bord `rgba(11,146,55,.18)`, texte `#03562A`
- ligne d'import douteuse : `#FDF3EF`

Couleurs de catégorie (cycle `COUL_CAT`, appliqué par index de groupe) :
`#EC6D23`, `#0B9237`, `#3E7CB1`, `#B4692F`, `#8E44AD`, `#C4361F`, `#0F8B8D`
(le 7e sert aussi de couleur « Sans catégorie »).

Bandes d'épreuve (`BANDES`, filet de 4 px en haut de chaque carte d'épreuve) :
`#EC6D23`, `#0B9237`, `#141210`, `#CB7C4A`, `#03562A`.

Podium / récompenses : or `#D9A441`, argent `#9AA0A6`, bronze `#B4692F`, au-delà `#8A8378`.

Écrans publics (vue `solo`), deux thèmes :

| Jeton | Nuit (défaut) | Jour |
|---|---|---|
| `soloFond` | `#0A0D0B` | `#FCFAF6` |
| `soloEncre` | `#FCFAF6` | `#141210` |
| `soloSecond` | `#9AA79E` | `#6E675C` |
| `soloCarte` | `#141A16` | `#FFFFFF` |
| `soloBord` | `#26302A` | `#E7E1D6` |

Chronomètre : blanc `#FCFAF6` au repos ; flash orange `#F7A76C` (page) /
`#EC6D23` (encadré) toutes les 30 s écoulées ; rouge `#FF6B52` (page) /
`#FF4A2E` (écran géant) sur les 30 dernières secondes, avec clignotement.

Drapeaux : chaque nationalité est rendue par trois bandes verticales de couleur
(table `PAYS`, ex. CIV = `#EC6D23` / `#FFFFFF` / `#0B9237`), dans un rectangle
bordé `#DDD6C9` (22×15 px en page, 3,6–4,4 vw sur écran géant).

### 1.2 Typographie

- Police unique : **Clash Display** (graisses 300/400/500/600/700 chargées en
  woff2/woff/ttf, `font-display: swap`), repli `Barlow Condensed`, `system-ui`,
  `sans-serif`. Lissage `-webkit-font-smoothing: antialiased`.
- Titre de vue : 22 px, 700, `text-transform: uppercase`, avec le second mot en
  `#EC6D23` (« Épreuves **du championnat** »).
- Titre de carte : 24 px / 700, `letter-spacing:-.01em`.
- Sur-titre de champ (étiquette) : 11 px, 600, `letter-spacing:.12em`,
  majuscules, couleur `#8A8378` — variantes `#EC6D23` (dossard), `#03562A`
  (pesée), `#BC4F14` (contact d'urgence, niveau).
- Entête de colonne / bandeau de liste : 12 px, 700, `letter-spacing:.1em`, majuscules.
- Paragraphe d'aide : 15 px, `line-height:1.55`, `#4A443B`, `text-wrap:pretty`, largeur max 760 px.
- Chiffres de chronomètre et de compte à rebours : `font-variant-numeric: tabular-nums`.

### 1.3 Mise en page

- Conteneur : `max-width:1180px`, centré, `padding:0 20px 80px`.
- Cartes : fond `#FFFFFF`, bord 1 px `#E7E1D6`, rayon 12–16 px, padding 16–26 px.
  Les blocs « importants » (plateau, import, codes d'accès, régie) passent en
  bord 2 px `#141210`.
- Grilles : systématiquement `repeat(auto-fit, minmax(Xpx, 1fr))` avec X entre
  130 et 320 px selon le bloc, gap 12–16 px — donc responsive sans media query.
- Boutons : rayon 8–11 px, padding 9–16 px, 13–15 px, 600/700.
  - primaire vert : fond `#0B9237`, texte blanc, sans bord
  - primaire noir : fond `#141210`, texte blanc
  - secondaire : fond `#FFFFFF` ou `#FCFAF6`, bord `#DDD6C9`, texte `#141210`
  - destructif : fond `#FFFFFF`, bord `#E9CFC4`, texte `#A6371C`
  - ajout : bord **pointillé** `#B8B0A2`, texte `#03562A`, libellé « + … »
- Champs : bord `#DDD6C9`, rayon 8–10 px, fond `#FCFAF6`, `outline:none`.
  Champ verrouillé : fond `#F5F1E8`, texte `#6E675C`.
- Chaque contrôle porte un `title` explicatif en français : l'aide contextuelle
  est un principe de l'interface, à conserver au portage.
- Animation unique : `@keyframes clignote { 0%,49%{opacity:1} 50%,100%{opacity:.2} }`.
- Les écrans publics dimensionnent **tout en `vh`/`vw`** (jamais en px) pour rester
  lisibles quelle que soit la définition du mur LED.

---

## 2. Ossature commune (hors vue `solo`)

Affichée quand `pasSolo` est vrai (vue ≠ `solo` et pas d'écran de connexion).

1. **Bandeau démonstration** — visible seulement si `espaceEssai`. Barre orange
   `#EC6D23`, texte blanc majuscule « Mode démonstration — rien de ce qui est ici
   ne compte ». Boutons : `chargerDemo` (libellé `libDemo`, « Charger le jeu de
   démo (12/24 athlètes) »), `viderDemo`, `versModeReel`.
2. **Dialogue de confirmation destructive** — si `demandeOuverte`. Carte
   `#FBEFEA` bord 2 px `#C4361F`, titre `demandeTitre`, texte `demandeTexte`,
   boutons `annulerDemande` / `confirmerDemande` (libellé `libConfirmer`).
   Quatre demandes possibles : `liste`, `vierge`, `tout`, `videdemo`.
3. **Entête** — dégradé `linear-gradient(115deg,#03562A 0%,#0B3D22 45%,#141210 100%)`,
   rayon haut 16 px. Logo FIBDA 62×62 sur pastille `#FCFAF6`. Sur-titre orange
   « Fédération Ivoirienne de Bodybuilding et Disciplines Associées », titre
   « Championnat National de Strongman **2026** ». À droite : bouton de session
   (`deconnecter`, libellé `libSession`) si `connecte`, et « Exporter la
   sauvegarde » (`exporter`).
4. **Bande tricolore** — 5 px, trois tiers `#EC6D23` / `#FFFFFF` / `#0B9237`.
5. **Barre de navigation** — sélecteur Réel/Démo (`versModeReel`/`versModeDemo`,
   fonds `fondReel`/`fondDemo`), bouton « Accueil » (`versAccueil`), chevron `›`,
   fil d'Ariane `filAriane`, puis à droite une pastille verte + `libAutoEnreg`
   (« Enregistré automatiquement · 14h05 »).

### Écran de connexion (`besoinLogin`)

Affiché à la place de tout le reste dès qu'au moins un code d'accès est défini.
Colonne centrée 620 px : logo 86 px, sur-titre orange, titre « Qui utilise ce
poste ? », explication (deux accès seulement : administrateur et régie ; juges et
chronométreurs n'ont pas de code).

Liste `comptes` (au plus 2 : **Administrateur du logiciel** — droit `tout`, et
**Régie de diffusion** — droit `regie`). Chaque ligne : pastille d'initiales
(AD/RG), nom, `rôle · portée`, libellé d'action à droite. Clic → `c.choisir`
déplie un champ mot de passe (`codeSaisi`/`setCodeSaisi`, `inputMode=numeric`,
`letter-spacing:.22em`, validation à Entrée via `c.touche`) + bouton « Entrer »
(`c.valider` → `connexion`). Erreur éventuelle : `erreurCode`.

En bas : rappel que les codes se règlent dans Préparation → Officiels, et bouton
en bord pointillé « Code perdu — ouvrir sans connexion » (`ignorerCodes`).

---

## 3. Vue `accueil`

**Rôle** — page d'atterrissage et poste de pilotage administratif : identité de
l'épreuve, aiguillage vers les trois métiers (préparer / arbitrer / diffuser),
import-export et remises à zéro.
**Utilisateur** — l'administrateur du logiciel (direction de compétition, table).

### 3.1 Trois fiches d'identité (grille `minmax(300px,1fr)`)

| Fiche | Contenu |
|---|---|
| **Date et horaires** | `champDate` (texte libre, ex. « Samedi 19 Septembre 2026 ») ; en dessous `champHeure` → `champFin`, séparés par une flèche, en `#03562A`. Setters `setChampDate`, `setChampHeure`, `setChampFin`. |
| **Lieu** | `champLieu` (16 px gras) + `champAdresse` (13 px gris). Setters `setChampLieu`, `setChampAdresse`. |
| **Engagés** | Lecture seule : « `nbAthletes` athlètes · `nbEpreuves` épreuves », puis « `nbPeses` pesées validées ». |

> La date pilote le compte à rebours de l'écran d'attente : elle est analysée par
> `dateCible()` au format « jj mois aaaa » + « 14h00 ».

### 3.2 Trois cartes d'action (grille `minmax(320px,1fr)`)

1. **Préparer la compétition** — badge orange pâle « Étape par étape ». Boutons :
   `versPreparation` (vert, libellé `libPreparer` = « Commencer » ou « Reprendre
   la préparation ») et `versRecap` (« Récapitulatif »).
2. **Lancer / reprendre** — badge vert pâle « Jour J ». Bouton noir « Ouvrir le
   plateau » (`versPlateau`, qui déclenche aussi `assurerFile`).
3. **Régie de diffusion** — carte **noire** `#141210`, texte `#FCFAF6`, badge
   orange translucide « Écrans géants ». Boutons : `versRegie` (orange) et
   `ouvrirMire` (ouvre une fenêtre `?ecran=mire`).

### 3.3 Message d'erreur d'enregistrement

Si `erreurEnreg` (mémoire du poste saturée) : encadré rouge pleine largeur.

### 3.4 Barre d'outils fichiers (ligne de boutons, `flex-wrap`)

| Bouton | Méthode | Effet |
|---|---|---|
| Exporter les athlètes (Excel) | `exporterListe` | CSV de la liste |
| Exporter la compétition (Excel) | `exporterExcel` | classeur XML multi-feuilles : athlètes, catégories, épreuves, résultats, classements |
| Importer une compétition | `importerExcel` (sur `<input type=file accept=".xls,.xml,.json">` caché dans un `<label>`) | recharge un export ou une sauvegarde `.json` |
| Exporter les classements (Excel) | `exporterClassements` | classements par groupe et par épreuve |
| Copier cette liste dans la démonstration | `copierVersDemo` | visible seulement en `modeReel` |
| Démarrer une compétition réelle vierge | `demanderVierge` | visible en `modeReel`, style destructif |
| Supprimer la liste des athlètes | `demanderViderListe` | destructif |
| Tout remettre à zéro | `demanderTout` | destructif ; rétablit 5 épreuves et 2 groupes |

En dessous, message vert `msgImportComp` après un import réussi.

---

## 4. Vue `prepa` — parcours guidé en 6 étapes

**Rôle** — tout ce qui se prépare avant le jour J. **Utilisateur** —
administrateur / secrétaire de table (et, à l'étape 5, le poste de pesée).

**Barre d'étapes** (commune aux 6 étapes) : rangée horizontale scrollable, bordée
en bas `#E7E1D6`. Six boutons `etapes[i]` : pastille ronde numérotée + titre.
Étape active : fond `#141210`, texte `#FCFAF6`, pastille `#EC6D23` sur blanc ;
inactive : fond blanc, bord `#E7E1D6`, texte `#4A443B`, pastille `#F0EBE1`.
Clic → `et.aller`.

**Pied de page commun** : « Étape précédente » (`etapePrec` ; depuis l'étape 1,
renvoie à l'accueil) et bouton vert `etapeSuiv` avec libellé `libSuivant`
(« Étape suivante », ou « Voir le récapitulatif » à la dernière étape).

### 4.1 Étape 1 — Épreuves (`etape0`)

Titre « Épreuves **du championnat** ». Chapeau : les cinq épreuves officielles
sont pré-remplies avec leur critère réglementaire.

Une **carte par épreuve** (liste `epreuves`), filet supérieur 4 px de couleur
`ep.bande`, contenant :

1. Ligne de tête : pastille noire du numéro, champ **Nom de l'épreuve**
   (`ep.setNom`, 16 px gras), bouton destructif « Retirer » (`ep.suppr`).
2. Grille 4 colonnes (`minmax(180px,1fr)`) :
   - **Mesure** — `<select>` `ep.setMesure`, options : `nb_temps` « Nombre, puis
     temps », `poids` « Charge maximale (kg) », `duree` « Temps de maintien »,
     `chrono` « Temps sur distance », `distance` « Distance parcourue »,
     `medley` « Medley — parcours à ateliers ». Sous le champ, l'aide `ep.aide`
     explique le sens du classement.
   - **Temps imparti** — `ep.setTemps`, texte libre (« 60 s », « Illimité ») ;
     c'est la durée préchargée sur le chronomètre à chaque passage.
   - **Essais par athlète** — `ep.setEssais`, nombre 1→9 ; le meilleur essai est retenu.
   - **Passage** — `ep.setPassage` : `groupe` « Par groupe de poids » ou
     `melange` « Tout le monde mélangé ». Les classements restent séparés dans les deux cas.
3. Bandeau `#F5F1E8` : bouton bascule **niveaux** (`ep.basculerNiveau`, libellé
   `ep.libNiveau` = « Épreuve à niveaux » vert plein / « Sans niveau » blanc),
   texte d'aide `ep.aideNiveau`, et — si `ep.niveau` — champ
   `ep.setNiveauxOptions` listant les niveaux séparés par des virgules
   (« Niveau 1 — prise basse, Niveau 2 — prise médiane, … »).
4. Bloc **Medley** (si `ep.estMedley`), encadré ambre `#FFF6E8`/`#F0D8B0` :
   textarea **Ateliers dans l'ordre** (un par ligne : agrès, charge, distance —
   `ep.setAteliers`), **Distance totale** (`ep.setDistanceTotale`), **Fin de
   temps** (`ep.setRegleFin`).
5. **Critère de classement** — textarea 2 lignes avec filet gauche orange 3 px et
   fond `rgba(236,109,35,.05)` (`ep.setCritere`). Texte rappelé au juge et au speaker.
6. Grille 2 colonnes : **Matériel de compétition** (`ep.setMateriel`) et
   **Équipements personnels autorisés** (`ep.setEquipements`).

Sous la liste : « + Ajouter une épreuve » (`ajouterEpreuve`, bord pointillé) et
« + Ajouter un medley » (`ajouterMedley`, bord orange, fond `#FFF6E8`, préremplit
un parcours Yoke / Farmer's walk / Sandbag de 45 m).

Encadré vert de rappel du barème : **Points = N − Rang + 1** (N = nombre de
participants classés du groupe) ; ex æquo = mêmes points, rang suivant sauté ;
zéro ou forfait = 0 point, l'athlète reste au classement général.

Épreuves officielles préchargées : Atlas Stones, Renversement de pneu, Deadlift
voiture, Piliers d'Hercule (à niveaux), Tirage de camion.

### 4.2 Étape 2 — Groupes de poids (`etape1`)

Titre « Groupes **de poids** ». Championnat masculin, deux groupes par défaut :
« Moins de 100 kg » (max 100) et « Plus de 100 kg » (min 100).

> **Écart du portage (2026-09-17)** : chaque carte commence par « Couleur de la
> catégorie » — sept pastilles de la palette et un sélecteur libre. La couleur
> est attribuée à la création (première de la palette non prise) et enregistrée
> en base ; dans l'original elle ne dépendait que du rang dans la liste.

Grille `minmax(280px,1fr)`, une carte par groupe (`groupes`), filet supérieur
4 px (vert pour le premier, orange pour les suivants) :

- Champ **nom du groupe** (`g.setNom`, 17 px).
- Deux champs **Poids min (kg)** / **Poids max (kg)** (`g.setMin`, `g.setMax`,
  vides = pas de limite).
- Deux boutons côte à côte : **Sélectionner** (`g.retenir`) et **Mettre de côté**
  (`g.mettreDeCote`). L'état retenu se lit dans les couleurs (`fondRetenue`
  `#0B9237` plein quand actif ; `fondCote` `#C4361F` plein quand mis de côté) et
  dans la phrase `g.etatCategorie`. Une catégorie mise de côté reste enregistrée
  mais disparaît du plateau et des écrans.
- Pied : `g.effectif` (« 4 athlètes affectés ») et bouton « Retirer »
  (`g.demanderSuppr`).
- Confirmation en ligne (`g.aSupprimer`) : encadré rouge, avertissement
  `g.avertSuppr` (rappelle combien d'athlètes seront remis sans catégorie),
  boutons `g.annulerSuppr` / `g.suppr` (rouge plein).

Bouton « + Ajouter un groupe » (`ajouterGroupe`).

### 4.3 Étape 3 — Officiels (`etape2`)

Titre « Officiels **et corps arbitral** ». Minimum réglementaire rappelé : cinq
arbitres principaux, deux responsables techniques, des chronométreurs, un
secrétaire de table. Les juges ne saisissent rien : la table enregistre.

1. **Carte « Codes d'accès du logiciel »** (bord 2 px noir) : deux champs
   mot de passe visuels (17 px, `letter-spacing:.2em`, placeholder `0000`) —
   **Administrateur** (`accesAdmin`/`setAccesAdmin`) et **Régie**
   (`accesRegie`/`setAccesRegie`). Vides = ouverture sans connexion.
2. **Liste des officiels** (`officiels`), une ligne par personne : champ « Nom,
   prénoms » (`o.setNom`), `<select>` de rôle (`o.setRole`) parmi Directeur de
   compétition, Responsable technique, Responsable arbitrage, Juge principal,
   Chronométreur, Secrétaire de table, Régie, Speaker ; bouton « Retirer »
   (`o.suppr`).
3. « + Ajouter un officiel » (`ajouterOfficiel`), puis le rappel `manqueOfficiels`
   tant que moins de 5 officiels sont nommés.

### 4.4 Étape 4 — Athlètes (`etape3`)

Titre « Athlètes **engagés** ». Règles rappelées : les non-Ivoiriens sont marqués
Invité et restent hors classement ; les dossards, saisis à la main, fixent
l'ordre de passage de la première épreuve (croissant), les épreuves suivantes se
rangeant du total de points le plus bas au plus haut.

**Barre d'outils** : « Importer une liste » (`ouvrirImport`, vert) · « Photos
groupées » (`<input type=file multiple accept="image/*">` → `photosGroupees`) ·
« + Athlète » (`ajouterAthlete`) · « Effacer les dossards » (`viderDossards`,
bord noir) · champ de recherche `recherche`/`setRecherche` (nom, club) ·
`<select>` `filtre`/`setFiltre` alimenté par `filtres` (« Tous les athlètes »,
« À compléter », puis un item par club). Sous la barre : compteur `nbAffiches`.

#### Panneau d'import (`impOuvert`) — carte bord 2 px noir, 4 états

- **`impSource`** — deux zones en bord pointillé : « Depuis un fichier »
  (`importerFichier`, accepte `.xlsx,.csv,.txt,.docx,.pdf`, bouton noir
  « Choisir un fichier », note sur la fiabilité des formats, bouton « Télécharger
  le modèle » → `modeleCSV`) et « Ou coller la liste » (textarea `impTexte`,
  bouton vert « Lire ce texte » → `importerTexte`). Message `impErreur` en rouge.
- **`impLecture`** — simple ligne centrée « Lecture du fichier en cours… ».
- **`impVerif`** — tableau de contrôle à 5 colonnes
  (`44px 1.5fr 1fr 80px 1fr`) : Garder / Nom et prénoms / Club / Poids /
  Téléphones. Entête `#F5F1E8`. Chaque ligne (`impLignes`) : case à cocher
  carrée (`l.basculerGarder`, marque `✓`), nom en gras + prénoms, motifs de doute
  en `#BC4F14`, et pour un doublon un petit bouton bascule `l.basculerDoublon`
  (« Déjà présent — compléter la fiche » / « … — ignorer »). Les lignes douteuses
  ont le fond `#FDF3EF`. Bouton vert « Importer les N lignes cochées »
  (`validerImport`), avec le rappel que le poids du fichier reste indicatif.
- **`impResume`** — quatre compteurs en cartes (`resAjoutes` en vert,
  `resFusionnes`, `resIgnores` en gris, `resAVerifier` en orange), puis
  « Compléter les fiches » (`fermerImport`), « Aller à la pesée » (`versPesee`)
  et, à droite, « Annuler cet import » (`annulerImport`, revient à l'état d'avant).

Le bouton « Fermer » (`fermerImport`) est présent dans l'entête du panneau.

#### Panneau de correspondance des photos (`photosOuvert`)

Carte bord 2 px noir. Une ligne par fichier (`photosCorresp`) : vignette 44×54,
nom du fichier, `<select>` de l'athlète destinataire (`ph.choisir`, alimenté par
`athletesOptions`, avec « — Ne pas utiliser — »), et état à droite (« Reconnu »
en `#0B9237` / « À désigner » en `#BC4F14`). Bouton vert « Appliquer les photos »
(`appliquerPhotos`). Les photos sont recadrées en portrait automatiquement.

#### Encadré « athlètes sans catégorie » (`ilYaSansCategorie`)

Carte ambre `#FFF6E8` / bord gauche `#E8A317`. Titre `nbSansCategorie`. Barre
d'affectation groupée : « Tout cocher » (`toutSelectionner`), « Tout décocher »
(`toutDeselectionner`), compteur `libSelection`, `<select>` « Catégorie
d'arrivée… » (`choixGroupe`/`setChoixGroupe`, options = catégories retenues +
« Indépendant — hors classement »), bouton vert « Affecter la sélection »
(`affecterSelection`) et « Classer d'après le poids pesé » (`repartirParPoids`).
Retour utilisateur dans `msgAffectation` (y compris la liste des refus pour poids
hors limites). En dessous, la liste `sansCategorie` : case à cocher
(`s.basculerCoche`), nom, détail (poids pesé · club), `<select>` individuel
(`s.setChoix`), et message d'erreur `s.erreur` en pleine largeur si le poids ne
correspond pas aux bornes.

#### Liste des athlètes (`athletes`)

Tri : par dossard croissant dès qu'un dossard existe, sinon alphabétique.

**Ligne repliée** : vignette photo 36×44 (ou initiales sur `#F5F1E8`), champ
dossard 52 px (`a.setDossard`), bouton `✕` de suppression (`a.suppr`), nom en
capitales + prénoms, « club · groupe », drapeau 3 bandes, à droite le statut
(`a.statut` : Engagé / Pesée validée / Invité, couleur `a.statutCouleur`) et
l'alerte (`a.alerte` : « À vérifier » ou « Manque : prénoms, pesée, photo »),
enfin le bouton `a.basculer` (« Modifier » / « Replier »).

**Fiche dépliée** (`a.ouvert`, fond `#FCFAF6`) : photo 74×88 avec un lien
« Photo » (`a.setPhoto`) sous la vignette, puis une grille
`minmax(160px,1fr)` de champs :
Dossard (encadré ambre, 17 px) · Nom · Prénoms · Club (placeholder
« Indépendant ») · Nationalité (`<select>` de 14 pays ; hors CIV ⇒ Invité) ·
Catégorie (`<select>` : « — À déterminer par la pesée — », catégories retenues,
« Indépendant — hors classement ») · **un sélecteur de niveau par épreuve à
niveaux** (`a.niveaux`, encadré ambre, options issues de `niveauxOptions`) ·
Participation (bouton bascule `a.basculerInvite`, libellé `a.libInvite`) ·
Taille · Âge · Commune · Téléphone · Contact d'urgence (étiquette `#BC4F14`,
jamais affiché en public) · Poids déclaré (**lecture seule**, fond `#F5F1E8`) ·
Poids de la pesée (**lecture seule**, encadré vert `#B7DCC4`, `a.poidsPesee` +
`a.poidsMention` en info-bulle) · Note pour le speaker.

Erreur d'affectation : `a.erreurCat` en encadré rouge. Pied de fiche : texte
d'explication de la marque « À vérifier », bouton « Fiche vérifiée » (`a.vu`) et
« Retirer l'athlète » (`a.suppr`).

#### Carte « Logos des clubs »

Un item par club engagé (`clubs`) : vignette 46×46 (`cl.logo`, `background-size:
contain`), nom, effectif, lien « Choisir un logo » (`cl.setLogo`). Message
« Aucun club renseigné pour l'instant. » si `aucunClub`.

### 4.5 Étape 5 — Pesée (`etape4`)

Titre « Pesée **et vérification** ». Chapeau : 14h00–15h00, accueil, pesée,
vérification des équipements ; la validation attribue le groupe et le dossard
puis verrouille la ligne.

Une carte-liste, une ligne par athlète (`pesee`), en `flex-wrap` aligné en bas :

1. Champ **dossard** 52 px (`p.setDossard`, désactivé si `p.verrou`, couleur
   `p.dossardCouleur` — `#C4BCAC` tant qu'il est vide) + nom complet et
   sous-titre « club · nationalité ».
2. **Poids (kg)** — `p.setPoids`, désactivé si verrouillé.
3. **Catégorie** — `<select>` (`p.setCategorie`) : « — Déduite du poids — »,
   catégories, « Indépendant — hors classement ».
4. Bouton d'action (`p.basculer`) dont le libellé et les couleurs changent :
   **« Valider la pesée »** (vert plein) → **« Déverrouiller »** (blanc, bord gris).

La validation refuse et affiche `p.erreur` (encadré rouge) quand le poids est
absent, quand aucune catégorie retenue ne correspond au poids, ou quand le poids
sort des bornes de la catégorie choisie. Le fond des champs passe à `#F5F1E8`
une fois la ligne verrouillée.

Pied : `resumePesee` (« 8 pesée(s) validée(s) sur 12. … »).

### 4.6 Étape 6 — Programme (`etape5`)

Titre « Programme **de la journée** ». Alimente l'écran d'attente et la fiche du
speaker.

1. **Carte programme** — une ligne par moment (`programme`) : champ heure 96 px
   (`pr.setH`, texte vert gras), champ intitulé (`pr.setTxt`), bouton « Retirer »
   (`pr.suppr`). Bouton « + Ajouter une ligne » (`ajouterProgramme`).
   Programme par défaut : 14h00 accueil/pesée, 15h30 briefing technique, 16h30
   démarrage, 22h30 fin et délibérations, 22h45 remise des récompenses.
2. **Carte Récompenses** — une ligne par place (`recompenses`), bord gauche 5 px
   de la couleur du métal : libellé de rang (`r.libRang`), champ Titre
   (`r.setTitre`, ex. « Médaille d'or »), champ Prime (`r.setPrime`, texte vert
   gras, ex. « 500 000 fr »), champ Lot (`r.setLot`), bouton « Retirer »
   (`r.suppr`). Boutons « + Ajouter une récompense » (`ajouterRecompense`) et
   « Rétablir les valeurs officielles » (`retablirRecompenses` → or 500 000 fr +
   trophée, argent 300 000 fr, bronze 200 000 fr). Ce contenu alimente l'écran
   Podium et le procès-verbal.
3. **Carte Bandeau partenaires** — champ unique `partenaires`/`setPartenaires`
   (noms séparés par des virgules), défilant sur l'écran d'attente.

---

## 5. Vue `recap`

**Rôle** — état de préparation en un écran, avec accès direct à l'étape
défaillante. **Utilisateur** — administrateur / directeur de compétition.

Titre « Récapitulatif **de préparation** ». Rappel : rien n'empêche de lancer la
compétition avec des lignes incomplètes.

Six lignes (`recap`), carte blanche à bord gauche 4 px coloré :

| Ligne | Condition de réussite | Détail affiché |
|---|---|---|
| Épreuves | ≥ 1 | « N épreuve(s) définie(s) » |
| Groupes de poids | ≥ 1 | « N groupe(s) » |
| Officiels | ≥ 5 nommés | « N officiel(s) nommé(s), dont J juge(s) de terrain » |
| Athlètes | ≥ 2 et toutes les fiches complètes | « N engagé(s), C fiche(s) complète(s) » |
| Pesée | toutes les pesées validées | « P / N pesée(s) validée(s) » |
| Programme | ≥ 3 lignes | « N ligne(s) au programme » |

Chaque ligne : pastille ronde `✓` (vert `#0B9237`, fond `rgba(11,146,55,.12)`) ou
`!` (orange `#EC6D23`, fond `rgba(236,109,35,.14)`), titre, détail, bouton
« Ouvrir » (`r.aller` → vue `prepa` sur l'étape correspondante).

En bas, **bandeau verdict** en dégradé orange `linear-gradient(100deg,#EC6D23,#BC4F14)`,
texte blanc : `verdictRecap` (« Préparation complète » / « Un point à
compléter » / « N points à compléter ») et `verdictDetail`.

---

## 6. Vue `plateau`

**Rôle** — conduite de la compétition en direct : ordre de passage, appel des
athlètes, chronomètre à deux appuis, saisie et validation des performances,
classements en temps réel. **Utilisateur** — la table (secrétaire + directeur) ;
le juge valide l'essai sur le terrain mais ne saisit rien.

### 6.1 Barre de contrôle (carte blanche, `flex-wrap`, alignée en bas)

- **Épreuve en cours** — `<select>` `epreuveCouranteId`/`setEpreuveCourante`
  (options = toutes les épreuves).
- **Passage** — `<select>` `groupeCourantId`/`setGroupeCourant`, alimenté par
  `groupesPlateau` : les catégories retenues + « Toutes catégories mélangées »
  (id `tous`).
- **Reconstruire l'ordre** (`construireFile`) — rebâtit la file « À venir » de
  l'épreuve dans l'ordre réglementaire.
- **Précharger toutes les épreuves** (`preparerToutes`, bouton noir) — charge
  tous les athlètes dans toutes les épreuves, par catégorie et toutes catégories
  mélangées, sans toucher aux ordres déjà construits.
- **Régie des écrans** (`versRegie`, bouton orange clair).
- **Suspendre** (`suspendre`, destructif) — demande un motif et l'affiche sur les
  écrans publics.

### 6.2 Bandeaux contextuels

- `epreuveANiveaux` → encadré ambre `messageNiveaux` (chaque athlète concourt au
  niveau déclaré sur sa fiche).
- `estMedleyCourant` → carte « Medley — ateliers dans l'ordre » : `distanceMedley`
  en orange, puis une pastille numérotée par atelier (`ateliersCourants`).
- `msgPreparation` → message vert après un préchargement.
- `suspendu` → bandeau ambre « Compétition suspendue — `motifSuspension` » +
  bouton vert « Reprendre » (`reprendre`).

### 6.3 Bloc « Appel — un athlète par catégorie » (seulement si `melange`)

Carte bord 2 px noir. Grille de cartes `ordreCats` : dossard du prochain en
grand (couleur de la catégorie), nom de la catégorie en sur-titre, nom du
prochain athlète, bouton noir « Appeler » (`c.appelerProchain`).

### 6.4 Trois colonnes (grille `minmax(300px,1fr)`, alignées en haut)

#### Colonne 1 — « À venir · N » (`avenir`)

Entête `#F5F1E8`. Une ligne par passage : pastille dossard 34×34, nom, puis une
rangée de badges — catégorie (pastille pleine de `p.catCouleur`, texte blanc),
niveau si `p.aNiveau` (pastille ambre), `p.clubMention` (suffixée « · Invité,
hors classement » le cas échéant). Bouton noir « Appeler » (`p.appeler`).
Vide (`aucunAvenir`) : « Aucun passage en attente. Construisez l'ordre de passage
pour cette épreuve. »

#### Colonne 2 — « Au plateau » (carte bord 2 px noir, entête noire)

Titre `libPlateau` (« Au plateau » ou « Au plateau · 2 athlètes »).

1. Si `melange` : bouton noir pleine largeur `appelerDuo` (libellé
   `libAppelerDuo`, « Appeler les N athlètes (un par catégorie) »).
2. **Chronomètre** — bloc `#0A0D0B`, bord coloré `chronoEncadre` :
   - affichage 44 px `chronoTexte` au format `mm:ss,d` (couleur
     `chronoCouleurClair`, animation `chronoAnim`),
   - état `chronoEtat` (« Décompte préparé : 60 s » ou « Chronomètre montant »),
   - gros bouton `chronoAction` (17 px) dont le libellé suit la phase :
     **« Démarrer à l'annonce »** (vert) → **« Arrêter au commencement »**
     (rouge `#C4361F`) → **« Réarmer »** (vert). Si aucun athlète n'est au
     plateau, le libellé devient « Appelez un athlète d'abord » et le fond
     `#B8B0A2`.
   - message `msgChrono` en rouge si l'on tente de démarrer à vide.
3. **Critère de l'épreuve** (`critereCourant`) en filet gauche orange.
4. Si `plateauVide` : encadré `#F5F1E8` invitant à appeler un athlète.
5. **Une carte par athlète au plateau** (`plateaux`, 1 ou 2), bord supérieur 4 px
   de la couleur de catégorie :
   - photo 84×100 (ou initiales), badge dossard orange, drapeau, nationalité,
     pastille de catégorie, nom 21 px, « club · poids », badge de niveau si
     `aNiveau`, note du speaker.
   - bouton « ← Retour file » (`auPlateau.renvoyer`) pour corriger un appel erroné.
   - **Compteur de tours** si `toursActifs` (épreuves `nb_temps` et `duree`) :
     bloc noir avec un grand bouton « Tour — répétition validée »
     (`auPlateau.tour` → `tourPour`), le compte `nbTours`, un bouton « Retirer le
     dernier » (`annulerTour`), et la liste des tours sous forme de pastilles
     « n · t s ». Chaque appui remplit automatiquement la valeur et le temps.
   - **Saisie** : champ principal étiqueté `uniteValeur` (« Nombre validé »,
     « Charge (kg) », « Durée tenue (s) », « Distance (m) », « Distance parcourue
     (m) », « Temps (s) ») et, pour les mesures mixtes (`nb_temps`, `distance`,
     `medley`), un second champ `libTemps` (« Temps du dernier tour (s) » ou
     « Temps mis (s) »). Erreur de saisie : `auPlateau.erreur`.
   - **Actions** : bouton vert pleine largeur **« Valider la performance et
     appeler le suivant »** (`officialiser`), puis **« Zéro »** (`zero` — a
     concouru, rien de validé, reste classé avec 0 point) et **« Forfait »**
     (`forfait` — ne s'est pas présenté).
6. En bas : « ← Annuler la dernière validation » (`retourPassage`) tant que
   `annulationOuverte` ; remplacé par un encadré gris explicatif quand
   `annulationVerrouillee` (épreuve terminée pour la catégorie : la correction
   passe par la feuille de notation signée).
   > **Écart du portage (2026-09-17, [ADR 0005](decisions/0005-un-passage-valide-ne-s-annule-plus-depuis-le-plateau.md))** :
   > aucune annulation. À la place, quand tout est rendu, un encadré vert
   > « Épreuve terminée » avec « Imprimer les résultats ».

#### Colonne 3 — « Passages terminés · N » (`termines`, du plus récent au plus ancien)

Pastille dossard, nom (rouge `#A6371C` si forfait), résultat `t.texte`
(valeur + unité, éventuellement « · temps s », ou « ZÉRO » / « FORFAIT » en
rouge), fond de ligne `#FBEFEA` pour un zéro ou un forfait. Bouton « Annuler »
(`t.renvoyer`) qui renvoie le passage dans « À venir ».
> **Écart du portage** : pas de bouton « Annuler » par ligne (ADR 0005). En
> tête de colonne, un rappel et un lien « Imprimer les résultats » vers
> `/admin/impression/resultats`. Le portage ajoute aussi un huitième écran
> public, `/ecran/resultats` (résultats de l'épreuve par catégorie), et son
> entrée dans la régie.

### 6.5 « Ordre de passage par catégorie » (si `melange`)

Grille `minmax(260px,1fr)` : une carte par catégorie (`ordreCats`), entête plein
de la couleur de catégorie avec le nom et `c.compte` (« 5 athlètes à passer »).
Chaque ligne (8 max) : rang dans la catégorie, dossard, nom, bouton « Appeler ».
La première ligne est surlignée `#FFF6E8`.

### 6.6 Deux tableaux de classement (grille `minmax(320px,1fr)`)

- **`nomEpreuveCourante` · `nomGroupeCourant`** (`clEpreuve`) : rang en orange,
  nom, performance, points alignés à droite (« N pts »). Vide : « Aucun résultat
  officialisé sur cette épreuve. »
- **Classement général · `nomGroupeCourant`** (`clGeneral`) : rang en vert
  `#03562A`, nom, total de points.

> **Règles de calcul à reproduire** — Points = N − Rang + 1 sur le groupe.
> Départage : valeur, puis temps intermédiaire le plus court, puis poids de corps
> le plus léger. Au général : total, puis nombre de 1res, 2es, 3es places.
> Invités et athlètes sans catégorie sont hors classement mais leurs performances
> sont enregistrées. Ordre de passage : dossards croissants à la 1re épreuve,
> puis du total de points le plus bas au plus haut.

---

## 7. Vue `regie`

**Rôle** — pilotage des sorties vidéo : que montre chaque mur LED, en quel
thème, et ouverture des fenêtres à glisser sur les écrans.
**Utilisateur** — la régie de diffusion (code d'accès dédié, droit `regie`).

Titre « Régie **de diffusion** ». Chapeau : une sortie par écran, mise à jour
automatique à chaque décision du plateau, mode sombre par défaut.

1. **Barre thème** — libellé `themeLibelle` (« Mur LED en mode nuit / jour »),
   bouton « Basculer jour / nuit » (`basculerTheme`), bouton « Ouvrir la mire »
   (`ouvrirMire`).
2. **Carte « Résultats de l'épreuve en cours »** (bord 2 px noir) : titre +
   `nomEpreuveCourante` en orange + mention « Classement séparé par catégorie,
   mis à jour à chaque validation ». Grille `minmax(260px,1fr)` de blocs `epParCat`
   (un par catégorie retenue) : entête plein de la couleur de catégorie, puis les
   lignes rang / nom / performance / points (points en `#03562A`). Bloc vide :
   « Aucun passage validé pour l'instant dans cette catégorie. »
   > **Écart du portage (2026-09-17, demande de Kevin)** : cette carte n'est
   > pas reprise. La régie ne montre ni l'épreuve en cours ni ses résultats :
   > tout cela se lit sur les écrans diffusés (`plateau`, `resultats`). La
   > feuille de résultats s'imprime depuis le plateau.
3. **Liste des sorties** (`ecrans`), une carte par sortie :
   - champ **Sortie** (`e.setNom`, ex. « Mur LED principal »),
   - `<select>` **Contenu diffusé** (`e.setContenu`) : `attente` « Écran
     d'attente », `plateau` « Athlète au plateau + chronomètre », `ordre` « Ordre
     de passage à venir », `verdict` « Dernier verdict validé », `classement`
     « Classement général par catégorie », `podium` « Podium et palmarès »,
     `mire` « Mire de lisibilité »,
   - bouton **Aperçu** (`e.apercu` — rend le contenu en plein cadre dans la page
     courante, sans ouvrir de fenêtre),
   - bouton vert **Ouvrir la fenêtre** (`e.ouvrir` — `window.open` sur
     `?ecran=<contenu>&theme=<theme>&espace=<espace>`, 1280×720),
   - bouton **Retirer** (`e.suppr`).
   Sorties par défaut : « Mur LED principal » (plateau) et « Écran secondaire » (ordre).
4. Bouton « + Ajouter une sortie » (`ajouterEcran`).
5. Encadré vert de principe d'architecture : le poste est maître, les fenêtres
   écrans lisent la compétition sur ce même poste, sans dépendre du réseau.

---

## 8. Vue `solo` — écrans publics plein cadre

**Rôle** — ce que voit le public sur les murs LED. **Utilisateur** — personne :
c'est une sortie, ouverte soit dans une fenêtre dédiée (`?ecran=…`), soit en
aperçu dans la page de régie.

Conteneur `position:fixed; inset:0`, padding `3vh 4vw`, colonne flex, gap `2vh`,
fond `soloFond`, texte `soloEncre`. **Toutes les tailles sont en `vh`/`vw`.**
Une fenêtre écran relit les données toutes les 1,5 s, le chronomètre toutes les
0,4 s, et se rafraîchit 10 fois par seconde.

**Entête commune** (toujours affichée) : logo FIBDA `6vh`, sur-titre orange
« Championnat National de Strongman 2026 », badge orange « ESSAI » si
`espaceEssai`, puis à droite le bouton `retourEcran` (libellé `libRetourEcran` :
« ← Retour » ou « ← Fermer l'aperçu ») et une bande tricolore de `14vw`.

### 8.1 `plateau` — athlète au plateau (`soloPlateauActif`)

Deux mises en page selon le nombre d'athlètes appelés.

**Un seul athlète (`soloUnSeul`)**
- Bandeau supérieur : à gauche un bloc plein de la couleur de catégorie —
  sur-titre « Catégorie » + nom de catégorie en `4.2vh` majuscules ; à droite une
  pastille carte avec `nomEpreuveCourante` en orange.
- Corps : photo `19vw × 52vh` (ou initiales `9vh`), puis le bloc identité —
  badge dossard orange `3.6vh`, drapeau, nationalité, pastille de poids
  (`poidsTexte` en orange), badge de niveau orange plein si l'épreuve est à
  niveaux, mention « Invité — hors classement » le cas échéant ; **nom en `7vh`
  gras** ; en dessous le logo du club (`6vh`) et le nom du club en `3.2vh`.
- À droite, le **chronomètre géant** : `16vh`, `tabular-nums`, couleur
  `chronoCouleurEcran`, sous-titre `chronoLibelleEcran` (« Temps restant »,
  « Temps écoulé », « Temps arrêté », « Prêt — <catégorie> »).

**Deux athlètes (`duoActif`, appel croisé en passage mélangé)**
- Ligne supérieure : nom de l'épreuve à gauche, chronomètre `11vh` à droite.
- Deux colonnes égales `duoA` / `duoB`, séparées par une **bande tricolore
  verticale** de `1.5vw`. Chaque colonne : bandeau de catégorie plein
  (`3.6vh`), photo `13vw × 36vh`, badge dossard, drapeau, nationalité, nom
  `5.4vh`, club `2.6vh`, pastilles poids et niveau.

**Pied (si `melange`)** : « Appel — un athlète par catégorie » — une carte par
catégorie avec bord gauche `0.7vw` coloré, dossard `3.6vh`, nom de catégorie en
sur-titre, nom du prochain athlète `3.2vh`.

### 8.2 `plateau` sans athlète appelé (`soloPlateauVide`)

Bloc centré verticalement : sur-titre orange « `nomEpreuveCourante` ·
`nomGroupeCourant` », puis
- si plus personne à venir (`soloAucunProchain`) : **« Épreuve terminée »** en
  `8vh` et « Résultats en cours de vérification » en `3vh` ;
- sinon (`soloProchain`) : sur-titre « Prochain passage », photo `14vw × 17vw`
  si disponible, dossard `9vh` en orange, pastille de catégorie, nom `8vh`,
  club `3vh`.

### 8.3 `ordre` — ordre de passage

Deux variantes selon le mode de passage.

**`soloOrdre`** (passage par groupe) : titre `4vh` « Ordre de passage —
`nomEpreuveCourante` », puis la liste `avenir` en lignes séparées par un filet :
photo `6vh × 7.4vh`, dossard `4.2vh` orange, nom `4.2vh`, pastille de catégorie,
club `2.6vh`.

**`soloOrdreCats`** (passage mélangé) : titre `3.4vh`, puis une grille
`minmax(22vw,1fr)` de colonnes `ordreCats` — entête plein de la couleur de
catégorie (`3.2vh` majuscules), puis 8 lignes maximum : photo `4.6vh × 5.6vh`,
dossard `3.2vh` de la couleur de catégorie, nom `3vh`. La première ligne est
légèrement surlignée (`rgba(252,250,246,.10)` en nuit, `rgba(20,18,16,.05)` en jour).

### 8.4 `verdict` — dernier verdict officialisé

Bloc centré horizontalement et verticalement :
- sur-titre `2.4vh` « Dernier verdict officialisé »,
- nom de l'athlète `8vh`,
- **résultat en `14vh`** : la valeur (virgule décimale française), ou « ZÉRO »,
  ou « FORFAIT ». Couleur `#0B9237` si performance validée, `#C4361F` sinon,
- pied `3vh` : « `nomEpreuveCourante` · `nomGroupeCourant` ».

Le verdict retenu est le passage terminé le plus récent, toutes catégories confondues.

### 8.5 `classement` — classement général par catégorie

Titre `3.6vh` « Classement général par catégorie », puis grille
`minmax(24vw,1fr)` de colonnes `clParCat` (une par catégorie retenue,
**10 premiers**) : entête plein de la couleur de catégorie, puis par ligne le
rang `3vh` coloré, la photo `4.6vh × 5.6vh`, le nom `2.8vh`, le total de points
`3vh` à droite.

### 8.6 `podium` — podium et palmarès

Titre `4vh` « Podium — `nomGroupeCourant` », puis les **trois premiers** du
groupe courant en cartes empilées, bord gauche `0.8vw` de la couleur du métal :
rang `6vh`, photo `9vh × 11vh`, nom `5vh`, ligne « `métal` · `total` points »,
et à droite la **prime** en orange `3.4vh`. Métal et prime proviennent des
récompenses saisies à l'étape Programme.

### 8.7 `attente` — écran d'attente

Deux colonnes.

**Colonne gauche (centrée verticalement)** :
- sur-titre orange `compteurLib` (« Avant le coup d'envoi », « Coup d'envoi
  dans », « Championnat », « Coup d'envoi »),
- **compte à rebours `12vh`** `compteur` : « 3j 04h 12min » à plus d'un jour,
  « 04:12:33 » le jour même, « En cours » une fois l'heure passée, ou simplement
  l'heure si la date n'est pas analysable,
- date `5vh`, plage horaire `champHeure → champFin` en vert `4vh`,
- lieu `3vh` et adresse `2.4vh` en couleur secondaire,
- en bas de colonne, le **bandeau partenaires** (`soloPartenaires`, `2.2vh`).

**Colonne droite (`42vw`)** : titre `soloEngagesTitre` (« Athlètes engagés ·
1–10 sur 24 »), indicateur de pagination à droite (`pagesEng` : barrettes de
`0.7vh`, active orange `4vw`, inactives `1.4vw` en gris translucide), puis
**10 athlètes par page** triés par dossard : photo `5.2vh × 6.4vh`, dossard
`2.8vh` orange, nom `2.8vh`, club `2vh`. **La page tourne toutes les 8 secondes.**

### 8.8 `mire` — mire de lisibilité

Outil de réglage du mur LED avant ouverture au public :
- une **barre de six couleurs** sur `8vh` : `#EC6D23`, `#FFFFFF`, `#0B9237`,
  `#03562A`, `#141210`, `#CB7C4A`,
- quatre lignes d'échantillon typographique décroissantes :
  `9vh` « KONÉ IBRAHIM », `6vh` « KONÉ IBRAHIM », `4vh` « KONÉ IBRAHIM · Iron
  Club Abidjan », `2.6vh` « Renversement de pneu · 4 renversements · 58,2 s »,
- consigne finale `1.8vh` : « Lisez la plus petite ligne encore nette depuis le
  dernier rang : c'est votre plancher de taille de texte pour cette sortie. »

---

## 9. Points d'attention pour le portage

- **Deux espaces de données étanches** : compétition réelle (`fibda-strongman-2026-prepa`)
  et démonstration (`fibda-strongman-2026-essai`), sélectionnables partout par la
  barre Réel/Démo et par le paramètre d'URL `espace=essai`.
- **Tout est local** : persistance à chaque frappe sur le poste, synchronisation
  des fenêtres écrans par lecture périodique du stockage local et par l'événement
  `storage` — aucune dépendance réseau assumée explicitement dans l'interface.
- **Le chronomètre est partagé** entre le plateau et les écrans par un canal
  séparé : il doit rester la source unique, avec ses trois phases
  `pret` / `encours` / `arrete`.
- **Aucune modale bloquante** pour les suppressions : les confirmations
  s'affichent en place, dans le flux (bandeau global ou encadré dans la carte).
- **Tous les libellés, messages d'erreur et info-bulles sont en français** et
  rédigés en langue métier (« Valider la pesée », « Zéro », « Forfait »,
  « Retour file ») : ils font partie de l'interface, pas de l'habillage.
