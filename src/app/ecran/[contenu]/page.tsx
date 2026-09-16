/**
 * Écrans publics du mur LED — `/ecran/plateau`, `/ecran/ordre`,
 * `/ecran/classement`, `/ecran/podium`, `/ecran/attente`.
 *
 * Lecture seule, sans authentification, sans aucune donnée personnelle : tout
 * passe par `AthletePublic`, qui ne porte ni téléphone, ni contact d'urgence,
 * ni âge. Aucune requête n'est écrite ici — `src/lib/donnees.ts` est la seule
 * porte vers la base.
 *
 * Ces écrans sont lus à vingt mètres : les tailles sont exprimées en `vh`/`vw`
 * par style en ligne, parce qu'un mur LED n'a pas la hauteur d'un écran de
 * bureau et qu'une taille en pixels y devient illisible ou débordante.
 *
 * Un écran vide et muet se lit comme une panne : chaque cas sans donnée dit
 * explicitement ce qu'il attend.
 */

import { notFound } from "next/navigation";
import {
  athletesDe,
  categoriesDe,
  competitionCourante,
  epreuvesDe,
  passagesDe,
  tableauGeneral,
  type AthletePublic,
  type CategorieVue,
  type EpreuveVue,
} from "@/lib/donnees";
import Rafraichir from "./rafraichir";

/**
 * Le rendu serveur est refait au plus toutes les deux secondes. Le composant
 * client `Rafraichir` déclenche la demande ; cette valeur borne le coût côté
 * base.
 */
export const revalidate = 2;

const CONTENUS = [
  "plateau",
  "ordre",
  "classement",
  "podium",
  "attente",
] as const;
type Contenu = (typeof CONTENUS)[number];

const estContenu = (v: string): v is Contenu =>
  (CONTENUS as readonly string[]).includes(v);

/* ── Petites aides d'affichage ────────────────────────────────────────── */

/**
 * La couleur d'une catégorie suit son rang dans la liste : la charte n'en
 * définit que sept, au-delà on recommence. On passe par la variable CSS et non
 * par une classe Tailwind, parce qu'une classe construite dynamiquement
 * (`bg-cat-${i}`) n'est pas vue par le scanner de Tailwind et n'existerait pas
 * au moment du rendu.
 */
const couleurCategorie = (index: number): string =>
  `var(--color-cat-${(index % 7) + 1})`;

const COULEURS_METAL = [
  "var(--color-or)",
  "var(--color-argent)",
  "var(--color-bronze)",
] as const;

const METAUX = ["Or", "Argent", "Bronze"] as const;

const nomComplet = (a: AthletePublic): string =>
  `${a.nom.toUpperCase()} ${a.prenoms}`.trim();

const dossardTexte = (a: AthletePublic): string =>
  a.dossard === null ? "—" : String(a.dossard);

const dateFr = (d: Date | null): string | null => {
  if (!d) return null;
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const heureFr = (d: Date | null): string | null => {
  if (!d) return null;
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

/* ── Briques communes ─────────────────────────────────────────────────── */

/** Le cadre plein écran commun à tous les contenus. */
function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mur-led fixed inset-0 flex flex-col font-titre"
      style={{ padding: "3vh 4vw", gap: "2vh" }}
    >
      <Rafraichir />
      {children}
    </main>
  );
}

