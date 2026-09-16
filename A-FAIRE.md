# À FAIRE — actions manuelles, opérationnelles et externes en attente

Ce fichier recense tout ce qui doit être fait **hors code** : comptes à créer,
secrets à renseigner, migrations à appliquer, décisions à trancher, prérequis
externes.

> **Règle de tenue :** dès qu'une tâche fait apparaître une action manuelle ou
> externe, elle est ajoutée ici **dans la même tâche**, avec la date. On ne
> laisse aucun prérequis implicite.

Dernière mise à jour : 2026-09-16 (déploiement vérifié en ligne).

---

## 1. Variables d'environnement / secrets

| Variable | Où l'obtenir | Statut |
|---|---|---|
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler (port 6543)** | ✅ en place |
| `SESSION_SECRET` | `openssl rand -base64 48` | ✅ en place |
| `ADMIN_PASSWORD_HASH` | `pnpm run motdepasse` | ✅ en ligne · 🟠 malformée **en local** |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob | ⬜ absente — les photos sont refusées proprement |

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

### ⬜ `BLOB_READ_WRITE_TOKEN` — photos des athlètes

Sans ce jeton, l'envoi d'une photo est refusé avec un message explicite et la
fiche reste utilisable : la vignette retombe sur les initiales de l'athlète.
À renseigner avant la pesée si les photos doivent apparaître sur le mur LED.

## 2. Comptes / services externes

| Service | Usage | Statut |
|---|---|---|
| Supabase | PostgreSQL (région `eu-west-1`) | ✅ en place |
| Vercel | Hébergement (région `dub1`, même région que la base) | ✅ en place |
| Vercel Blob | Photos des athlètes et logos des clubs | ⬜ à activer |

## 3. Migrations à appliquer

| Migration | Environnement | Statut |
|---|---|---|
| `0000_quiet_pete_wisdom` | Supabase | ✅ appliquée |
| `0001_graceful_ben_grimm` (programme, récompenses, sorties, logos, niveaux) | Supabase | ✅ appliquée le 2026-09-16 |
| `0002_clean_marrow` (état du chronomètre) | Supabase | ✅ appliquée le 2026-09-16 |

> ⚠️ `pnpm run db:push` **échoue sur Supabase** : l'introspection de drizzle-kit
> trébuche sur les contraintes CHECK des schémas internes. Utiliser
> `pnpm run db:migrer`, qui applique le SQL versionné de `drizzle/`.

## 4. Décisions en attente

| Question | Qui tranche | Échéance | Impact si non tranché |
|---|---|---|---|
| Faut-il un espace d'entraînement pour former les officiels ? | Kevin | avant la formation du jury | Les officiels s'entraînent sur la vraie compétition — voir [ADR 0003](docs/decisions/0003-un-seul-espace-de-donnees-pas-de-mode-demonstration.md) |
| Import Word / PDF nécessaire, ou CSV suffit-il ? | Kevin, selon le format reçu de la fédération | avant les engagements | La liste devra être recopiée à la main dans le cadre « coller la liste » |
| Noms des officiels et codes du jury | Direction de compétition | avant le procès-verbal | Le PV ne peut pas être signé |

## 5. Ops et sauvegardes

- **Sauvegarde applicative** : bouton « Exporter la sauvegarde » du bandeau
  (`/api/admin/export`), qui produit un classeur Excel complet — athlètes,
  épreuves, résultats, classements. À lancer **avant la compétition et après
  chaque épreuve**, et à déposer hors du poste : clé USB, second ordinateur.
- **Sauvegarde base** : celle de Supabase, selon le plan souscrit. ⬜ **Non
  vérifiée à ce jour** — une sauvegarde qu'on n'a jamais restaurée n'est pas
  une sauvegarde. À tester une fois sur une base jetable avant le jour J.
- **Non couvert par la sauvegarde Excel** : les photos des athlètes et les
  logos des clubs, qui vivent sur Vercel Blob et n'entrent pas dans l'export.
- **Coupure réseau le jour J** : les écrans publics et la table dépendent tous
  du serveur. Il n'y a pas de repli hors ligne — c'est le principal écart avec
  le poste autonome d'origine. ⬜ Prévoir une procédure papier (feuille de
  notation) en cas de panne prolongée.
