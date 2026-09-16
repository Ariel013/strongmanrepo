import Link from "next/link";
import {
  C,
  clubAffiche,
  libelleTemps,
  mesureMixte,
  nomComplet,
  pays,
  tempsImpartiLisible,
  uniteValeur,
  virgule,
} from "@/lib/charte";
import { FilAriane } from "@/components/chrome";
import { Encart, styleBouton } from "@/components/ui";
import {
  categoriesDe,
  competitionCourante,
  epreuvesCompletes,
  fichesAthletes,
  type FicheAthlete,
} from "@/lib/donnees";
import { BoutonImprimer } from "./imprimer";

/**
 * Les fiches de notation papier — une par athlète, une par feuille A4.
 *
 * C'est le repli du jour J : les juges notent sur le terrain, et la table
 * reporte dans le logiciel plus tard. La règle qui gouverne toute cette page :
 * **le papier demande exactement ce que l'écran demandera à la ressaisie**,
 * avec les mêmes mots. Une case « Nombre validé » sur la fiche correspond au
 * champ « Nombre validé » du plateau. Un juge n'a rien à traduire.
 *
 * `?athlete=<id>` imprime une seule fiche ; sans paramètre, toutes.
 */
export const dynamic = "force-dynamic";

const capitaliser = (s: string): string =>
  s.replace(/(^|\s)([a-zà-ÿ])/g, (_, e, l) => e + l.toUpperCase());

export default async function PageFiches({
  searchParams,
}: {
  searchParams: Promise<{ athlete?: string }>;
}) {
  const { athlete: seulement } = await searchParams;
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Fiches de notation</FilAriane>
        <Encart ton="ambre">Aucune compétition installée.</Encart>
      </>
    );
  }

  const [epreuves, categories, tous] = await Promise.all([
    epreuvesCompletes(comp.id),
    categoriesDe(comp.id),
    fichesAthletes(comp.id),
  ]);

  const athletes = (
    seulement ? tous.filter((a) => a.id === seulement) : tous
  ).sort(
    (a, b) =>
      (a.dossard ?? Infinity) - (b.dossard ?? Infinity) ||
      a.nom.localeCompare(b.nom, "fr"),
  );

  const dateTexte = comp.debutLe
    ? capitaliser(
        comp.debutLe.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      )
    : "";

  return (
    <>
      <FilAriane>Fiches de notation</FilAriane>

      {/* ── Barre d'outils, écran seulement ── */}
      <div
        className="ne-pas-imprimer"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        <BoutonImprimer nombre={athletes.length} />
        {seulement ? (
          <Link
            href="/admin/impression/fiches"
            style={styleBouton("blanc", { padding: "10px 16px", borderRadius: 9 })}
          >
            Toutes les fiches ({tous.length})
          </Link>
        ) : null}
        <div style={{ fontSize: 13, color: C.encre4, lineHeight: 1.5 }}>
          Une fiche par feuille A4. Les juges y notent sur le terrain ; la table
          reporte ensuite dans le plateau — les cases portent exactement les
          mêmes intitulés que l&apos;écran de saisie.
        </div>
      </div>

      {athletes.length === 0 ? (
        <Encart ton="ambre">
          Aucun athlète engagé : rien à imprimer. Ajoutez-les à l&apos;étape
          Athlètes.
        </Encart>
      ) : null}

      {athletes.map((a) => (
        <Fiche
          key={a.id}
          a={a}
          categorie={categories.find((c) => c.id === a.categorieId)?.nom ?? null}
          epreuves={epreuves}
          entete={{
            date: dateTexte,
            lieu: comp.lieu ?? "",
            adresse: comp.adresse ?? "",
          }}
        />
      ))}
    </>
  );
}

/* ── Une fiche ────────────────────────────────────────────────────────── */

/** Une case à remplir à la main : un cadre vide, assez haut pour un stylo. */
function Case({
  libelle,
  large = false,
  unite,
}: {
  libelle: string;
  large?: boolean;
  unite?: string;
}) {
  return (
    <div style={{ flex: large ? "2 1 160px" : "1 1 110px", minWidth: 100 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: C.encre4,
          marginBottom: 3,
        }}
      >
        {libelle}
      </div>
      <div
        style={{
          height: 34,
          border: `1.5px solid ${C.encre}`,
          borderRadius: 6,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          padding: "0 6px 3px",
          fontSize: 10,
          color: C.encre4,
        }}
      >
        {unite}
      </div>
    </div>
  );
}

/** Une case à cocher, dessinée — les caractères ☐ varient d'une police à l'autre. */
function Coche({ libelle }: { libelle: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: 13,
          height: 13,
          border: `1.5px solid ${C.encre}`,
          borderRadius: 3,
          display: "inline-block",
        }}
      />
      {libelle}
    </span>
  );
}