/** Message plein cadre — panne de données, attente, écran sans contenu. */
function Message({ texte, detail }: { texte: string; detail?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="font-bold" style={{ fontSize: "7vh" }}>
        {texte}
      </p>
      {detail ? (
        <p
          className="opacity-70"
          style={{ fontSize: "3vh", marginTop: "2vh" }}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}

/** Titre de haut d'écran : le contenu affiché, et le contexte. */
function Titre({ texte, contexte }: { texte: string; contexte?: string }) {
  return (
    <header className="flex shrink-0 items-baseline justify-between">
      <h1
        className="font-bold uppercase tracking-wide"
        style={{ fontSize: "4.5vh" }}
      >
        {texte}
      </h1>
      {contexte ? (
        <p
          className="uppercase text-orange"
          style={{ fontSize: "3.2vh" }}
        >
          {contexte}
        </p>
      ) : null}
    </header>
  );
}

/**
 * Bandeau de suspension, par-dessus tout le reste.
 *
 * Une compétition suspendue et un écran inchangé, c'est un public qui croit à
 * un simple retard : l'interruption doit se voir avant tout le reste.
 */
function BandeauSuspension({ motif }: { motif: string | null }) {
  return (
    <div
      className="absolute inset-x-0 top-0 z-50 bg-rouge text-center font-bold uppercase"
      style={{ padding: "2vh 4vw" }}
    >
      <p style={{ fontSize: "6vh", lineHeight: 1.05 }}>
        Compétition suspendue
      </p>
      {motif ? (
        <p className="font-normal normal-case" style={{ fontSize: "3.2vh" }}>
          {motif}
        </p>
      ) : null}
    </div>
  );
}

/* ── Écran : plateau ──────────────────────────────────────────────────── */

function EcranPlateau({
  athlete,
  categorie,
  couleur,
  epreuve,
}: {
  athlete: AthletePublic | null;
  categorie: CategorieVue | null;
  couleur: string;
  epreuve: EpreuveVue | null;
}) {
  if (!athlete) {
    return (
      <>
        <Titre texte="Au plateau" contexte={epreuve?.nom} />
        <Message
          texte="En attente du prochain athlète"
          detail={epreuve ? `Épreuve : ${epreuve.nom}` : undefined}
        />
      </>
    );
  }

  return (
    <>
      <Titre texte="Au plateau" contexte={epreuve?.nom} />
      <section className="flex flex-1 items-center" style={{ gap: "4vw" }}>
        <div
          className="flex shrink-0 items-center justify-center rounded-lg bg-nuit-2 font-bold text-orange"
          style={{
            fontSize: "25vh",
            lineHeight: 1,
            padding: "2vh 3vw",
            minWidth: "28vw",
            borderBottom: `1.2vh solid ${couleur}`,
          }}
        >
          {dossardTexte(athlete)}
        </div>

        <div className="flex min-w-0 flex-col" style={{ gap: "1.5vh" }}>
          <p
            className="truncate font-bold uppercase"
            style={{ fontSize: "8vh", lineHeight: 1.05 }}
          >
            {athlete.nom}
          </p>
          <p className="truncate" style={{ fontSize: "5vh", lineHeight: 1.05 }}>
            {athlete.prenoms}
          </p>
          <p
            className="truncate opacity-80"
            style={{ fontSize: "3.6vh" }}
          >
            {athlete.club ?? "Sans club"}
          </p>
          {categorie ? (
            <p
              className="inline-flex self-start rounded font-bold uppercase text-nuit"
              style={{
                fontSize: "3.4vh",
                padding: "0.6vh 1.6vw",
                background: couleur,
              }}
            >
              {categorie.nom}
            </p>
          ) : null}
          {athlete.horsClassement ? (
            <p className="text-orange" style={{ fontSize: "3vh" }}>
              Invité — hors classement
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

/* ── Écran : ordre de passage ─────────────────────────────────────────── */

function EcranOrdre({
  athletes,
  epreuve,
}: {
  athletes: AthletePublic[];
  epreuve: EpreuveVue | null;
}) {
  if (athletes.length === 0) {
    return (
      <>
        <Titre texte="Ordre de passage" contexte={epreuve?.nom} />
        <Message
          texte="Plus aucun passage à venir"
          detail="Résultats en cours de vérification"
        />
      </>
    );
  }

  return (
    <>
      <Titre texte="Ordre de passage" contexte={epreuve?.nom} />
      <ol className="flex flex-1 flex-col justify-center" style={{ gap: "1vh" }}>
        {athletes.map((a, i) => (
          <li
            key={a.id}
            className="flex items-center rounded"
            style={{
              gap: "2.5vw",
              padding: "0.8vh 1.5vw",
              background: i === 0 ? "var(--color-nuit-2)" : "transparent",
              borderLeft:
                i === 0
                  ? "0.8vw solid var(--color-orange)"
                  : "0.8vw solid transparent",
            }}
          >
            <span
              className="shrink-0 text-right font-bold text-orange"
              style={{
                fontSize: i === 0 ? "7vh" : "5vh",
                lineHeight: 1.1,
                minWidth: "8vw",
              }}
            >
              {dossardTexte(a)}
            </span>
            <span
              className="truncate"
              style={{
                fontSize: i === 0 ? "6.5vh" : "4.6vh",
                lineHeight: 1.1,
                opacity: i === 0 ? 1 : 0.85,
              }}
            >
              {nomComplet(a)}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

/* ── Écran : classement général ───────────────────────────────────────── */

interface ColonneClassement {
  categorie: CategorieVue;
  couleur: string;
  lignes: { athleteId: string; rang: number; total: number }[];
}

function EcranClassement({
  colonnes,
  nomsParId,
}: {
  colonnes: ColonneClassement[];
  nomsParId: Map<string, AthletePublic>;
}) {
  const remplies = colonnes.filter((c) => c.lignes.length > 0);

  if (remplies.length === 0) {
    return (
      <>
        <Titre texte="Classement général" />
        <Message texte="Aucun résultat pour le moment" />
      </>
    );
  }

  return (
    <>
      <Titre texte="Classement général par catégorie" />
      <div
        className="grid flex-1 content-start overflow-hidden"
        style={{
          gap: "2vw",
          gridTemplateColumns: `repeat(${Math.min(remplies.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {remplies.map((c) => (
          <section key={c.categorie.id} className="flex min-w-0 flex-col">
            <h2
              className="truncate rounded-t text-center font-bold uppercase text-nuit"
              style={{
                fontSize: "3.2vh",
                padding: "0.6vh 0.5vw",
                background: c.couleur,
              }}
            >
              {c.categorie.nom}
            </h2>
            <ol className="flex flex-col" style={{ gap: "0.4vh" }}>
              {c.lignes.map((l) => {
                const a = nomsParId.get(l.athleteId);
                const metal =
                  l.rang >= 1 && l.rang <= 3
                    ? COULEURS_METAL[l.rang - 1]
                    : "var(--color-nuit-encre)";
                return (
                  <li
                    key={l.athleteId}
                    className="flex items-baseline"
                    style={{
                      gap: "1vw",
                      padding: "0.5vh 0.6vw",
                      borderBottom: "0.2vh solid var(--color-nuit-2)",
                    }}
                  >
                    <span
                      className="shrink-0 text-right font-bold"
                      style={{
                        fontSize: "3.4vh",
                        minWidth: "2.5vw",
                        color: metal,
                      }}
                    >
                      {l.rang}
                    </span>
                    <span
                      className="flex-1 truncate uppercase"
                      style={{ fontSize: "3vh" }}
                    >
                      {a ? a.nom : "—"}
                    </span>
                    <span
                      className="shrink-0 font-bold"
                      style={{ fontSize: "3.2vh" }}
                    >
                      {l.total}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}

/* ── Écran : podium ───────────────────────────────────────────────────── */

function EcranPodium({
  colonnes,
  nomsParId,
}: {
  colonnes: ColonneClassement[];
  nomsParId: Map<string, AthletePublic>;
}) {
  const remplies = colonnes.filter((c) => c.lignes.length > 0);

  if (remplies.length === 0) {
    return (
      <>
        <Titre texte="Podium" />
        <Message texte="Aucun résultat pour le moment" />
      </>
    );
  }

  return (
    <>
      <Titre texte="Podium par catégorie" />
      <div
        className="grid flex-1 content-start overflow-hidden"
        style={{
          gap: "2vw",
          gridTemplateColumns: `repeat(${Math.min(remplies.length, 3)}, minmax(0, 1fr))`,
        }}
      >
        {remplies.map((c) => (
          <section key={c.categorie.id} className="flex min-w-0 flex-col">
            <h2
              className="truncate rounded-t text-center font-bold uppercase text-nuit"
              style={{
                fontSize: "3.6vh",
                padding: "0.8vh 0.5vw",
                background: c.couleur,
              }}
            >
              {c.categorie.nom}
            </h2>
            <ol
              className="flex flex-1 flex-col justify-center"
              style={{ gap: "1.2vh", marginTop: "1.2vh" }}
            >
              {c.lignes.slice(0, 3).map((l, i) => {
                const a = nomsParId.get(l.athleteId);
                return (
                  <li
                    key={l.athleteId}
                    className="flex min-w-0 items-center rounded bg-nuit-2"
                    style={{
                      gap: "1.5vw",
                      padding: "1.2vh 1vw",
                      borderLeft: `0.8vw solid ${COULEURS_METAL[i]}`,
                    }}
                  >
                    <span
                      className="shrink-0 font-bold"
                      style={{ fontSize: "7vh", color: COULEURS_METAL[i] }}
                    >
                      {l.rang}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span
                        className="truncate font-bold uppercase"
                        style={{ fontSize: "4.4vh", lineHeight: 1.1 }}
                      >
                        {a ? a.nom : "—"}
                      </span>
                      <span
                        className="truncate opacity-75"
                        style={{ fontSize: "2.6vh" }}
                      >
                        {METAUX[i]} · {l.total} points
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}

/* ── Écran : attente ──────────────────────────────────────────────────── */

function EcranAttente({
  nom,
  lieu,
  adresse,
  debutLe,
}: {
  nom: string;
  lieu: string | null;
  adresse: string | null;
  debutLe: Date | null;
}) {
  const date = dateFr(debutLe);
  const heure = heureFr(debutLe);

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p
        className="uppercase text-orange"
        style={{ fontSize: "3.2vh", letterSpacing: "0.3vw" }}
      >
        Avant le coup d'envoi
      </p>
      <h1
        className="font-bold uppercase"
        style={{ fontSize: "11vh", lineHeight: 1.05, marginTop: "2vh" }}
      >
        {nom}
      </h1>
      <p style={{ fontSize: "5vh", marginTop: "3vh" }}>
        {date ?? "Date à confirmer"}
        {heure ? <span className="text-vert"> · {heure}</span> : null}
      </p>
      <p className="opacity-85" style={{ fontSize: "4vh", marginTop: "2vh" }}>
        {lieu ?? "Lieu à confirmer"}
      </p>
      {adresse ? (
        <p className="opacity-60" style={{ fontSize: "2.6vh" }}>
          {adresse}
        </p>
      ) : null}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default async function PageEcran({
  params,
}: {
  params: Promise<{ contenu: string }>;
}) {
  const { contenu } = await params;
  if (!estContenu(contenu)) notFound();

  const comp = await competitionCourante();
  if (!comp) {
    return (
      <Cadre>
        <Message
          texte="Aucune compétition enregistrée"
          detail="Créez la compétition depuis l'administration."
        />
      </Cadre>
    );
  }

  const suspension = comp.suspendue ? (
    <BandeauSuspension motif={comp.motifSuspension} />
  ) : null;

  // L'écran d'attente n'a besoin d'aucune donnée sportive : on s'arrête là
  // plutôt que de charger athlètes et classements pour rien.
  if (contenu === "attente") {
    return (
      <Cadre>
        {suspension}
        <EcranAttente
          nom={comp.nom}
          lieu={comp.lieu}
          adresse={comp.adresse}
          debutLe={comp.debutLe}
        />
      </Cadre>
    );
  }

  const [epreuves, categories, athletes] = await Promise.all([
    epreuvesDe(comp.id),
    categoriesDe(comp.id),
    athletesDe(comp.id),
  ]);

  const parId = new Map(athletes.map((a) => [a.id, a]));
  const actives = categories.filter((c) => c.active);
  const indexCouleur = new Map(categories.map((c, i) => [c.id, i]));

  const epreuveCourante =
    epreuves.find((e) => e.id === comp.epreuveCouranteId) ?? null;
  const categorieCourante =
    categories.find((c) => c.id === comp.categorieCouranteId) ?? null;

  /* ── plateau et ordre : tous deux lisent les passages de l'épreuve ── */
  if (contenu === "plateau" || contenu === "ordre") {
    if (!epreuveCourante) {
      return (
        <Cadre>
          {suspension}
          <Message
            texte="En attente du lancement d'une épreuve"
            detail={comp.nom}
          />
        </Cadre>
      );
    }

    // Sans catégorie désignée, on regarde tout le plateau : mieux vaut un
    // écran qui montre le passage en cours qu'un écran vide.
    const concernes = categorieCourante
      ? athletes.filter((a) => a.categorieId === categorieCourante.id)
      : athletes;
    const passages = await passagesDe(
      epreuveCourante.id,
      concernes.map((a) => a.id),
    );

    if (contenu === "plateau") {
      const auPlateau = passages.find((p) => p.statut === "plateau") ?? null;
      const athlete = auPlateau ? (parId.get(auPlateau.athleteId) ?? null) : null;
      const cat = athlete
        ? (categories.find((c) => c.id === athlete.categorieId) ?? null)
        : categorieCourante;
      const couleur = couleurCategorie(
        cat ? (indexCouleur.get(cat.id) ?? 0) : 0,
      );
      return (
        <Cadre>
          {suspension}
          <EcranPlateau
            athlete={athlete}
            categorie={cat}
            couleur={couleur}
            epreuve={epreuveCourante}
          />
        </Cadre>
      );
    }

    const prochains = passages
      .filter((p) => p.statut === "avenir")
      .sort((a, b) => a.ordre - b.ordre)
      .slice(0, 8)
      .map((p) => parId.get(p.athleteId))
      .filter((a): a is AthletePublic => Boolean(a));

    return (
      <Cadre>
        {suspension}
        <EcranOrdre athletes={prochains} epreuve={epreuveCourante} />
      </Cadre>
    );
  }

  /* ── classement et podium : le général de chaque catégorie ── */
  const colonnes: ColonneClassement[] = [];
  for (const cat of actives) {
    const tableau = await tableauGeneral(cat, epreuves, athletes);
    // Un classement où personne n'a encore marqué n'apprend rien au public :
    // on ne montre la colonne qu'à partir du premier point inscrit.
    if (tableau.lignes.every((l) => l.total === 0)) continue;
    colonnes.push({
      categorie: cat,
      couleur: couleurCategorie(indexCouleur.get(cat.id) ?? 0),
      lignes: tableau.lignes
        .slice(0, contenu === "podium" ? 3 : 10)
        .map((l) => ({ athleteId: l.athleteId, rang: l.rang, total: l.total })),
    });
  }

  return (
    <Cadre>
      {suspension}
      {contenu === "podium" ? (
        <EcranPodium colonnes={colonnes} nomsParId={parId} />
      ) : (
        <EcranClassement colonnes={colonnes} nomsParId={parId} />
      )}
    </Cadre>
  );
}
