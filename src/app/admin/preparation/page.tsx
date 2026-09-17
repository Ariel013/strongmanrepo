import Link from "next/link";
import { C } from "@/lib/charte";
import { FilAriane } from "@/components/chrome";
import { Encart, styleBouton } from "@/components/ui";
import {
  categoriesDe,
  competitionCourante,
  epreuvesCompletes,
  fichesAthletes,
  logosDe,
  officielsDe,
  programmeDe,
  recompensesDe,
} from "@/lib/donnees";
import { EtapeEpreuves } from "./etape-epreuves";
import { EtapeGroupes } from "./etape-groupes";
import { EtapeOfficiels } from "./etape-officiels";
import { EtapeAthletes } from "./etape-athletes";
import { EtapePesee } from "./etape-pesee";
import { EtapeProgramme } from "./etape-programme";

/**
 * Le parcours guidé en six étapes, repris du logiciel d'origine.
 *
 * L'étape vit dans l'URL (`?etape=3`) et non dans l'état du navigateur : un
 * officiel qui veut envoyer « regarde la pesée » à un collègue lui envoie un
 * lien, et un rafraîchissement en pleine compétition ne le ramène pas à
 * l'étape 1.
 */
export const dynamic = "force-dynamic";

const TITRES = [
  "Épreuves",
  "Groupes",
  "Officiels",
  "Athlètes",
  "Pesée",
  "Programme",
] as const;

export default async function PagePreparation({
  searchParams,
}: {
  searchParams: Promise<{ etape?: string }>;
}) {
  const { etape: brut } = await searchParams;
  const etape = Math.min(5, Math.max(0, Number.parseInt(brut ?? "0", 10) || 0));

  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Préparation</FilAriane>
        <Encart ton="ambre">
          Aucune compétition installée. Lancez <code>pnpm run db:seed</code>,
          puis rechargez cette page.
        </Encart>
      </>
    );
  }

  const [epreuves, categories, officiels, athletes, prog, recs, logos] =
    await Promise.all([
      epreuvesCompletes(comp.id),
      categoriesDe(comp.id),
      officielsDe(comp.id),
      fichesAthletes(comp.id),
      programmeDe(comp.id),
      recompensesDe(comp.id),
      logosDe(comp.id),
    ]);

  return (
    <>
      <FilAriane>Préparation · {TITRES[etape]}</FilAriane>

      {/* ── Les six onglets ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 14,
          marginBottom: 22,
          borderBottom: `1px solid ${C.bordure}`,
        }}
      >
        {TITRES.map((titre, i) => {
          const actif = i === etape;
          return (
            <Link
              key={titre}
              href={`/admin/preparation?etape=${i}`}
              title={`Étape ${i + 1} — ${titre}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "9px 15px",
                borderRadius: 10,
                border: `1px solid ${actif ? C.encre : C.bordure}`,
                background: actif ? C.encre : C.blanc,
                color: actif ? C.papier : C.encre2,
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
                flex: "none",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: actif ? C.orange : C.papier3,
                  color: actif ? C.blanc : C.encre4,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              {titre}
            </Link>
          );
        })}
      </div>

      {etape === 0 ? (
        <EtapeEpreuves competitionId={comp.id} epreuves={epreuves} />
      ) : null}
      {etape === 1 ? (
        <EtapeGroupes
          competitionId={comp.id}
          categories={categories}
          effectifs={Object.fromEntries(
            categories.map((c) => [
              c.id,
              athletes.filter((a) => a.categorieId === c.id).length,
            ]),
          )}
        />
      ) : null}
      {etape === 2 ? (
        <EtapeOfficiels
          competitionId={comp.id}
          officiels={officiels}
          categories={categories}
        />
      ) : null}
      {etape === 3 ? (
        <EtapeAthletes
          competitionId={comp.id}
          athletes={athletes}
          categories={categories}
          epreuves={epreuves.map((e) => ({
            id: e.id,
            nom: e.nom,
            niveau: e.niveau,
            niveauxOptions: e.niveauxOptions,
          }))}
          logos={Object.fromEntries(logos)}
        />
      ) : null}
      {etape === 4 ? (
        <EtapePesee athletes={athletes} categories={categories} />
      ) : null}
      {etape === 5 ? (
        <EtapeProgramme
          competitionId={comp.id}
          programme={prog}
          recompenses={recs}
          partenaires={comp.partenaires ?? ""}
        />
      ) : null}

      {/* ── Navigation bas de page ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 30,
          paddingTop: 20,
          borderTop: `1px solid ${C.bordure}`,
          flexWrap: "wrap",
        }}
      >
        <Link
          href={`/admin/preparation?etape=${Math.max(0, etape - 1)}`}
          title="Revenir à l'étape précédente ; la saisie est conservée"
          style={styleBouton("blanc", { padding: "12px 20px", fontSize: 14 })}
        >
          Étape précédente
        </Link>
        {etape < 5 ? (
          <Link
            href={`/admin/preparation?etape=${etape + 1}`}
            title="Passer à l'étape suivante ; la saisie est conservée"
            style={styleBouton("vert", { padding: "12px 20px", fontSize: 14 })}
          >
            Étape suivante — {TITRES[etape + 1]}
          </Link>
        ) : (
          <Link
            href="/admin/recapitulatif"
            title="Vérifier ce qui est prêt et ce qui manque"
            style={styleBouton("vert", { padding: "12px 20px", fontSize: 14 })}
          >
            Voir le récapitulatif
          </Link>
        )}
      </div>
    </>
  );
}
