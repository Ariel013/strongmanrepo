# 🧭 Journal de bord — Arbitrage Strongman 2026 (FIBDA)

> **Nouvelle session : LIS CE FICHIER EN PREMIER**, puis `CLAUDE.md`. Tu sauras
> où on en est, quoi faire ensuite et quoi éviter — sans relire tout le code.
>
> **Discipline** :
> 1. Au **démarrage** : lire les trois sections ci-dessous, puis agir / proposer.
> 2. En **fin de session** : mettre à jour « État & prochaine action », ajouter
>    une entrée au journal des sessions, consigner toute erreur en « Leçons ».
> 3. Convertir les dates relatives en absolues. Rester concis.

**Carte des documents**

| Document | Ce qu'il répond |
|---|---|
| `A-FAIRE.md` | Que reste-t-il à faire **hors code** ? (secrets, migrations, ops) |
| `README.md` | Comment ça marche, comment on l'installe, quel est le barème |
| `docs/regles-metier.md` | Quelle est la règle exacte du classement |
| `docs/cartographie-ui.md` | À quoi l'interface doit ressembler — **pièce de comparaison du portage** |
| `docs/reference/` | Le poste autonome d'origine, tel quel. On ne le modifie jamais |
| `docs/decisions/` | Pourquoi ce choix plutôt qu'un autre (ADR) |

---

## 📍 État actuel & prochaine action

*(Mis à jour le 2026-09-19.)*

- **Front** : portage fidèle du poste autonome terminé. Relevé automatique :
  **96 % des textes visibles** de l'original retrouvés ; les 4 % restants sont
  les trois écarts assumés (mode démo → [ADR 0003](docs/decisions/0003-un-seul-espace-de-donnees-pas-de-mode-demonstration.md),
  compte unique à la connexion, import limité au CSV et au texte collé).
- **Vérifications** : `pnpm run build` ✓, `pnpm run lint` ✓, `pnpm run test`
  **200/200** ✓ (2026-09-19). Les routes répondent 200 sur un build de production local.
- **Base** : migrations `0001` à `0008` appliquées sur Supabase (dernière le
  2026-09-17).
- **Branche** : `main` alignée avec `origin/main` sur `c46b319`, poussée le
  2026-09-19 (vérifié par comparaison des SHA). Le commit de capitalisation
  qui suit n'est pas compté ici.
- **Dernier déploiement vérifié** : `c46b319`, le 2026-09-19 — statut Vercel
  `success`, et `/aide` en ligne porte le texte des alertes de pesée, propre
  à ce commit. **Non vu à l'écran** : les alertes elles-mêmes à l'étape Pesée,
  derrière la connexion.
- **Déploiement** : ✅ **vérifié en ligne le 2026-09-16** sur
  https://strongman-pied.vercel.app — `/api/sante` répond `etat: en ordre`,
  les 7 écrans publics d'alors servent du vrai contenu, la garde d'accès renvoie 307
  et 401, les 5 en-têtes de sécurité sont posés, le manifeste PWA et ses
  icônes répondent.
- **Vitesse en ligne** : sur connexion réutilisée, `/ecran/classement` répond
  en 0,32 s et `/api/ecran/etat` en 0,28 s — soit **~40 ms de travail serveur**
  au-dessus du plancher réseau. Le reste est le trajet Abidjan → `cpt1` →
  `dub1`, qui ne se règle pas depuis le code.

- **À contrôler par Kevin, deux minutes** : à l'étape Pesée en ligne, un poids
  au-dessus du déclaré (bandeau ambre), un poids hors de la catégorie annoncée
  (bandeau rouge), et le décompte au-dessus de la liste.
- **Prochaine action** : rien ne bloque la compétition. Le plus utile
  maintenant est de **se connecter à l'administration en ligne et de dérouler
  une épreuve de bout en bout** — appel, chrono, « résultat plus tard »,
  saisie différée, mur LED — sur du matériel réel. **Critère de fin** : un
  passage validé apparaît sur `/ecran/classement` en moins de deux secondes,
  et un passage en attente n'y apparaît pas.

---

## 📓 Journal des sessions

### 2026-09-19 (27) — Le classement général complet s'imprime

Kevin, en compétition, correction validée (« ça marche ») : « on ne peut tirer
que les 3 de chaque catégorie ». Le palmarès n'imprime que les places dotées.
`/admin/impression/classement` : une feuille A4 paysage par catégorie, tous
les athlètes du premier au dernier, points de chaque épreuve, total, décompte
des places qui départage, invités sous le classement, bandeau définitif /
provisoire, signatures. `?categorie=<id>` pour une seule. Recalculée par
`tableauGeneral`, rien de neuf côté règle. Accès : accueil et palmarès ; mode
d'emploi à neuf feuilles. `lint` ✓, `build` ✓. **Non vue dans le navigateur
ni imprimée.**

### 2026-09-19 (26) — En pleine compétition : corriger un résultat validé

Kevin, pendant l'épreuve : une erreur de saisie sur un athlète, épreuve
terminée, impossible d'y revenir (ADR 0005). Bouton **« Corriger »** sur chaque
ligne des terminés : le passage repart « en attente de résultat », prérempli
avec sa valeur, jamais au plateau ; confirmation qui dit qu'il sort du
classement jusqu'à revalidation ; ancien résultat au journal d'audit
(`passage.correction_ouverte`). Écriture dans `rouvrirPourCorrection`
(`plateau.ts`), 7 tests. ADR 0005 amendé, mode d'emploi et cartographie à jour.
`lint` ✓, `build` ✓, `test` 200/200. **Non essayé dans le navigateur.**

Même jour, abandonné avant tout commit à la demande de Kevin : un mode de
passage « deux par deux » (deux athlètes de la même catégorie au plateau). La
compétition s'est faite ainsi sans lui ; rien n'en reste dans le code.

### 2026-09-19 (25) — Deux alertes de couleur à la pesée

