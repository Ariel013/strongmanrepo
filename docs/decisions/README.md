# Décisions d'architecture (ADR)

Un ADR se déclenche quand **plusieurs options existaient**. Pas pour acter une
évidence, pas pour documenter une implémentation.

| N° | Décision | Statut |
|---|---|---|
| [0001](0001-le-chronometre-publie-son-etat-en-base.md) | Le chronomètre publie son état en base, pas seulement dans le navigateur | adopté |
| [0002](0002-les-niveaux-declares-vivent-en-json-sur-l-athlete.md) | Les niveaux déclarés vivent en JSON sur l'athlète, pas dans une table | adopté |
| [0003](0003-un-seul-espace-de-donnees-pas-de-mode-demonstration.md) | Un seul espace de données : pas de mode démonstration | adopté |

## Avant le n° 0001

La numérotation commence au portage du front. Deux décisions structurantes lui
sont antérieures et n'ont pas d'ADR : elles sont argumentées là où elles
s'appliquent, en tête de `src/lib/db/schema.ts`.

- **Les points et les rangs ne sont pas stockés**, ils se recalculent. Un
  classement figé devient faux à la première disqualification.
- **Les données personnelles vivent dans une table séparée** (`athlete_contact`)
  que les écrans publics n'interrogent jamais.

Elles méritent d'être reprises ici le jour où l'une des deux est remise en
cause — c'est à ce moment-là qu'un ADR sert vraiment.
