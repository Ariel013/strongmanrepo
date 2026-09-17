# Règles métier — Arbitrage Strongman 2026

Spécification fonctionnelle extraite de la logique applicative (`app.jsx`, 2134 lignes,
classe `Component extends DCLogic`). Toutes les références de ligne renvoient à ce fichier.

Ce document décrit **ce que le code fait**, pas ce qu'il devrait faire. Les écarts,
ambiguïtés et bugs probables sont regroupés dans la section « Points douteux » en fin
de document.

---

## 0. Cadre général

### 0.1 Persistance

- Tout l'état métier tient dans **un seul objet JSON** stocké dans `localStorage`.
- Deux espaces étanches, sélectionnés par le paramètre d'URL `?espace=essai` (l. 199-201) :
  - `"fibda-strongman-2026-prepa"` — espace **officiel** (constante `CLE`, l. 2)
  - `"fibda-strongman-2026-essai"` — espace **essai / démonstration** (`CLE_ESSAI`, l. 3)
  - `cle()` (l. 196) choisit la clé selon `state.espace`.
- Une clé annexe `CLE + ":ch"` porte l'état du chronomètre (l. 1063, 1067) — voir § 9.4.
- `maj(fn)` (l. 252-259) est le seul point d'écriture métier : clonage profond par
  `JSON.parse(JSON.stringify(...))`, application de `fn` sur le brouillon, sérialisation,
  écriture. En cas de `QuotaExceeded`, message d'erreur explicite sur les photos (l. 257).
- `relire()` (l. 243-250) relit le stockage si le texte brut a changé ; n'est activé
  qu'en mode écran solo (intervalle 1,5 s, l. 227) plus l'événement `storage` (l. 230).

**Conséquence pour un backend :** la synchronisation entre le poste de saisie et les
écrans publics repose sur un polling du document complet. Un backend doit fournir
l'équivalent (document entier versionné, ou événements).

### 0.2 Migration de schéma au chargement

`componentDidMount` (l. 198-232) normalise les épreuves d'une sauvegarde ancienne
(l. 209-217) :

- appariement avec les épreuves officielles sur `id` **et** nom désaccentué identique ;
- rattrapage systématique de `niveau` / `niveauxOptions` ;
- si `e.tours` est absent : reprise de `mesure`, `temps`, `critere`, `tours` de
  l'épreuve officielle, sinon calcul par défaut `tours = (mesure === "nb_temps" || mesure === "duree")` (l. 216).

`sansAcc(s)` (l. 9) : normalisation NFD, suppression des diacritiques, minuscules, trim.
C'est la fonction de comparaison de noms utilisée partout (doublons d'import,
appariement d'épreuves, correspondance de catégories à l'import Excel).

---

## 1. Modèle de données

Racine de l'état métier : `etatVide()` (l. 106-151).

```
{ champ, comp, passages, ecrans, regie, epreuves, groupes, officiels,
  athletes, logos, programme, partenaires, acces, recompenses }
```

### 1.1 `champ` — identité de la compétition (l. 108-115)

| Champ | Type | Sens |
|---|---|---|
| `nom` | texte | Nom du championnat. Défaut : « Championnat National de Strongman 2026 » |
| `date` | texte libre | Date en français, ex. « Samedi 19 Septembre 2026 ». Parsée par `dateCible()` |
| `heure` | texte libre | Heure de début, ex. « 14h00 ». Parsée `(\d{1,2})\s*h\s*(\d{2})?` |
| `fin` | texte libre | Heure de fin annoncée, purement informative |
| `lieu` | texte | Lieu |
| `adresse` | texte | Adresse |

`dateCible(champ)` (l. 77-86) : extrait `jour mois année` par
`/(\d{1,2})\s+([a-zéûîà]+)\s+(\d{4})/` sur `date` en minuscules, cherche le mois dans
`MOIS_FR` (l. 75-76), y ajoute l'heure. Retourne `null` si le motif ou le mois échoue.
Sert exclusivement au compte à rebours de l'écran d'attente (l. 1706-1726).

### 1.2 `comp` — état courant de la compétition (l. 116)

| Champ | Type | Sens |
|---|---|---|
| `epreuveId` | id ou `null` | Épreuve sélectionnée au plateau. `null` ⇒ `epreuves[0]` (l. 775) |
| `groupeId` | id, `"tous"` ou `null` | Catégorie sélectionnée. `"tous"` = pseudo-groupe « Toutes catégories » (l. 779). `null` ⇒ `groupes[0]` (l. 780) |
| `suspendu` | booléen | Compétition suspendue (l. 1010) |
| `motif` | texte | Motif de suspension, saisi par `prompt()` (l. 1008). Vide si non renseigné ⇒ « Suspension » |

### 1.3 `epreuves[]` (l. 49-73 pour les 5 officielles)

