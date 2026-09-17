/**
 * Des chiffres qui ne bougent pas.
 *
 * Clash Display n'a pas de chiffres tabulaires : mesuré sur la police, le « 1 »
 * fait 407 unités et le « 0 » 733. À chaque dixième de seconde, un chronomètre
 * écrit en texte courant change donc de largeur, la rangée qui le contient se
 * recalcule, et le nom de l'athlète à côté tremble sur le mur LED.
 * `font-variant-numeric: tabular-nums` ne peut rien : la variante n'existe
 * pas dans la police.
 *
 * Ici chaque caractère est posé dans une case de largeur fixe — celle du
 * chiffre le plus large pour les chiffres, une case étroite pour « : » et
 * « , ». La largeur totale ne dépend plus des chiffres affichés. C'est ce que
 * font les tableaux d'affichage de stade, pour la même raison.
 */

/** Largeur du « 0 », le plus large des chiffres de Clash Display : 733/1000. */
const LARGEUR_CHIFFRE = "0.74em";
/** « : » et « , » : 304/1000, arrondi pour ne jamais couper le glyphe. */
const LARGEUR_SEPARATEUR = "0.32em";

export function ChiffresStables({ texte }: { texte: string }) {
  return (
    <span style={{ display: "inline-flex", whiteSpace: "nowrap" }}>
      {Array.from(texte).map((c, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: /\d/.test(c) ? LARGEUR_CHIFFRE : LARGEUR_SEPARATEUR,
            textAlign: "center",
          }}
        >
          {c}
        </span>
      ))}
    </span>
  );
}
