# 0002 — Les niveaux déclarés vivent en JSON sur l'athlète, pas dans une table

**Statut** : adopté

## Contexte

Certaines épreuves se courent « à niveaux » : aux Piliers d'Hercule, la hauteur
de prise dépend de la taille de l'athlète, qui déclare le sien avant de
concourir. L'épreuve porte la liste des niveaux proposés ; chaque athlète en
choisit un, **par épreuve**.

C'est une relation plusieurs-à-plusieurs : un athlète, une épreuve, une valeur.
Le réflexe est d'en faire une table de liaison `athlete_epreuve_niveau`.

Il fallait trancher entre :

1. **Une table de liaison** — la forme orthodoxe.
2. **Une colonne JSON sur `athlete`**, indexée par identifiant d'épreuve.

## Décision

Le niveau est stocké dans une colonne `athlete.niveaux`, en JSON :
`{ "<epreuveId>": "Niveau 2 — prise médiane" }`.

La lecture passe par `niveauxPour(competitionId, epreuveId)`, qui rend un
simple `Record<athleteId, string>`.

## Pourquoi

- **Rien n'est jamais calculé sur le niveau.** Il ne classe pas, ne départage
  pas, n'entre dans aucun barème. Il est affiché : sur la fiche, dans la file
  d'attente, au plateau, et sur le mur LED pendant le passage. Une table de
  liaison ferait croire à un lien exploité par le classement, et le premier
  lecteur du schéma chercherait où — il ne trouverait rien.
- Une table de liaison aurait ajouté une jointure à chaque affichage de
  plateau, soit toutes les deux secondes sur chaque écran public, pour une
  donnée décorative.
- Le coût du JSON est connu et accepté : pas de contrainte d'intégrité vers
  `epreuve`, pas de requête « qui a déclaré le niveau 3 ». Aucun des deux ne
  sert aujourd'hui.

## Conséquences

- La colonne peut contenir des identifiants d'épreuves supprimées. C'est sans
  effet : la lecture cherche l'épreuve courante et ignore le reste.
- Une colonne JSON illisible ne doit jamais faire tomber un écran. Les deux
  points de lecture (`fichesAthletes`, `niveauxPour`) attrapent l'erreur et
  repartent d'un niveau vide, quitte à le faire ressaisir.
- Le jour où un niveau devra être **classé** — un barème par palier, par
  exemple — cette décision tombe et se remplace par la table de liaison. Ce
  jour-là, la migration est mécanique : le JSON contient déjà le couple.