| Champ | Type | Sens |
|---|---|---|
| `id` | texte | Identifiant (`ep1`…`ep5` pour les officielles, sinon `nid("ep")`) |
| `nom` | texte | Nom de l'épreuve |
| `mesure` | clé | Une des 5 clés de `MESURES` (§ 2). `"medley"` existe aussi mais hors `MESURES` — voir Points douteux |
| `temps` | texte libre | Temps imparti, ex. « 60 s », « 90 s », « Illimité ». Converti en secondes par `parseDuree` (l. 94-97) : **premier entier trouvé**, 0 si aucun |
| `essais` | texte libre | Nombre d'essais annoncé (« 1 », « 3 »). **Jamais contrôlé par le code** |
| `passage` | texte | Défaut `"groupe"`. Stocké et éditable, **jamais lu par la logique** |
| `tours` | booléen | Active le compteur de répétitions par athlète au plateau (l. 1590) |
| `critere` | texte | Critère d'arbitrage affiché au plateau et sur les écrans |
| `materiel` | texte | Matériel requis |
| `equipements` | texte | Équipements autorisés de l'athlète |
| `niveau` | booléen | Épreuve à niveaux (ex. `ep4` Piliers d'Hercule) |
| `niveauxOptions` | texte | Niveaux possibles, séparés par des virgules (l. 1349) |
| `ateliers` | texte | Medley uniquement : ateliers, un par ligne (l. 1794) |
| `distanceTotale` | texte | Medley uniquement |
| `regleFin` | texte | Medley uniquement |

Les 5 épreuves officielles (l. 51-71) :

| id | nom | mesure | temps | essais | tours | niveau |
|---|---|---|---|---|---|---|
| ep1 | Atlas Stones | `nb_temps` | 60 s | 1 | oui | non |
| ep2 | Renversement de pneu | `nb_temps` | 60 s | 1 | oui | non |
| ep3 | Deadlift voiture | `nb_temps` | 60 s | 3 | oui | non |
| ep4 | Piliers d'Hercule | `duree` | Illimité | 1 | oui | **oui** (3 niveaux : prise basse / médiane / haute) |
| ep5 | Tirage de camion | `distance` | 90 s | 1 | **non** | non |

### 1.4 `groupes[]` — catégories de poids (l. 124-127)

| Champ | Type | Sens |
|---|---|---|
| `id` | texte | Identifiant |
| `nom` | texte | Libellé, ex. « Moins de 100 kg » |
| `min` | texte numérique ou `""` | Limite basse. `""` ⇒ `-Infinity` |
| `max` | texte numérique ou `""` | Limite haute. `""` ⇒ `+Infinity` |
| `actif` | booléen (implicite `true`) | `false` = « mise de côté » : la catégorie n'est plus proposée au plateau ni affichée sur les écrans (l. 1268-1269, 1639, 1810). Le test est toujours `actif !== false` |
| `parite` | `"pair"` / `"impair"` / `""` | Parité de dossards forcée (§ 5) |

Défaut : `g1` « Moins de 100 kg » (min `""`, max `"100"`), `g2` « Plus de 100 kg »
(min `"100"`, max `""`).

**Suppression d'une catégorie** (l. 1282-1289) : les athlètes affectés repassent à
`groupeId = null` **et** `verrou = false`, et tous les passages de cette catégorie sont
supprimés.

### 1.5 `officiels[]` (l. 128-137)

| Champ | Type | Sens |
|---|---|---|
| `id` | texte | Identifiant |
| `nom` | texte | Nom |
| `role` | clé de `ROLES` | § 10 |
| `code` | texte | Code d'accès individuel — **jamais utilisé pour la connexion** (voir Points douteux) |

Composition par défaut : 1 directeur, 1 arbitrage, 3 juges, 1 chrono, 1 secrétaire,
1 régie (tous sans nom).

### 1.6 `athletes[]`

Forme complète (fusion de `jeuDemo` l. 178-183, `ajouterAthlete` l. 2130, import Excel
l. 511-522, import de liste l. 695-698) :

| Champ | Type | Sens |
|---|---|---|
| `id` | texte | `nouvelId("a")` (l. 164) ou `nid("a")` (l. 307) |
| `nom` | texte | Nom de famille, systématiquement mis en MAJUSCULES à l'affichage et à l'import |
| `prenoms` | texte | Prénoms |
| `club` | texte | Vide ⇒ affiché « Indépendant » |
| `pays` | code ISO3 | Clé de `PAYS` (l. 30-45). Défaut `"CIV"` |
| `photo` | data-URL | Portrait recadré 260 px, qualité 0,6 (l. 608) |
| `poids` | texte | Poids pesé, virgule ou point acceptés (`parseFloat(String(x).replace(",", "."))`) |
| `poidsDeclare` | texte | Poids déclaré à l'inscription (import), distinct du poids pesé |
| `groupeId` | id ou `null` | Catégorie affectée |
| `hors` | booléen | Marqué « Indépendant / hors catégorie » manuellement (l. 376) |
| `invite` | booléen | Athlète invité |
| `verrou` | booléen | Pesée validée (§ 6.4) |
| `dossard` | texte | Numéro de dossard, saisi à la main |
| `note` | texte | Note libre, affichée au plateau |
| `taille`, `age`, `commune`, `tel`, `urgence` | texte | Fiche administrative |
| `aVerifier` | booléen | Ligne d'import jugée douteuse (l. 680) |
| `niveaux` | objet `{epreuveId: niveau}` | Niveau déclaré par épreuve à niveaux (l. 1350) |

`PAYS` (l. 30-45) associe à chaque code un nom `n` et trois couleurs de drapeau `c[0..2]`
utilisées comme bandeau d'identité visuelle.

### 1.7 `passages[]`

Créés par `construireFile`, `assurerFile`, `preparerToutes`, ou l'import Excel.

| Champ | Type | Sens |
|---|---|---|
| `id` | texte | `nid("ps")` |
| `epreuveId` | id | Épreuve |
| `groupeId` | id ou `"tous"` | **Vue** sous laquelle la file a été construite, pas nécessairement la catégorie de l'athlète |
| `athleteId` | id | Athlète |
| `ordre` | entier ≥ 1 | Rang dans la file (1-based) |
| `statut` | `"avenir"` / `"plateau"` / `"termine"` (+ `"a_saisir"` dans le portage) | § 8 |
| `resultat` | objet ou `null` | voir ci-dessous |
| `ts` | ISO-8601 ou `null` | Horodatage du dernier changement d'état (appel ou officialisation) |
| `votes` | `[null,null,null]` | Écrit **uniquement** par `construireFile` (l. 851), jamais lu |

`resultat` (l. 964-967) :

| Champ | Type | Sens |
|---|---|---|
| `statut` | `"ok"` / `"zero"` / `"forfait"` | Verdict |
| `valeur` | nombre ou `null` | Performance mesurée. `null` si `zero`/`forfait` |
| `temps` | nombre ou `null` | Temps intermédiaire / temps mis |
| `tours` | tableau de nombres | Temps de chaque répétition validée (en secondes, arrondis au dixième) |

### 1.8 `ecrans[]` (l. 118-121)

| Champ | Type | Sens |
|---|---|---|
| `id` | texte | Identifiant |
| `nom` | texte | Nom de la sortie, ex. « Mur LED principal » |
| `contenu` | clé de `CONTENUS` | § 11 |

Défaut : `e1` « Mur LED principal » → `plateau` ; `e2` « Écran secondaire » → `ordre`.
Ouverture d'un écran (l. 1671) : nouvelle fenêtre
`?ecran=<contenu>&theme=<theme>&espace=<espace>`, 1280×720.

### 1.9 `regie` (l. 122)

| Champ | Type | Sens |
|---|---|---|
| `theme` | `"nuit"` / `"jour"` | Palette des écrans publics. Défaut `"nuit"` (l. 1665) |

### 1.10 `programme[]` (l. 140-146)

| Champ | Type | Sens |
|---|---|---|
| `id` | texte | Identifiant |
| `h` | texte | Heure, ex. « 14h00 » |
| `txt` | texte | Libellé de l'étape |

Cinq lignes par défaut (accueil/pesée, briefing, démarrage, fin/délibérations, récompenses).

### 1.11 `recompenses[]` (l. 166-170, `RECOMPENSES_DEF`)

| Champ | Type | Sens |
|---|---|---|
| `titre` | texte | Ex. « Médaille d'or » |
| `prime` | texte | Ex. « 500 000 fr » |
| `lot` | texte | Lot complémentaire |

Le rang est **l'index dans le tableau** (1ère place = index 0). Liste extensible
(`ajouterRecompense`, l. 1888) et réinitialisable (`retablirRecompenses`, l. 1893).
Si la liste est vide, `RECOMPENSES_DEF` sert de repli (l. 1748).

### 1.12 `acces` (l. 148)

| Champ | Type | Sens |
|---|---|---|
| `admin` | texte | Code d'accès « Administrateur du logiciel » → droit `tout` |
| `regie` | texte | Code d'accès « Régie de diffusion » → droit `regie` |

### 1.13 `logos` (l. 139)

Dictionnaire `{ nomDuClub: dataURL }`. La clé est le nom de club **trimé** (l. 754,
1555). Image réduite à 320 px (l. 753).

### 1.14 `partenaires` (l. 147)

Texte libre affiché en bas des écrans publics (l. 1900).

---

## 2. Les cinq types de mesure (`MESURES`, l. 11-17)

| Clé | Libellé | Aide affichée | Sens pour le classement |
|---|---|---|---|
| `nb_temps` | Nombre, puis temps | « la quantité classe ; à égalité, le temps intermédiaire de la dernière répétition départage » | `valeur` **décroissante**, puis `temps` **croissant** |
| `poids` | Charge maximale (kg) | « la charge la plus lourde validée l'emporte » | `valeur` décroissante |
| `duree` | Temps de maintien | « le temps le plus long l'emporte » | `valeur` décroissante |
| `distance` | Distance parcourue (m) | « la distance classe ; à distance égale, le temps le plus rapide » | `valeur` décroissante, puis `temps` croissant |
| `chrono` | Temps sur distance | « le temps le plus court l'emporte » | `valeur` **croissante** |

**Règle unique dans le code** (l. 1109, 1140) : `const min = ep.mesure === "chrono"`.
Seule la mesure `chrono` inverse le sens du tri sur `valeur`. Pour les quatre autres,
la plus grande valeur gagne.

Le **temps est toujours un départage croissant**, quelle que soit la mesure, et un
`temps` absent vaut `Infinity` (donc classe dernier à valeur égale) — l. 1112, 1145.

Libellés du champ de saisie selon la mesure :
- champ « valeur » (l. 1519 / 1579-1582) : `nb_temps` → « Nombre validé », `poids` → « Charge (kg) », `duree` → « Maintien (s) » / « Durée tenue (s) », `distance` → « Distance (m) », `chrono` → « Temps (s) » ;
- champ « temps » (l. 1583-1584) : « Temps mis (s) » pour `distance`/`medley`/`chrono`, « Temps du dernier tour (s) » sinon ;
- saisie double (`mixte`, l. 1597, 1799) uniquement pour `nb_temps`, `distance` (et `medley`) ;
- unité d'affichage du résultat (l. 1570) : `nb_temps` → aucune, `poids` → « kg », `duree`/`chrono` → « s », `distance`/`medley` → « m ».

---

## 3. Points et classements

### 3.1 `meilleurResultat(epId, athleteId)` — l. 1104-1115

1. Retient les passages tels que `epreuveId === epId`, `athleteId` correspondant,
   `statut === "termine"`, `resultat` présent **et** `resultat.statut === "ok"`.
   Les verdicts `zero` et `forfait` sont donc **exclus** : ils ne produisent aucun résultat.
2. Si la liste est vide ou l'épreuve introuvable → `null`.
3. Tri : `valeur` croissante si `mesure === "chrono"`, décroissante sinon ; à valeur
   égale, `temps` croissant (`null` ⇒ `Infinity`).
4. Retourne le **premier** (le meilleur).

C'est le mécanisme qui gère les essais multiples : plusieurs passages « termine » pour
le même couple (épreuve, athlète) sont autorisés, seul le meilleur compte.

### 3.2 `tableauEpreuve(epId, gid)` — l. 1131-1159

**Population** : `athletesDuGroupe(gid)` filtré par `!horsClassement(a)` (§ 7).
`N = ath.length` — **le nombre d'athlètes classables du groupe**, y compris ceux qui
n'ont aucun résultat.

**Partition** : `avec` (un `meilleurResultat` existe) / `sans` (aucun).

**Tri de `avec`** (l. 1143-1148), trois critères en cascade :
1. `valeur` — croissante si `chrono`, décroissante sinon ;
2. `temps` — croissant (`null` ⇒ `Infinity`) ;
3. **poids de corps croissant** — `pdc(a)` (l. 1141) : `parseFloat` du poids,
   `Infinity` si illisible. Le plus léger l'emporte.

**Attribution des rangs** (l. 1150-1156) : rangs standard avec sauts.
La clé d'égalité est `valeur + "|" + temps + "|" + poidsDeCorps` (l. 1153). Tant que
cette clé est identique à la précédente, le rang est conservé ; sinon le rang devient la
position courante `pas`. Deux athlètes ne sont donc **vraiment ex aequo que si leur
valeur, leur temps et leur poids de corps sont identiques** — auquel cas ils reçoivent
le même rang et le même nombre de points, et le rang suivant saute (1, 1, 3).

**Points** : `points = Math.max(0, N - rang + 1)` (l. 1155). Le 1er marque `N` points,
le 2e `N-1`, etc.

**Athlètes sans résultat** (l. 1157) : `{ rang: null, points: 0, r: null }`. Ils ne sont
pas classés mais comptent dans `N`.

### 3.3 `tableauGeneral(gid)` — l. 1160-1181

1. Population identique : athlètes du groupe, non hors classement.
2. Pour chaque épreuve de `d.epreuves`, on construit une `Map athleteId → ligne` à
   partir de `tableauEpreuve(e.id, gid)` (l. 1163).
3. Pour chaque athlète : `total` = somme des points sur toutes les épreuves ; `rangs` =
   liste des rangs obtenus (les `rang: null` sont ignorés).
4. Clé de tri (l. 1168) : `[ -total, -nbDePremièresPlaces, -nbDeDeuxièmesPlaces, -nbDeTroisièmesPlaces ]`,
   comparée composante par composante en ordre croissant (l. 1170-1173). Soit, en clair :
   - total de points **décroissant** ;
   - puis nombre de **1res places** décroissant ;
   - puis nombre de **2es places** décroissant ;
   - puis nombre de **3es places** décroissant ;
   - au-delà, l'ordre est celui de la liste d'entrée (tri stable), donc l'ordre des
     dossards croissants hérité de `athletesDuGroupe` (§ 7.3).
5. Rangs avec sauts sur la clé complète (l. 1174-1180) : deux athlètes de même total
   **et** de même profil de podiums (1res/2es/3es) sont ex aequo au général.
6. Retourne `[{ athleteId, rang, total }]`.

### 3.4 Séparation des classements

Commentaire l. 1632 : « Classements toujours séparés par catégorie, jamais fusionnés ».
`clParCat` (l. 1640-1643) et `epParCat` (l. 1644-1653) produisent un tableau par
catégorie **active** (`actif !== false`) ; `clParCat` est tronqué aux 10 premiers.

Le podium (l. 1749-1760) prend les 3 premiers de `tableauGeneral(groupeCourant)` et les
apparie positionnellement aux `recompenses` (index 0/1/2), avec repli sur
« Médaille d'or / d'argent / de bronze » et couleurs `#D9A441 / #9AA0A6 / #B4692F`.

---

## 4. Ordre de passage et construction des files

### 4.1 `ordreDePassage(epId, gid)` — l. 1117-1130

Commentaire l. 1116 : « 1re épreuve = dossards croissants ; ensuite, du moins de points
au plus de points ».

1. `idx = d.epreuves.findIndex(e => e.id === epId)` — position de l'épreuve dans la liste.
2. Population : si `gid === "tous"`, **tous** les athlètes ; sinon ceux dont
   `groupeId === gid`. Aucun filtre « hors classement » ici : les invités et les
   non-classés passent quand même.
3. `doss(a)` = `parseInt(dossard)`, **9999** si illisible (l. 1121) — les sans-dossard
   partent en fin de file.
4. **Si `idx <= 0`** (première épreuve, ou épreuve introuvable avec `idx === -1`) :
   tri par dossard croissant.
5. **Sinon** : cumul des points obtenus sur les épreuves d'indice `0..idx-1`, en
   parcourant **toutes** les catégories `d.groupes` (l. 1124-1128). Tri par points
   cumulés **croissants** (le moins bien classé passe en premier), puis dossard croissant
   en départage.

### 4.2 `construireFile()` — l. 842-855

Action explicite de l'opérateur sur le plateau.

1. Épreuve et groupe courants ; si l'un manque, ne fait rien.
2. `ordreDePassage(ep.id, g.id)` ; si la liste est vide → alerte
   « Aucun athlète dans ce groupe. Validez les pesées d'abord. » et abandon.
3. **Supprime tous les passages existants** pour ce couple (épreuve, groupe) — donc
   y compris les résultats déjà saisis sous cette vue.
4. Crée un passage par athlète : `ordre = i+1`, `statut: "avenir"`,
   `votes: [null,null,null]`, `resultat: null`, `ts: null`.
5. Réarme le chronomètre sur `parseDuree(ep.temps)`.

### 4.3 `assurerFile()` — l. 856-873

Construction **idempotente et non destructive**, appelée automatiquement à l'entrée du
plateau (l. 1784) et à chaque changement d'épreuve ou de groupe (l. 1806-1807), via
`setTimeout(..., 0)`.

1. Purge d'abord tous les passages dont l'athlète n'existe plus (l. 861-863).
2. **Si au moins un passage existe déjà** pour (épreuve courante, groupe courant) avec un
   athlète vivant → ne fait rien.
3. Sinon, crée la file par `ordreDePassage` (sans champ `votes`).

### 4.4 `preparerToutes()` — l. 874-894

Prépare en une écriture toutes les combinaisons manquantes :
- cibles = **catégories actives** (`actif !== false`) **plus** le pseudo-groupe `"tous"` (l. 876) ;
- pour chaque épreuve × chaque cible, si aucun passage n'existe déjà → création de la file ;
- message final : « Toutes les épreuves avaient déjà leur ordre de passage. » ou
  « N passages préparés… ».

**Effet de bord important** : chaque athlète reçoit ainsi *deux* jeux de passages par
épreuve — un sous sa catégorie, un sous `"tous"`.

### 4.5 `file(statut)` — l. 811-841

Sélecteur des passages affichés au plateau pour l'épreuve et le groupe courants.

- `vivants` : athlètes encore présents dans `d.athletes`.
- `faits` : athlètes ayant **un passage terminé avec résultat** sur cette épreuve,
  **toutes vues confondues** (l. 818-821). Commentaire l. 817 : « Un athlète déjà passé
  sur cette épreuve — sous n'importe quelle vue — ne repasse pas ».
- **`statut === "termine"`** (l. 823-836) : tous les passages terminés de l'épreuve,
  **sans filtre sur `p.groupeId`** ; si le groupe courant n'est pas `"tous"`, on filtre
  sur la **catégorie actuelle de l'athlète** (`a.groupeId === g.id`) ; dédoublonnage par
  athlète (premier rencontré conservé) ; tri par `ordre` croissant.
- **Autres statuts** : filtre strict `epreuveId` + `groupeId` + `statut`, athlète vivant,
  et **exclusion des athlètes déjà « faits »** ; tri par `ordre` croissant.

### 4.6 Ordre de passage par catégorie à l'écran

`ordreCats` (l. 1684-1703) : regroupe la file « avenir » par catégorie réelle de
l'athlète (`infoCat`, l. 1534-1538, couleur = `COUL_CAT[index de la catégorie]`,
« Sans catégorie » / index 6 sinon). Pour chaque catégorie : premier de la liste marqué
`prochainCat`, compteur d'athlètes restants, liste tronquée à 8.

