# 0004 — Un passage peut attendre son résultat, plateau libéré

**Statut** : adopté (2026-09-17)

## Contexte

Dans le poste d'origine, un passage a trois états : `avenir`, `plateau`,
`termine`. La validation de la performance est la **seule** sortie du plateau.
Tant que le jury n'a pas rendu la valeur, l'athlète reste « au plateau » et la
table ne peut pas appeler le suivant.

Sur un grand terrain, ou quand le jury note loin de la table, la feuille
arrive plusieurs minutes après la fin du chronomètre. Chaque passage impose
alors une attente à vide, devant le public.

Trois options :

1. **Appeler le suivant sans valider** — impossible tel quel : l'appel renvoie
   en file l'athlète précédent, et le compteur de tours, local au navigateur,
   se remet à zéro. Le relevé de la table serait perdu.
2. **Valider une valeur provisoire** puis la corriger — fausse le classement
   affiché entre-temps, et fabrique une trace d'audit mensongère.
3. **Un quatrième état, « à saisir »** : le passage quitte le plateau avec ce
   que la table a relevé, sans verdict ; la valeur se saisit quand elle arrive.

## Décision

Option 3. Le cycle devient `avenir → plateau → a_saisir → termine`, l'état
`a_saisir` étant facultatif : valider depuis le plateau reste possible.

- **Sortie du plateau** : bouton « Passage fini, résultat plus tard » sur la
  carte de l'athlète, refusé tant que le chronomètre tourne. Les tours comptés
  et le temps du dernier partent avec le passage ; le suivant de la même
  catégorie est appelé. Trace `passage.en_attente`.
- **Saisie** : un tableau « En attente de résultat » sous les trois colonnes,
  une ligne par athlète, prérempli avec le relevé de la table — la forme de
  la feuille papier que le jury renvoie. Valider écrit exactement ce que
  valider depuis le plateau écrit, avec la même trace `passage.valide`.
- **Invisible tant que non rempli** : un passage « à saisir » n'est ni au
  classement, ni sur le mur LED, ni dans la file ; la feuille de notation
  l'imprime en ligne vide.
- **Garde-fous** : une catégorie n'a fini son épreuve qu'à zéro passage en
  attente. « Reconstruire l'ordre » conserve ces passages comme les terminés.
  « Annuler la dernière validation » remet le passage au plateau s'il est
  libre, sinon en attente : on ne chasse pas l'athlète qui concourt.

## Conséquences

- Écart assumé avec l'original, le quatrième du portage. Il ajoute un état et
  un bloc d'écran ; il ne modifie aucun des trois états existants.
- Pas de migration : `passage.statut` est du texte libre.
- La saisie d'attente vit dans un état React séparé de celle du plateau, qui
  se remet à zéro à chaque appel.
