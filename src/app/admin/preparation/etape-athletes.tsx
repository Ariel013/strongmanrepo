"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  C,
  PAYS_OPTIONS,
  clubAffiche,
  initiales,
  nomComplet,
  pays,
  virgule,
} from "@/lib/charte";
import { TitreSection } from "@/components/chrome";
import { Drapeau, Etiquette, styleBouton, styleChamp } from "@/components/ui";
import { BoutonAction, ChampTexte, ChoixListe } from "@/components/saisie";
import {
  affecterCategorie,
  ajouterAthleteVierge,
  basculerInvite,
  definirNiveau,
  enregistrerContact,
  marquerVerifiee,
  modifierAthlete,
  repartirParPoids,
  supprimerAthlete,
  televerserLogo,
  televerserPhoto,
  viderDossards,
} from "@/lib/actions";
import type { CategorieVue, FicheAthlete } from "@/lib/donnees";
import { poidsLisible, preparerImage, type ModeImage } from "@/lib/image";
import { PanneauImport } from "./import-liste";
import { PhotosGroupees } from "./photos-groupees";

/** Sans accents ni casse : la recherche d'un nom ivoirien ne doit pas s'y
 *  perdre — « Koné » se retrouve en tapant « kone ». */
const sansAcc = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

interface EpreuveNiveau {
  id: string;
  nom: string;
  niveau: boolean;
  niveauxOptions: string | null;
}

/**
 * Étape 4 — les athlètes engagés.
 *
 * L'écran le plus dense du logiciel : une ligne repliée par athlète, la fiche
 * complète au dépliage. Les dossards se saisissent à la main — ils fixent
 * l'ordre de passage de la première épreuve, du plus petit au plus grand.
 */