`melange` (l. 1704) est vrai quand le groupe courant est `"tous"` **et** que plus d'une
catégorie est représentée — c'est ce qui bascule l'écran « ordre » en mode multi-colonnes.

---

## 5. Dossards

### 5.1 `prochainDossard()` — l. 333-336

`max(dossards entiers existants) + 1`, ou `1` si aucun. **Cette fonction n'est appelée
nulle part** (voir Points douteux).

### 5.2 `pariteGroupe(g, groupes)` — l. 338-346

Commentaire l. 337 : « Dossards : impairs pour la catégorie la plus lourde, pairs pour
la plus légère ».

1. `g` absent → `null`.
2. Si `g.parite` vaut explicitement `"impair"` ou `"pair"` → cette valeur (réglage manuel).
3. Sinon, calcul automatique **uniquement s'il y a exactement deux catégories actives**
   (`actif !== false`) ; sinon → `null` (« Dossards à la suite »).
4. La plus lourde est celle dont `min` est le plus grand (`""`/`null` ⇒ `-Infinity`) ;
   en cas d'égalité, `act[0]` est retenue. Elle reçoit `"impair"`, l'autre `"pair"`.

Affichage (l. 1271-1272) : « Dossards impairs (1, 3, 5…) », « Dossards pairs (2, 4, 6…) »,
« Dossards à la suite ».