Kevin : savoir quand un athlète dépasse son poids déclaré, et quand il sort
de la catégorie annoncée. `alertesPesee` (`classement.ts`, pure, testée § 22) :
**ambre** = pesé au-dessus du déclaré mais même catégorie ; **rouge** = hors de
la catégorie annoncée (l'affectée, à défaut celle du poids déclaré — qui garde
la mémoire de l'annonce une fois la validation passée). Affichées sous la
ligne à l'étape Pesée, conservées après validation, décompte au-dessus de la
liste. Ce sont des alertes, pas des refus : l'officiel décide — écart avec
l'original noté dans la cartographie § 4.5. Un invité hors classement n'a que
l'alerte ambre. `lint` ✓, `build` ✓, `test` 193/193. Non essayé sur matériel
réel ni en ligne.

Suite : commit `e96805c` poussé (SHA vérifiés), statut Vercel `success`,
`/api/sante` en ordre en ligne. Le mode d'emploi, étape Pesée, explique les
deux alertes et qu'elles ne bloquent rien. `lint` ✓, `build` ✓.

Puis : phrase fausse du mode d'emploi corrigée (« la validation attribue le
dossard » — il se saisit à la main, la validation l'exige). Commit `c46b319`
poussé, déploiement vérifié par le contenu de `/aide` en ligne. Le chapeau de
l'étape Pesée garde la formule de l'original, laissée telle quelle.
Capitalisation : deux occurrences ajoutées au coffre, fiche projet complétée.

### 2026-09-17 (24) — Le mode d'emploi rattrape tout ce qui a été fait

Kevin : « est-ce qu'il contient tout ? » Non. Réécrit contre le code : les
sept étapes de préparation dans l'ordre des onglets (épreuves et niveaux,
couleur des groupes, staff par catégorie, import et photos, feuilles de
pesée, programme par heure, récompenses par catégorie et meilleur club) ;
au plateau, le choix de l'épreuve et du passage, précharger, reconstruire,
le réalignement de la file, la case « temps au chrono », la reprise du
chrono ; la régie et le branchement d'une sortie vidéo ; une rubrique « Ce
qui s'imprime » avec les huit feuilles, qui les remplit et où les trouver ;
la fin de compétition en trois temps, vérifier, proclamer, archiver ; la
rubrique problèmes alignée sur ce que le logiciel permet — plus
d'annulation depuis le plateau, connexion ralentie, suspension, écran
d'erreur qui retente seul. Sommaire à neuf rubriques. `lint` ✓, `build` ✓.

### 2026-09-17 (23) — Le bouton du mode d'emploi ne repasse plus par le code

Kevin : « le CTA a le même problème ». Cause : `/connexion` ne regardait
jamais si une session était déjà ouverte — depuis le mode d'emploi, on
retombait sur le formulaire de code, et la navigation en `<a>` rechargeait
tout. La page de connexion redirige maintenant une session ouverte vers
`/admin` (ou la `suite` si elle est sous `/admin`), et le bouton est un
`Link`.

Puis la capture d'écran de Kevin : le bouton était **vert sans texte**.
Cause vérifiée dans `globals.css:120` : la base reprise de l'original pose
`a { color: #0b9237 }` hors couche Tailwind, donc elle bat n'importe quelle
classe de couleur utilitaire — texte vert sur fond vert, à la bonne largeur.
Couleur et soulignement forcés en style inline sur le bouton. Leçon : sur
cette page en Tailwind, une classe de couleur sur un `<a>` ne suffit jamais.
`lint` ✓, `build` ✓.

### 2026-09-17 (22) — Quatre corrections de terrain : ordre de passage, clubs, chrono, classements

Retours de Kevin après essai en ligne.

1. **L'ordre de passage de la 2e épreuve restait par dossards.** La règle
   (dossards à la 1re épreuve, puis points acquis croissants) était bien
   dans `ordreDePassage`, mais « Précharger toutes les épreuves » construit
   toutes les files d'un coup, avant tout résultat, et rien ne les réordonnait.
   `realignerFile` (`plateau.ts`) réaligne une file **où personne n'est encore
   passé** sur l'ordre théorique ; appelée au choix de l'épreuve et à
   l'affichage du plateau (idempotente), tracée `file.realignee`. Une épreuve
   commencée ne bouge plus. Test § 21.
2. **Le classement des clubs « repartait à zéro ».** Il était calculé sur le
   rang **final** de chaque athlète ; Kevin veut le rang **à chaque épreuve**,
   cumulé : 2e puis 1er = 10 + 15 = 25. `tableauClubs` parcourt maintenant
   chaque épreuve ; barème, README, règles métier § 9, aide et libellés mis à
   jour ; test ajouté.
3. **Le chrono revenait à zéro en revenant de la régie.** Le plateau est un
   composant client ; quitter la page perdait son état, et l'effet de montage
   republiait « prêt » en base — ce qui remettait aussi le mur LED à zéro. Le
   plateau reçoit maintenant l'état publié (`chronoPublie`) et, si un chrono
   est en cours pour un athlète au plateau, reprend depuis son instant de
   départ sans rien republier. Pas de `Date.now()` pendant le rendu ; reprise
   portée par un ref, effet déplacé après les fonctions qu'il appelle
   (compilateur React).
4. **Classements** : sous le plateau, d'abord « Classement de l'épreuve »
   avec une carte par catégorie, en autant de colonnes que de catégories ;
   puis « Classement général · toutes épreuves » ; puis les clubs.

Le lot UI/UX (audit précédent) est suspendu, à reprendre ensuite.

### 2026-09-17 (21) — Audit de sécurité complet, et ses corrections

Demande de Kevin : tout vérifier, jusqu'aux entrées insignifiantes. Trois
audits en parallèle (auth et accès ; actions serveur et entrées ; API, écrans
publics, robustesse), chaque constat revérifié à la source avant correction.

**Sain, vérifié** : cookie httpOnly/secure/lax signé HMAC, PBKDF2 210 000
itérations et comparaison en temps constant, message d'erreur unique,
fail-closed sans secret ; toutes les Server Actions ouvrent par
`exigerSession()` ; aucune fuite de `athlete_contact` sur `/ecran/*`, `/aide`,
`/api/ecran/etat` ; aucun secret versionné ni dans l'historique ; `pnpm audit`
vide ; SQL toujours paramétré ; JSON parse protégé ; Next 16.3.5 postérieur
au correctif du contournement de middleware.

**Corrigé** (aucune faille critique, mais de vrais défauts) :

- *Redirection ouverte* après connexion : `suite=/\evil.com` ou `/%09/evil.com`
  passaient le filtre « commence par / ». L'URL est maintenant résolue et
  bornée à `/admin`.
- *Blocage d'IP* : huit mauvais codes depuis le Wi-Fi de la salle verrouillaient
  la table cinq minutes. Remplacé par un ralentissement progressif (2, 4, 8 s),
  par adresse et global ; le bon code passe toujours. IPv6 tronquée.