function Fiche({
  a,
  categorie,
  epreuves,
  entete,
}: {
  a: FicheAthlete;
  categorie: string | null;
  epreuves: Awaited<ReturnType<typeof epreuvesCompletes>>;
  entete: { date: string; lieu: string; adresse: string };
}) {
  const p = pays(a.pays);

  return (
    <article
      className="fiche-papier"
      style={{
        background: C.blanc,
        border: `1px solid ${C.bordure}`,
        borderRadius: 12,
        padding: "18px 22px",
        marginBottom: 24,
        color: C.encre,
        fontSize: 12,
        lineHeight: 1.35,
      }}
    >
      {/* En-tête fédéral */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          paddingBottom: 10,
          borderBottom: `2px solid ${C.encre}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fibda.jpg"
          alt="FIBDA"
          style={{ width: 44, height: 44, objectFit: "contain", flex: "none" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: C.encre3,
            }}
          >
            Fédération Ivoirienne de Bodybuilding et Disciplines Associées
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.15 }}>
            Championnat National de Strongman 2026 — Fiche de notation
          </div>
          <div style={{ fontSize: 11, color: C.encre3 }}>
            {[entete.date, entete.lieu, entete.adresse].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      {/* Identité */}
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          padding: "12px 0",
          borderBottom: `1px solid ${C.bordure}`,
        }}
      >
        <div
          style={{
            width: 54,
            height: 66,
            borderRadius: 6,
            border: `1px solid ${C.bordure2}`,
            backgroundColor: C.papier2,
            backgroundImage: a.photoUrl ? `url("${a.photoUrl}")` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            flex: "none",
          }}
        />
        <div
          style={{
            width: 64,
            height: 54,
            borderRadius: 8,
            background: C.encre,
            color: C.blanc,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <div style={{ fontSize: 8, letterSpacing: ".14em", opacity: 0.7 }}>
            DOSSARD
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
            {a.dossard ?? "—"}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>
            {nomComplet(a)}
          </div>
          <div style={{ fontSize: 12, color: C.encre2, marginTop: 3 }}>
            {clubAffiche(a.club)} · {p.n}
            {a.horsClassement ? " · Invité, hors classement" : ""}
          </div>
          <div style={{ fontSize: 12, marginTop: 3 }}>
            <strong>{categorie ?? "Catégorie à déterminer"}</strong>
            {" · "}
            {a.poidsCorps === null
              ? "poids à relever"
              : `${virgule(a.poidsCorps)} kg${a.peseeValidee ? " (pesée validée)" : " (pesée non validée)"}`}
          </div>
        </div>
      </div>

      {/* Une ligne par épreuve */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: C.encre4,
          margin: "12px 0 6px",
        }}
      >
        À remplir par le juge — une ligne par épreuve, dans l&apos;ordre du
        programme
      </div>

      {epreuves.map((ep, i) => {
        const niveau = ep.niveau ? (a.niveaux[ep.id] ?? null) : null;
        return (
          <div
            key={ep.id}
            style={{
              border: `1px solid ${C.bordure2}`,
              borderLeft: `4px solid ${C.encre}`,
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 7,
              breakInside: "avoid",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "baseline",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {i + 1}. {ep.nom}
              </div>
              <div style={{ fontSize: 10, color: C.encre3 }}>
                {tempsImpartiLisible(ep.tempsLimiteS)}
                {ep.niveau
                  ? ` · niveau déclaré : ${niveau ?? "________"}`
                  : ""}
              </div>
            </div>
            {ep.critere ? (
              <div
                style={{
                  fontSize: 10,
                  color: C.encre3,
                  fontStyle: "italic",
                  margin: "2px 0 6px",
                }}
              >
                {ep.critere}
              </div>
            ) : null}

            {/* Les cases portent les intitulés EXACTS du plateau. */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "flex-end",
              }}
            >
              <Case libelle={uniteValeur(ep.mesure)} large />
              {mesureMixte(ep.mesure) ? (
                <Case libelle={libelleTemps(ep.mesure)} unite="s" />
              ) : null}
              <div style={{ flex: "1 1 170px" }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: C.encre4,
                    marginBottom: 3,
                  }}
                >
                  Verdict
                </div>
                <div
                  style={{
                    height: 34,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <Coche libelle="Validé" />
                  <Coche libelle="Zéro" />
                  <Coche libelle="Forfait" />
                </div>
              </div>
            </div>

            {/* Pour compter les répétitions au stylo : une case par tour, à
                barrer à chaque répétition validée. Le nombre se lit ensuite
                d'un coup d'œil. */}
            {ep.tours ? (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: C.encre4,
                    marginRight: 4,
                  }}
                >
                  Tours
                </span>
                {Array.from({ length: 20 }).map((_, k) => (
                  <span
                    key={k}
                    style={{
                      width: 16,
                      height: 16,
                      border: `1px solid ${C.encre3}`,
                      borderRadius: 3,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 7,
                      color: C.encre5,
                    }}
                  >
                    {k + 1}
                  </span>
                ))}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 6,
                fontSize: 10,
                color: C.encre3,
              }}
            >
              <span>Juge : ____________________</span>
              <span>Heure : ________</span>
            </div>
          </div>
        );
      })}

      {/* Pied : signatures et report */}
      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          marginTop: 10,
          paddingTop: 8,
          borderTop: `2px solid ${C.encre}`,
          fontSize: 10,
          color: C.encre2,
        }}
      >
        <span>Juge principal : ________________________</span>
        <span>Secrétaire de table : ________________________</span>
        <span style={{ marginLeft: "auto" }}>
          Reporté dans le logiciel le ________ par ____________
        </span>
      </div>
    </article>
  );
}