### 5.3 `numeroLibre(athletes, parite, exclureId)` — l. 348-362

Commentaire l. 347 : « Numéro libre tiré au hasard dans la bonne parité, jamais à la
suite du précédent ».

1. Recense les numéros pris, en excluant `exclureId`.
2. `pas = parite ? 2 : 1` ; `base = (parite === "pair") ? 2 : 1` — donc `"impair"` **et**
   `null` donnent tous deux `base = 1`, mais `null` donne `pas = 1`.
3. Étendue explorée : `max(30, nbAthlètes × 3)` incréments.
4. Collecte les numéros libres, puis tire **au hasard parmi les 25 premiers libres**
   (l. 361). Si aucun libre, retourne `base`.

**Cette fonction n'est appelée nulle part** (voir Points douteux) : les dossards sont
saisis à la main (`setDossard`, l. 1345 et 1434).

### 5.4 `viderDossards()` — l. 396-399

Efface le `dossard` de **tous** les athlètes et **vide entièrement `d.passages`**.
Message : « Dossards effacés. Saisissez les numéros à la main dans la colonne Dossard :
l'ordre de passage de la première épreuve suivra ces numéros, du plus petit au plus grand. »

---

## 6. Pesée et catégories

### 6.1 `groupePour(poids)` — l. 309-318

1. `parseFloat` du poids avec virgule convertie ; `NaN` → `null`.
2. Cherche, **parmi les catégories actives uniquement**, la **première** telle que
   `v > min - 0.0001 && v <= max` (min vide ⇒ `-Infinity`, max vide ⇒ `+Infinity`).
   La borne basse est donc **inclusive à 0,0001 près** et la borne haute inclusive.
3. Retourne la catégorie ou `null`.

### 6.2 `poidsHorsLimite(poids, g)` — l. 363-371

Retourne `""` si tout va bien (ou si `g` est absent, ou si le poids est illisible), sinon
un message explicite :
- `v < min` → « Poids refusé : X kg est en dessous de la limite basse de « G » (min kg). Choisissez la catégorie qui correspond à ce poids. »
- `v > max` → « Poids refusé : X kg dépasse la limite haute de « G » (max kg). … »

Noter que le test est `v < min` **strict** : un poids exactement égal à `min` est accepté.

### 6.3 `appliquerCategorie(draft, id, v)` / `affecterCategorie(id, v)` — l. 372-395

`appliquerCategorie` travaille sur un brouillon déjà cloné (commentaire l. 372 : « une
seule écriture pour tout un lot ») :

| `v` | Effet |
|---|---|
| `"hors"` | `hors = true`, `groupeId = null` |
| `""` / falsy | `hors = false`, `groupeId = null` |
| un id de catégorie | contrôle `poidsHorsLimite` ; si erreur, **rien n'est modifié** et le message est retourné ; sinon `hors = false`, `groupeId = v` |

`affecterCategorie` fait le même contrôle *avant* d'ouvrir une écriture, puis appelle
`appliquerCategorie` dans un `maj`. Elle retourne la chaîne d'erreur (vide si succès),
que l'appelant stocke dans `erreurCat` (fiche athlète, l. 1356-1359) ou `erreurPesee`
(table de pesée, l. 1436-1439).

**Affectation en lot** (`affecterSelection`, l. 1957-1977) : chaque athlète sélectionné
est testé ; les refusés sont listés nommément dans le message, les retenus sont écrits en
une seule transaction.

**Répartition automatique** (`repartirParPoids`, l. 1978-1995) : applique `groupePour` au
poids pesé de chaque athlète ciblé (la sélection, ou à défaut tous les sans-catégorie) ;
compte les « sans poids exploitable » restants.

### 6.4 Validation de la pesée et champ `verrou` — l. 1440-1464

Le bouton bascule :

- **Si `verrou` est vrai** → simple déverrouillage (`verrou = false`), sans autre contrôle.
- **Sinon**, dans l'ordre :
  1. le poids doit être un nombre → sinon « Poids manquant : relevez le poids à la bascule avant de valider. » ;
  2. catégorie retenue = catégorie déjà affectée **si elle est active**, sinon
     `groupePour(poids)` (l. 1447-1448) ;
  3. si aucune catégorie n'est trouvée **et** que l'athlète n'est pas `hors` → refus :
     « Catégorie non sélectionnée : aucune catégorie retenue ne correspond à X kg… » ;
  4. si une catégorie est trouvée, contrôle `poidsHorsLimite` → refus le cas échéant ;
  5. écriture : si une catégorie a été trouvée, `groupeId = gg.id` et `hors = false` ;
     dans tous les cas `verrou = true`.

Un athlète `hors` peut donc être « pesée validée » sans catégorie.

Libellés (l. 1355) : verrou → « Pesée validée — dossard et catégorie verrouillés » ;
poids saisi sans verrou → « Poids saisi, pesée non validée » ; sinon « À relever à
l'étape Pesée ». Résumé (l. 2002) : « La validation attribue le groupe et le dossard,
puis verrouille la ligne. »

**Le verrou n'empêche techniquement aucune modification** dans le code lu (voir Points
douteux) ; il change la teinte du champ (`champFond`, l. 1425) et le libellé du bouton.
`bilan().peses` (l. 1190) compte les athlètes `verrou`.

---

## 7. Hors classement

### 7.1 `estInvite(a)` — l. 803

```js
return !!a.invite || (a.pays || "CIV") !== "CIV";
```

Est invité tout athlète marqué `invite`, **ou dont la nationalité n'est pas ivoirienne**.
La nationalité de référence `"CIV"` est codée en dur.

### 7.2 `horsClassement(a)` — l. 805

```js
return this.estInvite(a) || !!a.hors || !this.groupeDe(a);
```

Trois causes cumulables :
1. invité (§ 7.1) ;
2. drapeau `hors` posé manuellement ;
3. **absence de catégorie** — `groupeDe(a)` (l. 804) cherche `groupeId` dans `d.groupes` ;
   un athlète non affecté, ou affecté à une catégorie supprimée, sort du classement.