- *Cinq actions `modifier*`* écrivaient la colonne nommée par le client
  (`set({ [champ]: v })`) : `competitionId`, `id`, `position` étaient
  écrivables. Fermé par `parmi(...)` ; `modifierEpreuve` par `Object.hasOwn`.
- *`validerPassage`* réécrivait un passage déjà validé, ou inexistant, sans
  trace. Il exige `plateau` ou `a_saisir`, refuse le reste, et l'écriture est
  conditionnée au statut (`returning`) contre la double validation.
- *`reconstruireFile`* supprimait puis réinsérait sans transaction : un
  identifiant étranger effaçait la file sans la remplacer. Transaction avec
  verrou, athlètes vérifiés avant toute suppression, et **l'athlète au plateau
  est conservé** (test mis à jour). `placerAuPlateau` en transaction verrouillée.
- *Bornes* : performance 0–100 000, temps 0–36 000, tours ≤ 200, chrono
  (phase, durée, instant), motif de suspension 120, niveau 40 avec épreuve de
  la compétition, coordonnées (40/120/80), import ≤ 500 lignes validées avant
  écriture et en transaction, thème `parmi`, catégorie rattachée à la
  compétition des athlètes, UUID vérifiés partout où un id vient du client.
- *`enregistrerAthlete`* : action sans appelant et sans validation, supprimée.
- *Photos* : l'ancien blob est effacé au remplacement ; le club du logo est
  borné et nettoyé ; à la lecture, seule une URL du magasin Vercel Blob est
  affichée.
