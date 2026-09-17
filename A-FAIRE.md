# À FAIRE — actions manuelles, opérationnelles et externes en attente

Ce fichier recense tout ce qui doit être fait **hors code** : comptes à créer,
secrets à renseigner, migrations à appliquer, décisions à trancher, prérequis
externes.

> **Règle de tenue :** dès qu'une tâche fait apparaître une action manuelle ou
> externe, elle est ajoutée ici **dans la même tâche**, avec la date. On ne
> laisse aucun prérequis implicite.

Dernière mise à jour : 2026-09-16 (retours du premier déploiement).

---

## 1. Variables d'environnement / secrets

| Variable | Où l'obtenir | Statut |
|---|---|---|
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler (port 6543)** | ✅ en place |
| `SESSION_SECRET` | `openssl rand -base64 48` | ✅ en place |
| `ADMIN_PASSWORD_HASH` | `pnpm run motdepasse` | ✅ en ligne · 🟠 malformée **en local** |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob | 🟠 **absente — aucune photo ne peut être déposée** |

### 🟠 `ADMIN_PASSWORD_HASH` — en local seulement (relevé le 2026-09-16)

**En ligne, tout va bien.** `GET /api/sante` sur la production répond
`{"etat":"en ordre","problemes":[]}` : la connexion à l'administration
fonctionne. Vérifié le 2026-09-16 sur https://strongman-pied.vercel.app.

C'est le fichier `.env` **du poste de développement** qui porte une valeur
malformée ; `pnpm run db:verifier` et le `/api/sante` local répondent :

> `ADMIN_PASSWORD_HASH malformée : attendu « pbkdf2$…$…$… ». Avez-vous collé le
> mot de passe au lieu de son empreinte ?`

Conséquence : impossible d'ouvrir une session **en local**. Sans effet sur la
compétition. À corriger pour pouvoir tester l'administration sur le poste.

Marche à suivre :

```bash
pnpm run motdepasse          # demande le code, affiche l'empreinte
```

Reporter l'empreinte **entière** (elle commence par `pbkdf2$`) dans `.env`.
Vérifier ensuite avec `GET /api/sante`, qui doit répondre `etat: en ordre`.

> ⚠️ **Ne pas toucher à la valeur de Vercel** : elle est correcte, et la
> changer déconnecterait immédiatement toutes les sessions ouvertes.

### 🟠 `BLOB_READ_WRITE_TOKEN` — photos impossibles (constaté en ligne le 2026-09-16)

L'envoi d'une photo répond :

> `Aucun espace de stockage d'images configuré sur ce poste
> (BLOB_READ_WRITE_TOKEN). La fiche reste utilisable sans photo.`

Ce n'est pas une panne : le message est celui prévu quand le stockage n'est pas
branché, et tout le reste fonctionne — la vignette retombe sur les initiales de
l'athlète. Mais **aucune photo ne peut être déposée** tant que le jeton manque,
ni pour les athlètes, ni pour les logos des clubs.

Marche à suivre, entièrement sur vercel.com :

1. Projet **strongman** → onglet **Storage** → **Create Database** → **Blob**.
   ⚠️ **Choisir l'accès PUBLIC.** Le mode se fixe à la création. Un magasin
   privé exige une authentification pour *lire* chaque image — or le mur LED
   n'a pas de session : les photos y resteraient invisibles.
2. Nommer le magasin, puis **Connect to Project** en cochant les trois
   environnements (Production, Preview, Development).
   Vercel écrit alors `BLOB_READ_WRITE_TOKEN` tout seul dans les variables.
3. **Redéployer** — une variable ajoutée ne s'applique qu'au déploiement
   suivant : onglet Deployments → ⋯ sur le dernier → **Redeploy**.
4. Vérifier **sans se connecter** : `GET /api/sante` doit montrer
   `BLOB_READ_WRITE_TOKEN: true` et aucun avertissement. S'il reste `false`
   alors que la variable existe dans Vercel, c'est que le déploiement en cours
   est **antérieur** à son ajout — redéployez.
5. Puis déposer une photo sur une fiche athlète.

> ⚠️ Le magasin Blob crée **trois** variables : `BLOB_READ_WRITE_TOKEN`,
> `BLOB_STORE_ID` et `BLOB_WEBHOOK_PUBLIC_KEY`. Seule la première sert au
> dépôt des photos — elle commence par `vercel_blob_rw_`.

**Constaté le 2026-09-16 (2) :** le premier magasin créé l'était en accès
**privé**, d'où « Cannot use public access on a private store ». Il faut un
magasin **public** — voir l'avertissement de l'étape 1.

**Constaté le 2026-09-16 :** les trois variables existaient bien dans le
déploiement, mais `BLOB_READ_WRITE_TOKEN` avait une **valeur vide**. Côté code
c'est indiscernable d'une variable absente, alors que l'interface de Vercel la
montre comme présente — on cherche un problème de déploiement là où il faut
simplement coller la valeur. `GET /api/sante` distingue maintenant les deux.

Pour travailler en local avec les photos, recopier la valeur depuis
Settings → Environment Variables dans le `.env` du poste.

> Les photos vivent chez Vercel Blob et **n'entrent pas dans l'export Excel** :
> voir § 5.

## 2. Comptes / services externes