export function EtapeAthletes({
  competitionId,
  athletes,
  categories,
  epreuves,
  logos,
}: {
  competitionId: string;
  athletes: FicheAthlete[];
  categories: CategorieVue[];
  epreuves: EpreuveNiveau[];
  logos: Record<string, string>;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<"tous" | "acompleter">("tous");
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({});
  const [coches, setCoches] = useState<Record<string, boolean>>({});
  const [cible, setCible] = useState("");
  const [message, setMessage] = useState("");
  const [importOuvert, setImportOuvert] = useState(false);
  const [photosOuvert, setPhotosOuvert] = useState(false);
  const [, demarrer] = useTransition();
  const router = useRouter();

  const nomCategorie = (id: string | null) =>
    categories.find((c) => c.id === id)?.nom ?? null;

  const manquesDe = (a: FicheAthlete): string[] => {
    const m: string[] = [];
    if (!a.prenoms.trim()) m.push("prénoms");
    if (!a.club?.trim()) m.push("club");
    if (a.dossard === null) m.push("dossard");
    if (a.poidsCorps === null) m.push("pesée");
    if (!a.horsClassement && !a.categorieId) m.push("catégorie");
    return m;
  };

  const affiches = useMemo(() => {
    const q = sansAcc(recherche);
    return athletes.filter((a) => {
      if (
        q &&
        !sansAcc(`${a.nom} ${a.prenoms} ${a.club ?? ""}`).includes(q)
      )
        return false;
      if (filtre === "acompleter")
        return a.aVerifier || manquesDe(a).length > 0;
      return true;
    });
  }, [athletes, recherche, filtre]);

  const sansCategorie = athletes.filter(
    (a) => !a.categorieId && !a.horsClassement,
  );
  const nbCoches = Object.values(coches).filter(Boolean).length;

  const clubs = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of athletes) {
      const nom = a.club?.trim();
      if (nom) m.set(nom, (m.get(nom) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [athletes]);

  return (
    <div>
      <TitreSection
        debut="Athlètes"
        suite="engagés"
        chapeau="Importez votre liste, ou saisissez les fiches une par une. Les athlètes non ivoiriens peuvent être marqués Invité et restent alors hors classement officiel. Les numéros de dossard se saisissent à la main, ici ou à la pesée : ils fixent l'ordre de passage de la première épreuve, du plus petit au plus grand. Les épreuves suivantes se rangent ensuite du total de points le plus bas au plus haut."
      />

      {/* ── Barre d'outils ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <button
          type="button"
          title="Lire une liste depuis un fichier CSV, ou coller un texte"
          onClick={() => setImportOuvert(true)}
          style={styleBouton("vert", { padding: "11px 18px", fontWeight: 600 })}
        >
          Importer une liste
        </button>
        <button
          type="button"
          title="Déposez toutes les photos en une fois : la correspondance se fait sur le nom du fichier"
          onClick={() => setPhotosOuvert(true)}
          style={styleBouton("blanc", { padding: "11px 18px", fontWeight: 600 })}
        >
          Photos groupées
        </button>
        <Link
          href="/admin/impression/fiches"
          title="Une fiche de notation par athlète, à imprimer pour les juges : ils y notent sur le terrain, la table reporte ensuite"
          style={styleBouton("blanc", { padding: "11px 18px", fontWeight: 600 })}
        >
          Fiches de notation
        </Link>
        <BoutonAction
          ton="blanc"
          title="Ajoute une fiche athlète vierge, à compléter dans la liste"
          action={() => ajouterAthleteVierge(competitionId)}
          style={{ fontWeight: 600 }}
        >
          + Athlète
        </BoutonAction>
        <BoutonAction
          ton="noir"
          title="Efface tous les numéros de dossard pour les saisir à la main. L'ordre de passage de la première épreuve suit les dossards croissants."
          confirmation="Effacer tous les dossards ? L'ordre de passage de la première épreuve devra être ressaisi."
          action={() => viderDossards(competitionId)}
          style={{ background: C.blanc, color: C.encre, border: `1px solid ${C.encre}` }}
        >
          Effacer les dossards
        </BoutonAction>
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un nom, un club"
          title="Filtre la liste au fur et à mesure de la saisie"
          style={styleChamp({
            flex: 1,
            minWidth: 180,
            width: "auto",
            padding: "11px 13px",
            borderRadius: 10,
          })}
        />
        <select
          value={filtre}
          onChange={(e) =>
            setFiltre(e.target.value as "tous" | "acompleter")
          }
          title="Filtrer la liste"
          style={styleChamp({
            width: "auto",
            padding: "11px 13px",
            borderRadius: 10,
          })}
        >
          <option value="tous">Tous les athlètes</option>
          <option value="acompleter">À compléter</option>
        </select>
      </div>

      <div style={{ fontSize: 13, color: C.encre4, marginBottom: 14 }}>
        {affiches.length} fiche{affiches.length > 1 ? "s" : ""} affichée
        {affiches.length > 1 ? "s" : ""} sur {athletes.length} engagé
        {athletes.length > 1 ? "s" : ""}
      </div>

      {photosOuvert ? (
        <PhotosGroupees
          athletes={athletes}
          fermer={() => setPhotosOuvert(false)}
        />
      ) : null}

      {importOuvert ? (
        <PanneauImport
          competitionId={competitionId}
          existants={athletes.map((a) => ({ nom: a.nom, prenoms: a.prenoms }))}
          fermer={() => setImportOuvert(false)}
          versPesee={() => router.push("/admin/preparation?etape=4")}
        />
      ) : null}

      {/* ── Athlètes sans catégorie ── */}
      {sansCategorie.length > 0 ? (
        <div
          style={{
            background: C.ambreFond,
            border: `1px solid ${C.ambreBord}`,
            borderLeft: `4px solid ${C.ambreTrait}`,
            borderRadius: 12,
            padding: "16px 18px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: C.ambreEncre,
              marginBottom: 4,
            }}
          >
            {sansCategorie.length} athlète
            {sansCategorie.length > 1 ? "s" : ""} sans catégorie
          </div>
          <div
            style={{
              fontSize: 13,
              color: C.ambreEncre,
              lineHeight: 1.5,
              marginBottom: 12,
              textWrap: "pretty",
            }}
          >
            Affectez-les à une catégorie existante, ou déclarez-les
            indépendants : ils concourent, leurs performances sont
            enregistrées, mais ils restent hors classement.
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              background: C.blanc,
              border: `1px solid ${C.ambreBord}`,
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <button
              type="button"
              title="Cocher tous les athlètes de cette liste"
              onClick={() =>
                setCoches(
                  Object.fromEntries(sansCategorie.map((a) => [a.id, true])),
                )
              }
              style={styleBouton("creme", {
                padding: "9px 13px",
                borderRadius: 8,
                fontSize: 13,
              })}
            >
              Tout cocher
            </button>
            <button
              type="button"
              title="Décocher tout"
              onClick={() => setCoches({})}
              style={styleBouton("blanc", {
                padding: "9px 13px",
                borderRadius: 8,
                fontSize: 13,
              })}
            >
              Tout décocher
            </button>
            <div style={{ fontSize: 13, color: C.encre4, flex: "none" }}>
              {nbCoches === 0 ? "Aucun coché" : `${nbCoches} coché(s)`}
            </div>
            <select
              value={cible}
              onChange={(e) => setCible(e.target.value)}
              title="Catégorie d'arrivée pour les athlètes cochés"
              style={styleChamp({
                flex: 1,
                minWidth: 190,
                width: "auto",
                padding: "9px 11px",
              })}
            >
              <option value="">Catégorie d&apos;arrivée…</option>
              {categories
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              <option value="hors">Indépendant — hors classement</option>
            </select>
            <button
              type="button"
              title="Affecte tous les athlètes cochés à la catégorie choisie"
              onClick={() => {
                const ids = Object.entries(coches)
                  .filter(([, v]) => v)
                  .map(([k]) => k);
                if (!cible) {
                  setMessage("Choisissez d'abord une catégorie d'arrivée.");
                  return;
                }
                demarrer(async () => {
                  const r = await affecterCategorie(ids, cible);
                  setMessage(
                    r.ok
                      ? `${ids.length} athlète(s) affecté(s).`
                      : (r.erreur ?? "Affectation refusée."),
                  );
                  if (r.ok) setCoches({});
                });
              }}
              style={styleBouton("vert", {
                padding: "10px 16px",
                borderRadius: 9,
                fontWeight: 700,
              })}
            >
              Affecter la sélection
            </button>
            <button
              type="button"
              title="Classe les athlètes cochés (ou toute la liste si rien n'est coché) d'après le poids relevé à la pesée"
              onClick={() => {
                const ids = Object.entries(coches)
                  .filter(([, v]) => v)
                  .map(([k]) => k);
                demarrer(async () => {
                  const r = await repartirParPoids(competitionId, ids);
                  setMessage(
                    r.erreur ??
                      (r.ok
                        ? "Athlètes rangés d'après le poids pesé."
                        : "Répartition refusée."),
                  );
                });
              }}
              style={styleBouton("creme", {
                padding: "10px 16px",
                borderRadius: 9,
              })}
            >
              Classer d&apos;après le poids pesé
            </button>
          </div>

          {message ? (
            <div
              style={{
                marginBottom: 10,
                padding: "10px 12px",
                borderRadius: 9,
                background: C.blanc,
                border: `1px solid ${C.ambreBord}`,
                color: C.ambreEncre,
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.45,
              }}
            >
              {message}
            </div>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sansCategorie.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                  background: C.blanc,
                  border: `1px solid ${C.ambreBord}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <button
                  type="button"
                  title="Sélectionner cet athlète pour une affectation groupée"
                  onClick={() =>
                    setCoches({ ...coches, [a.id]: !coches[a.id] })
                  }
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    border: `1.5px solid ${coches[a.id] ? C.vert : C.encre5}`,
                    background: coches[a.id] ? C.vert : C.blanc,
                    color: C.blanc,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    flex: "none",
                    padding: 0,
                  }}
                >
                  {coches[a.id] ? "✓" : ""}
                </button>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {nomComplet(a)}
                  </div>
                  <div style={{ fontSize: 12, color: C.encre4 }}>
                    {clubAffiche(a.club)} ·{" "}
                    {a.poidsCorps === null
                      ? "pas encore pesé"
                      : `${virgule(a.poidsCorps)} kg`}
                  </div>
                </div>
                <div style={{ flex: "none", minWidth: 200 }}>
                  <ChoixListe
                    valeur=""
                    title="Choisir la catégorie de cet athlète"
                    enregistrer={(v) =>
                      v
                        ? affecterCategorie([a.id], v)
                        : Promise.resolve({ ok: true })
                    }
                    style={{ padding: "9px 11px" }}
                  >
                    <option value="">Affecter à…</option>
                    {categories
                      .filter((c) => c.active)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                    <option value="hors">
                      Indépendant — hors classement
                    </option>
                  </ChoixListe>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Liste des fiches ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {affiches.map((a) => (
          <LigneAthlete
            key={a.id}
            a={a}
            categories={categories}
            epreuves={epreuves}
            nomCategorie={nomCategorie}
            manques={manquesDe(a)}
            ouverte={!!ouvertes[a.id]}
            basculer={() =>
              setOuvertes({ ...ouvertes, [a.id]: !ouvertes[a.id] })
            }
          />
        ))}
        {affiches.length === 0 ? (
          <div
            style={{
              background: C.blanc,
              border: `1px solid ${C.bordure}`,
              borderRadius: 12,
              padding: "20px 18px",
              fontSize: 14,
              color: C.encre4,
              lineHeight: 1.5,
            }}
          >
            Aucune fiche ne correspond. Videz la recherche, ou ajoutez un
            athlète.
          </div>
        ) : null}
      </div>

      {/* ── Logos des clubs ── */}
      <div
        style={{
          marginTop: 24,
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderRadius: 14,
          padding: "18px 20px",
        }}
      >
        <Etiquette style={{ marginBottom: 4 }}>Logos des clubs</Etiquette>
        <div
          style={{
            fontSize: 13,
            color: C.encre3,
            lineHeight: 1.45,
            marginBottom: 14,
          }}
        >
          Un logo par club engagé. Il s&apos;affiche près du nom de
          l&apos;athlète sur les écrans du public.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))",
            gap: 12,
          }}
        >
          {clubs.map(([nom, effectif]) => (
            <div
              key={nom}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                border: `1px solid ${C.bordure}`,
                borderRadius: 11,
                padding: 12,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 8,
                  border: `1px solid ${C.bordure2}`,
                  backgroundColor: C.papier2,
                  backgroundImage: logos[nom] ? `url("${logos[nom]}")` : "none",
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  flex: "none",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{nom}</div>
                <div style={{ fontSize: 12, color: C.encre4 }}>
                  {effectif} athlète{effectif > 1 ? "s" : ""}
                </div>
                <ChoixFichier
                  libelle="Choisir un logo"
                  title="Choisir l'image du logo"
                  mode="entier"
                  envoyer={(fd) => televerserLogo(competitionId, nom, fd)}
                />
              </div>
            </div>
          ))}
          {clubs.length === 0 ? (
            <div style={{ fontSize: 13, color: C.encre4 }}>
              Aucun club renseigné pour l&apos;instant.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Une ligne de la liste ────────────────────────────────────────────── */

function LigneAthlete({
  a,
  categories,
  epreuves,
  nomCategorie,
  manques,
  ouverte,
  basculer,
}: {
  a: FicheAthlete;
  categories: CategorieVue[];
  epreuves: EpreuveNiveau[];
  nomCategorie: (id: string | null) => string | null;
  manques: string[];
  ouverte: boolean;
  basculer: () => void;
}) {
  const p = pays(a.pays);
  const statut = a.horsClassement
    ? "Invité"
    : a.peseeValidee
      ? "Pesée validée"
      : "Engagé";
  const statutCouleur = a.horsClassement
    ? C.orangeFonce
    : a.peseeValidee
      ? C.vert
      : C.encre4;
  const alerte = a.aVerifier
    ? "À vérifier"
    : manques.length
      ? `Manque : ${manques.join(", ")}`
      : "";

  const niveauxDus = epreuves.filter((e) => e.niveau);

  return (
    <div
      style={{
        background: C.blanc,
        border: `1px solid ${C.bordure}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          padding: "10px 14px",
        }}
      >
        <div
          style={{
            width: 36,
            height: 44,
            borderRadius: 7,
            border: `1px solid ${C.bordure2}`,
            backgroundColor: C.papier2,
            backgroundImage: a.photoUrl ? `url("${a.photoUrl}")` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            color: C.encre4,
            flex: "none",
            overflow: "hidden",
          }}
        >
          {a.photoUrl ? null : initiales(a)}
        </div>

        <div style={{ width: 52, flex: "none" }}>
          <ChampTexte
            valeur={a.dossard === null ? "" : String(a.dossard)}
            placeholder="—"
            inputMode="numeric"
            title="Numéro de dossard, saisi à la main. L'ordre de passage de la première épreuve suit ces numéros, du plus petit au plus grand."
            enregistrer={(v) => modifierAthlete(a.id, "dossard", v)}
            style={{
              padding: "7px 6px",
              borderRadius: 7,
              fontSize: 15,
              fontWeight: 700,
              textAlign: "center",
            }}
          />
        </div>

        <BoutonAction
          ton="rouge"
          title="Supprimer cet athlète de la liste des engagés"
          confirmation={`Retirer ${nomComplet(a)} de la liste des engagés ? Ses passages et résultats sont supprimés avec lui.`}
          action={() => supprimerAthlete(a.id)}
          style={{
            width: 30,
            height: 30,
            padding: 0,
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            flex: "none",
          }}
        >
          ✕
        </BoutonAction>

        <div style={{ flex: "3 1 160px", minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>
            {nomComplet(a)}
          </div>
          <div style={{ fontSize: 13, color: C.encre4 }}>
            {clubAffiche(a.club)} ·{" "}
            {a.horsClassement
              ? "Indépendant"
              : (nomCategorie(a.categorieId) ?? "Sans catégorie")}
          </div>
        </div>

        <Drapeau couleurs={p.c} />

        <div style={{ flex: "1 1 110px", minWidth: 96, textAlign: "right" }}>
          <div
            style={{ fontSize: 12, fontWeight: 600, color: statutCouleur }}
          >
            {statut}
          </div>
          <div
            style={{
              fontSize: 11,
              color: a.aVerifier ? C.orangeFonce : C.encre4,
            }}
          >
            {alerte}
          </div>
        </div>

        <button
          type="button"
          title="Ouvrir ou replier la fiche"
          onClick={basculer}
          style={styleBouton("creme", {
            padding: "8px 13px",
            borderRadius: 8,
            fontSize: 13,
            flex: "none",
          })}
        >
          {ouverte ? "Replier" : "Modifier"}
        </button>
      </div>

      {ouverte ? (
        <div
          style={{
            padding: 14,
            borderTop: `1px solid ${C.papier3}`,
            background: C.papier,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div style={{ width: 74, flex: "none" }}>
              <div
                style={{
                  width: 74,
                  height: 88,
                  borderRadius: 9,
                  backgroundColor: C.papier2,
                  backgroundImage: a.photoUrl ? `url("${a.photoUrl}")` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: `1px solid ${C.bordure2}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.encre4,
                }}
              >
                {a.photoUrl ? null : initiales(a)}
              </div>
              <div style={{ marginTop: 7, textAlign: "center" }}>
                <ChoixFichier
                  libelle="Photo"
                  title="Photo affichée près du nom sur le mur LED"
                  envoyer={(fd) => televerserPhoto(a.id, fd)}
                />
              </div>
            </div>

            <div
              style={{
                flex: 1,
                // `min(260px, 100%)` : la fiche passe sur une colonne au lieu
                // de forcer un défilement latéral sur un téléphone étroit.
                minWidth: "min(260px, 100%)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(160px,100%),1fr))",
                gap: "14px 12px",
                alignItems: "end",
              }}
            >
              <div>
                <Etiquette couleur={C.orange}>Dossard</Etiquette>
                <ChampTexte
                  valeur={a.dossard === null ? "" : String(a.dossard)}
                  placeholder="—"
                  inputMode="numeric"
                  title="Numéro de dossard, saisi à la main. Il fixe l'ordre de passage de la première épreuve, du plus petit au plus grand."
                  enregistrer={(v) => modifierAthlete(a.id, "dossard", v)}
                  style={{
                    border: `1px solid ${C.ambreBord}`,
                    background: C.ambreFond,
                    fontSize: 17,
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                />
              </div>

              <Champ
                etiquette="Nom"
                valeur={a.nom}
                title="Nom de famille, en capitales sur les affichages publics"
                enregistrer={(v) => modifierAthlete(a.id, "nom", v)}
                gras
              />
              <Champ
                etiquette="Prénoms"
                valeur={a.prenoms}
                title="Prénoms tels qu'ils seront annoncés"
                enregistrer={(v) => modifierAthlete(a.id, "prenoms", v)}
              />
              <Champ
                etiquette="Club"
                valeur={a.club ?? ""}
                placeholder="Indépendant"
                title="Club affilié. Laisser vide affiche « Indépendant »."
                enregistrer={(v) => modifierAthlete(a.id, "club", v)}
              />

              <div>
                <Etiquette>Nationalité</Etiquette>
                <ChoixListe
                  valeur={a.pays}
                  title="Hors Côte d'Ivoire, l'athlète peut être marqué Invité et sortir du classement officiel."
                  enregistrer={(v) => modifierAthlete(a.id, "pays", v)}
                  style={{ background: C.blanc, fontSize: 15 }}
                >
                  {PAYS_OPTIONS.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.nom}
                    </option>
                  ))}
                </ChoixListe>
              </div>

              <div>
                <Etiquette>Catégorie</Etiquette>
                <ChoixListe
                  valeur={a.horsClassement ? "hors" : (a.categorieId ?? "")}
                  title="Catégorie de poids. « Indépendant » retire l'athlète des classements tout en conservant ses performances."
                  enregistrer={(v) =>
                    v === ""
                      ? affecterCategorie([a.id], "")
                      : affecterCategorie([a.id], v)
                  }
                  style={{ background: C.blanc, fontSize: 15 }}
                >
                  <option value="">— À déterminer par la pesée —</option>
                  {categories
                    .filter((c) => c.active)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  <option value="hors">Indépendant — hors classement</option>
                </ChoixListe>
              </div>

              {niveauxDus.map((ep) => {
                const options = (ep.niveauxOptions ?? "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                // Sans liste à l'étape Épreuves, un sélecteur n'aurait rien à
                // proposer : on laisse saisir le niveau en clair, et on dit
                // où renseigner la liste.
                if (options.length === 0)
                  return (
                    <div key={ep.id}>
                      <Etiquette couleur={C.orangeFonce}>
                        Niveau — {ep.nom}
                      </Etiquette>
                      <ChampTexte
                        valeur={a.niveaux[ep.id] ?? ""}
                        placeholder="ex. prise haute"
                        title="Niveau déclaré par l'athlète, en clair. Pour proposer une liste à choisir, renseignez les niveaux de l'épreuve à l'étape Épreuves."
                        enregistrer={(v) => definirNiveau(a.id, ep.id, v)}
                        style={{
                          border: `1px solid ${C.ambreBord}`,
                          background: C.ambreFond,
                        }}
                      />
                      <div style={{ fontSize: 11, color: C.encre4, marginTop: 4, lineHeight: 1.4 }}>
                        Aucune liste de niveaux pour cette épreuve : saisie
                        libre. Renseignez la liste à l&apos;étape Épreuves.
                      </div>
                    </div>
                  );
                return (
                <div key={ep.id}>
                  <Etiquette couleur={C.orangeFonce}>
                    Niveau — {ep.nom}
                  </Etiquette>
                  <ChoixListe
                    valeur={a.niveaux[ep.id] ?? ""}
                    title="Niveau déclaré par l'athlète pour cette épreuve de tenue. Il s'affiche à la sélection de l'épreuve et sur le mur LED pendant son passage."
                    enregistrer={(v) => definirNiveau(a.id, ep.id, v)}
                    style={{
                      border: `1px solid ${C.ambreBord}`,
                      background: C.ambreFond,
                    }}
                  >
                    <option value="">— Niveau à déclarer —</option>
                    {options.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </ChoixListe>
                </div>
                );
              })}

              <div>
                <Etiquette>Participation</Etiquette>
                <BoutonAction
                  ton="blanc"
                  title="Un invité concourt et ses performances sont enregistrées, mais il n'entre ni dans le classement de l'épreuve ni dans le classement général."
                  action={() => basculerInvite(a.id, !a.horsClassement)}
                  style={{
                    width: "100%",
                    padding: "10px 11px",
                    borderRadius: 8,
                    textAlign: "left",
                    fontWeight: 600,
                    border: `1px solid ${a.horsClassement ? C.orangeFonce : C.bordure2}`,
                    background: a.horsClassement ? C.orangeFonce : C.papier,
                    color: a.horsClassement ? C.blanc : C.encre3,
                  }}
                >
                  {a.horsClassement
                    ? "Invité — hors classement"
                    : "Classer cet athlète"}
                </BoutonAction>
              </div>

              <Champ
                etiquette="Taille (cm)"
                valeur={a.tailleCm === null ? "" : String(a.tailleCm)}
                placeholder="181"
                title="Taille déclarée"
                enregistrer={(v) => modifierAthlete(a.id, "tailleCm", v)}
              />
              <div>
                <Etiquette>
                  Date de naissance
                  {a.age !== null ? (
                    // L'âge est calculé au jour de la compétition, jamais
                    // stocké : il ne peut pas être faux à l'anniversaire suivant.
                    <span style={{ color: C.vertFonce, marginLeft: 8 }}>
                      · {a.age} ans le jour J
                    </span>
                  ) : null}
                </Etiquette>
                <ChampTexte
                  valeur={a.dateNaissance ?? ""}
                  type="date"
                  title="Date de naissance. L'âge affiché est calculé au jour de la compétition. Jamais affiché sur les écrans du public."
                  enregistrer={(v) =>
                    enregistrerContact(a.id, { dateNaissance: v })
                  }
                  style={{ background: C.blanc, fontSize: 15 }}
                />
              </div>
              <Champ
                etiquette="Commune"
                valeur={a.commune ?? ""}
                title="Commune de résidence"
                enregistrer={(v) =>
                  enregistrerContact(a.id, { commune: v })
                }
              />
              <Champ
                etiquette="Téléphone"
                valeur={a.telephone ?? ""}
                title="Téléphone de l'athlète. Jamais affiché sur les écrans du public."
                enregistrer={(v) =>
                  enregistrerContact(a.id, { telephone: v })
                }
              />
              <div>
                <Etiquette couleur={C.orangeFonce}>
                  Contact d&apos;urgence
                </Etiquette>
                <ChampTexte
                  valeur={a.contactUrgence ?? ""}
                  title="Personne à prévenir en cas d'accident. Jamais affiché sur les écrans du public."
                  enregistrer={(v) =>
                    enregistrerContact(a.id, { contactUrgence: v })
                  }
                  style={{
                    border: `1px solid ${C.rougeBord}`,
                    background: C.blanc,
                    fontSize: 15,
                  }}
                />
              </div>

              <div>
                <Etiquette>Poids déclaré (kg)</Etiquette>
                <ChampTexte
                  valeur={
                    a.poidsDeclare === null ? "" : virgule(a.poidsDeclare)
                  }
                  placeholder="—"
                  inputMode="decimal"
                  title="Poids annoncé à l'inscription. Indicatif : seule la pesée compte, et c'est elle qui décide de la catégorie."
                  enregistrer={(v) => modifierAthlete(a.id, "poidsDeclare", v)}
                  style={{ background: C.blanc, fontSize: 15 }}
                />
              </div>

              <div>
                <Etiquette couleur={C.vertFonce}>Poids de la pesée</Etiquette>
                <div
                  title={
                    a.peseeValidee
                      ? "Pesée validée — dossard et catégorie verrouillés"
                      : a.poidsCorps !== null
                        ? "Poids saisi, pesée non validée"
                        : "À relever à l'étape Pesée"
                  }
                  style={{
                    padding: "9px 11px",
                    border: "1px solid #B7DCC4",
                    borderRadius: 8,
                    background: C.blanc,
                    fontSize: 17,
                    fontWeight: 700,
                    color:
                      a.poidsCorps === null
                        ? C.encre4
                        : a.peseeValidee
                          ? C.vertFonce
                          : C.encre,
                  }}
                >
                  {a.poidsCorps === null
                    ? "Pas encore pesé"
                    : `${virgule(a.poidsCorps)} kg`}
                </div>
                {/* Le poids de la pesée ne se saisit PAS ici : il engage la
                    responsabilité d'un officiel à la bascule, et il verrouille
                    la catégorie. Le dire en clair évite de chercher un champ
                    qui n'existe pas. */}
                <div
                  style={{
                    fontSize: 11,
                    color: C.encre4,
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  {a.peseeValidee
                    ? "Pesée validée — déverrouillez-la à l'étape Pesée pour corriger."
                    : "Se relève à la bascule, "}
                  {a.peseeValidee ? null : (
                    <Link
                      href="/admin/preparation?etape=4"
                      style={{ color: C.vert, fontWeight: 600 }}
                    >
                      étape Pesée
                    </Link>
                  )}
                </div>
              </div>

              <Champ
                etiquette="Note pour le speaker"
                valeur={a.note ?? ""}
                placeholder="Anecdote, prononciation"
                title="Note libre reprise sur la fiche du speaker"
                enregistrer={(v) => modifierAthlete(a.id, "note", v)}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 14,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 200,
                fontSize: 12,
                color: C.encre4,
                lineHeight: 1.45,
                textWrap: "pretty",
              }}
            >
              Une fiche importée dont une donnée a été devinée est marquée « À
              vérifier ». Le bouton ci-contre retire cette marque une fois la
              fiche relue.
            </div>
            <Link
              href={`/admin/impression/fiches?athlete=${a.id}`}
              title="Imprimer la fiche de notation de cet athlète"
              style={styleBouton("blanc", { padding: "9px 14px", borderRadius: 9, fontSize: 13 })}
            >
              Fiche papier
            </Link>
            <BoutonAction
              ton="blanc"
              title="Retire la marque « À vérifier » de cette fiche"
              action={() => marquerVerifiee(a.id)}
              disabled={!a.aVerifier}
              style={{ padding: "9px 14px", borderRadius: 9, fontSize: 13 }}
            >
              Fiche vérifiée
            </BoutonAction>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Petites briques ──────────────────────────────────────────────────── */

function Champ({
  etiquette,
  valeur,
  enregistrer,
  title,
  placeholder,
  gras = false,
}: {
  etiquette: string;
  valeur: string;
  enregistrer: (v: string) => Promise<{ ok: boolean; erreur?: string }>;
  title?: string;
  placeholder?: string;
  gras?: boolean;
}) {
  return (
    <div>
      <Etiquette>{etiquette}</Etiquette>
      <ChampTexte
        valeur={valeur}
        title={title}
        placeholder={placeholder}
        enregistrer={enregistrer}
        style={{
          background: C.blanc,
          fontSize: 15,
          fontWeight: gras ? 600 : 400,
        }}
      />
    </div>
  );
}

/**
 * Le choix de fichier discret du fichier d'origine : un simple libellé vert,
 * l'`input type=file` caché derrière. L'envoi part dès que le fichier est
 * choisi — aucun bouton « Envoyer » à cliquer en plus.
 *
 * L'image est réduite dans le navigateur avant de partir : une photo de
 * téléphone dépasse la limite de corps d'une Server Action et se faisait
 * refuser par un `413` brut, qui cassait l'écran au lieu de dire quoi que ce
 * soit.
 */
function ChoixFichier({
  libelle,
  title,
  envoyer,
  mode = "portrait",
}: {
  libelle: string;
  title?: string;
  envoyer: (donnees: FormData) => Promise<{ ok: boolean; erreur?: string }>;
  mode?: ModeImage;
}) {
  const [etat, setEtat] = useState("");
  const [echec, setEchec] = useState(false);
  /** Accepté, mais avec une réserve : ni vert, ni rouge. */
  const [avertir, setAvertir] = useState(false);
  const [, demarrer] = useTransition();

  return (
    <>
      <label
        title={title}
        style={{
          display: "inline-block",
          marginTop: 5,
          fontSize: 12,
          color: C.vert,
          cursor: "pointer",
        }}
      >
        {libelle}
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            e.target.value = "";
            setEchec(false);
            setAvertir(false);
            setEtat("Préparation…");
            try {
              const { fichier, avant, apres, largeur, hauteur, tropPetite } =
                await preparerImage(f, mode);
              const fd = new FormData();
              fd.set("fichier", fichier);
              const reduite = apres < avant;
              setEtat(`Envoi de ${poidsLisible(apres)}…`);
              demarrer(async () => {
                try {
                  const r = await envoyer(fd);
                  setEchec(!r.ok);
                  if (!r.ok) {
                    setEtat(r.erreur ?? "Envoi refusé.");
                  } else if (tropPetite && mode === "portrait") {
                    // Acceptée, mais on le dit : sur le mur LED elle occupe
                    // 19 vw de large, et une image de 218 px y est franchement
                    // pixellisée. Le constater au dépôt vaut mieux que devant
                    // la salle, au moment du passage.
                    setAvertir(true);
                    setEtat(
                      `Photo enregistrée, mais petite (${largeur}×${hauteur} px). ` +
                        "Elle sera pixellisée sur le mur LED : une image d'au " +
                        "moins 600 px de large donnerait un bien meilleur rendu.",
                    );
                  } else {
                    setEtat("");
                  }
                } catch {
                  // Une Server Action qui échoue au transport fait autrement
                  // tomber toute la page sur l'écran d'erreur. On dit ce qui a
                  // été tenté : la taille envoyée distingue « image encore
                  // trop lourde » de « stockage qui refuse », sans second essai.
                  setEchec(true);
                  setEtat(
                    `Envoi interrompu (${poidsLisible(apres)}` +
                      (reduite ? `, réduite depuis ${poidsLisible(avant)}` : ", non réduite") +
                      "). Si le poids est faible, la panne vient du stockage, pas de l'image.",
                  );
                }
              });
            } catch {
              setEchec(true);
              setEtat("Cette image n'a pas pu être lue par le navigateur.");
            }
          }}
        />
      </label>
      {etat ? (
        <div
          style={{
            fontSize: 11,
            color: echec
              ? C.rougeFonce
              : avertir
                ? C.ambreEncre
                : C.encre4,
            lineHeight: 1.4,
            marginTop: 3,
          }}
        >
          {etat}
        </div>
      ) : null}
    </>
  );
}
