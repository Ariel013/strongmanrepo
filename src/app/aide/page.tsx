/**
 * Mode d'emploi des officiels.
 *
 * Page publique et entièrement statique : aucun accès à la base, aucune
 * session. Elle doit rester consultable depuis un téléphone, au bord du
 * plateau, même si le poste de saisie est occupé ou hors service — c'est
 * pourquoi elle est volontairement hors du périmètre du middleware
 * d'authentification (voir `src/proxy.ts`).
 */

import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Mode d'emploi — Arbitrage Strongman",
  description:
    "Mode d'emploi du logiciel d'arbitrage du Championnat National de Strongman 2026 (FIBDA).",
};

/** Les sections de la page, dans l'ordre. Sert aussi à bâtir le sommaire. */
const SOMMAIRE = [
  { id: "a-quoi-ca-sert", titre: "1. À quoi sert ce logiciel" },
  { id: "avant", titre: "2. Avant la compétition" },
  { id: "points", titre: "3. Comment les points sont calculés" },
  { id: "ordre", titre: "4. L'ordre de passage" },
  { id: "epreuve", titre: "5. Pendant l'épreuve" },
  { id: "ecrans", titre: "6. Les écrans du public et la régie" },
  { id: "papier", titre: "7. Ce qui s'imprime" },
  { id: "fin", titre: "8. En fin de compétition" },
  { id: "probleme", titre: "9. En cas de problème" },
] as const;

function Section({
  id,
  titre,
  chapeau,
  children,
}: {
  id: string;
  titre: string;
  chapeau?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-bordure pt-8">
      <h2 className="font-titre text-2xl font-bold tracking-tight uppercase sm:text-3xl">
        {titre}
      </h2>
      {chapeau ? (
        <p className="mt-2 text-base text-encre-2 sm:text-lg">{chapeau}</p>
      ) : null}
      <div className="mt-5 space-y-5">{children}</div>
      <p className="mt-6">
        <a href="#sommaire" className="text-sm text-encre-3 underline">
          Revenir au sommaire
        </a>
      </p>
    </section>
  );
}

function Carte({
  titre,
  children,
}: {
  titre?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-bordure bg-white p-5 shadow-sm">
      {titre ? (
        <h3 className="font-titre text-lg font-semibold tracking-wide uppercase">
          {titre}
        </h3>
      ) : null}
      <div className={titre ? "mt-3 space-y-3" : "space-y-3"}>{children}</div>
    </div>
  );
}

/** Encadré d'attention. Trois tons, jamais plus : information, vigilance, refus. */
function Encadre({
  ton,
  titre,
  children,
}: {
  ton: "info" | "attention" | "interdit";
  titre: string;
  children: ReactNode;
}) {
  const bord =
    ton === "info"
      ? "border-l-vert"
      : ton === "attention"
        ? "border-l-orange"
        : "border-l-rouge";
  const couleurTitre =
    ton === "info"
      ? "text-vert-fonce"
      : ton === "attention"
        ? "text-orange-fonce"
        : "text-rouge-fonce";

  return (
    <div
      className={`rounded-xl border border-bordure border-l-4 bg-papier-2 p-4 ${bord}`}
    >
      <p
        className={`font-titre text-sm font-bold tracking-wide uppercase ${couleurTitre}`}
      >
        {titre}
      </p>
      <div className="mt-2 space-y-2 text-sm text-encre-2 sm:text-base">
        {children}
      </div>
    </div>
  );
}

/** Une étape numérotée : une pastille, un titre, une explication. */
function Etape({
  numero,
  titre,
  children,
}: {
  numero: number;
  titre: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vert-fonce font-titre text-base font-bold text-papier">
        {numero}
      </span>
      <div className="min-w-0">
        <p className="font-semibold">{titre}</p>
        <div className="mt-1 space-y-2 text-encre-2">{children}</div>
      </div>
    </li>
  );
}