Les hors classement sont exclus de `tableauEpreuve` et `tableauGeneral` (l. 1133, 1162),
donc aussi de `N` et des points. Ils **restent** dans l'ordre de passage (§ 4.1) et au
plateau, avec la mention « Invité — hors classement » (l. 1552, 1560, 1361).
`horsClassement` alimente aussi la colonne « Classement » de l'export Excel (l. 437).

### 7.3 `athletesDuGroupe(gid)` — l. 806-810

- `gid === "tous"` ou falsy → **tous** les athlètes ;
- sinon ceux dont `groupeId === gid` ;
- tri par dossard croissant, **999** pour un dossard illisible (l. 809).

C'est l'ordre d'entrée qui départage les ex aequo résiduels du classement général (§ 3.3).

---

## 8. Cycle de vie d'un passage

### 8.1 Les trois statuts (quatre dans le portage)

| Statut | Sens |
|---|---|
| `avenir` | En file d'attente |
| `plateau` | Appelé, en cours de prestation |
| `a_saisir` | **Portage seulement** — passé, plateau libéré, valeur attendue du jury. Ne compte nulle part tant qu'il n'est pas validé. Voir [ADR 0004](decisions/0004-un-passage-peut-attendre-son-resultat.md) |
| `termine` | Verdict rendu (`resultat` renseigné) |