| Service | Usage | Statut |
|---|---|---|
| Supabase | PostgreSQL (région `eu-west-1`) | ✅ en place |
| Vercel | Hébergement (région `dub1`, même région que la base) | ✅ en place |
| Vercel Blob | Photos des athlètes et logos des clubs | 🟠 à activer — voir § 1 |

## 3. Migrations à appliquer

| Migration | Environnement | Statut |
|---|---|---|
| `0000_quiet_pete_wisdom` | Supabase | ✅ appliquée |
| `0001_graceful_ben_grimm` (programme, récompenses, sorties, logos, niveaux) | Supabase | ✅ appliquée le 2026-09-16 |
| `0002_clean_marrow` (état du chronomètre) | Supabase | ✅ appliquée le 2026-09-16 |
| `0003_little_sharon_carter` (date de naissance dans `athlete_contact`, colonne `age` retirée) | Supabase | ✅ appliquée le 2026-09-17 |
| `0004_slimy_dagger` (colonne `couleur` sur `categorie`) | Supabase | ✅ appliquée le 2026-09-17 |
| `0005_sturdy_norman_osborn` (colonne `chrono_s` sur `passage`) | Supabase | ✅ appliquée le 2026-09-17 |
| `0006_closed_pestilence` (colonne `categorie_id` sur `officiel`) | Supabase | ✅ appliquée le 2026-09-17 |

> ⚠️ `pnpm run db:push` **échoue sur Supabase** : l'introspection de drizzle-kit
> trébuche sur les contraintes CHECK des schémas internes. Utiliser
> `pnpm run db:migrer`, qui applique le SQL versionné de `drizzle/`.

## 4. Limites connues du logiciel

| Limite | Effet | Contournement |
|---|---|---|
| **Essais multiples non gérés** — `epreuve.essais` est enregistré et exporté, mais le plateau ne crée qu'un passage par athlète | une épreuve à 3 essais se comporte comme à 1 essai ; rouvrir un passage **remplace** le résultat au lieu d'ajouter une tentative | saisir directement la meilleure tentative, ou noter les essais sur la feuille papier |
| ~~Trou entre catégories~~ (≤ 105,5 / > 105,6) | ~~105,6 kg sans catégorie~~ | ✅ **corrigé le 2026-09-17** : bornes à 105 / 105, contrôle sans trou ni recouvrement. L'étape Groupes signalerait toute régression. |

## 5. Décisions en attente

| Question | Qui tranche | Échéance | Impact si non tranché |
|---|---|---|---|
| Faut-il un espace d'entraînement pour former les officiels ? | Kevin | avant la formation du jury | Les officiels s'entraînent sur la vraie compétition — voir [ADR 0003](docs/decisions/0003-un-seul-espace-de-donnees-pas-de-mode-demonstration.md) |
| Import Word / PDF nécessaire, ou CSV suffit-il ? | Kevin, selon le format reçu de la fédération | avant les engagements | La liste devra être recopiée à la main dans le cadre « coller la liste » |
| Noms des officiels et codes du jury | Direction de compétition | avant le procès-verbal | Le PV ne peut pas être signé |

## 6. Ops et sauvegardes

- **Sauvegarde applicative** : bouton « Exporter la sauvegarde » du bandeau
  (`/api/admin/export`), qui produit un classeur Excel complet — athlètes,
  épreuves, résultats, classements. À lancer **avant la compétition et après
  chaque épreuve**, et à déposer hors du poste : clé USB, second ordinateur.
- **Mise en pause Supabase** : en offre gratuite, un projet sans requête
  pendant une semaine est **mis en pause** — les données restent, mais la base
  est injoignable jusqu'à une reprise manuelle, qui prend du temps. Le jour de
  la compétition, c'est le scénario à exclure. ✅ **Un cron Vercel appelle
  `/api/sante` chaque jour à 06 h UTC** (`vercel.json`), ce qui interroge la
  base et le stockage. ⬜ **Vérifier dans Vercel → Settings → Cron Jobs** que le
  cron est bien enregistré après le déploiement, et qu'il a tourné au moins
  une fois (onglet Logs). La pause et la perte sont deux choses différentes :
  le cron évite la première, pas la seconde.
- **Sauvegarde base** : celle de Supabase, selon le plan souscrit. ⬜ **Non
  vérifiée à ce jour** — une sauvegarde qu'on n'a jamais restaurée n'est pas
  une sauvegarde. À tester une fois sur une base jetable avant le jour J.
- **Non couvert par la sauvegarde Excel** : les photos des athlètes et les
  logos des clubs, qui vivent sur Vercel Blob et n'entrent pas dans l'export.
- **Coupure réseau le jour J** : les écrans publics et la table dépendent tous
  du serveur. Il n'y a pas de repli hors ligne — c'est le principal écart avec
  le poste autonome d'origine. ✅ **Procédure papier en place le 2026-09-17** :
  depuis le plateau, **« Imprimer la feuille »** sort la feuille de notation de
  l'épreuve en cours — tous les athlètes dans l'ordre de passage, une ligne à
  remplir chacun, colonnes aux intitulés exacts de l'écran. ⬜ **À imprimer
  pour chaque épreuve la veille**, et à garder à la table. (La fiche par
  athlète, toutes épreuves, reste disponible depuis l'étape Athlètes.)