export default function PageAide() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <p className="font-titre text-xs font-bold tracking-widest text-orange uppercase sm:text-sm">
          Championnat National de Strongman 2026 — FIBDA
        </p>
        <h1 className="mt-2 font-titre text-3xl font-bold tracking-tight uppercase sm:text-4xl">
          Mode d&apos;emploi
        </h1>
        <p className="mt-3 text-base text-encre-2 sm:text-lg">
          Ce document s&apos;adresse aux officiels de la compétition. Il
          explique, étape par étape, ce que fait le logiciel et ce que vous avez
          à faire devant lui. Aucune connaissance en informatique n&apos;est
          nécessaire. Vous pouvez le consulter depuis votre téléphone pendant la
          compétition.
        </p>
        <p className="mt-6">
          <Link
            href="/connexion"
            title="Entre dans l'administration — préparation, plateau, régie. Le code d'accès n'est demandé que si aucune session n'est ouverte."
            className="inline-flex items-center gap-2 rounded-xl bg-vert px-6 py-3.5 font-titre text-base font-bold tracking-wide uppercase shadow-sm transition hover:bg-vert-fonce focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
            // La base globale (reprise de l'original) impose `a { color: vert }`
            // hors couche Tailwind : elle battait la classe de couleur, et le
            // texte était vert sur vert. Le style inline gagne sur tout.
            style={{ color: "#FCFAF6", textDecoration: "none" }}
          >
            Accéder à l&apos;administration
            <span aria-hidden="true">→</span>
          </Link>
        </p>
      </header>

      <nav
        id="sommaire"
        aria-label="Sommaire"
        className="mt-8 scroll-mt-6 rounded-xl border border-bordure bg-white p-5 shadow-sm"
      >
        <h2 className="font-titre text-lg font-semibold tracking-wide uppercase">
          Sommaire
        </h2>
        <ol className="mt-3 space-y-2">
          {SOMMAIRE.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block rounded-lg px-2 py-1.5 text-encre underline decoration-bordure-2 underline-offset-4 hover:bg-papier-2 hover:decoration-encre-3"
              >
                {s.titre}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {/* ── 1 ───────────────────────────────────────────────────────── */}
        <Section
          id="a-quoi-ca-sert"
          titre="1. À quoi sert ce logiciel"
          chapeau="Trois phrases suffisent à le résumer."
        >
          <Carte>
            <p>
              Ce logiciel tient la feuille de match de la compétition : il
              enregistre les athlètes, leur pesée, leur catégorie et leur
              dossard.
            </p>
            <p>
              Pendant les épreuves, il conduit le plateau : il dit qui passe,
              quand, il chronomètre, il enregistre chaque performance et calcule
              les points immédiatement.
            </p>
            <p>
              Enfin, il alimente les écrans du public et produit le classement
              final, prêt à être imprimé ou exporté.
            </p>
          </Carte>

          <Encadre ton="info" titre="Le principe à retenir">
            <p>
              Vous n&apos;avez jamais à calculer un point ni un classement à la
              main. Votre travail consiste à saisir ce qui s&apos;est réellement
              passé sur le plateau : le logiciel s&apos;occupe du reste, et il
              recalcule tout à chaque nouvelle saisie.
            </p>
          </Encadre>
        </Section>

        {/* ── 2 ───────────────────────────────────────────────────────── */}
        <Section
          id="avant"
          titre="2. Avant la compétition"
          chapeau="Tout se joue ici. Une préparation propre évite les corrections dans l'urgence, une fois le public installé."
        >
          <Carte titre="Les sept étapes de préparation, dans l'ordre des onglets">
            <p className="text-encre-2">
              Chaque saisie s&apos;enregistre toute seule dès que vous quittez
              le champ. Le bouton « ← Retour » et le fil d&apos;Ariane vous
              ramènent où vous étiez. Le <strong>Récapitulatif</strong>, depuis
              l&apos;accueil, dit ce qui est prêt et ce qui manque, avec un lien
              vers l&apos;étape concernée.
            </p>
            <ol className="space-y-5">
              <Etape numero={1} titre="Épreuves">
                <p>
                  Les cinq épreuves officielles sont installées. Pour chacune :
                  le nom, la mesure (nombre de répétitions, charge, distance,
                  temps, tenue), le temps imparti, le critère lu au micro, le
                  matériel. Activez le <strong>comptage des tours</strong> sur
                  les épreuves à répétitions : c&apos;est le bouton « Tour » du
                  plateau qui relève le temps de la dernière répétition, celui
                  qui départage.
                </p>
                <p>
                  Une épreuve de tenue dont la prise dépend de la taille, les
                  Piliers d&apos;Hercule, a des <strong>niveaux</strong> :
                  renseignez la liste (« Niveau 1, Niveau 2… ») pour que chaque
                  athlète choisisse le sien sur sa fiche. Sans liste, le niveau
                  se saisit en clair.
                </p>
              </Etape>

              <Etape numero={2} titre="Groupes de poids">
                <p>
                  Les catégories, avec leurs bornes de poids et leur{" "}
                  <strong>couleur</strong>, la même sur le plateau, les écrans
                  et les impressions. « Retenue » : elle concourt. « Mise de
                  côté » : elle disparaît du plateau sans rien perdre. Le
                  logiciel signale un trou entre deux bornes.
                </p>
              </Etape>

              <Etape numero={3} titre="Officiels">
                <p>
                  Nom et rôle de chaque officiel, et la{" "}
                  <strong>catégorie qu&apos;il arbitre</strong> : il faut un
                  staff par catégorie, au moins un juge principal chacune. Les
                  postes communs, directeur, speaker, régie, restent « toutes
                  catégories ». Ces noms se retrouvent préremplis sur les
                  feuilles de notation.
                </p>
              </Etape>

              <Etape numero={4} titre="Athlètes">
                <p>
                  Une fiche par athlète : nom, prénoms, club, nationalité, date
                  de naissance, photo, coordonnées. Une liste d&apos;inscription
                  s&apos;importe d&apos;un coup depuis un fichier CSV ou un
                  texte collé, les doublons sont signalés avant import. Les
                  photos se déposent en lot, le logiciel les rapproche des
                  noms et vous confirmez.
                </p>
                <p>
                  Le club est important : c&apos;est lui qui reçoit les points
                  du classement des clubs. Un athlète sans club ne rapporte
                  rien. Un athlète <strong>invité</strong> passe au plateau
                  mais reste hors classement.
                </p>
              </Etape>

              <Etape numero={5} titre="Pesée">
                <p>
                  Imprimez d&apos;abord les <strong>feuilles de pesée</strong>,
                  une par catégorie. À la balance, l&apos;officiel note le poids
                  et signe. La table reporte ensuite ici : elle saisit le
                  poids, le logiciel propose la catégorie, elle valide. La
                  validation attribue le dossard et verrouille la ligne. Sans
                  poids, pas de validation : un athlète sans poids ne se classe
                  nulle part.
                </p>
                <p>
                  Le dossard n&apos;est pas décoratif : il fixe l&apos;ordre de
                  passage de la première épreuve, du plus petit au plus grand.
                </p>
              </Etape>

              <Etape numero={6} titre="Programme">
                <p>
                  Le déroulé de la journée, heure par heure. Les lignes se
                  rangent toutes seules par heure : une ligne ajoutée après
                  coup à 12h passe avant celle de 18h. Ce programme alimente
                  l&apos;écran d&apos;attente du mur LED et s&apos;imprime sur
                  une page.
                </p>
              </Etape>

              <Etape numero={7} titre="Récompenses">
                <p>
                  Titre, prime et lot de chaque place, <strong>catégorie par
                  catégorie</strong> : le podium de « Moins de 105 kg » n&apos;a
                  pas forcément la dotation de « Plus de 105 kg ». Tant
                  qu&apos;une catégorie n&apos;a pas ses propres récompenses,
                  elle utilise les communes ; « Personnaliser » les lui copie.
                  Dès que le classement commence, le lauréat de chaque place
                  s&apos;affiche à côté.
                </p>
                <p>
                  Le <strong>meilleur club</strong> se calcule ; sa récompense
                  se saisit ici et figure au palmarès. Le bandeau des
                  partenaires défile sur l&apos;écran d&apos;attente.
                </p>
              </Etape>
            </ol>
          </Carte>

          <Encadre ton="attention" titre="Avant le coup d'envoi">
            <p>
              Chaque concurrent à classer a un poids, une catégorie et un
              dossard. Chaque catégorie retenue a son staff et trois places
              dotées. Le récapitulatif le vérifie pour vous. Puis, sur le
              plateau, « Précharger toutes les épreuves » construit les files de
              passage d&apos;un coup.
            </p>
          </Encadre>
        </Section>

        {/* ── 3 ───────────────────────────────────────────────────────── */}
        <Section
          id="points"
          titre="3. Comment les points sont calculés"
          chapeau="Une seule formule, appliquée épreuve par épreuve, à l'intérieur de chaque catégorie."
        >
          <Carte titre="La formule">
            <p className="rounded-lg bg-papier-2 px-4 py-3 text-center font-titre text-xl font-bold tracking-wide sm:text-2xl">
              Points = N − rang + 1
            </p>
            <p>
              <strong>N</strong> est le nombre d&apos;athlètes classables de la
              catégorie. <strong>Rang</strong> est la place obtenue sur
              l&apos;épreuve. Autrement dit : le premier marque autant de points
              qu&apos;il y a d&apos;athlètes, et chaque place suivante rapporte
              un point de moins.
            </p>
          </Carte>

          <Carte titre="Exemple chiffré : une catégorie de 8 athlètes">
            <p>
              Huit athlètes classables, donc <strong>N = 8</strong>. Sur une
              épreuve, les points se répartissent ainsi :
            </p>
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[20rem] border-collapse text-left text-sm sm:text-base">
                <thead>
                  <tr className="border-b border-bordure-2 font-titre text-xs tracking-wider text-encre-3 uppercase">
                    <th className="py-2 pr-3 font-bold">Place</th>
                    <th className="py-2 pr-3 font-bold">Calcul</th>
                    <th className="py-2 font-bold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["1er", "8 − 1 + 1", "8 points"],
                    ["2e", "8 − 2 + 1", "7 points"],
                    ["3e", "8 − 3 + 1", "6 points"],
                    ["4e", "8 − 4 + 1", "5 points"],
                    ["5e", "8 − 5 + 1", "4 points"],
                    ["6e", "8 − 6 + 1", "3 points"],
                    ["7e", "8 − 7 + 1", "2 points"],
                    ["8e", "8 − 8 + 1", "1 point"],
                  ].map(([place, calcul, points]) => (
                    <tr key={place} className="border-b border-bordure">
                      <td className="py-2 pr-3 font-semibold">{place}</td>
                      <td className="py-2 pr-3 text-encre-3">{calcul}</td>
                      <td className="py-2 font-semibold">{points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-encre-2">
              Dans une catégorie de 12 athlètes, le premier marquerait 12 points
              et le dernier 1 point. Le barème suit donc toujours
              l&apos;effectif de la catégorie.
            </p>
          </Carte>

          <Carte titre="Les départages sur une épreuve">
            <p>Quand deux athlètes sont à égalité, on descend dans cet ordre :</p>
            <ol className="ml-5 list-decimal space-y-2 text-encre-2 marker:font-semibold marker:text-encre">
              <li>
                <strong className="text-encre">La performance.</strong> Le
                meilleur résultat mesuré l&apos;emporte : le plus grand nombre
                de répétitions, la charge la plus lourde, la plus longue
                distance, le maintien le plus long — ou, pour une épreuve
                chronométrée, le temps le plus court.
              </li>
              <li>
                <strong className="text-encre">
                  Le temps intermédiaire le plus court.
                </strong>{" "}
                À performance identique, celui qui l&apos;a réalisée le plus
                vite passe devant.
              </li>
              <li>
                <strong className="text-encre">
                  Le poids de corps le plus léger.
                </strong>{" "}
                À performance et temps identiques, le plus léger passe devant.
                C&apos;est une règle officielle : à effort égal, la performance
                du plus léger vaut davantage.
              </li>
            </ol>
            <p className="text-encre-2">
              Deux athlètes ne sont réellement à égalité que si ces trois
              éléments sont identiques. Dans ce cas ils reçoivent la même place
              et le même nombre de points, et la place suivante est sautée
              (1, 1, 3).
            </p>
          </Carte>

          <Carte titre="Le classement général de la catégorie">
            <p>À la fin, on additionne les points de toutes les épreuves.</p>
            <ol className="ml-5 list-decimal space-y-2 text-encre-2 marker:font-semibold marker:text-encre">
              <li>
                <strong className="text-encre">Le total de points</strong>, du
                plus élevé au plus faible.
              </li>
              <li>
                À total égal, <strong className="text-encre">
                  le nombre de premières places
                </strong>{" "}
                obtenues sur les épreuves.
              </li>
              <li>Puis le nombre de deuxièmes places.</li>
              <li>Puis le nombre de troisièmes places.</li>
            </ol>
            <p className="text-encre-2">
              Celui qui a gagné le plus d&apos;épreuves l&apos;emporte donc sur
              celui qui a été régulier sans jamais gagner, à total identique.
            </p>
          </Carte>

          <Encadre ton="attention" titre="Les classements ne se mélangent jamais">
            <p>
              Chaque catégorie a son propre classement et son propre barème. Un
              athlète de moins de 105 kg n&apos;est jamais comparé à un athlète
              de plus de 105 kg, même s&apos;ils passent en même temps sur le
              plateau.
            </p>
          </Encadre>

          <Carte titre="Le classement des meilleurs clubs">
            <p>
              À chaque épreuve, le rang de chaque athlète dans sa catégorie
              rapporte des points à son club, et les points se cumulent
              d&apos;une épreuve à l&apos;autre : un athlète 2e à la première
              épreuve puis 1er à la deuxième apporte 10 + 15 = 25 points.
              Toutes les catégories retenues comptent, ensemble.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bordure text-left text-xs tracking-wide text-encre-3 uppercase">
                  <th className="py-2 pr-4">Rang à l&apos;épreuve, dans sa catégorie</th>
                  <th className="py-2 text-right">Points pour le club</th>
                </tr>
              </thead>
              <tbody className="text-encre-2">
                {[
                  ["1er", "15"],
                  ["2e", "10"],
                  ["3e", "5"],
                  ["4e", "4"],
                  ["5e", "3"],
                  ["Tout autre athlète classé", "1"],
                ].map(([rang, pts]) => (
                  <tr key={rang} className="border-b border-bordure">
                    <td className="py-2 pr-4">{rang}</td>
                    <td className="py-2 text-right font-semibold text-encre">
                      {pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-encre-2">
              Un club qui place un premier et un sixième marque donc 16 points.
              À égalité de points, le club qui a le plus de titres passe devant,
              puis le plus de deuxièmes places, puis de troisièmes. Un athlète
              sans club, ou invité hors classement, ne rapporte rien à
              personne : vérifiez le club sur chaque fiche.
            </p>
            <p className="text-encre-2">
              Le classement des clubs se lit sur le plateau, sur la page
              « Classement des clubs » de l&apos;administration (imprimable) et
              sur l&apos;écran public du même nom, à choisir dans la régie.
            </p>
          </Carte>
        </Section>

        {/* ── 4 ───────────────────────────────────────────────────────── */}
        <Section
          id="ordre"
          titre="4. L'ordre de passage"
          chapeau="Il est calculé par le logiciel. Vous n'avez pas à le composer à la main."
        >
          <Carte titre="Première épreuve : les dossards">
            <p>
              À la première épreuve, les athlètes passent dans l&apos;ordre
              croissant des dossards : le numéro 1, puis le 2, et ainsi de
              suite. Un athlète sans dossard passe en dernier.
            </p>
          </Carte>

          <Carte titre="Épreuves suivantes : du moins de points au plus de points">
            <p>
              À partir de la deuxième épreuve, l&apos;ordre s&apos;inverse avec
              le classement : celui qui a le moins de points passe en premier,{" "}
              <strong>le leader passe en dernier</strong>. À points égaux, le
              dossard le plus petit passe en premier.
            </p>
            <p className="text-encre-2">
              C&apos;est la règle habituelle du strongman : le public voit
              monter la tension jusqu&apos;au dernier passage, et le leader sait
              exactement ce qu&apos;il doit réaliser.
            </p>
          </Carte>

          <Encadre ton="info" titre="L'ordre se recalcule tout seul">
            <p>
              L&apos;ordre de passage de l&apos;épreuve suivante tient compte
              des résultats que vous venez de valider. Si vous corrigez un
              résultat, l&apos;ordre est remis à jour. Ne recopiez jamais un
              ordre de passage sur papier la veille : consultez-le à
              l&apos;écran au moment de lancer l&apos;épreuve.
            </p>
          </Encadre>
        </Section>

        {/* ── 5 ───────────────────────────────────────────────────────── */}
        <Section
          id="epreuve"
          titre="5. Pendant l'épreuve"
          chapeau="Le geste se répète à chaque athlète : appeler, chronométrer, compter, valider."
        >
          <Carte titre="Avant d'appeler : l'épreuve et la file">
            <p>
              En haut du plateau, choisissez l&apos;<strong>épreuve</strong> et
              le <strong>passage</strong> : par groupe de poids, ou tout le
              monde mélangé, un athlète de chaque catégorie côte à côte sur le
              même chronomètre. Ce choix pilote aussi le mur LED.
            </p>
            <p>
              La colonne « À venir » est la file de passage. Elle vient du
              préchargement, ou de « Reconstruire l&apos;ordre », qui remet la
              file dans l&apos;ordre théorique sans toucher aux passages déjà
              validés, en attente ou au plateau. Quand vous passez à la
              deuxième épreuve, la file se réordonne seule sur les points
              acquis, tant que personne n&apos;y est encore passé.
            </p>
            <p>
              « Imprimer la feuille » sort la feuille de notation de
              l&apos;épreuve, dans l&apos;ordre de passage, pour l&apos;arbitre.
            </p>
          </Carte>

          <Carte titre="Le cycle d'un passage">
            <ol className="space-y-5">
              <Etape numero={1} titre="Appeler l'athlète au plateau">
                <p>
                  Sélectionnez l&apos;athlète en tête de file et appelez-le. Sa
                  fiche s&apos;affiche aussitôt sur le mur LED : photo, dossard,
                  nom, club, catégorie.
                </p>
                <p>
                  Un seul athlète est au plateau par catégorie. En passage
                  mélangé, deux athlètes de catégories différentes peuvent être
                  appelés ensemble et concourir sur le même chronomètre.
                </p>
              </Etape>

              <Etape numero={2} titre="Lancer le chronomètre">
                <p>
                  Le chronomètre est armé automatiquement sur le temps imparti
                  de l&apos;épreuve dès que vous appelez un athlète. Il ne
                  démarre pas tant que personne n&apos;est au plateau :
                  c&apos;est un garde-fou, pas une panne.
                </p>
                <p>
                  Un appui le démarre à l&apos;annonce, un deuxième
                  l&apos;arrête, un troisième le réarme pour l&apos;athlète
                  suivant. Les trente dernières secondes s&apos;affichent en
                  rouge clignotant sur le mur LED.
                </p>
              </Etape>

              <Etape numero={3} titre="Compter les répétitions">
                <p>
                  À chaque répétition validée par le juge, appuyez sur le bouton
                  de comptage de la fiche de l&apos;athlète. Le logiciel remplit
                  alors tout seul le nombre de répétitions et le temps de la
                  dernière répétition.
                </p>
                <p>
                  Un appui de trop s&apos;annule : le dernier comptage se retire
                  et les chiffres sont recalculés.
                </p>
              </Etape>

              <Etape numero={4} titre="Si le jury n'a pas encore rendu la performance : mettre en attente">
                <p>
                  Sur un grand terrain, la feuille du jury arrive après la fin
                  du chronomètre. N&apos;attendez pas à plateau vide : appuyez
                  sur « Passage fini, résultat plus tard ». Le plateau se
                  libère, l&apos;athlète suivant est appelé, et le passage
                  entre dans la <strong>file d&apos;attente de résultat</strong>,
                  un tableau sous les trois colonnes du plateau.
                </p>
                <p>
                  Ce que la table a déjà compté part avec lui : les tours, le
                  temps de la dernière répétition, le temps au chrono. Tant
                  qu&apos;il attend, le passage ne compte nulle part — ni au
                  classement, ni sur le mur LED.
                </p>
              </Etape>

              <Etape numero={5} titre="Valider le résultat">
                <p>
                  Quand le juge a rendu son verdict, validez — depuis la fiche
                  au plateau, ou ligne à ligne dans la file d&apos;attente
                  quand la feuille arrive. « Tout valider » enregistre d&apos;un
                  coup toutes les lignes renseignées ; une ligne vide reste en
                  attente. La performance est enregistrée, les points sont
                  recalculés immédiatement.
                </p>
                <p>
                  Depuis le plateau, l&apos;athlète suivant de la catégorie est
                  appelé automatiquement. Un passage validé ne s&apos;annule
                  pas depuis le plateau : une correction passe par la feuille
                  de notation et la signature du juge principal.
                </p>
              </Etape>
            </ol>
          </Carte>

          <Carte titre="Les trois issues possibles">
            <div className="space-y-4">
              <div className="rounded-lg border border-bordure border-l-4 border-l-vert bg-papier-2 p-4">
                <p className="font-titre text-base font-bold tracking-wide text-vert-fonce uppercase">
                  Résultat validé
                </p>
                <p className="mt-1 text-encre-2">
                  L&apos;athlète a réalisé une performance mesurable. Saisissez
                  la valeur avant de valider : sans valeur, le logiciel refuse
                  la validation. L&apos;athlète prend un rang et marque des
                  points.
                </p>
              </div>
              <div className="rounded-lg border border-bordure border-l-4 border-l-orange bg-papier-2 p-4">
                <p className="font-titre text-base font-bold tracking-wide text-orange-fonce uppercase">
                  Zéro
                </p>
                <p className="mt-1 text-encre-2">
                  L&apos;athlète s&apos;est présenté et a tenté, mais rien
                  n&apos;a été validé par le juge : aucune répétition, aucune
                  charge, aucune distance.
                </p>
              </div>
              <div className="rounded-lg border border-bordure border-l-4 border-l-rouge bg-papier-2 p-4">
                <p className="font-titre text-base font-bold tracking-wide text-rouge-fonce uppercase">
                  Forfait
                </p>
                <p className="mt-1 text-encre-2">
                  L&apos;athlète ne se présente pas ou renonce à
                  l&apos;épreuve : blessure, abandon, absence au plateau.
                </p>
              </div>
            </div>
          </Carte>

          <Carte titre="Le temps au chrono, et quitter la page">
            <p>
              Sur les épreuves à répétitions, trois cases : le nombre validé,
              le temps de la dernière répétition, et le{" "}
              <strong>temps au chrono</strong>. Cette dernière se remplit toute
              seule quand le chronomètre s&apos;arrête, avec le temps imparti
              de l&apos;épreuve, le même pour tous, qu&apos;on ait coupé avant
              la fin ou non. Elle est conservée et imprimée ; elle ne départage
              pas.
            </p>
            <p>
              Vous pouvez aller à la régie ou ailleurs pendant qu&apos;un
              chrono tourne : en revenant sur le plateau, il reprend là où il
              en était, le même que sur le mur LED.
            </p>
            <p>
              Quand tous les passages d&apos;une catégorie sont rendus, un
              encadré « Épreuve terminée » propose d&apos;imprimer les
              résultats, à signer.
            </p>
          </Carte>

          <Encadre ton="attention" titre="Zéro et forfait rapportent 0 point et ne prennent aucun rang">
            <p>
              Ces deux verdicts ne sont pas des performances. L&apos;athlète
              n&apos;apparaît pas au classement de l&apos;épreuve : ni premier,
              ni dernier, il n&apos;a pas de rang du tout et marque 0 point.
            </p>
            <p>
              En revanche <strong>il continue de compter dans l&apos;effectif</strong>{" "}
              de la catégorie. Sur huit athlètes dont un forfait, le premier
              marque toujours 8 points. C&apos;est normal : le barème dépend du
              nombre d&apos;engagés classables, pas du nombre de performances
              réalisées.
            </p>
          </Encadre>
        </Section>

        {/* ── 6 ───────────────────────────────────────────────────────── */}
        <Section
          id="ecrans"
          titre="6. Les écrans du public et la régie"
          chapeau="Le mur LED se sert tout seul dans les données du poste de saisie. La régie choisit seulement ce que chaque sortie affiche."
        >
          <Carte titre="Brancher une sortie vidéo">
            <ol className="ml-5 list-decimal space-y-2 text-encre-2 marker:font-semibold marker:text-encre">
              <li>
                Dans la <strong>Régie de diffusion</strong>, déclarez une sortie
                par écran branché, mur LED, vidéoprojecteur, avec son nom.
              </li>
              <li>
                Choisissez son contenu dans la liste ci-dessous. « Aperçu » le
                montre dans l&apos;onglet courant ; « Ouvrir la fenêtre »
                l&apos;ouvre à part.
              </li>
              <li>
                Détachez cette fenêtre, glissez-la sur l&apos;écran voulu,
                passez en plein écran (F11). Elle se met à jour toute seule à
                chaque décision du plateau ; rien à saisir de ce côté.
              </li>
              <li>
                Avant l&apos;ouverture au public, ouvrez la <strong>mire</strong>{" "}
                sur chaque sortie et lisez-la depuis le dernier rang. Le bouton
                « jour / nuit » règle la lisibilité en plein soleil.
              </li>
            </ol>
            <p className="text-encre-2">
              La régie n&apos;affiche ni l&apos;épreuve ni les résultats : ils
              se lisent sur les écrans qu&apos;elle pilote. N&apos;importe quel
              poste du réseau peut ouvrir un écran, sans code d&apos;accès.
            </p>
          </Carte>

          <Carte titre="Les contenus disponibles">
            <dl className="space-y-4">
              {[
                [
                  "Écran d'attente",
                  "Avant le coup d'envoi : le compte à rebours, la date, le lieu, la liste des athlètes engagés qui défile page par page, et le bandeau des partenaires.",
                ],
                [
                  "Athlète au plateau",
                  "Pendant l'épreuve : la fiche de l'athlète appelé — photo, dossard, nom, club, nationalité, catégorie, poids — et le chronomètre géant.",
                ],
                [
                  "Ordre de passage",
                  "Qui passe ensuite. En passage mélangé, une colonne par catégorie, le prochain athlète mis en évidence.",
                ],
                [
                  "Dernier verdict",
                  "La performance qui vient d'être validée, en très grand : la valeur en vert, ou « ZÉRO » / « FORFAIT » en rouge.",
                ],
                [
                  "Résultats de l'épreuve par catégorie",
                  "Le tableau de l'épreuve en cours, une colonne par catégorie : rang, dossard, athlète, performance et points. Marqué « provisoires » tant que des passages restent à faire, « définitifs » quand tout est validé. Un passage en attente de résultat n'y figure pas.",
                ],
                [
                  "Classement général",
                  "Une colonne par catégorie, les dix premiers avec leur dossard et leur total de points.",
                ],
                [
                  "Podium",
                  "Les trois premiers de la catégorie affichée, avec leur médaille et leur prime — celles de leur catégorie.",
                ],
                [
                  "Classement des clubs",
                  "Les clubs classés par points, toutes catégories confondues, selon le barème de la rubrique 3.",
                ],
                [
                  "Mire de lisibilité",
                  "Un outil de réglage, à utiliser avant l'ouverture au public : vous lisez la plus petite ligne encore nette depuis le dernier rang du public.",
                ],
              ].map(([nom, texte]) => (
                <div key={nom}>
                  <dt className="font-semibold">{nom}</dt>
                  <dd className="mt-1 text-encre-2">{texte}</dd>
                </div>
              ))}
            </dl>
          </Carte>

          <Encadre ton="info" titre="Les écrans sont en lecture seule">
            <p>
              Rien de ce qui est affiché sur le mur LED ne peut être modifié
              depuis l&apos;écran lui-même. Toute correction se fait au poste de
              saisie, et l&apos;affichage suit dans les secondes qui suivent.
            </p>
          </Encadre>
        </Section>

        {/* ── 7 ───────────────────────────────────────────────────────── */}
        <Section
          id="papier"
          titre="7. Ce qui s'imprime"
          chapeau="Le papier demande exactement ce que l'écran demandera à la ressaisie, avec les mêmes mots. Le juge n'a rien à traduire."
        >
          <Carte titre="Les huit feuilles, et qui les remplit">
            <dl className="space-y-4">
              {[
                [
                  "Feuilles de pesée",
                  "Une par catégorie, plus une pour les athlètes pas encore rangés. L'officiel de pesée note le poids à la balance et signe ; la table reporte à l'étape Pesée. Depuis l'étape Pesée ou l'accueil.",
                ],
                [
                  "Programme de la journée",
                  "Une page : déroulé, épreuves dans l'ordre avec matériel, catégories, officiels. Pour le speaker, l'accueil, les clubs. Depuis l'étape Programme ou l'accueil.",
                ],
                [
                  "Liste des officiels",
                  "Postes communs puis staff de chaque catégorie, colonne signature, pour le procès-verbal. Depuis l'étape Officiels ou l'accueil.",
                ],
                [
                  "Fiches de notation par athlète",
                  "Une page par athlète, toutes épreuves, cases vides à remplir par les juges. Le repli si le réseau tombe. Depuis l'étape Athlètes ou l'accueil.",
                ],
                [
                  "Feuille de notation de l'épreuve",
                  "Une feuille par catégorie, tous les athlètes dans l'ordre de passage : l'arbitre remplit ligne à ligne sur le terrain, la table reporte au plateau ou dans la file d'attente. Les résultats déjà validés y sont préremplis et grisés. Depuis le plateau, « Imprimer la feuille ».",
                ],
                [
                  "Résultats de l'épreuve",
                  "Une feuille par catégorie : classement recalculé, zéros, forfaits et non-passés listés avec leur motif, bandeau « provisoires » ou « définitifs », signatures. Depuis le plateau quand l'épreuve est terminée.",
                ],
                [
                  "Palmarès",
                  "Par catégorie, chaque place dotée avec son lauréat, puis le meilleur club et sa récompense, à signer. Depuis l'étape Récompenses ou l'accueil.",
                ],
                [
                  "Classement des clubs",
                  "Rang, club, athlètes classés, titres, points. Depuis la page Classement des clubs.",
                ],
              ].map(([nom, texte]) => (
                <div key={nom}>
                  <dt className="font-semibold">{nom}</dt>
                  <dd className="mt-1 text-encre-2">{texte}</dd>
                </div>
              ))}
            </dl>
          </Carte>

          <Encadre ton="info" titre="Imprimer">
            <p>
              Chaque feuille a un bouton « Imprimer » qui ouvre la boîte
              d&apos;impression du navigateur : choisissez A4, portrait, sauf
              la feuille de notation de l&apos;épreuve, qui est en paysage. Les
              boutons et le bandeau disparaissent à l&apos;impression.
            </p>
          </Encadre>
        </Section>

        {/* ── 8 ───────────────────────────────────────────────────────── */}
        <Section
          id="fin"
          titre="8. En fin de compétition"
          chapeau="Le classement est déjà fait. Il reste à le vérifier, à le proclamer, à le signer et à l'archiver."
        >
          <Carte titre="Vérifier">
            <p>
              Sur le plateau, sous les colonnes : le classement de
              l&apos;épreuve par catégorie, puis le classement général de toutes
              les épreuves, puis le classement des clubs. Avant la
              proclamation, relisez-les avec le directeur de compétition :
              aucun passage ne doit rester « en attente de résultat », aucun
              athlète attendu ne doit manquer.
            </p>
          </Carte>

          <Carte titre="Proclamer">
            <p>
              Dans la régie, passez une sortie sur « Podium » pour la catégorie
              affichée, puis sur « Classement des clubs ». L&apos;étape
              Récompenses montre le lauréat de chaque place ; le{" "}
              <strong>palmarès imprimé</strong> reprend le tout, avec le
              meilleur club et sa récompense, à signer par le directeur et le
              juge principal.
            </p>
          </Carte>

          <Carte titre="Archiver">
            <p>
              L&apos;export Excel, depuis l&apos;accueil, contient les athlètes,
              les résultats de chaque épreuve et les classements. C&apos;est le
              document à remettre à la fédération et à conserver. Faites-le
              avant d&apos;éteindre quoi que ce soit ; les photos n&apos;y sont
              pas.
            </p>
          </Carte>

          <Encadre ton="attention" titre="Ne remettez rien à zéro le jour même">
            <p>
              Les opérations de remise à zéro effacent les athlètes et les
              passages sans possibilité de retour. Tant que le classement
              n&apos;est pas exporté et validé, n&apos;y touchez pas.
            </p>
          </Encadre>
        </Section>

        {/* ── 9 ───────────────────────────────────────────────────────── */}
        <Section
          id="probleme"
          titre="9. En cas de problème"
          chapeau="Quatre situations reviennent souvent. Aucune n'est irrattrapable."
        >
          <Carte titre="Vous vous êtes trompé de saisie">
            <p>
              <strong>Avant de valider</strong> : corrigez la case, retirez le
              dernier tour compté, ou « ← Retour file » remet l&apos;athlète
              dans « À venir » sans rien enregistrer.
            </p>
            <p>
              <strong>Après validation</strong>, un passage ne s&apos;annule
              pas depuis le plateau : c&apos;est un résultat officiel, déjà lu
              sur le mur LED. La correction passe par la feuille de notation
              signée du juge principal, puis par la personne qui administre le
              logiciel. Prévenez le directeur de compétition avant de corriger
              un résultat déjà annoncé au public.
            </p>
          </Carte>

          <Carte titre="Un athlète est disqualifié">
            <p>
              Passez-le « invité, hors classement » sur sa fiche, ou saisissez
              un forfait sur l&apos;épreuve, selon la décision du jury. Le
              logiciel recalcule immédiatement.
            </p>
          </Carte>

          <Encadre ton="info" titre="Les points de toute la catégorie changent : c'est normal">
            <p>
              Le barème dépend de l&apos;effectif classable de la catégorie.
              Retirer un athlète du classement fait passer N de 8 à 7 : sur
              chaque épreuve, le premier marque désormais 7 points au lieu de 8,
              et tous les autres suivent. Le changement porte sur{" "}
              <strong>toutes les épreuves déjà disputées</strong>, pas seulement
              sur la suivante.
            </p>
            <p>
              Ce n&apos;est pas un bug et ce n&apos;est pas une perte de
              données : c&apos;est la règle appliquée correctement. Les places
              relatives des athlètes restants ne changent pas.
            </p>
          </Encadre>

          <Carte titre="L'écran du public se fige ou affiche une erreur">
            <p>
              Vérifiez d&apos;abord le poste de saisie : si le logiciel y
              fonctionne, les données sont intactes, seul l&apos;affichage est
              en cause. Un écran qui affiche « Données momentanément
              indisponibles » retente tout seul toutes les cinq secondes.
            </p>
            <p>
              Sinon, fermez la fenêtre de l&apos;écran concerné et rouvrez-la
              depuis la régie. L&apos;écran se reconstruit à partir des données
              du poste : aucun résultat n&apos;est perdu en le fermant. Si
              l&apos;image ne revient pas, contrôlez le câble et la sortie
              vidéo. Pendant ce temps, la compétition continue : le mur LED est
              un affichage, pas la source des résultats.
            </p>
          </Carte>

          <Carte titre="Le code d'accès est refusé, ou la page met du temps">
            <p>
              Après plusieurs mauvais codes, chaque nouvel essai attend un peu
              plus longtemps, quelques secondes : c&apos;est une protection, pas
              une panne, et le bon code passe toujours. Une session dure douze
              heures ; si une page dit « session expirée », reconnectez-vous,
              rien de validé n&apos;est perdu.
            </p>
          </Carte>

          <Carte titre="Suspendre la compétition">
            <p>
              Blessure, panne, réclamation : le bouton « Suspendre » du plateau
              affiche « Compétition suspendue » et le motif sur tous les écrans
              du public. « Reprendre » les rend à leur contenu.
            </p>
          </Carte>

          <Encadre ton="interdit" titre="Ce qu'il ne faut jamais faire en pleine compétition">
            <p>
              Ne supprimez pas une catégorie : ses athlètes perdent leur
              affectation, ses récompenses propres disparaissent et son staff
              repasse « toutes catégories ». Préférez « Mettre de côté ».
            </p>
            <p>
              Ne supprimez pas une épreuve commencée : ses passages et ses
              résultats partent avec elle.
            </p>
            <p>
              Ne modifiez pas le club d&apos;un athlète après la première
              épreuve sans prévenir : les points de club déjà acquis suivent le
              nouveau nom.
            </p>
          </Encadre>
        </Section>
      </div>

      <footer className="mt-12 border-t border-bordure pt-6 text-sm text-encre-3">
        <p>
          Une question qui n&apos;est pas traitée ici se pose au directeur de
          compétition ou au responsable de l&apos;arbitrage. En cas de doute sur
          un résultat, on suspend la compétition et on vérifie : une saisie
          fausse validée est toujours plus coûteuse qu&apos;une minute
          d&apos;attente.
        </p>
        <p className="mt-6">
          <Link
            href="/connexion"
            title="Entre dans l'administration — préparation, plateau, régie. Le code d'accès n'est demandé que si aucune session n'est ouverte."
            className="inline-flex items-center gap-2 rounded-xl bg-vert px-6 py-3.5 font-titre text-base font-bold tracking-wide uppercase shadow-sm transition hover:bg-vert-fonce focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
            // La base globale (reprise de l'original) impose `a { color: vert }`
            // hors couche Tailwind : elle battait la classe de couleur, et le
            // texte était vert sur vert. Le style inline gagne sur tout.
            style={{ color: "#FCFAF6", textDecoration: "none" }}
          >
            Accéder à l&apos;administration
            <span aria-hidden="true">→</span>
          </Link>
        </p>
      </footer>
    </main>
  );
}
