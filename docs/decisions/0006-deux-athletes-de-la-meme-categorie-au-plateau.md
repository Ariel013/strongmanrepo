# 0006 — Deux formats au choix : un athlète à la fois, ou deux de la même catégorie ensemble

**Statut** : adopté (2026-09-20)

## Contexte

Le poste d'origine tient un invariant : **un seul athlète au plateau par
catégorie** (`regles-metier.md` § Invariants, n° 6). Le seul passage à deux
qu'il connaît est l'appel en duo du passage mélangé — deux athlètes de
catégories **différentes** sur le même chronomètre.

Kevin, le 2026-09-19 puis le 2026-09-20 : le comité veut pouvoir choisir, avant
chaque compétition, entre **le fonctionnement actuel** et un format « 1 contre
1 » où deux athlètes de la **même** catégorie passent ensemble — appel,
plateau, mur LED et ordre de passage en paires. Précision demandée et obtenue
le 19 : ce n'est pas un duel. Personne ne « bat » personne ; le classement
reste celui de la performance, par catégorie, avec ses départages. C'est le
passage qui change, jamais le barème.

(Un premier jet du 19, jamais committé, avait été retiré : la compétition
s'était tenue sans lui. La demande est revenue le lendemain sous la forme de
deux modes au choix.)

Options :

1. **Une colonne de format sur la compétition.** Une migration, et deux
   sources de vérité : le format de la compétition et le champ « Passage » de
   chaque épreuve pourraient se contredire.
2. **Une troisième valeur du mode de passage de l'épreuve** — `groupe`,
   `melange`, `paire` — et un réglage « format » qui l'applique à toutes les
   épreuves d'un coup. La colonne est du texte : aucune migration. Le format
   affiché se **lit** sur les épreuves, il n'est stocké nulle part ailleurs.
3. **Deux par catégorie, toujours.** Pas de retour au fonctionnement actuel.

## Décision

Option 2.

- **Le choix du comité se fait en un clic**, en tête de l'étape Épreuves :
  « Un athlète à la fois » ou « Deux par deux · 1 contre 1 ». Il règle toutes
  les épreuves ; une épreuve réglée « tout le monde mélangé » à la main garde
  son réglage. Chaque épreuve reste modifiable à part — un format mixte est
  possible et l'écran le dit.
- `paire` se comporte comme `groupe` — une catégorie après l'autre — avec une
  capacité de **deux** au plateau par catégorie (`capacitePlateau`,
  `src/lib/plateau.ts`).
- **Les paires suivent la file** : 1er et 2e, 3e et 4e. La file garde sa règle
  (dossards à la première épreuve, puis points acquis croissants). La colonne
  « À venir » se lit par paires ; un effectif impair laisse le dernier passer
  seul, et l'écran le dit.
- **Un troisième appel est refusé**, pas absorbé. En solo, appeler renvoie le
  précédent en file : c'est une correction d'appel. À deux, le logiciel ne
  devine pas lequel céderait sa place en plein essai.
- **La paire suivante n'est appelée que lorsque la catégorie a quitté le
  plateau** — validée ou mise en attente de résultat.
- **Un seul chronomètre pour la paire**, comme pour le duo mélangé : l'état du
  chronomètre est publié une fois par compétition (ADR 0001).

## Conséquences

- L'invariant n° 6 devient « un par catégorie, ou deux en passage par
  paires ». Les tests § 23 tiennent les deux règles et la bascule de format.
- Le mur LED n'a rien à apprendre : sa vue à deux athlètes sert telle quelle.
- En vue « toutes catégories » d'une épreuve par paires, des appels ligne à
  ligne peuvent mettre une paire de chaque catégorie au plateau ; le mur LED
  n'en montre que deux athlètes. Le bouton d'appel, lui, n'appelle qu'une
  paire à la fois. Accepté : le format par paires se conduit catégorie par
  catégorie.
- Changer de format en cours d'épreuve ne renvoie personne en file : la
  capacité ne joue qu'à l'appel suivant.
- Un vrai duel — le vainqueur du face-à-face marque — reste hors de portée de
  cette décision : ce serait une autre règle de classement, donc un autre ADR.
