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

*(Mis à jour le 2026-09-16.)*

- **Front** : portage fidèle du poste autonome terminé. Relevé automatique :
  **96 % des textes visibles** de l'original retrouvés ; les 4 % restants sont
  les trois écarts assumés (mode démo → [ADR 0003](docs/decisions/0003-un-seul-espace-de-donnees-pas-de-mode-demonstration.md),
  compte unique à la connexion, import limité au CSV et au texte collé).
- **Vérifications** : `pnpm run build` ✓, `pnpm run lint` ✓, `pnpm run test`
  **88/88** ✓. Les routes répondent 200 sur un build de production local.
- **Base** : migrations `0001` et `0002` appliquées sur Supabase le 2026-09-16.
- **Branche** : `main` alignée avec `origin/main` sur `14b8ca5`, poussée le
  2026-09-16 (vérifié par `git fetch` puis comparaison des SHA).
- **Déploiement** : ✅ **vérifié en ligne le 2026-09-16** sur
  https://strongman-pied.vercel.app — `/api/sante` répond `etat: en ordre`,
  les 7 écrans publics servent du vrai contenu, la garde d'accès renvoie 307
  et 401, les 5 en-têtes de sécurité sont posés, le manifeste PWA et ses
  icônes répondent.
- **Vitesse en ligne** : sur connexion réutilisée, `/ecran/classement` répond
  en 0,32 s et `/api/ecran/etat` en 0,28 s — soit **~40 ms de travail serveur**
  au-dessus du plancher réseau. Le reste est le trajet Abidjan → `cpt1` →
  `dub1`, qui ne se règle pas depuis le code.

- **Prochaine action** : rien ne bloque la compétition. Le plus utile
  maintenant est de **se connecter à l'administration en ligne et de dérouler
  une épreuve de bout en bout** — appel, chrono, validation, mur LED — sur du
  matériel réel. **Critère de fin** : un passage validé apparaît sur
  `/ecran/classement` en moins de deux secondes.

---

## 📓 Journal des sessions

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

### 2026-09-16 (3) — Premiers retours du terrain

**Trois pannes signalées après le déploiement, une seule était connue.**

- Choisir une catégorie renvoyait « A server error occurred », aux étapes
  Athlètes comme Pesée. Cause : `sql` + `any(${tableau})`, aplati par drizzle
  en paramètres séparés. Le même motif servait à deux autres endroits jamais
  signalés et pires — `appelerAuPlateau` plantait à **chaque appel sauf le
  premier**, et « Reconstruire l'ordre » dès qu'une file existait. Corrigé par
  `inArray()` aux trois endroits.
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

### Un symptôme local ne se reporte pas en production sans l'avoir mesuré (2026-09-16)

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
