# 0001 — Le chronomètre publie son état en base, pas seulement dans le navigateur

**Statut** : adopté

## Contexte

Le poste d'arbitrage d'origine était un fichier HTML autonome. Son chronomètre
vivait dans l'état React de la page, et les fenêtres « écran » que la régie
ouvrait le lisaient sans difficulté : elles tournaient dans le même navigateur,
sur la même machine.

Le portage change cette donnée. La table de marque est sur un poste, le mur LED
sur un autre — parfois à vingt mètres, parfois dans une autre salle. Le
chronomètre est pourtant ce que le public regarde le plus pendant un essai : un
compteur figé pendant que l'athlète travaille se lit comme une panne, et prive
le speaker de son principal repère.

Trois options étaient ouvertes :

1. **Ne rien afficher sur le mur LED** — l'écran plateau montre l'athlète, pas
   le temps.
2. **Diffuser le temps écoulé en continu**, à chaque dixième de seconde.
3. **Publier seulement les bascules**, et laisser chaque écran calculer.

## Décision

L'état du chronomètre vit dans la table `competition` : `chronoPhase`,
`chronoDebutLe`, `chronoDureeS`, `chronoArretS`.

Seul **l'instant de départ** est enregistré, jamais le temps écoulé. Chaque
écran calcule son affichage à partir de `chronoDebutLe` et rafraîchit son
compteur dix fois par seconde, localement.

La table de marque, elle, continue de faire tourner son propre chronomètre en
mémoire : elle n'attend pas le serveur pour voir défiler son compteur.

## Pourquoi

- L'option 1 aurait fait perdre au mur LED ce qui tient la salle en haleine.
  Le chronomètre n'est pas un ornement de l'écran plateau, c'en est le sujet.
- L'option 2 aurait envoyé dix écritures par seconde en base pendant chaque
  passage, pour afficher de toute façon un temps en retard d'un aller-retour
  réseau. C'est cher et faux à la fois.
- L'option 3 ne coûte qu'une écriture par bascule — trois par passage — et
  reste juste au dixième même quand la page n'est rafraîchie que toutes les
  deux secondes. L'horloge du navigateur suffit : on ne mesure pas un temps
  officiel avec, on **réaffiche** un temps dont le départ fait foi.

## Conséquences

- Toute action qui change l'état du chronomètre passe par `majChrono()`. Un
  chronomètre piloté depuis un autre écran devra emprunter le même chemin.
- Le chronomètre est remis à `pret` dès que la composition du plateau change :
  laisser courir un compteur d'un athlète au suivant fausserait la performance
  enregistrée.
- Les écrans dépendent de l'heure du poste qui les affiche. Un poste dont
  l'horloge dérive de plusieurs secondes affichera un temps décalé — à
  surveiller au montage, avec la mire.
- Ce qui reste ouvert : la mesure officielle n'est toujours pas celle-ci. Le
  temps qui compte est celui saisi par la table et validé par le juge ; le
  chronomètre reste un affichage, jamais une source de vérité.