Le passage de `avenir` → `plateau` renseigne `ts` (horodatage de l'appel), le passage
`plateau` → `termine` l'écrase (horodatage du verdict).

### 8.2 `appeler(pid)` — l. 925-937

1. Détermine la catégorie réelle de l'athlète visé via `groupeDuPassage(p)` (l. 895-898 :
   la catégorie de l'athlète, ou `"sans"`).
2. Cherche un passage **déjà au plateau dans la même catégorie** ; s'il existe, il est
   renvoyé en `avenir`. **Un seul athlète au plateau par catégorie.**
3. Passe le passage visé en `plateau` avec `ts = maintenant`.
4. Réarme le chronomètre sur `parseDuree(ep.temps)` et vide la saisie globale.

### 8.3 `appelerDuo()` — l. 899-919

Appel simultané d'un athlète par catégorie (mode « toutes catégories mélangées »).

1. Vivier = file `avenir` + file `plateau`, retriées par `ordre` (commentaire l. 900 :
   « tous remis dans l'ordre des dossards »).
2. Parcours dans l'ordre ; on retient **le premier passage rencontré pour chaque
   catégorie distincte** (`groupeDuPassage`).
3. Si rien à retenir → abandon.
4. Écriture : **tout le vivier repasse en `avenir`**, puis les élus passent en `plateau`
   avec un `ts` commun.
5. Réarme le chronomètre.

Le libellé du bouton (l. 1869) annonce `Math.max(2, ordreCats.length)` athlètes.

### 8.4 `renvoyer(pid)` — l. 938

Remet un passage en `avenir`, sans toucher au résultat ni à `ts`. Disponible depuis la
carte plateau (l. 1604) **et** depuis la liste des terminés (l. 1615) — dans ce dernier
cas le `resultat` est conservé, ce qui laisse le passage « à venir » mais toujours
comptabilisé comme « fait » par `file()` (§ 4.5) et par `meilleurResultat`… non :
`meilleurResultat` exige `statut === "termine"`, donc le résultat cesse de compter, mais
`faits` (l. 820) exige lui aussi `statut === "termine"` — l'athlète redevient donc
appelable. Cohérent.

### 8.5 `officialiser(pid, statut)` — l. 948-981

`statut` ∈ `"ok"` | `"zero"` | `"forfait"`.

1. Lit la saisie propre au passage (`saisieDe(pid)`, l. 939).
2. **Si `ok`** : `valeur = parseFloat(saisie.valeur)` (virgule acceptée). Si absente ou
   `NaN` → erreur bloquante « Saisissez la performance mesurée avant de valider. » et
   abandon.
3. `temps = parseFloat(saisie.temps)` si renseigné, sinon `null`.
4. Calcule `suivant = suivantPour(p0)` **avant** l'écriture.
5. Écriture :
   - `statut = "termine"`, `ts = maintenant` ;
   - si `ok` : `resultat = { statut:"ok", valeur, temps (null si NaN), tours }` où `tours`
     = les tours propres à ce passage (`state.toursPar[pid]`) s'il y en a, **sinon les
     laps du chronomètre global** (`state.ch.laps`) — l. 963-966 ;
   - sinon : `resultat = { statut, valeur:null, temps:null, tours:[] }` ;
   - **enchaînement automatique** : si un suivant existe, il passe immédiatement en
     `plateau` avec son propre `ts` (l. 969-972).
6. Réarme le chronomètre sur le temps de l'épreuve ; purge `saisies[pid]`,
   `erreurSaisie[pid]`, `toursPar[pid]` et le message chrono.

### 8.6 `suivantPour(p)` — l. 920-924

Premier passage de la file `avenir` **de la même catégorie réelle** que `p`, ou `null`.
C'est ce qui rend l'enchaînement automatique catégorie par catégorie.

### 8.7 `retourPassage()` — l. 982-996

« Annuler le dernier verdict ».

1. Trie les passages terminés (vue courante) par `ts` croissant et prend **le dernier**.
   Si aucun → alerte « Aucun passage validé à reprendre. »
2. Si un athlète de la **même catégorie** est actuellement au plateau, il est renvoyé en
   `avenir`.
3. Le passage repris passe en `plateau` et **son `resultat` est remis à `null`**.
   Son `ts` n'est pas modifié.
4. Réarme le chronomètre.

Disponibilité à l'écran (l. 1859-1860) : `annulationOuverte` = il y a des terminés **et**
il reste quelque chose en file ou au plateau ; `annulationVerrouillee` = il y a des
terminés mais plus rien en file ni au plateau.

### 8.8 Suspension

`suspendre()` (l. 1007-1011) : `prompt` du motif (« blessure, panne matériel, météo,
réclamation, disqualification… ») ; annulation du prompt (`null`) → aucun effet ; motif
vide → « Suspension ». `reprendre()` (l. 1012) remet `suspendu = false`, `motif = ""`.
Aucun autre comportement du code n'est conditionné par `comp.suspendu` : c'est un
indicateur d'affichage.

---

## 9. Chronomètre

Section « Chronomètre, deux appuis » (commentaire l. 1014).

### 9.1 État

`state.ch = { phase, duree, reste, laps, t0 }` (l. 192, 1017, 1073).

| Champ | Sens |
|---|---|
| `phase` | `"pret"` \| `"encours"` \| `"arrete"` |
| `duree` | Durée programmée en secondes ; **0 = chronomètre montant** |
| `reste` | Secondes restantes (décompte) ou écoulées (montant) |
| `laps` | Temps de tour globaux |
| `t0` | `Date.now()` du démarrage, propagé aux écrans |

`prepareChrono(sec)` (l. 1015-1019) : coupe le tick, remet `{ phase:"pret", duree:sec,
reste:sec, laps:[] }` et le pousse aux écrans. Appelé à chaque appel d'athlète, chaque
officialisation, chaque construction de file, chaque retour de passage, avec
`parseDuree(ep.temps)` — donc **0 pour « Illimité »** (ep4, Piliers d'Hercule), qui
devient un chronomètre montant.

### 9.2 Machine à états — `chronoAction()` (l. 1075-1101)

1. **Garde** : si `phase === "pret"` et qu'aucun athlète n'est au plateau → message
   « Appelez d'abord un athlète au plateau : le chronomètre ne peut pas démarrer sur un
   plateau vide. » et abandon.
2. `encours` → **arrêt** : coupe le tick, `phase = "arrete"`, `t0 = null` poussé.
3. `arrete` → **réarmement** : `prepareChrono(ch.duree)` (retour à `pret`, laps vidés).
4. `pret` → **départ** : `t0 = Date.now()`, `phase = "encours"`, tick de 100 ms qui
   recalcule `reste = max(0, duree - écoulé)` (décompte) ou `reste = écoulé` (montant).
   En décompte, à `reste <= 0` le tick s'arrête et la phase passe à `arrete`, `reste = 0`.

Libellés (l. 1818-1819) : `pret` → « Démarrer à l'annonce » (ou « Appelez un athlète
d'abord » si le plateau est vide), `encours` → « Arrêter au commencement », `arrete` →
« Réarmer ». Couleur du bouton (l. 1820) : rouge en cours, gris si plateau vide, vert sinon.

Un **arrêt suivi d'un réarmement** demande donc deux appuis successifs sur le même
bouton : c'est le sens de « deux appuis ».

### 9.3 Tours / laps

Deux mécanismes coexistent.

**`tourPour(pid)` — tour propre à un athlète** (l. 1021-1036, commentaire l. 1020 :
« chaque carte du plateau compte ses répétitions ») :
- ignoré si `phase !== "encours"` ;
- temps écoulé calculé depuis `t0` si disponible, sinon depuis `reste` ;
  `t = duree - max(0, duree - (now - t0)/1000)` en décompte, `t = (now - t0)/1000` en
  montant ; arrondi au dixième (`Math.round(t*10)/10`) ;
- empile la valeur dans `state.toursPar[pid]` ;
- **remplit automatiquement la saisie** du passage : `valeur = nombre de tours`,
  `temps = temps du dernier tour` (virgule décimale).

**`annulerTour(pid)`** (l. 1037-1046) : retire le dernier tour et recalcule la saisie
(`valeur` = nouveau nombre, `temps` = nouveau dernier tour ; les deux vides s'il ne reste
aucun tour). Non conditionné par la phase du chronomètre.

**`tour()` — tour global** (l. 1047-1061) :
- ignoré si `phase !== "encours"` ;
- `ecoule = duree > 0 ? duree - reste : reste` (basé sur l'état, pas sur `t0`) ;
- empile dans `ch.laps` ;
- **si et seulement si un seul athlète est au plateau**, écrase sa saisie avec
  `{ valeur: nombre de laps, temps: dernier lap }` ;
- pousse l'état aux écrans.

Le bouton de tour n'est proposé que si `ep.tours` est vrai (`toursActifs`, l. 1590, 1800).

### 9.4 Diffusion vers les écrans

`pousserChrono(o)` (l. 1062-1064) écrit `{phase, duree, reste, t0, laps}` dans
`localStorage[CLE + ":ch"]`. `lireChrono()` (l. 1065-1074) relit toutes les 400 ms côté
écran solo (l. 228). L'écran recalcule lui-même le temps affiché à partir de `t0`
(l. 1521-1525) pour rester fluide.

### 9.5 Alertes visuelles

Commentaire l. 1526 : « flash à chaque demi-minute, rouge clignotant sur les 30 dernières
secondes ».

- `passeChrono` = temps écoulé (l. 1527) ;
- `finalChrono` (l. 1528) : en cours, décompte, `reste <= 30` → rouge `#C4361F` / `#FF4A2E` ;
- `flashChrono` (l. 1529-1530) : en cours, hors phase finale, `passeChrono >= 29` et
  `floor(passeChrono) % 30 < 2` → orange `#EC6D23`, soit ~2 s de flash toutes les 30 s ;
- animation `clignote .6s steps(1,end) infinite` dans les deux cas (l. 1532).

Formatage (`mmss`, l. 98-104) : `MM:SS,d` — minutes et secondes sur 2 chiffres, dixième
après la virgule, valeurs négatives ramenées à 0.

---

## 10. Rôles, droits et accès

### 10.1 `ROLES` (l. 19-28) et `ROLES_LBL` (l. 88-90)

Huit rôles, utilisés comme libellé de la fiche officiel : `directeur` (Directeur de
compétition), `technique` (Responsable technique), `arbitrage` (Responsable arbitrage),
`juge` (Juge principal), `chrono` (Chronométreur), `secretaire` (Secrétaire de table),
`regie` (Régie), `speaker` (Speaker).

### 10.2 `DROITS` (l. 91-92)

```js
{ directeur:"tout", technique:"tout", arbitrage:"tout", secretaire:"tout",
  juge:"plateau", chrono:"plateau", speaker:"plateau", regie:"regie" }
```

Table de correspondance rôle → droit. **Elle n'est référencée nulle part ailleurs dans le
fichier** (voir Points douteux) : la connexion effective passe par `ACCES`.

### 10.3 `ACCES` (l. 1491-1496) — les deux comptes réellement utilisés

| id | Nom | Rôle affiché | Portée | Droit | Code |
|---|---|---|---|---|---|
| `admin` | Administrateur du logiciel | Direction et table | Préparation, plateau, saisie des performances, impressions | `tout` | `acces.admin` |
| `regie` | Régie de diffusion | Écrans géants | Choix des contenus et ouverture des écrans LED | `regie` | `acces.regie` |

Seuls les comptes **dont le code est non vide** sont proposés (`comptes`, l. 1497).
`besoinLogin` (l. 1508) : la connexion est exigée dès qu'au moins un code est défini, sauf
en vue écran solo. **Si aucun code n'est renseigné, l'application est ouverte sans
authentification.**

### 10.4 `connexion(o)` (l. 757-768)

- code vide saisi → « Saisissez le code d'accès. » ;
- code différent (comparaison de chaînes trimées, sensible à la casse) →
  « Code refusé pour <nom>. Réessayez. » et la saisie est vidée ;
- succès → `session = { nom, role: o.id, droit }` et redirection :
  `regie` → vue régie, `plateau` → vue plateau, `tout` → accueil.

`ignorerCodes()` (l. 769-770) ouvre une session « Poste responsable » en droit `tout`
**sans aucun contrôle** — porte de secours volontaire.
`deconnecter()` (l. 771) efface la session et revient à l'accueil.

### 10.5 Ce que chaque droit autorise

Dérivé de `droit` (l. 1509) et des trois drapeaux (l. 1920-1922) :

| Droit | `peutPreparer` | `peutPlateau` | `peutRegie` | Bascule officiel/essai (l. 271) |
|---|---|---|---|---|
| `tout` | oui | oui | oui | oui |
| `plateau` | non | oui | non | non |
| `regie` | non | non | oui | non |

Hors session, `droit` vaut `"tout"` par défaut (l. 1509).

---

## 11. Écrans publics — `CONTENUS` (l. 1656-1664)

Un écran est ouvert par `?ecran=<cle>&theme=<nuit|jour>&espace=<officielle|essai>`.
Le thème provient de `regie.theme` ; en aperçu interne, `nuit = (theme === "nuit")`,
en fenêtre dédiée `nuit = (param theme !== "jour")` (l. 1679).
Palette (l. 1882-1886) : nuit `#0A0D0B` / `#FCFAF6`, jour `#FCFAF6` / `#141210`.

| Clé | Libellé | Contenu préparé par la logique |
|---|---|---|
| `attente` | Écran d'attente | Compte à rebours vers `dateCible(champ)` : `Jj HHh MMmin` si ≥ 1 jour, sinon `HH:MM:SS` ; « En cours » si la date est passée ; l'heure brute si la date est illisible (l. 1706-1726). Prochain athlète appelé (photo, dossard, nom, club, catégorie — l. 1850-1856). **Liste complète des engagés paginée par 10, page suivante toutes les 8 secondes** (`_pg`, l. 225 ; l. 1730-1746), triée par dossard ; titre « Athlètes engagés · a–b sur n ». Bandeau partenaires (l. 1900) |
| `plateau` | Athlète au plateau + chronomètre | Cartes `plateaux` (1 ou 2 athlètes : photo, dossard, nom, club + mention invité, nationalité/drapeau, catégorie et sa couleur, poids, niveau déclaré si épreuve à niveaux, note). Chronomètre géant avec couleurs/clignotement (§ 9.5). `soloPlateauVide` si personne n'est appelé (l. 1848) |
| `ordre` | Ordre de passage à venir | Si `melange` faux (l. 1878) : liste simple `avenir`. Si vrai (groupe « tous » + plusieurs catégories) : une colonne par catégorie (`ordreCats`), 8 lignes max, première ligne mise en évidence |
| `verdict` | Dernier verdict validé | `dernier` = passage terminé avec résultat, **toutes épreuves et catégories confondues**, au `ts` le plus récent (l. 1680-1681). Affiche le nom et la valeur, ou « ZÉRO » / « FORFAIT » ; vert `#0B9237` si `ok`, rouge `#C4361F` sinon (l. 1901-1905) |
| `classement` | Classement général par catégorie | `clParCat` : une colonne par catégorie active, **10 premiers** de `tableauGeneral`, avec photo/initiales, rang, nom, total (l. 1640-1643) |
| `podium` | Podium et palmarès | 3 premiers du **groupe courant** avec métal, prime et couleur (l. 1749-1760) |
| `mire` | Mire de lisibilité | Ouverte à part (l. 1673, 1844), sans paramètre d'espace dans le bouton par écran |

---

## 12. Règles implicites et subtilités à préserver

1. **Nombre de points dépendant de l'effectif.** `points = N - rang + 1` où `N` est le
   nombre d'athlètes **classables** de la catégorie, résultat ou non. Retirer un athlète
   d'une catégorie change rétroactivement les points de tous les autres sur **toutes** les
   épreuves.

2. **Le poids de corps est un critère de départage officiel** sur une épreuve (l. 1147) :
   à performance et temps identiques, **le plus léger passe devant**. Ce critère fait
   partie de la clé d'ex aequo — deux athlètes de poids différents ne sont jamais ex aequo.

3. **Le classement général ne départage pas au poids de corps** mais au profil de
   podiums (nombre de 1res, puis 2es, puis 3es places), l. 1168. Au-delà, l'ordre des
   dossards (stabilité du tri).

4. **`zero` et `forfait` ne sont pas des résultats.** Ils marquent le passage comme
   terminé, mais `meilleurResultat` les ignore : l'athlète est traité comme « sans
   résultat », rang `null`, 0 point.

5. **Les essais multiples sont implicites.** Le champ `essais` n'est jamais contrôlé ;
   plusieurs passages terminés pour le même couple (épreuve, athlète) sont possibles et
   c'est le meilleur qui compte. Mais `file()` (l. 818-821) empêche l'appel d'un athlète
   déjà « fait » sur l'épreuve — il faut donc `renvoyer` ou `retourPassage` pour un
   second essai.

6. **Un seul athlète au plateau par catégorie** (`appeler`, l. 928-930 ; `appelerDuo`,
   l. 904-906 ; `suivantPour`, l. 920-924). D'où le mode duo : en vue « toutes
   catégories », deux athlètes de catégories différentes concourent simultanément sur le
   même chronomètre.

7. **La catégorie qui gouverne le plateau est celle de l'athlète, pas celle du passage.**
   `groupeDuPassage(p)` (l. 895-898) lit `athlete.groupeId` (ou `"sans"`), jamais
   `p.groupeId`. Réaffecter un athlète change donc la mécanique d'appel de ses passages
   déjà créés.

8. **Double jeu de passages.** `preparerToutes` crée les files par catégorie **et** sous
   `"tous"` (l. 876). Un même athlète a donc deux passages par épreuve. Le garde-fou
   `faits` (l. 818-821) empêche qu'il passe deux fois, et `file("termine")` dédoublonne
   par athlète (l. 831-833).

9. **L'ordre de passage s'inverse avec le classement.** À partir de la deuxième épreuve,
   celui qui a le moins de points passe en premier (l. 1129) — le leader passe en dernier.

10. **Un athlète sans dossard passe en dernier** (9999 dans `ordreDePassage`, 999 dans
    `athletesDuGroupe`).

11. **La nationalité vaut exclusion du classement.** Tout non-CIV est automatiquement
    « invité, hors classement » (l. 803). Règle codée en dur, propre à une compétition
    nationale ivoirienne.

12. **Un athlète sans catégorie est hors classement** mais reste dans les ordres de
    passage et peut concourir (l. 805, 1120).

13. **La suppression d'une catégorie déverrouille les pesées** des athlètes concernés
    (`verrou = false`, l. 1285) et supprime leurs passages (l. 1286).

14. **`construireFile` est destructif**, `assurerFile` ne l'est pas. Le premier écrase
    les passages existants du couple (épreuve, groupe), résultats compris.

15. **Le chronomètre est réarmé à chaque appel et à chaque verdict** — on ne peut pas
    reprendre un décompte interrompu autrement qu'en repartant de zéro.

16. **Les tours remplissent la saisie automatiquement** (l. 1030-1033) : sur une épreuve
    `nb_temps`, le juge n'a en principe rien à taper, le compteur de répétitions et le
    temps du dernier tour sont déduits des appuis.

17. **Les laps globaux servent de repli** pour `resultat.tours` quand aucun tour propre
    au passage n'a été compté (l. 963-966).

18. **Le verdict affiché sur l'écran public est global**, toutes épreuves et catégories
    confondues (l. 1680) — pas limité à l'épreuve courante.

19. **L'export Excel est aussi un format d'import.** `importerExcel` (l. 479-551) accepte
    indifféremment un JSON de sauvegarde (détecté par `/^\s*[{[]/`) ou le XML Excel 2003
    produit par `exporterExcel`. À l'import Excel : **la liste d'athlètes est remplacée
    intégralement**, les passages sont vidés puis reconstruits depuis la feuille
    « Resultats », l'appariement athlète se fait **par dossard** (l. 530), la catégorie par
    nom désaccentué (l. 509, 516), « Toutes catégories » redevient `"tous"` (l. 529). Les
    photos sont perdues (message l. 547).

20. **Détection des doublons à l'import de liste** (l. 629-634) : clé
    `sansAcc(nom + " " + prenoms)`. En mode `fusionner` (l. 682-693), **seuls les champs
    vides de la fiche existante sont complétés** — rien n'est écrasé. `aVerifier` est en
    revanche positionné si la ligne importée est douteuse.

21. **L'import de liste est annulable** (`annulerImport`, l. 709-715) : un instantané
    `avant` de la liste d'athlètes est pris avant écriture et peut être restauré après
    confirmation.

22. **`hors` vs `invite` sont deux notions distinctes.** `invite` = statut de l'athlète
    (bouton « Classer cet athlète » / « Invité — hors classement », l. 1360-1365) ;
    `hors` = choix de catégorie « Indépendant » dans le sélecteur (l. 375, 1337, 1342).

23. **Les quatre opérations de remise à zéro** (l. 285-299, libellés l. 2025-2037) :
    - `liste` : efface athlètes + passages de l'espace courant ;
    - `vierge` : identique, présenté comme « démarrer une compétition réelle vierge »
      — **mêmes effets que `liste`**, épreuves/catégories/officiels/codes conservés ;
    - `tout` : remplace l'espace courant par `etatVide()` (5 épreuves et 2 catégories
      officielles rétablies) ;
    - `videdemo` : remplace l'espace **essai** par `etatVide()`, sans toucher à l'officiel.

24. **`copierVersDemo`** (l. 300-305) duplique l'état officiel dans l'espace essai et y
    bascule ; échoue proprement si le quota est dépassé.

25. **Repères de complétude** (`bilan`, l. 1188-1203 ; `recap`, l. 1479-1486) : au moins
    1 épreuve, 1 groupe, **5 officiels nommés**, ≥ 2 athlètes tous « complets » (nom
    **et** prénoms renseignés), 100 % de pesées validées, ≥ 3 lignes de programme.
    Message l. 2001 : « Les juges valident l'essai sur le terrain ; c'est la table qui
    saisit la performance dans l'application. »

26. **Filtres de la liste d'athlètes** (l. 1304-1316) : tri par dossard **dès qu'au moins
    un athlète en a un**, sinon par nom (`localeCompare` français) ; filtre
    « À compléter » = `aVerifier || !prenoms || !poids` ; filtres par club, « Indépendant »
    pour les clubs vides.

27. **Les clubs sont identifiés par leur nom trimé**, y compris pour les logos. Renommer
    un club détache son logo.

---

## Points douteux

Classés par gravité décroissante. Aucun de ces points n'a été corrigé — ils sont
signalés pour arbitrage avant réimplémentation.

### D1 — La mesure `medley` n'est pas dans `MESURES` et se classe à l'envers

`ajouterMedley` (l. 2121-2127) crée une épreuve `mesure:"medley"` dont le critère annoncé
est « le temps le plus court l'emporte ». Or `MESURES` (l. 11-17) ne contient pas
`"medley"`, et le test de sens de tri est `min = (mesure === "chrono")` (l. 1109, 1140).
Une épreuve medley est donc classée **valeur décroissante** : la plus grande distance
gagne, et un parcours achevé (temps court) est traité comme une performance faible.
`MESURES.find(...) || MESURES[0]` (l. 1223, 1518) fait de plus retomber l'aide et
l'unité sur `nb_temps`. **Bug fonctionnel.**

### D2 — `prochainDossard()` et `numeroLibre()` sont du code mort

Aucun appel dans le fichier. Toute la logique documentée de parité et de tirage aléatoire
de dossards (commentaires l. 337 et 347) n'est **jamais exécutée** : les dossards sont
saisis à la main (l. 1345, 1434) et `viderDossards` renvoie explicitement l'opérateur vers
la saisie manuelle (l. 398). Seul `pariteGroupe` est utilisé, et uniquement pour un
libellé (l. 1271) et une colonne d'export (l. 442). À trancher : implémenter la règle
côté backend, ou l'abandonner.

### D3 — `DROITS` et `ROLES_LBL` sont du code mort ; le champ `officiels[].code` ne sert à rien

`DROITS` (l. 91) et `ROLES_LBL` (l. 88) ne sont référencés nulle part. La connexion
n'utilise que les deux comptes `ACCES` (l. 1491) alimentés par `acces.admin` / `acces.regie`.
Le champ `code` de chaque officiel est saisissable (l. 1297) mais **jamais vérifié** :
un juge ou un chronométreur n'a pas de compte propre. L'intention (droits par rôle) est
visible mais non implémentée.

### D4 — `viderListe` est indéfini

Ligne 2040 : `viderListe: this.viderListe` — aucune méthode `viderListe` n'existe dans la
classe. La valeur exposée au markup est `undefined` ; un appel depuis l'interface
lèverait une exception.

### D5 — Ambiguïté de frontière entre catégories

`groupePour` teste `v > min - 0.0001 && v <= max` (l. 315). Avec les catégories par défaut
(« ≤ 100 » et « > 100 »), un poids de **100,0 kg satisfait les deux** ; `find` retourne la
première du tableau, soit « Moins de 100 kg ». `poidsHorsLimite` utilise pour sa part
`v < min` **strict** (l. 368), donc valide aussi 100,0 kg pour « Plus de 100 kg ». Le
comportement dépend de l'ordre de déclaration des catégories. **À spécifier explicitement :
borne basse exclusive ou inclusive.**

### D6 — Le verrou de pesée ne verrouille rien

Le libellé annonce « dossard et catégorie verrouillés » (l. 1355), mais aucun test
`a.verrou` ne bloque `setPoids` (l. 1431), `setDossard` (l. 1434), `setCategorie`
(l. 1436) ni `affecterCategorie`. Seule la couleur de fond change (l. 1425). **À décider :
contrainte réelle côté backend, ou simple indicateur.**

### D7 — Le chronomètre ignore l'espace essai

`pousserChrono` et `lireChrono` écrivent et lisent toujours `CLE + ":ch"` (l. 1063, 1067),
avec la constante officielle, jamais `this.cle()`. Une session d'essai pilote donc le
chronomètre des écrans officiels, et réciproquement.

### D8 — `ordreDePassage` ignore les athlètes sans catégorie dans le cumul de points

Le cumul (l. 1124-1128) itère sur `d.groupes` et n'inclut pas le pseudo-groupe `"tous"`.
Un athlète sans `groupeId` accumule donc toujours 0 point et passe systématiquement en
tête à partir de la deuxième épreuve. Par ailleurs les catégories **mises de côté**
(`actif === false`) sont incluses dans ce cumul, contrairement au reste du code qui les
filtre.

### D9 — `renvoyer` depuis la liste des terminés laisse un résultat orphelin

`renvoyer` (l. 938) remet `statut = "avenir"` sans effacer `resultat`. Le passage garde
donc une valeur qui ne compte plus (les deux sélecteurs exigent `statut === "termine"`),
mais qui réapparaîtra telle quelle si le passage est un jour repassé en `termine`.
Contraste volontaire avec `retourPassage` (l. 992) qui, lui, remet `resultat = null`.

### D10 — `tourPour` écrase la saisie même quand ce n'est pas pertinent

`tourPour` force `valeur = nombre de tours` (l. 1032). Sur une épreuve à `tours: true`
mais de mesure `duree` (cas de `ep4`, Piliers d'Hercule, l. 63), la valeur attendue est un
temps de maintien, pas un compte de répétitions : un appui sur « tour » remplace le
maintien par « 1 ». Idem pour `distance` si `tours` était activé.

### D11 — `file("termine")` ignore `p.groupeId`

Ligne 826 : le filtre ne porte que sur `epreuveId` et `statut`, puis sur la **catégorie
actuelle de l'athlète**. Un passage créé sous la vue « tous » apparaît donc dans la liste
des terminés d'une vue par catégorie, et inversement. C'est probablement volontaire (vue
unifiée des résultats), mais asymétrique avec le filtrage strict des autres statuts (l. 838).

### D12 — `votes` créé mais jamais utilisé

`construireFile` initialise `votes: [null,null,null]` (l. 851) — trois juges —, mais
`assurerFile` (l. 870), `preparerToutes` (l. 884) et l'import Excel (l. 535) ne le créent
pas, et aucun code ne le lit ni ne l'écrit. Vestige d'un système de validation à trois
juges non implémenté.

### D13 — `libAppelerDuo` annonce un nombre potentiellement faux

Ligne 1869 : `"Appeler les " + Math.max(2, ordreCats.length) + " athlètes"`. Le nombre
réellement appelé est celui des catégories distinctes présentes dans le vivier
(file + plateau, l. 901-907), qui peut différer de `ordreCats.length` (construit à partir
de la seule file `avenir`, l. 1685). Avec une seule catégorie, le bouton annonce « 2 »
alors qu'un seul athlète sera appelé.

### D14 — `retourPassage` ne restaure pas la saisie

Le passage repris repart au plateau avec `resultat = null`, mais `state.saisies[pid]` et
`state.toursPar[pid]` ont été purgés par `officialiser` (l. 975-980). La valeur et les
tours doivent être ressaisis intégralement.

### D15 — Deux confirmations aux effets identiques

`"liste"` et `"vierge"` déclenchent exactement la même opération (l. 287) alors que leurs
textes de confirmation (l. 2032-2033) décrivent des périmètres différents ; `vierge`
annonce notamment que « les codes d'accès restent en place », ce qui est vrai des deux.

### D16 — `epreuve.passage` et `epreuve.essais` sont inertes

`passage` (défaut `"groupe"`) est stocké et éditable (l. 1246) mais n'influence aucun
comportement. `essais` est affiché et exporté mais jamais confronté au nombre réel de
passages d'un athlète.

### D17 — `comp.suspendu` n'a aucun effet fonctionnel

Aucune action (appel, officialisation, chronomètre) n'est bloquée par la suspension : elle
ne pilote qu'un affichage (l. 1834-1835).

### D18 — L'athlète créé manuellement n'a pas tous les champs

`ajouterAthlete` (l. 2130) omet `hors`, `invite`, `poidsDeclare`, `aVerifier`, `taille`,
`age`, `commune`, `tel`, `urgence`, `niveaux`. Ces champs restent `undefined` et sont
traités comme falsy partout, mais un schéma de base de données devra les déclarer
explicitement.

### D19 — Pagination de l'écran d'attente sur tous les athlètes

`tousEngages` (l. 1730) part de `d.athletes` sans aucun filtre : les fiches incomplètes,
non pesées ou sans dossard (affichées « — ») apparaissent sur le mur LED.

### D20 — Le bouton « mire » par écran perd le paramètre d'espace

Ligne 1673 : `?ecran=mire&theme=...` sans `&espace=`, contrairement aux boutons
« ouvrir » (l. 1671) et à la mire globale (l. 1844). Sans conséquence visible pour une
mire, mais incohérent.