- *Seconde barrière* : `/api/admin/export` vérifie la session lui-même et
  trace l'export ; `fichesAthletes()` refuse de lire les coordonnées sans
  session, quelle que soit la page. `src/middleware.ts` → `src/proxy.ts`
  (convention Next 16, l'ancienne est dépréciée).
- *`/api/sante`* : public, il ne dit plus que « en ordre / en panne » ; le
  diagnostic complet exige la session ou `CRON_SECRET` ; plus aucun message
  d'erreur brut ; résultat gardé 30 s (chaque appel ouvrait une connexion).
- *Robustesse* : `error.tsx` sur `/ecran` (message en français, nouvelle
  tentative toutes les 5 s — avant, une base muette deux secondes figeait le
  mur LED sur la page d'erreur anglaise jusqu'à un F5 en régie), sur `/admin`,
  `global-error.tsx`, `not-found.tsx`. Rafraîchissement LED sans requêtes
  empilées (délai réarmé, abandon à 1,5 s). `revalidate = 2` retiré : sans
  effet sur une route dynamique, le commentaire mentait. Export : caractères
  de contrôle filtrés, 503 en clair si la base ne répond pas. CSP sans
  `unsafe-eval` en production, `X-Powered-By` retiré, empreinte publique hachée.
- Confirmation de suppression de catégorie : dit que les récompenses propres
  partent et que le jury repasse « toutes catégories ».

**Laissé pour après la compétition, consigné** : révocation de session côté
serveur (un jeton copié vaut 12 h), limitation de débit partagée en base,
`rowCount` sur tous les `update` par id, `competition_id` dans le journal.

`lint` ✓, `build` ✓, `test` 179/179 (3 ajoutés). Non essayé sur matériel réel.

### 2026-09-17 (20) — Mode d'emploi : file d'attente, écrans résultats et clubs, bouton

Kevin. Le cycle d'un passage compte cinq étapes, la quatrième étant la mise
en attente de résultat (file, tableau, « Tout valider », plus d'annulation).
Les contenus disponibles gagnent « Résultats de l'épreuve par catégorie » et
« Classement des clubs ». Le bouton dit « Accéder à l'administration » ; il
passe de `text-white` à `text-papier`, couleur du thème — Kevin voyait le
bouton sans texte, ce qui pointe une classe non générée. `lint` ✓, `build` ✓.

### 2026-09-17 (19) — Les récompenses se dotent par catégorie

Kevin : 1er, 2e, 3e **par catégorie**. Colonne `recompense.categorie_id`
(migration `0008`), vide = récompense commune. `recompensesPour(toutes, cat)`
rend les propres d'une catégorie, sinon les communes — jamais un mélange. À
l'étape Récompenses : un bloc par catégorie retenue, avec ses places (titre,
prime, lot, lauréat) ou, tant qu'elle n'en a pas, les communes en lecture et
un bouton « Personnaliser pour … » qui les copie ; puis le bloc des communes,
le meilleur club, les partenaires. Podium LED, palmarès imprimé et
récapitulatif lisent par catégorie ; le récapitulatif exige trois places par
catégorie retenue. Les récompenses déjà saisies restent, en communes : rien
n'est perdu.

Raté puis corrigé : `recompensesPour` d'abord posée dans `donnees.ts`, que le
composant client importait — Turbopack refuse (`fs`, `net` : le module ouvre la
base). Déplacée dans `classement.ts`, module pur. Le build l'a dit, pas
`tsc`. `lint` ✓, `build` ✓, `test` 176/176.

### 2026-09-17 (18) — Les lauréats à côté des récompenses, et le palmarès imprimé

Kevin. `src/lib/palmares.ts` calcule qui a gagné quoi depuis les classements
(jamais saisi) : par catégorie retenue, les lauréats avec rang, club, dossard,
total ; et le classement des clubs. À l'étape Récompenses, chaque place montre
son lauréat dans chaque catégorie (ou « pas encore classé »), et un bloc
« Meilleur club » affiche le club en tête avec un champ pour sa récompense —
colonne `competition.recompense_club`, migration `0007`. Feuille
`/admin/impression/palmares` : par catégorie, chaque place dotée avec son
lauréat, puis le meilleur club, ses points et sa récompense, signatures.
Accès depuis l'étape et l'accueil. `lint` ✓, `build` ✓, `test` 176/176.

### 2026-09-17 (17) — Les récompenses deviennent la septième étape

Kevin. Récompenses et bandeau partenaires sortent de l'étape Programme vers
`etape-recompenses.tsx`, septième onglet (`?etape=6`), après Programme. Le
récapitulatif gagne une ligne « Récompenses » (au moins trois places dotées,
ce que l'écran podium affiche). Écart avec l'original noté dans la
cartographie § 4.6. `lint` ✓, `build` ✓, `test` 176/176.

### 2026-09-17 (16) — Le programme se range par heure, pas par ordre de saisie

Kevin : une ligne créée après coup à 12h restait sous celle de 18h. Le
programme était lu dans l'ordre de création (`position`). `trierProgramme`
(`validation.ts`, pure, testée en § 20) range par heure lue avec
`heureFrancaise` — « 14h00 », « 14:00 », « 9h30 » — puis par ordre de saisie ;
une heure illisible (« vers midi », vide) passe en fin. Appliqué dans
`programmeDe`, donc partout : étape, écran d'attente, impression,
récapitulatif. `lint` ✓, `build` ✓, `test` 176/176.

### 2026-09-17 (15) — Liste des officiels et feuilles de pesée imprimables

Kevin. `/admin/impression/officiels` : les postes communs puis le staff de
chaque catégorie retenue, colonne signature, signatures du directeur et du
responsable arbitrage. `/admin/impression/pesee` : une feuille par catégorie
(dossard, athlète, club, poids déclaré, case « Poids pesé (kg) », coche
« Pesée validée », signature), plus une feuille « À ranger à la pesée » pour
les athlètes sans catégorie et une pour les invités. Les valeurs déjà
validées sont préremplies et grisées, comme sur la feuille de notation.
Accès depuis les étapes Officiels et Pesée, et l'accueil. `lint` ✓, `build` ✓.

### 2026-09-17 (14) — Le programme de la journée s'imprime

Kevin. `/admin/impression/programme` : une page A4 avec l'en-tête de la
compétition (nom, date, lieu, adresse), le déroulé saisi à l'étape Programme,
les épreuves dans l'ordre avec temps imparti, critère et matériel, les
catégories retenues avec leur couleur, et les officiels avec leur rôle et leur
catégorie. Accès depuis l'étape Programme et l'accueil de l'administration.
`lint` ✓, `build` ✓.

### 2026-09-17 (13) — Un vrai bouton « Accès à l'administration » dans le mode d'emploi

Kevin : un CTA plutôt que le lien souligné en pied de page. Bouton vert
plein, en tête du mode d'emploi sous le chapeau et en pied de page, vers
`/connexion`. Et la rubrique 3 du mode d'emploi explique le barème des clubs,
avec sa table et un exemple. `lint` ✓, `build` ✓.

### 2026-09-17 (12) — Le classement des clubs sur le plateau

Kevin : sur le plateau, à côté des classements d'épreuve et généraux par
catégorie, le rang des clubs. Carte « Classement des clubs · toutes
catégories » en fin de la grille des classements, même `tableauClubs` que la
page `/admin/clubs`, lien vers la version imprimable. `lint` ✓, `build` ✓.

### 2026-09-17 (11) — La frappe prime sur le rafraîchissement du serveur

Kevin : « quand on remplit un champ, ça se supprime ou déconne, il faut
réécrire plusieurs fois ». Cause dans `ChampTexte` : après 600 ms de pause, la
valeur partielle part au serveur ; la page revient rafraîchie avec cette
valeur partielle ; le composant l'adoptait dès qu'elle différait de la
précédente — et écrasait ce qui avait été tapé depuis. Avec la latence
Abidjan → serveur, l'aller-retour dépasse la pause : chaque nom un peu long
était tronqué.

Correction : la valeur du serveur ne reprend la main que si le champ est au
repos — curseur sorti, aucun enregistrement en vol, aucune frappe en attente.
Pause portée à 900 ms. La fiche d'identité (`identite.tsx`) n'était pas
touchée : elle n'enregistre qu'à la sortie du champ et ne se resynchronise
pas. Leçon ci-dessous. `lint` ✓, `build` ✓. Non essayé sur matériel réel :
**à vérifier en ligne en tapant un nom long sans s'arrêter.**

### 2026-09-17 (10) — Le temps au chrono est le temps imparti, pour tous

Précision de Kevin : la troisième case porte le temps imparti de l'épreuve
(90 s), que le chrono soit allé au bout ou qu'on l'ait coupé avant. Seule une
épreuve sans limite garde le temps écoulé. `lint` ✓, `build` ✓.

### 2026-09-17 (9) — Niveau sans liste, bouton retour, staff par catégorie, clubs

Quatre demandes de Kevin.

1. **« Le niveau ne passe pas » sur Piliers d'Hercule.** Vérifié en base :
   `niveau = true`, `niveaux_options = null`. Le sélecteur n'avait rien à
   proposer — un blanc muet, lu comme une panne. Désormais sans liste, le
   niveau se saisit en clair et l'écran dit où renseigner la liste ; l'étape
   Épreuves avertit quand les niveaux sont activés sans liste.
2. **« ← Retour »** dans le fil d'Ariane de toutes les pages d'administration
   (`src/components/retour.tsx`).
3. **Un staff par catégorie** : `officiel.categorie_id` (migration `0006`),
   sélecteur « Catégorie arbitrée » sur chaque officiel, un encart par
   catégorie retenue avec son staff, avertissement sans juge principal, ligne
   du récapitulatif. La feuille de notation préremplit juge, chrono et
   secrétaire de la catégorie.
4. **Classement des clubs**, barème 15 / 10 / 5 / 4 / 3 puis 1 sur le rang
   final par catégorie : `classementClubs` (pure, 6 tests), `tableauClubs`,
   page `/admin/clubs` imprimable depuis l'accueil, écran public `clubs`,
   entrée régie. Règle en `regles-metier.md` § 9.

Et sur le plateau, un seul « Imprimer les résultats » : celui de l'encadré
« Épreuve terminée », le doublon en tête des terminés est retiré.

`lint` ✓, `build` ✓, `test` 175/175. Non essayé sur matériel réel. Commit
`2210a22` poussé. Capitalisation : une troisième occurrence au coffre, fiche
complétée.

### 2026-09-17 (8) — Troisième case « Temps au chrono », et le message de reconstruction

Kevin, avec l'exemple du client : 4 répétitions chacun en 90 s, départage au
temps de la dernière répétition (58 s bat 68 s). **La règle du classement le
faisait déjà** (nombre décroissant, puis temps croissant — `regles-metier.md`
§ 5). Ce qui manquait : la troisième case, le temps lu au chrono à l'arrêt.

- Colonne `passage.chrono_s`, migration `0005` appliquée. Se remplit toute
  seule pour chaque athlète au plateau quand le chrono s'arrête, avec le
  **temps imparti de l'épreuve** (précision de Kevin, session 10 : 90 s pour
  tous, qu'on ait coupé avant ou non ; le temps écoulé seulement sans limite), reste
  modifiable, part avec la validation et avec la mise en attente. Absente pour
  les mesures `chrono` et `duree`, où le temps est la performance.
- Visible : carte du plateau, tableau d'attente (préremplie), ligne des
  terminés (« · chrono 90 s »), feuille de notation et feuille de résultats
  (colonne « Temps au chrono (s) »).
- « Reconstruire l'ordre » : le message disait « déjà validés » alors que des
  passages pouvaient être en attente de résultat. Il dit maintenant « déjà
  passés (validés ou en attente) » et rappelle qu'un passage validé ne se
  reconstruit pas — c'est ce que Kevin a vu : seuls les athlètes pas encore
  passés sont revenus dans la file, par construction.
- Lint : `Date.now()` dans `basculerChrono` refusé par la règle de pureté du
  compilateur React après l'ajout de `releverChrono` ; remplacé par
  `new Date().getTime()`, même valeur.

`lint` ✓, `build` ✓, `test` 169/169. Non essayé sur matériel réel. Commits
`be505a0` et `037a6df` poussés sur `origin/main` (SHA vérifiés). Capitalisation
en fin de session : une seconde occurrence au coffre, fiche projet complétée.

### 2026-09-17 (7) — Couleur propre à chaque catégorie, dossards sur les résultats

Demande de Kevin. **Couleur** : colonne `categorie.couleur` (migration `0004`
appliquée), attribuée à la création — première couleur de la palette qu'aucune
catégorie de la compétition ne porte — et modifiable à l'étape Groupes (sept
pastilles + sélecteur libre, `#RRGGBB` validé côté serveur). Les catégories
d'avant, sans couleur enregistrée, retombent sur la palette par rang, comme
avant : `CategorieVue.couleur` est toujours renseignée et les quatre appelants
de `couleurCategorie(rang)` lisent désormais la catégorie. **Dossards** : sur
les cartes de la régie (colonne « Dossard »), et en pastille orange sur les
écrans LED résultats, classement général et podium. La feuille imprimée les
avait déjà.

Aussi dans ce lot : le bouton « Appeler les 2 athlètes » passe en orange plein.
Et un retrait demandé par Kevin, en deux temps : la régie n'affiche plus le
classement de l'épreuve en cours, puis plus l'épreuve en cours du tout — ni
son nom, ni son état, ni les boutons. La régie n'est que la liste des sorties
et le thème ; l'épreuve et ses résultats se lisent sur les écrans diffusés,
la feuille de résultats s'imprime depuis le plateau. Écart noté dans la
cartographie § régie.

`lint` ✓, `build` ✓, `test` 168/168. Non essayé sur matériel réel.

### 2026-09-17 (6) — Un passage validé ne s'annule plus ; les résultats s'impriment et se diffusent

Trois demandes de Kevin, [ADR 0005](docs/decisions/0005-un-passage-valide-ne-s-annule-plus-depuis-le-plateau.md) :

- **Plus d'annulation depuis le plateau** : ni le bouton « Annuler » par ligne
  des terminés, ni « Annuler la dernière validation ». Une correction passe par
  la feuille de notation et le juge principal. L'action `rouvrirPassage` reste
  en base de code, sans bouton, pour un futur parcours « juge principal ».
- **Résultats imprimables** : `/admin/impression/resultats?epreuve=&categorie=`,
  une feuille A4 portrait par catégorie, classement recalculé par
  `tableauEpreuve`, zéros / forfaits / non passés listés sous le classement
  avec leur motif. Bandeau « définitifs » ou « provisoires · n passages à
  faire ». Liens depuis la colonne des terminés, l'encadré « Épreuve
  terminée » et la régie.
- **Huitième écran public** `/ecran/resultats` : résultats de l'épreuve
  courante par catégorie (rang, photo, nom, performance, points), bandeau
  définitif / provisoire. Ajouté au menu de la régie et aux contenus admis.
  La régie dit maintenant si l'épreuve courante est terminée.

`lint` ✓, `build` ✓, `test` 168/168 (rien d'ajouté : aucune écriture nouvelle).
Non essayé sur matériel réel.

### 2026-09-17 (5) — Le plateau se libère avant que le jury ait rendu la valeur

Souci de terrain signalé par Kevin : sur un grand terrain, le jury rend la
performance bien après la fin du chrono. La validation étant la seule sortie
du plateau, la table attendait à vide avant d'appeler le suivant.

Quatrième état de passage, `a_saisir` → [ADR 0004](docs/decisions/0004-un-passage-peut-attendre-son-resultat.md).
Bouton « Passage fini, résultat plus tard » sur la carte du plateau (refusé
chrono en marche) : les tours comptés partent avec le passage, le suivant est
appelé. Tableau « En attente de résultat » sous les trois colonnes, une ligne
par athlète, prérempli, choix de Kevin (forme de la feuille papier), avec un
bouton « Tout valider » demandé ensuite : les lignes renseignées passent en une
fois, les vides restent en attente et le disent. Tant que
non validé : ni classement, ni mur LED, ni file ; feuille imprimée en ligne
vide. Fin d'épreuve et verrou d'annulation exigent zéro passage en attente ;
« Reconstruire l'ordre » les conserve ; « Annuler la dernière validation »
renvoie en attente si le plateau est pris. Trace `passage.en_attente`.

`pnpm run lint` ✓, `build` ✓, `test` 168/168 (7 ajoutés sur `libererLePlateau`,
la reconstruction et le retour en file). Pas de migration : `statut` est du
texte. Non essayé sur matériel réel. Commit `efec8a9`, poussé sur `origin/main`
le 2026-09-17 (SHA vérifiés).

Capitalisation : première du projet. Trois leçons montées au coffre, deux
occurrences ajoutées à des notes existantes, fiche `brain/20-projets/strongman.md`
créée. La leçon « la référence est l'original, pas l'intuition » reste ici :
propre au portage.

### 2026-09-16 — Portage fidèle du front, et une lenteur enfin expliquée

**Fait**

- Front repris du poste autonome (`docs/reference/`) trait pour trait : charte,
  compositions, dimensions, libellés, infobulles. Police Clash Display et logo
  FIBDA extraits du bundle HTML d'origine vers `public/`.
- Écrans reconstruits qui manquaient : préparation en 6 étapes, récapitulatif,
  régie de diffusion, écrans `verdict` et `mire`, import d'une liste d'engagés,
  correspondance des photos. Le plateau retrouve l'appel en duo, le comptage
  des tours et les classements par catégorie.
- Schéma étendu : `programme`, `recompense`, `sortie`, `club_logo`, plus les
  colonnes de niveaux, de medley et l'état du chronomètre.
- Suite de tests fonctionnels (`pnpm run test`) : 56 vérifications sur le
  barème, les départages, l'ordre de passage, la lecture des listes et
  l'empreinte de fraîcheur.
- En-têtes de sécurité ajoutés (il n'y en avait aucun), nom de fichier
  téléversé assaini, catégorie d'affectation relue en base.
- Les écrans LED n'interrogent plus qu'une empreinte de fraîcheur
  (`/api/ecran/etat`, 60 octets, une requête) et ne redemandent la page que si
  elle a bougé — avec un rafraîchissement complet toutes les 30 s en filet.
  Entre deux passages, un écran ne recalcule plus les classements.

**Découvert**

- La lenteur en production venait du cache du pool PostgreSQL, posé **hors
  production seulement**. Voir « Leçons » ci-dessous.
- `pnpm run db:push` ne fonctionne pas sur Supabase. `pnpm run db:migrer` a été
  écrit pour appliquer le SQL versionné.
- `ADMIN_PASSWORD_HASH` est malformée **dans le `.env` local** — la valeur de
  Vercel, elle, est correcte. Voir « Leçons ».

**Reste ouvert**

- Les 4 % de textes de l'original non repris sont les trois écarts assumés ;
  aucun n'est un oubli.
- Aucun essai sur matériel réel : ni vidéoprojecteur, ni mur LED, ni téléphone
  de la table.

### 2026-09-17 (4) — L'âge se calcule, il ne se saisit plus

Demande de Kevin : afficher l'âge à partir de la date de naissance. Deux
décisions :

- **La date de naissance vit dans `athlete_contact`**, la table que les écrans
  publics n'interrogent jamais — c'est une donnée personnelle au même titre
  que le téléphone. Le test de cloisonnement la couvre.
- **L'âge se compte au jour de la compétition**, pas au jour où l'on regarde
  l'écran : règle sportive, et une fiche ne change pas d'âge entre la pesée et
  le podium. Jamais stocké ; l'ancienne colonne `age` est retirée — un âge
  saisi à la main était faux dès l'anniversaire suivant.

Saisie par le sélecteur natif (clavier de date sur téléphone), refusée si elle
donne un âge impossible pour un athlète. L'import lit « 14/03/1998 » et l'ISO,
et laisse vide tout le reste plutôt que de deviner. L'export porte la date et
l'âge au jour J. Migration `0003` appliquée.

### 2026-09-17 (3) — Feuille de notation par épreuve

Précision de Kevin : c'est **par épreuve** qu'on imprime, depuis le plateau,
avec tous les athlètes à venir dans l'ordre de passage — l'arbitre remplit
ligne à ligne. `/admin/impression/epreuve?epreuve=&categorie=` reprend les
paramètres du plateau ; bouton « Imprimer la feuille » dans sa barre. Une
feuille A4 paysage par catégorie, même en passage mélangé : les classements
ne se mélangent pas, la feuille non plus. Les résultats déjà validés y
apparaissent préremplis et grisés, pour ne pas être ressaisis. Si la file
n'est pas construite, l'ordre théorique est imprimé et la feuille le dit.

La fiche par athlète (toutes épreuves) reste, depuis l'étape Athlètes.

### 2026-09-17 (2) — Fiches de notation papier

Demande de Kevin : imprimer une fiche par athlète, avec des cases vides que
les juges remplissent sur le terrain, la table reportant ensuite. C'est aussi
le repli hors ligne que `A-FAIRE.md` réclamait depuis le portage.

`/admin/impression/fiches` (toutes) ou `?athlete=<id>` (une seule). Une feuille
A4 par athlète. **Règle de conception : le papier demande exactement ce que
l'écran demandera à la ressaisie, avec les mêmes mots** — « Nombre validé »,
« Temps du dernier tour (s) », « Durée tenue (s) »… tirés des mêmes fonctions
que le plateau (`uniteValeur`, `libelleTemps`, `mesureMixte`). Un juge n'a rien
à traduire. Vingt cases à barrer par épreuve à répétitions, verdict à cocher,
juge et heure par ligne, signatures et « reporté le … par … » en pied.

Le bandeau et le fil d'Ariane disparaissent à l'impression (`.chrome-admin`).

### 2026-09-17 — Audit de cohérence à la demande de Kevin

Toutes les données en base sont de test. Quatre incohérences trouvées :

- **`medley` absent du type `Mesure`** — la mesure est proposée partout, mais
  les pages la faisaient passer par un `as Mesure`. Le classement était juste
  par accident. Type complété, et `versMesure()` remplace les casts aveugles :
  une valeur inconnue retombe sur un défaut sûr et le dit dans les journaux.
- **Trou entre catégories** — les bornes saisies (≤ 105,5 / > 105,6) laissent
  105,6 kg sans catégorie. Rien ne le signalait avant la pesée. Détecteur
  ajouté (`incoherencesCategories`), affiché à l'étape Groupes et au
  récapitulatif. Les bornes elles-mêmes restent à corriger → `A-FAIRE.md`.
- **`essais` sans effet** — enregistré, modifiable, exporté, jamais lu. Le
  plateau ne crée qu'un passage par athlète. Pas de fonction ajoutée à deux
  jours de l'épreuve : l'interface dit maintenant la vérité, et la limite est
  consignée.
- **Compteur de tours désactivé** sur les quatre épreuves en répétitions — la
  base avait été installée avant que le seed le renseigne. Or c'est ce bouton
  qui relève le temps de départage que la fédération vient de souligner.
  Rétabli selon la configuration d'origine, tracé au journal ; l'étape
  Épreuves avertit désormais quand une épreuve en répétitions n'a pas de
  compteur.

Et une correction de ma part : un test de l'empreinte cherchait « un passage à
venir » **sans filtrer par compétition** — voir la leçon du 2026-09-17.

### 2026-09-16 (3) — Premiers retours du terrain

**Trois pannes signalées après le déploiement, une seule était connue.**

- Choisir une catégorie renvoyait « A server error occurred », aux étapes
  Athlètes comme Pesée. Cause : `sql` + `any(${tableau})`, aplati par drizzle
  en paramètres séparés. Le même motif servait à deux autres endroits jamais
  signalés et pires — `appelerAuPlateau` plantait à **chaque appel sauf le
  premier**, et « Reconstruire l'ordre » dès qu'une file existait. Corrigé par
  `inArray()` aux trois endroits, et les écritures sont sorties dans
  `src/lib/plateau.ts` pour être enfin testables — 13 tests couvrent
  maintenant l'appel au plateau, le retour en file et la reconstruction.
- Le poids déclaré n'était saisissable nulle part : il n'arrivait que par
  l'import. Rendu modifiable. Le poids de la pesée reste en lecture seule —
  il engage un officiel — mais la fiche dit maintenant où le saisir.
- `BLOB_READ_WRITE_TOKEN` manque : aucune photo ne peut être déposée. Ce
  n'est pas une panne mais une configuration Vercel jamais faite. Marche à
  suivre dans `A-FAIRE.md` § 1.

### 2026-09-16 (suite) — Saisies fautives, téléphone, et vérification en ligne

**Fait**

- Couche de validation (`src/lib/validation.ts`) : une saisie incomprise est
  refusée avec un message qui dit ce qui est attendu, au lieu d'être
  réinterprétée en silence. 26 tests de plus, total 82.
- Bug du clavier corrigé : le champ de code portait `inputMode="numeric"`,
  hérité du PIN de l'original — sur téléphone, aucun mot de passe
  alphanumérique n'était saisissable.
- Mise en page téléphone : grilles qui débordaient sous 340 px, zoom
  automatique de Safari, bandeau qui ne se repliait pas.
- Manifeste PWA, icônes dérivées du logo fédéral, marges d'encoche.
- Déploiement vérifié en ligne de bout en bout (voir « État actuel »).

---

## 🎓 Leçons apprises

### Un cache « seulement en développement » est un cache absent là où il compte (2026-09-16)

*Au coffre : `brain/10-lecons/un-cache-seulement-en-developpement-est-absent-la-ou-il-compte.md`.*

**Symptôme.** Les pages mettaient 5 à 8 secondes en production, sans que la
requête SQL elle-même soit lente.

**Cause.** `src/lib/db/index.ts` posait le pool PostgreSQL sur `globalThis`
**uniquement si `NODE_ENV !== "production"`** — le garde-fou écrit pour le
rechargement de modules en développement. En production, `globalThis.__sm_db`
restait donc vide, et le proxy rappelait `ouvrir()` à **chaque accès à une
propriété** de `db`, c'est-à-dire à chaque requête. Mesuré : **57 pools ouverts
pour 3 requêtes**, soit autant de poignées de main TLS vers Supabase, et autant
de pools abandonnés.

**Règle.** Un cache de connexion se pose **dans tous les environnements**. Le
besoin du développement (survivre au rechargement des modules) s'ajoute à celui
de la production (ne pas rouvrir la connexion), il ne s'y substitue pas. Et une
lenteur se **mesure** avant d'être expliquée : c'est le compteur de pools, pas
le raisonnement, qui a tranché.

### Des tests qui n'écrivent jamais ne protègent pas les écritures (2026-09-16)

*Au coffre : `brain/10-lecons/des-tests-qui-n-ecrivent-jamais-ne-protegent-pas-les-ecritures.md`.*

**Symptôme.** Trois actions d'écriture plantaient en production —
`affecterCategorie`, `appelerAuPlateau`, `construireFile` — alors que la suite
de tests affichait 82/82.

**Cause.** Les tests couvraient la logique pure : le barème, les départages,
l'ordre de passage, la lecture des listes. Ils calculaient beaucoup et
n'écrivaient rien. Le défaut, lui, était dans la **sérialisation SQL** d'un
tableau (`any(${tableau})`, qu'aucun calcul ne traverse). Pire, deux des trois
chemins ne plantaient qu'au **deuxième** appel, quand le tableau à traiter
cessait d'être vide : même un essai manuel rapide les aurait manqués.

**Règle.** Une suite de tests doit **exécuter** les écritures, pas seulement
vérifier ce qui les précède — et les exécuter dans l'état où elles font
vraiment quelque chose : file déjà remplie, plateau déjà occupé. Le cas
intéressant n'est jamais le premier appel sur une base vide.

**Conséquence sur la structure** : une Server Action commence par
`exigerSession()`, qui lit les cookies de la requête — hors requête, elle ne
s'exécute pas du tout, donc elle n'est pas testable. Les écritures du plateau
vivent désormais dans `src/lib/plateau.ts`, en fonctions ordinaires, et les
actions n'en gardent que l'enveloppe : session, journal, rafraîchissement. Ce
qui décide de l'état de la compétition doit pouvoir être appelé par un test.

### Un libellé hérité de l'original ne dit pas ce que fait le bouton (2026-09-19)

*Au coffre : seconde occurrence dans `brain/10-lecons/une-consigne-executable-se-redige-contre-le-code.md`.*

**Symptôme.** Le mode d'emploi disait que valider la pesée « attribue le
dossard ». Personne ne l'avait signalé.

**Cause.** La phrase vient du chapeau de l'écran d'origine, repris au portage.
Dans le code, le dossard se saisit à la main et la validation le réclame. La
réécriture du mode d'emploi « contre le code » (session 24) l'avait laissée
passer : elle ressemblait à une citation de l'écran, donc à un fait.

**Règle.** Dans le mode d'emploi, un verbe d'action prêté au logiciel
(« attribue », « calcule », « range ») se vérifie dans l'action serveur, pas
dans le libellé de l'écran — même quand ce libellé vient de l'original.

### Un déploiement se prouve par un contenu propre au commit (2026-09-19)

*Au coffre : troisième occurrence dans `brain/10-lecons/verifier-chaque-commit-du-decoupage.md`.*

**Symptôme.** Statut Vercel `pending` alors que la production servait déjà le
nouveau build ; au push précédent, `success` sans preuve que l'alias suivait.

**Règle.** Après un push, chercher sur une page publique (`/aide`) une phrase
qui n'existe que dans le commit, et vérifier que l'ancienne a disparu. Le
statut se lit sans `gh` : `api.github.com/repos/Ariel013/strongmanrepo/commits/<sha>/status`.
Ce qui est derrière la connexion se dit « déployé, non vu à l'écran ».

### Un champ qui se resynchronise depuis le serveur écrase la frappe en cours (2026-09-17)

**Symptôme.** « Ça se supprime, il faut réécrire plusieurs fois. » Un nom tapé
d'une traite perdait sa fin.

**Cause.** Enregistrement automatique après une pause de frappe, puis
rafraîchissement de la page par le serveur. Le champ adoptait la valeur
serveur dès qu'elle changeait — or elle change précisément parce qu'on vient
d'envoyer une version partielle. En local, l'aller-retour tient dans la pause
et le défaut ne se voit pas ; en ligne, il dépasse et le défaut est
systématique.

**Règle.** Un champ contrôlé qui s'enregistre tout seul n'adopte la valeur du
serveur qu'**au repos** : curseur sorti, rien en vol, rien en attente. Et une
saisie automatique se teste sur la latence réelle, pas en local.

### Un sélecteur sans option est un blanc muet, signalé comme une panne de sauvegarde (2026-09-17)

*Au coffre : troisième occurrence dans `brain/10-lecons/une-fonctionnalite-invisible-est-absente.md`.*

**Symptôme.** « Le niveau ne passe pas pour Piliers d'Hercule, le select dit de
choisir mais ça ne prend pas. »

**Cause.** En base, `niveau = true` et `niveaux_options = null` : le sélecteur
n'avait que son libellé. Rien n'était cassé côté enregistrement.

**Règle.** Devant un rapport qui décrit un effet, lire la donnée avant le code.
Et ne jamais servir un sélecteur sans option : saisie libre, et dire où
renseigner la liste.

### Un état ajouté rend faux les messages qui énumèrent les états (2026-09-17)

*Au coffre : seconde occurrence dans `brain/10-lecons/une-enumeration-de-champs-se-teste.md`.*

**Symptôme.** Après « Reconstruire l'ordre », Kevin voit revenir « certains
athlètes mais pas tous » et un message « tous les passages sont déjà validés ».

**Cause.** Le statut « en attente de résultat » avait été ajouté avec ses tests
et ses filtres, mais le message de reconstruction, écrit pour trois états,
n'avait pas été relu. Il était faux dès qu'un passage attendait.

**Règle.** Un nouvel état déclenche un grep de tous les `statut ===` **et** de
tous les messages qui parlent des états. Les tests attrapent les filtres, pas
les phrases.

### Un test doit être borné à SA compétition, sans exception (2026-09-17)

*Au coffre : `brain/10-lecons/un-test-se-borne-a-son-propre-jeu-de-donnees.md`.*

**Symptôme.** Un test de l'empreinte de fraîcheur échouait par intermittence.

**Cause.** La requête qui cherchait « un passage à venir » n'était filtrée que
sur le statut : `where(eq(passage.statut, "avenir"))`. Elle attrapait donc le
premier passage de TOUTE la base — donc celui de la compétition réelle, qu'elle
faisait passer au plateau puis revenir. Le test comparait ensuite une empreinte
calculée sur la compétition jetable, qui n'avait évidemment pas bougé.

L'échec a rendu la faute visible ; sans lui, un test aurait continué à toucher
les données réelles en silence.

**Règle.** Toute requête d'un test porte `competitionId` — ou un identifiant de
ligne connu. Le filtre n'est pas une optimisation, c'est la frontière entre le
bac à sable et la compétition. Vérifié depuis par un contrôle sur le fichier de
tests lui-même.

### Un symptôme local ne se reporte pas en production sans l'avoir mesuré (2026-09-16)

*Au coffre : seconde occurrence dans `brain/10-lecons/verifier-chaque-commit-du-decoupage.md`.*

**Symptôme.** J'ai annoncé, dans un rapport et dans `A-FAIRE.md`, que
`ADMIN_PASSWORD_HASH` était malformée et **bloquait toute connexion, en local
comme en ligne**. C'était faux : la production répondait `etat: en ordre`.

**Cause.** Le diagnostic venait du `/api/sante` **local**, lu sur le `.env` du
poste. J'ai étendu la conclusion à la production sans l'interroger — alors
qu'une requête suffisait, et que l'environnement en ligne a ses propres
variables, précisément pour cette raison.

**Règle.** Un état de production s'affirme après l'avoir interrogé, jamais par
extrapolation depuis le poste de développement. C'est la même règle que pour
la lenteur, qui n'a été comprise qu'une fois comptée : **ne jamais affirmer un
résultat non mesuré**, et nommer l'environnement mesuré dans l'affirmation.

### Quand un test échoue, vérifier d'abord le test contre la source (2026-09-16)

**Symptôme.** Le test « l'invité n'a pas de rang malgré la meilleure
performance » échouait : le rang valait `undefined`, pas `null`.

**Cause.** Le portage écarte l'invité du tableau **dès le départ**, il n'y
figure pas du tout. C'était le test qui postulait autre chose — et la lecture
du poste d'origine (`filter(a => !horsClassement(a))`) a montré qu'il faisait
exactement pareil. Le code était fidèle, l'attente ne l'était pas.

**Règle.** Sur un portage, la référence n'est pas l'intuition : c'est
`docs/reference/`. Un écart se tranche en relisant l'original, pas en corrigeant
le code vers ce qu'on croit juste.

### Un écran qui ne montre que ce qui existe doit dire ce qui manque (2026-09-17)

*Au coffre : seconde occurrence dans `brain/10-lecons/une-fonctionnalite-invisible-est-absente.md`.*

**Symptôme.** Deux athlètes de « Plus de 105 kg », rangés, pesés, numérotés,
n'apparaissaient pas au plateau — ni dans leur catégorie, ni « toutes
mélangées ». Tout semblait un bug de filtre.

**Cause.** Ils avaient été inscrits **après** le préchargement. Aucun passage
n'existait pour eux ; le plateau n'affiche que les passages ; et « Précharger
toutes les épreuves » sautait toute épreuve ayant déjà une file. Trois
comportements exacts, un résultat faux — et pas un mot à l'écran.

**Au passage.** « Reconstruire l'ordre » d'une seule catégorie effaçait les
passages non terminés de **l'autre** catégorie : la file de « Moins de 105 »
disparaissait si l'on refaisait celle de « Plus de 105 ». Jamais cliqué en
prod, trouvé en lisant le code. Corrigé par un périmètre explicite.

**Règle.** Un écran qui ne liste que ce qui est *créé* doit nommer ce qui
*aurait dû l'être* — ici les athlètes rangés sans passage, avec le bouton à
cliquer. Et toute action de reconstruction s'exécute **dans un périmètre**
qu'on lui donne, jamais « tout ce qu'il y a ».
