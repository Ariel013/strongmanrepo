/**
 * Export du classeur de compétition.
 *
 * Format : SpreadsheetML (« Excel 2003 XML »), généré sans aucune dépendance.
 * Excel et LibreOffice l'ouvrent nativement, feuilles et types de cellules
 * compris. C'est le format qu'employait déjà le logiciel d'origine.
 *
 * Dette assumée, à reprendre après la compétition : produire un vrai `.xlsx`
 * (archive ZIP OpenXML) pour la mise en forme et la compatibilité mobile.
 * Le choix d'aujourd'hui tient à la fenêtre de livraison, pas à la technique.
 *
 * La route est sous `/api/admin/` : le middleware exige donc une session.
 * L'export contient les coordonnées personnelles — il ne doit jamais être
 * accessible au public.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { athlete, athleteContact, passage } from "@/lib/db/schema";
import {
  athletesDe,
  categoriesDe,
  competitionCourante,
  epreuvesDe,
  tableauGeneral,
} from "@/lib/donnees";

type Cellule = string | number | null;

const echapper = (v: Cellule): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function feuille(nom: string, entetes: string[], lignes: Cellule[][]): string {
  const cellule = (c: Cellule) => {
    const estNombre = typeof c === "number" && Number.isFinite(c);
    return `<Cell><Data ss:Type="${estNombre ? "Number" : "String"}">${echapper(c)}</Data></Cell>`;
  };
  const ligne = (cs: Cellule[]) => `<Row>${cs.map(cellule).join("")}</Row>`;
  // Excel refuse un nom de feuille au-delà de 31 caractères.
  return (
    `<Worksheet ss:Name="${echapper(nom).slice(0, 31)}"><Table>` +
    ligne(entetes) +
    lignes.map(ligne).join("") +
    `</Table></Worksheet>`
  );
}

export async function GET() {
  const comp = await competitionCourante();
  if (!comp) {
    return new Response("Aucune compétition.", { status: 404 });
  }

  const [epreuves, categories, athletes] = await Promise.all([
    epreuvesDe(comp.id),
    categoriesDe(comp.id),
    athletesDe(comp.id),
  ]);

  const nomCategorie = (id: string | null) =>
    categories.find((c) => c.id === id)?.nom ?? "Sans catégorie";
  const nomAthlete = (id: string) => {
    const a = athletes.find((x) => x.id === id);
    return a ? `${a.nom} ${a.prenoms}`.trim() : "";
  };

  /* ── Athlètes, avec les coordonnées (réservé à l'administration) ── */
  const contacts = await db
    .select()
    .from(athleteContact)
    .innerJoin(athlete, eq(athlete.id, athleteContact.athleteId))
    .where(eq(athlete.competitionId, comp.id));
  const parAthlete = new Map(
    contacts.map((c) => [c.athlete_contact.athleteId, c.athlete_contact]),
  );

  const feuilleAthletes = athletes.map((a): Cellule[] => {
    const c = parAthlete.get(a.id);
    return [
      a.dossard ?? "",
      a.nom,
      a.prenoms,
      a.club ?? "",
      a.pays,
      a.poidsCorps ?? "",
      nomCategorie(a.categorieId),
      a.horsClassement ? "Hors classement" : "Classé",
      a.peseeValidee ? "Oui" : "Non",
      c?.commune ?? "",
      c?.telephone ?? "",
      c?.contactUrgence ?? "",
    ];
  });

  /* ── Résultats détaillés ── */
  const tousPassages = await db
    .select()
    .from(passage)
    .where(eq(passage.competitionId, comp.id));
  const feuilleResultats = tousPassages.map((p): Cellule[] => {
    const a = athletes.find((x) => x.id === p.athleteId);
    return [
      epreuves.find((e) => e.id === p.epreuveId)?.nom ?? "",
      nomCategorie(a?.categorieId ?? null),
      p.ordre,
      a?.dossard ?? "",
      nomAthlete(p.athleteId),
      p.statut,
      p.resultatStatut ?? "",
      p.valeur ?? "",
      p.tempsS ?? "",
      (p.tours ?? []).join(" "),
      p.valideLe ? p.valideLe.toISOString() : "",
    ];
  });

  /* ── Classements ── */
  const feuilleClassements: Cellule[][] = [];
  for (const cat of categories.filter((c) => c.active)) {
    const t = await tableauGeneral(cat, epreuves, athletes);
    for (const l of t.lignes) {
      const a = athletes.find((x) => x.id === l.athleteId);
      feuilleClassements.push([
        cat.nom,
        l.rang,
        a?.dossard ?? "",
        nomAthlete(l.athleteId),
        l.total,
        ...epreuves.map((e) => t.parEpreuve.get(e.id)?.get(l.athleteId) ?? 0),
      ]);
    }
  }

  const xml =
    `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ` +
    `xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    feuille(
      "Athletes",
      [
        "Dossard", "Nom", "Prenoms", "Club", "Nationalite", "Poids",
        "Categorie", "Classement", "Pesee validee", "Commune", "Telephone",
        "Contact urgence",
      ],
      feuilleAthletes,
    ) +
    feuille(
      "Epreuves",
      ["Ordre", "Epreuve", "Mesure", "Temps limite (s)", "Essais", "Critere"],
      epreuves.map((e): Cellule[] => [
        e.position + 1, e.nom, e.mesure, e.tempsLimiteS ?? "", e.essais,
        e.critere ?? "",
      ]),
    ) +
    feuille(
      "Resultats",
      [
        "Epreuve", "Categorie", "Ordre", "Dossard", "Athlete", "Statut",
        "Resultat", "Valeur", "Temps", "Tours", "Valide le",
      ],
      feuilleResultats,
    ) +
    feuille(
      "Classements",
      ["Categorie", "Rang", "Dossard", "Athlete", "Total", ...epreuves.map((e) => e.nom)],
      feuilleClassements,
    ) +
    `</Workbook>`;

  const jour = new Date().toISOString().slice(0, 10);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="strongman-2026-${jour}.xls"`,
      // Un classement exporté ne doit jamais être servi depuis un cache :
      // il changerait sous les yeux du secrétaire au passage suivant.
      "Cache-Control": "no-store",
    },
  });
}
