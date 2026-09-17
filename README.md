# Arbitrage Strongman 2026 — FIBDA

Gestion et arbitrage du Championnat National de Strongman, pour la Fédération
Ivoirienne de Bodybuilding, Dynamophilie et Assimilés.

Le logiciel tient la compétition en direct : saisie des athlètes, pesée,
ordre de passage, chronométrage, validation des performances, classement, et
affichage sur le mur LED de la salle.

## Comment ça marche

L'application est en trois parties, aux accès distincts :

| Chemin | Qui | Accès |
|---|---|---|
| `/admin` | Accueil du championnat | code d'accès |
| `/admin/preparation?etape=0…5` | Épreuves, groupes, officiels, athlètes, pesée, programme | code d'accès |
| `/admin/recapitulatif` | Ce qui est prêt, ce qui manque | code d'accès |
| `/admin/plateau` | Jour J : appel, chronomètre, saisie, validation | code d'accès |
| `/admin/regie` | Sorties vidéo et contenu des écrans géants | code d'accès |
| `/ecran/…` | Mur LED, public | libre, lecture seule |
| `/aide` | Officiels en formation | libre |

Neuf écrans publics : `plateau`, `ordre`, `verdict`, `resultats`, `classement`, `podium`, `clubs`,
`attente`, `mire`. Chacun s'ouvre en plein écran sur sa sortie vidéo ; la régie
dit seulement lequel va où.

L'interface est le portage fidèle du poste autonome d'origine
(`docs/reference/`) : la charte, les compositions et les libellés sont repris
valeur par valeur, et `docs/cartographie-ui.md` sert de pièce de comparaison.

Les écrans publics se rafraîchissent seuls toutes les deux secondes. Ils ne
lisent jamais les coordonnées personnelles : celles-ci vivent dans une table
séparée (`athlete_contact`) qu'ils n'interrogent pas.

## Le barème

`Points = N − rang + 1`, où **N est l'effectif classable de la catégorie**,
que chacun ait concouru ou non. Dans une catégorie de huit, le premier marque
huit points.

Les points ne sont **jamais stockés** : ils se recalculent à chaque affichage.
C'est nécessaire, pas élégant — retirer un athlète change l'effectif, donc
change rétroactivement les points de toute sa catégorie. Une valeur figée
serait fausse dès la première disqualification.

Départages d'une épreuve, dans l'ordre : la performance, puis le temps
intermédiaire le plus court, puis le poids de corps le plus léger. Au général :
le total, puis le nombre de premières, deuxièmes et troisièmes places.

L'ordre de passage suit les dossards croissants à la première épreuve, puis va
du moins de points au plus de points — le leader ferme la marche.

**Classement des clubs** (`/admin/clubs`, écran `clubs`) : le rang final de
chaque athlète dans sa catégorie rapporte à son club 15, 10, 5, 4 ou 3 points
pour les cinq premiers, 1 point pour tout autre classé. Toutes catégories
retenues confondues ; un athlète sans club ne rapporte rien.

Le détail complet des règles est dans `docs/regles-metier.md`.

## Installation

```bash
pnpm install
cp .env.example .env     # puis renseigner les valeurs
pnpm run motdepasse      # génère ADMIN_PASSWORD_HASH
pnpm run db:migrer       # applique les migrations de drizzle/
pnpm run db:seed         # épreuves, catégories, programme, récompenses
pnpm run dev
```

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | PostgreSQL. **Avec Supabase, utiliser l'adresse du *pooler* (port 6543)** : l'adresse directe ne résout qu'en IPv6 et reste injoignable depuis la plupart des hébergeurs. |
| `SESSION_SECRET` | Signature des sessions, 32 caractères minimum (`openssl rand -base64 48`). La changer déconnecte tout le monde. |
| `ADMIN_PASSWORD_HASH` | Empreinte PBKDF2 du code d'accès, **jamais le mot de passe**. Produite par `pnpm run motdepasse`. |
| `BLOB_READ_WRITE_TOKEN` | Photos des athlètes (Vercel Blob). Facultatif. |

Sur une plateforme de déploiement, ces valeurs se saisissent **sans les
guillemets** qui les entourent dans le fichier `.env`.

### Vérifier une installation

```bash
pnpm run db:verifier     # la base répond-elle ?
pnpm run test            # le barème et l'ordre de passage sont-ils justes ?
```

`pnpm run test` travaille sur une compétition jetable, créée puis supprimée :
il ne touche jamais la compétition réelle.

En ligne, `GET /api/sante` nomme ce qui manque — variables absentes, base
injoignable, erreurs de copie courantes. Elle n'expose aucune valeur de secret.

## Scripts

| Commande | Effet |
|---|---|
| `pnpm run dev` | Serveur de développement |
| `pnpm run build` | Compilation de production |
| `pnpm run motdepasse` | Génère l'empreinte du code d'accès |
| `pnpm run db:verifier` | Teste la connexion à la base |
| `pnpm run db:motdepasse` | Met à jour le mot de passe dans `DATABASE_URL` |
| `pnpm run db:seed` | Installe la compétition ; relancé, complète seulement ce qui manque |
| `pnpm run db:generate` | Génère une migration après modification du schéma |
| `pnpm run db:migrer` | Applique les migrations de `drizzle/` (`db:push` échoue sur Supabase) |
| `pnpm run test` | Vérifie le barème, l'ordre de passage et la lecture des listes |

## Sécurité

- Le code d'accès n'existe nulle part en clair : seulement une empreinte
  PBKDF2 salée (210 000 itérations), comparée en temps constant.
- Deux barrières indépendantes : le middleware bloque l'affichage de
  `/admin`, et **chaque écriture revérifie la session**. Une Server Action
  est une route HTTP appelable directement — se fier au seul middleware
  laisserait la porte ouverte.
- Les données personnelles sont isolées dans une table que les routes
  publiques n'interrogent pas.
- Toute écriture touchant un résultat est tracée dans `journal`, en
  append-only. C'est la pièce qui permet de répondre à une réclamation.

## Dette assumée

À reprendre après la compétition du 19 septembre 2026 :

- **Mode dégradé hors-ligne** — si le réseau tombe en salle, la saisie
  s'arrête. La persistance est isolée derrière `src/lib/donnees.ts` et
  `src/lib/actions.ts`, ce qui permettra de l'ajouter sans tout réécrire.
- **Export en SpreadsheetML** plutôt qu'en `.xlsx` réel. S'ouvre dans Excel
  et LibreOffice, mais sans mise en forme.
- **Limitation des tentatives de connexion en mémoire** — remise à zéro à
  chaque instance. Suffisant à cette échelle, à déplacer en base si l'outil
  sert au-delà.
- **Photos des athlètes** — le stockage est prévu, l'écran d'envoi reste à
  construire.

## Origine

Le logiciel reprend un fichier HTML autonome d'arbitrage, dont la logique a
été extraite et documentée avant portage :

- `docs/regles-metier.md` — les règles, référencées ligne à ligne
- `docs/cartographie-ui.md` — les écrans et la charte graphique
- `docs/reference/` — le fichier d'origine et ses sources
