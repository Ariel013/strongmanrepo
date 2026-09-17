@AGENTS.md

# Arbitrage Strongman 2026 — règles du projet

**Lis `JOURNAL.md` en premier.** Il dit où on en est, quelle est la prochaine
action, et ce qui a déjà coûté cher.

## Ce que ce logiciel doit tenir

Il suit une compétition **en direct**, devant du public, un seul jour par an.
Deux conséquences sur tout ce qu'on écrit ici :

1. **Un écran vide se lit comme une panne.** Chaque cas sans donnée dit
   explicitement ce qu'il attend. Jamais de blanc muet.
2. **Ce qui touche un résultat se trace.** En cas de réclamation, le journal
   d'audit est la seule pièce qui dise ce qui a été saisi, quand, et d'où.

## Le front est un portage, pas une création

L'interface reprend le poste autonome d'origine, conservé tel quel dans
`docs/reference/`. `docs/cartographie-ui.md` en est la pièce de comparaison.

- Les écrans portés utilisent des **styles en ligne repris valeur par valeur**
  de l'original — pas Tailwind. Les couleurs et libellés passent par
  `src/lib/charte.ts`, qui ne contient que des valeurs de l'original.
- Un écart avec l'original **se décide et se dit**, il ne s'improvise pas.
  Les trois écarts du portage sont nommés dans son commit et, pour le
  principal, dans `docs/decisions/0003-*`. Les suivants ont chacun leur ADR :
  `0004` (un passage peut attendre son résultat), `0005` (un passage validé
  ne s'annule plus depuis le plateau ; résultats imprimables et diffusables).
- Devant un doute sur un comportement : **relire `docs/reference/`**, pas
  raisonner sur ce qui semblerait juste.

## Carte des documents

| Sujet | Où |
|---|---|
| Où on en est, quoi faire ensuite | `JOURNAL.md` |
| Ce qui reste à faire **hors code** (secrets, migrations, ops) | `A-FAIRE.md` |
| Règle exacte du classement et des départages | `docs/regles-metier.md` |
| À quoi l'interface doit ressembler | `docs/cartographie-ui.md` |
| Pourquoi tel choix plutôt qu'un autre | `docs/decisions/` |
| Installation, commandes, barème | `README.md` |

## Contraintes techniques à ne pas réapprendre

- **`pnpm run db:push` échoue sur Supabase** (introspection des contraintes
  CHECK internes). Utiliser `pnpm run db:migrer`.
- **Le cache du pool PostgreSQL se pose dans tous les environnements**, pas
  seulement en développement — voir la leçon du 2026-09-16 dans `JOURNAL.md`.
- Toute action serveur commence par `exigerSession()`. Le proxy (`src/proxy.ts`) est la
  première barrière, jamais la seule.
- Les écrans publics (`/ecran/*`) ne lisent que `AthletePublic`. Ils ne doivent
  **jamais** appeler `fichesAthletes()`, qui joint les coordonnées.

## Avant de livrer

```bash
pnpm run lint && pnpm run build && pnpm run test
```

`pnpm run test` travaille sur une compétition jetable ; il ne touche jamais la
compétition réelle.
