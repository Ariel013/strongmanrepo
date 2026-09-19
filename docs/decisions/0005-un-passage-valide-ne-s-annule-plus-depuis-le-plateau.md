# 0005 — Un passage validé ne s'annule plus depuis le plateau

**Statut** : adopté (2026-09-17)

## Contexte

Le poste d'origine offrait deux annulations depuis le plateau : « Annuler la
dernière validation » (le passage revient au plateau, sa performance est
effacée) et un bouton « Annuler » sur chaque passage terminé (le passage
revient en file, sans résultat). Toutes deux verrouillées seulement quand la
catégorie avait fini l'épreuve.

En direct, devant du public, une performance validée est déjà lue sur le mur
LED et prise dans le classement. Qu'elle puisse disparaître d'un clic de la
table, sans signature, fragilise ce que le journal d'audit est censé
garantir : un résultat contesté doit se corriger par une voie qui engage un
officiel, pas par le même bouton qui a servi à le saisir.

Options :

1. **Garder les deux annulations**, comme l'original.
2. **Garder seulement « Annuler la dernière validation »**, pour la faute de
   frappe immédiate.
3. **Aucune annulation depuis le plateau.** La correction passe par la feuille
   de notation signée du juge principal.

## Décision

Option 3, à la demande de Kevin. Ni bouton par ligne, ni annulation de la
dernière validation. Le rappel en tête de la colonne des terminés dit où passe
une correction. L'action serveur `rouvrirPassage` reste dans le code, tracée,
sans bouton : c'est le socle d'un futur parcours « correction par le juge
principal », qui demandera un motif et un nom.

Ce que l'après-validation gagne à la place :

- **Une feuille de résultats** par épreuve et par catégorie,
  `/admin/impression/resultats`, classement recalculé depuis les passages
  validés, zéros, forfaits et non-passés listés sous le classement avec leur
  motif, bandeau « définitifs » ou « provisoires » selon les passages
  restants, signatures juge principal et directeur technique.
- **Un huitième écran public**, `/ecran/resultats` : le tableau de l'épreuve
  courante par catégorie, avec performance et points, ajouté au menu de la
  régie. La régie dit si l'épreuve est terminée et offre l'impression.

## Conséquences

- Une faute de frappe validée ne se corrige plus à la table. C'est voulu :
  elle se corrige sur papier signé, puis dans le logiciel par le parcours
  « juge principal » à venir. D'ici là, `rouvrirPassage` n'est joignable que
  par le code.
- Écart avec l'original, documenté dans `docs/cartographie-ui.md` § 6.4.

## Amendement du 2026-09-19 — la correction revient au plateau, tracée

En pleine compétition, une erreur de saisie a été constatée sur un athlète
après la fin de son épreuve. Le parcours « juge principal » n'existait pas
encore : le résultat était incorrigible sans passer par le code. Kevin a
demandé la correction depuis le plateau.

Décision : un bouton **« Corriger »** sur chaque passage terminé, épreuve finie
ou non. Ce n'est pas le retour des annulations de l'original :

- le passage part « en attente de résultat », **jamais au plateau** — aucun
  athlète n'est chassé, aucun chronomètre relancé ;
- ses valeurs sont **conservées et préremplies** : on rectifie, on ne ressaisit
  pas à l'aveugle ;
- une confirmation dit qu'il sort du classement et du mur LED jusqu'à sa
  revalidation ;
- l'ancien résultat complet part au journal d'audit (`passage.correction_ouverte`),
  et la revalidation y laisse le nouveau (`passage.valide`).

L'écriture vit dans `rouvrirPourCorrection` (`src/lib/plateau.ts`), testée.
La signature du juge principal reste une règle d'organisation, pas un contrôle
du logiciel : le parcours dédié reste à faire après la compétition.
