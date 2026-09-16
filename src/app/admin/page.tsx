import Link from "next/link";
import { C } from "@/lib/charte";
import { FilAriane } from "@/components/chrome";
import { Encart, styleBouton } from "@/components/ui";
import {
  athletesDe,
  competitionCourante,
  epreuvesDe,
} from "@/lib/donnees";
import { CartesIdentite } from "./identite";

/**
 * L'accueil du championnat — la vue « estAccueil » du logiciel d'origine.
 *
 * Trois cartes de situation en haut, trois portes en dessous : préparer,
 * lancer, diffuser. C'est l'écran qu'un officiel voit vingt fois dans la
 * journée ; il est repris à l'identique, y compris les infobulles.
 */

/** « samedi 19 septembre 2026 » → « Samedi 19 Septembre 2026 ». */
const capitaliser = (s: string): string =>
  s.replace(/(^|\s)([a-zà-ÿ])/g, (_, e, l) => e + l.toUpperCase());

const dateTexte = (d: Date | null): string =>
  d
    ? capitaliser(
        d.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      )
    : "";

const heureTexte = (d: Date | null): string =>
  d
    ? d
        .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        .replace(":", "h")
    : "";

export default async function PageAccueil() {
  const comp = await competitionCourante();

  if (!comp) {
    return (
      <>
        <FilAriane>Accueil</FilAriane>
        <Encart ton="ambre">
          Aucune compétition installée. Lancez <code>pnpm run db:seed</code> pour
          créer celle du 19 septembre 2026, puis rechargez cette page.
        </Encart>
      </>
    );
  }

  const [athletes, epreuves] = await Promise.all([
    athletesDe(comp.id),
    epreuvesDe(comp.id),
  ]);
  const peses = athletes.filter((a) => a.peseeValidee).length;

  return (
    <>
      <FilAriane>Accueil</FilAriane>

      {/* ── Situation ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))",
          gap: 14,
          marginBottom: 30,
        }}
      >
        <CartesIdentite
          competitionId={comp.id}
          initial={{
            date: dateTexte(comp.debutLe),
            heure: heureTexte(comp.debutLe),
            fin: heureTexte(comp.finLe),
            lieu: comp.lieu ?? "",
            adresse: comp.adresse ?? "",
          }}
        />

        <div
          style={{
            background: C.blanc,
            border: `1px solid ${C.bordure}`,
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: C.encre4,
              marginBottom: 6,
            }}
          >
            Engagés
          </div>
          <div style={{ fontSize: 19, fontWeight: 600 }}>
            {athletes.length} athlètes · {epreuves.length} épreuves
          </div>
          <div style={{ fontSize: 14, color: C.encre3, marginTop: 2 }}>
            {peses} pesées validées
          </div>
        </div>
      </div>

      {/* ── Les trois portes ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))",
          gap: 16,
        }}
      >
        <CartePorte
          pastille="Étape par étape"
          pastilleFond="rgba(236,109,35,.12)"
          pastilleEncre={C.orangeFonce}
          titre="Préparer la compétition"
          texte="Épreuves, groupes de poids, officiels, athlètes, pesée et programme. Enregistrez à tout moment, revenez plus tard : un récapitulatif indique ce qui manque."
        >
          <Link
            href="/admin/preparation"
            title="Ouvre le parcours guidé en 6 étapes : épreuves, groupes, officiels, athlètes, pesée, programme"
            style={styleBouton("vert", {
              padding: "13px 22px",
              borderRadius: 11,
              fontSize: 15,
            })}
          >
            {epreuves.length > 0 && athletes.length > 0
              ? "Reprendre la préparation"
              : "Commencer la préparation"}
          </Link>
          <Link
            href="/admin/recapitulatif"
            title="Liste ce qui est prêt et ce qui manque avant le jour J"
            style={styleBouton("creme", {
              padding: "13px 20px",
              borderRadius: 11,
              fontSize: 15,
              fontWeight: 500,
            })}
          >
            Récapitulatif
          </Link>
        </CartePorte>

        <CartePorte
          pastille="Jour J"
          pastilleFond="rgba(11,146,55,.12)"
          pastilleEncre={C.vertFonce}
          titre="Lancer / reprendre"
          texte="Plateau, athlète au plateau, chronomètre deux appuis, saisie des performances par la table, régie et mur LED, impressions et procès-verbal."
        >
          <Link
            href="/admin/plateau"
            title="Ouvre le plateau : ordre de passage, chronomètre, saisie et validation des performances"
            style={styleBouton("noir", {
              padding: "13px 22px",
              borderRadius: 11,
              fontSize: 15,
            })}
          >
            Ouvrir le plateau
          </Link>
        </CartePorte>

        <CartePorte
          sombre
          pastille="Écrans géants"
          pastilleFond="rgba(236,109,35,.22)"
          pastilleEncre={C.orangeClair}
          titre="Régie de diffusion"
          texte="Déclarez vos sorties vidéo, choisissez ce que chaque mur LED affiche, réglez la lisibilité avec la mire, puis ouvrez les fenêtres à glisser sur les écrans."
        >
          <Link
            href="/admin/regie"
            title="Paramétrer la régie : sorties, contenus, jour/nuit"
            style={styleBouton("vert", {
              padding: "13px 22px",
              borderRadius: 11,
              fontSize: 15,
              background: C.orange,
            })}
          >
            Paramétrer la régie
          </Link>
          <a
            href="/ecran/mire"
            target="_blank"
            rel="noreferrer"
            title="Ouvre la mire de lisibilité pour régler le mur LED"
            style={{
              padding: "13px 20px",
              borderRadius: 11,
              border: "1px solid rgba(252,250,246,.28)",
              background: "transparent",
              color: C.papier,
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Mire de réglage
          </a>
        </CartePorte>
      </div>

      {/* ── Exports ── */}
      <div
        style={{
          marginTop: 28,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <a
          href="/api/admin/export?format=athletes"
          title="Liste des athlètes en CSV, à ouvrir dans Excel"
          style={styleBouton("blanc", {
            padding: "10px 16px",
            borderRadius: 9,
            fontSize: 13,
          })}
        >
          Exporter les athlètes (Excel)
        </a>
        <a
          href="/api/admin/export"
          title="Sauvegarde complète de la compétition : athlètes, catégories, épreuves, résultats et classements"
          style={styleBouton("vert", {
            padding: "10px 16px",
            borderRadius: 9,
            fontSize: 13,
            background: C.vertFonce,
          })}
        >
          Exporter la compétition
        </a>
        <Link
          href="/admin/impression/fiches"
          title="Une fiche de notation par athlète, à imprimer pour les juges"
          style={styleBouton("blanc", {
            padding: "10px 16px",
            borderRadius: 9,
            fontSize: 13,
          })}
        >
          Imprimer les fiches de notation
        </Link>
        <a
          href="/api/admin/export?format=classements"
          title="Classements par groupe et par épreuve en CSV"
          style={styleBouton("blanc", {
            padding: "10px 16px",
            borderRadius: 9,
            fontSize: 13,
          })}
        >
          Exporter les classements (Excel)
        </a>
      </div>
    </>
  );
}

/** Une des trois grandes cartes d'action. */
function CartePorte({
  pastille,
  pastilleFond,
  pastilleEncre,
  titre,
  texte,
  sombre = false,
  children,
}: {
  pastille: string;
  pastilleFond: string;
  pastilleEncre: string;
  titre: string;
  texte: string;
  sombre?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: sombre ? C.encre : C.blanc,
        border: `1px solid ${sombre ? C.encre : C.bordure}`,
        borderRadius: 16,
        padding: 26,
        display: "flex",
        flexDirection: "column",
        color: sombre ? C.papier : undefined,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          padding: "5px 11px",
          borderRadius: 999,
          background: pastilleFond,
          color: pastilleEncre,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        {pastille}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-.01em",
          marginBottom: 8,
        }}
      >
        {titre}
      </div>
      <div
        style={{
          fontSize: 15,
          lineHeight: 1.55,
          color: sombre ? "#C9C2B6" : C.encre2,
          marginBottom: 20,
          textWrap: "pretty",
        }}
      >
        {texte}
      </div>
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {children}
      </div>
    </div>
  );
}
