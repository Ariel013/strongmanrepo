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
  **50/50** ✓. Les 12 routes répondent 200 sur un build de production local.
- **Base** : migrations `0001` et `0002` appliquées sur Supabase le 2026-09-16.
- **Déploiement** : ⬜ **non vérifié en ligne depuis le portage.**
- **Branche** : `main`, 4 commits d'avance sur `origin/main` — **non poussés**
  (le push attend une confirmation explicite, à chaque fois).

- **🔴 Prochaine action** : régénérer `ADMIN_PASSWORD_HASH`
  (`pnpm run motdepasse`), la reporter dans `.env` et dans Vercel.
  **Critère de fin** : `GET /api/sante` répond `état: ok`, et la connexion
  s'ouvre sur `/admin`. Tant que ce n'est pas fait, personne ne peut entrer
  dans l'administration — voir `A-FAIRE.md` § 1.

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
- Suite de tests fonctionnels (`pnpm run test`) : 50 vérifications sur le
  barème, les départages, l'ordre de passage et la lecture des listes.
- En-têtes de sécurité ajoutés (il n'y en avait aucun), nom de fichier
  téléversé assaini, catégorie d'affectation relue en base.

**Découvert**

- La lenteur en production venait du cache du pool PostgreSQL, posé **hors
  production seulement**. Voir « Leçons » ci-dessous.
- `pnpm run db:push` ne fonctionne pas sur Supabase. `pnpm run db:migrer` a été
  écrit pour appliquer le SQL versionné.
- `ADMIN_PASSWORD_HASH` est malformée depuis avant cette session.

**Reste ouvert**

- Les écrans LED refont **tout le rendu serveur toutes les 2 secondes**. Les
  faire interroger une route JSON légère diviserait le nombre d'invocations
  Vercel. Levier identifié, non pris : il touche l'architecture du rendu, pas
  le front.
- Aucune vérification en ligne depuis le portage.

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
