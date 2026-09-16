# 0003 — Un seul espace de données : pas de mode démonstration

**Statut** : adopté

## Contexte

Le poste d'arbitrage d'origine offrait deux espaces séparés, commutables depuis
un bandeau permanent : la **compétition réelle** et une **démonstration**. Le
second servait à former les officiels et à s'entraîner la veille, avec des
athlètes fictifs, sans risquer de polluer la vraie compétition.

Techniquement, c'était deux clés `localStorage` distinctes. Basculer coûtait une
lecture ; rien n'était partagé, rien ne pouvait fuir de l'un à l'autre.

Le portage change la nature du stockage : une base PostgreSQL partagée par tous
les postes. Reproduire les deux espaces demandait de choisir :

1. **Une compétition miroir** en base, et un sélecteur partout.
2. **Une colonne `demonstration`** sur `competition`, filtrée dans chaque
   lecture.
3. **Ne pas reprendre la fonction.**

## Décision

Le portage n'a qu'un espace de données. Le bandeau « Mode démonstration » et le
sélecteur réel/démo de l'en-tête ne sont pas repris.

L'entraînement se fait en installant une compétition de test — ce que
`pnpm run test` fait déjà pour ses propres besoins, sur une compétition jetable
qu'il supprime ensuite.

## Pourquoi

- L'option 2 était la plus dangereuse : un filtre `where demonstration = false`
  oublié dans **une seule** lecture, et des athlètes fictifs apparaissent sur le
  mur LED un jour de compétition. Le coût d'un oubli est sans commune mesure
  avec le service rendu. C'est exactement le genre de condition qu'on oublie
  dans la requête ajoutée six mois plus tard.
- L'option 1 est défendable mais lourde : chaque écran, chaque action et chaque
  export auraient porté la notion d'espace courant, y compris les écrans
  publics qui n'ont pas de session pour la mémoriser.
- Le besoin réel — s'entraîner sans salir — est couvert autrement : par une
  seconde compétition en base, que le modèle prévoit depuis la première
  migration (voir l'en-tête de `schema.ts`).

## Conséquences

- Tout ce qui est saisi dans l'application compte. Il n'y a pas de filet.
- La fidélité au poste d'origine est entamée sur ce point, et c'est assumé :
  c'est l'un des trois écarts nommés dans le message du commit de portage.
- Ce qui reste ouvert : le modèle gère déjà plusieurs compétitions, mais
  l'application n'en expose qu'une (`competitionCourante()` prend la plus
  ancienne). Le jour où l'on veut un espace d'entraînement, c'est **là** qu'il
  faut travailler — un sélecteur de compétition — et non ressusciter un
  drapeau booléen.
