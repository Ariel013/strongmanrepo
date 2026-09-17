"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  C,
  LIBELLE_CHRONO,
  aCaseChrono,
  clubAffiche,
  initiales,
  libelleTemps,
  mesureMixte,
  mmss,
  nomComplet,
  pays,
  performanceLisible,
  tempsImpartiLisible,
  uniteValeur,
  virgule,
} from "@/lib/charte";
import { ChiffresStables } from "@/components/chiffres";
import {
  Drapeau,
  EnteteColonne,
  Etiquette,
  PastilleCategorie,
  styleBouton,
  styleChamp,
} from "@/components/ui";
import {
  appelerAuPlateau,
  choisirEpreuve,
  construireFile,
  majChrono,
  mettreEnAttente,
  preparerToutes,
  renvoyerEnFile,
  reprendre,
  suspendre,
  validerPassage,
} from "@/lib/actions";
import type { AthletePublic, PassageVue } from "@/lib/donnees";

/* ── Ce que la page serveur prépare pour chaque catégorie ─────────────── */

export interface CategoriePlateau {
  id: string;
  nom: string;
  couleur: string;
  /** L'ordre de passage théorique, recalculé à chaque validation. */
  ordre: string[];
  classementEpreuve: {
    rang: number;
    athleteId: string;
    points: number;
    valeur: number | null;
    temps: number | null;
  }[];
  classementGeneral: { rang: number; athleteId: string; total: number }[];
}

interface EpreuvePlateau {
  id: string;
  nom: string;
  mesure: string;
  tempsLimiteS: number | null;
  critere: string | null;
  niveau: boolean;
  tours: boolean;
  ateliers: string | null;
  distanceTotale: string | null;
}

const nombreOuNull = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
};

/**
 * Le plateau — l'écran de la table de marque pendant la compétition.
 *
 * Tout ce qui s'y décide part immédiatement en base et se retrouve sur le mur
 * LED. Le chronomètre, lui, reste local : il se lit au dixième et ne doit pas
 * dépendre d'un aller-retour réseau.
 */
export function Plateau({
  competitionId,
  epreuve,
  epreuves,
  categories,
  groupeCourantId,
  melange,
  parCategorie,
  athletes,
  niveaux,
  passages,
  suspendue,
  motifSuspension,
}: {
  competitionId: string;
  epreuve: EpreuvePlateau;
  epreuves: { id: string; nom: string }[];
  categories: { id: string; nom: string; couleur: string }[];
  groupeCourantId: string;
  melange: boolean;
  parCategorie: CategoriePlateau[];
  athletes: AthletePublic[];
  niveaux: Record<string, string>;
  passages: PassageVue[];
  suspendue: boolean;
  motifSuspension: string | null;
}) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [message, setMessage] = useState("");

  /**
   * Toute action du plateau passe par ici.
   *
   * Une Server Action qui lève — session expirée, réseau de salle coupé,
   * erreur serveur — fait tomber TOUT l'écran si personne ne l'attrape. Perdre
   * le plateau en pleine épreuve parce qu'un appel n'a pas abouti est le pire
   * scénario de cette application : on attrape, on le dit, et la page reste
   * debout.
   */
  const agir = (
    f: () => Promise<{ ok: boolean; erreur?: string } | void>,
    succes?: string,
  ) =>
    demarrer(async () => {
      try {
        const r = await f();
        if (r && !r.ok) {
          setMessage(r.erreur ?? "Action refusée.");
          setMessageOk(false);
        } else if (r?.erreur) {
          setMessage(r.erreur);
          setMessageOk(true);
        } else if (succes) {
          setMessage(succes);
          setMessageOk(true);
        }
      } catch {
        setMessage(
          "Le serveur n'a pas répondu. Votre session a peut-être expiré : " +
            "rechargez la page. Rien n'a été enregistré.",
        );
        setMessageOk(false);
      }
    });
  /** Un refus s'affiche en rouge : le vert dirait qu'il ne s'est rien passé
   *  d'anormal, alors que la file est restée vide. */
  const [messageOk, setMessageOk] = useState(true);

  const parId = new Map(athletes.map((a) => [a.id, a]));
  const catDe = (athleteId: string) =>
    parCategorie.find(
      (c) => c.id === parId.get(athleteId)?.categorieId,
    ) ?? parCategorie[0];

  const avenir = passages
    .filter((p) => p.statut === "avenir")
    .sort((a, b) => a.ordre - b.ordre);
  /** Rangés, pesés, numérotés — mais sans passage dans cette épreuve. */
  const avecPassage = new Set(passages.map((p) => p.athleteId));
  const sansPassage = athletes.filter((a) => !avecPassage.has(a.id));
  const auPlateau = passages
    .filter((p) => p.statut === "plateau")
    .sort((a, b) => a.ordre - b.ordre);
  /** Passés, plateau libéré, résultat attendu du jury. */
  const enAttente = passages
    .filter((p) => p.statut === "a_saisir")
    .sort((a, b) => a.ordre - b.ordre);
  const termines = passages
    .filter((p) => p.statut === "termine")
    .sort((a, b) => a.ordre - b.ordre)
    .reverse();

  /* ── Chronomètre ──────────────────────────────────────────────────── */

  const limite = epreuve.tempsLimiteS ?? 0;
  const [phase, setPhase] = useState<"pret" | "encours" | "arrete">("pret");
  const [ecoule, setEcoule] = useState(0);
  const [saisies, setSaisies] = useState<
    Record<string, { valeur: string; temps: string; chrono: string; erreur: string }>
  >({});
  const [tours, setTours] = useState<Record<string, number[]>>({});
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Qui est au plateau, en une chaîne : elle change à chaque appel. */
  const cle = auPlateau.map((p) => p.id).join(",");
  const [clePosee, setClePosee] = useState(cle);

  // Le chronomètre et la saisie se remettent à zéro dès que la composition du
  // plateau change : les laisser courir d'un passage au suivant fausserait la
  // performance enregistrée. Remise à zéro pendant le rendu, et non dans un
  // effet — un rendu intermédiaire afficherait le chrono du passage précédent
  // au-dessus du nouvel athlète.
  if (cle !== clePosee) {
    setClePosee(cle);
    setPhase("pret");
    setEcoule(0);
    setTours({});
    setSaisies({});
  }

  // Le minuteur du navigateur et le mur LED sont deux systèmes extérieurs :
  // on les remet à l'heure dans un effet, pas pendant le rendu.
  useEffect(() => {
    if (minuteur.current) {
      clearInterval(minuteur.current);
      minuteur.current = null;
    }
    void majChrono(competitionId, { phase: "pret", dureeS: limite });
  }, [cle, competitionId, limite]);

  useEffect(
    () => () => {
      if (minuteur.current) clearInterval(minuteur.current);
    },
    [],
  );

  const reste = limite > 0 ? Math.max(0, limite - ecoule) : ecoule;
  const passe = limite > 0 ? limite - reste : reste;
  /** Rouge clignotant sur les trente dernières secondes. */
  const finale = phase === "encours" && limite > 0 && reste <= 30;
  /** Flash orange à chaque demi-minute écoulée. */
  const flash =
    phase === "encours" && !finale && passe >= 29 && Math.floor(passe) % 30 < 2;

  /**
   * Le chronomètre tourne localement, au dixième, et publie seulement ses
   * bascules : c'est ce qui permet au mur LED de le suivre sans que la table
   * dépende du réseau pour voir défiler son propre compteur.
   */
  const publier = (etat: Parameters<typeof majChrono>[1]) =>
    demarrer(async () => {
      try {
        await majChrono(competitionId, etat);
      } catch {
        // Le mur LED perdra la synchronisation du chronomètre, pas la table :
        // le compteur local continue de tourner, et c'est lui qui compte pour
        // l'officiel. Inutile d'interrompre un passage pour le dire.
      }
    });

  function basculerChrono() {
    if (auPlateau.length === 0) {
      setMessage("Appelez un athlète au plateau avant de lancer le chronomètre.");
      return;
    }
    setMessage("");
    if (phase === "encours") {
      if (minuteur.current) clearInterval(minuteur.current);
      minuteur.current = null;
      setPhase("arrete");
      releverChrono(Math.round(passe * 10) / 10);
      publier({ phase: "arrete", dureeS: limite, arretS: reste });
      return;
    }
    if (phase === "arrete") {
      setPhase("pret");
      setEcoule(0);
      publier({ phase: "pret", dureeS: limite });
      return;
    }
    const t0 = new Date().getTime();
    setPhase("encours");
    publier({ phase: "encours", dureeS: limite, debutLe: t0 });
    minuteur.current = setInterval(() => {
      const e = (Date.now() - t0) / 1000;
      setEcoule(e);
      if (limite > 0 && e >= limite) {
        if (minuteur.current) clearInterval(minuteur.current);
        minuteur.current = null;
        setEcoule(limite);
        setPhase("arrete");
        releverChrono(limite);
        publier({ phase: "arrete", dureeS: limite, arretS: 0 });
      }
    }, 100);
  }

  /**
   * Le chrono s'arrête — au bout du temps imparti ou à la main — et le temps
   * lu se pose dans la troisième case de chaque athlète au plateau. La table
   * peut le corriger avant de valider ; il part avec le passage.
   */
  function releverChrono(secondes: number) {
    setSaisies((m) => {
      const suite = { ...m };
      for (const p of auPlateau)
        suite[p.id] = {
          ...(m[p.id] ?? { valeur: "", temps: "", chrono: "", erreur: "" }),
          chrono: virgule(secondes),
        };
      return suite;
    });
  }

  /* ── Saisie ───────────────────────────────────────────────────────── */

  const saisieDe = (id: string) =>
    saisies[id] ?? { valeur: "", temps: "", chrono: "", erreur: "" };
  const majSaisie = (
    id: string,
    champ: "valeur" | "temps" | "chrono",
    v: string,
  ) =>
    setSaisies((s) => ({
      ...s,
      [id]: { ...saisieDe(id), [champ]: v, erreur: "" },
    }));

  /**
   * La saisie des passages en attente vit à part : elle ne se remet pas à
   * zéro quand le plateau change, puisque c'est précisément pendant qu'un
   * autre athlète concourt que la feuille du jury arrive. Préremplie avec ce
   * que la table avait compté au plateau.
   */
  const [saisiesAttente, setSaisiesAttente] = useState<
    Record<string, { valeur: string; temps: string; chrono: string; erreur: string }>
  >({});
  const saisieAttenteDe = (p: PassageVue) =>
    saisiesAttente[p.id] ?? {
      valeur: epreuve.tours && p.tours?.length ? String(p.tours.length) : "",
      temps: p.tempsS !== null ? virgule(p.tempsS) : "",
      chrono: p.chronoS !== null ? virgule(p.chronoS) : "",
      erreur: "",
    };
  const majSaisieAttente = (
    p: PassageVue,
    champ: "valeur" | "temps" | "chrono",
    v: string,
  ) =>
    setSaisiesAttente((s) => ({
      ...s,
      [p.id]: { ...saisieAttenteDe(p), [champ]: v, erreur: "" },
    }));

  /**
   * Un appui = une répétition validée. Le temps du tour est relevé à l'appui :
   * c'est lui qui départage deux athlètes à égalité de nombre.
   */
  function compterTour(id: string) {
    if (phase !== "encours") {
      setMessage("Démarrez le chronomètre avant de compter les répétitions.");
      return;
    }
    const t = Math.round(ecoule * 10) / 10;
    setTours((m) => {
      const suite = [...(m[id] ?? []), t];
      setSaisies((s) => ({
        ...s,
        [id]: {
          ...saisieDe(id),
          valeur: String(suite.length),
          temps: virgule(t),
          erreur: "",
        },
      }));
      return { ...m, [id]: suite };
    });
  }

  function annulerTour(id: string) {
    setTours((m) => {
      const suite = (m[id] ?? []).slice(0, -1);
      setSaisies((s) => ({
        ...s,
        [id]: {
          ...saisieDe(id),
          valeur: suite.length ? String(suite.length) : "",
          temps: suite.length ? virgule(suite[suite.length - 1]) : "",
          erreur: "",
        },
      }));
      return { ...m, [id]: suite };
    });
  }

  function valider(passageId: string, statut: "ok" | "zero" | "forfait") {
    const s = saisieDe(passageId);
    if (statut === "ok") {
      const v = nombreOuNull(s.valeur);
      if (v === null) {
        setSaisies((m) => ({
          ...m,
          [passageId]: {
            ...s,
            erreur: "Saisissez la performance mesurée avant de valider.",
          },
        }));
        return;
      }
      demarrer(async () => {
        const r = await validerPassage(passageId, {
          statut: "ok",
          valeur: v,
          tempsS: nombreOuNull(s.temps),
          tours: tours[passageId] ?? [],
          chronoS: nombreOuNull(s.chrono),
        });
        if (!r.ok)
          setSaisies((m) => ({
            ...m,
            [passageId]: {
              ...s,
              erreur: r.erreur ?? "Enregistrement impossible.",
            },
          }));
        else appelerSuivant(passageId);
      });
      return;
    }
    demarrer(async () => {
      await validerPassage(passageId, { statut });
      appelerSuivant(passageId);
    });
  }

  /**
   * Le passage est fini mais le jury n'a pas rendu la performance : on libère
   * le plateau et on appelle le suivant. Ce que la table a compté part avec
   * le passage, pour préremplir la saisie quand la feuille arrivera.
   */
  function libererSansResultat(passageId: string) {
    if (phase === "encours") {
      setMessage("Arrêtez le chronomètre avant de libérer le plateau.");
      setMessageOk(false);
      return;
    }
    const s = saisieDe(passageId);
    agir(async () => {
      const r = await mettreEnAttente(passageId, {
        tours: tours[passageId] ?? [],
        tempsS: nombreOuNull(s.temps),
        chronoS: nombreOuNull(s.chrono),
      });
      if (r.ok) appelerSuivant(passageId);
      return r;
    }, "Plateau libéré : la performance se saisit dans « En attente de résultat ».");
  }

  /** Validation depuis la liste d'attente : même écriture, sans appel du suivant. */
  function validerEnAttente(p: PassageVue, statut: "ok" | "zero" | "forfait") {
    const s = saisieAttenteDe(p);
    if (statut !== "ok") {
      agir(() => validerPassage(p.id, { statut }));
      return;
    }
    const v = nombreOuNull(s.valeur);
    if (v === null) {
      setSaisiesAttente((m) => ({
        ...m,
        [p.id]: { ...s, erreur: "Saisissez la performance mesurée avant de valider." },
      }));
      return;
    }
    demarrer(async () => {
      try {
        const r = await validerPassage(p.id, {
          statut: "ok",
          valeur: v,
          tempsS: nombreOuNull(s.temps),
          tours: p.tours ?? [],
          chronoS: nombreOuNull(s.chrono),
        });
        if (!r.ok)
          setSaisiesAttente((m) => ({
            ...m,
            [p.id]: { ...s, erreur: r.erreur ?? "Enregistrement impossible." },
          }));
      } catch {
        setSaisiesAttente((m) => ({
          ...m,
          [p.id]: {
            ...s,
            erreur:
              "Le serveur n'a pas répondu. Rien n'a été enregistré : réessayez.",
          },
        }));
      }
    });
  }

  /**
   * Valide d'un coup toutes les lignes en attente qui portent une valeur.
   *
   * Une ligne vide n'est pas un zéro : elle reste en attente et se signale.
   * « Zéro » et « Forfait » se décident ligne à ligne, jamais en lot. Les
   * lignes se valident une à une, en ordre, chacune avec sa propre trace.
   */
  function toutValider() {
    const pretes: {
      p: PassageVue;
      valeur: number;
      temps: number | null;
      chrono: number | null;
    }[] = [];
    const vides: PassageVue[] = [];
    for (const p of enAttente) {
      const s = saisieAttenteDe(p);
      const v = nombreOuNull(s.valeur);
      if (v === null) vides.push(p);
      else
        pretes.push({
          p,
          valeur: v,
          temps: nombreOuNull(s.temps),
          chrono: nombreOuNull(s.chrono),
        });
    }
    if (vides.length > 0) {
      setSaisiesAttente((m) => {
        const suite = { ...m };
        for (const p of vides)
          suite[p.id] = { ...saisieAttenteDe(p), erreur: "Valeur manquante : reste en attente." };
        return suite;
      });
    }
    if (pretes.length === 0) {
      setMessage("Aucune ligne n'a de valeur : rien à valider.");
      setMessageOk(false);
      return;
    }
    demarrer(async () => {
      let faits = 0;
      let refuse = "";
      for (const { p, valeur, temps, chrono } of pretes) {
        try {
          const r = await validerPassage(p.id, {
            statut: "ok",
            valeur,
            tempsS: temps,
            tours: p.tours ?? [],
            chronoS: chrono,
          });
          if (r.ok) faits++;
          else refuse = r.erreur ?? "Enregistrement impossible.";
        } catch {
          refuse = "Le serveur n'a pas répondu.";
        }
        if (refuse) {
          setSaisiesAttente((m) => ({
            ...m,
            [p.id]: { ...saisieAttenteDe(p), erreur: refuse },
          }));
          break;
        }
      }
      const restent = vides.length + (pretes.length - faits);
      setMessage(
        `${faits} passage${faits > 1 ? "s" : ""} validé${faits > 1 ? "s" : ""}` +
          (restent > 0
            ? `, ${restent} encore en attente${refuse ? ` — ${refuse}` : ""}`
            : "."),
      );
      setMessageOk(!refuse);
    });
  }

  /** Après une validation, l'athlète suivant de la même catégorie est appelé. */
  function appelerSuivant(passageValide: string) {
    const cat = parId.get(
      passages.find((p) => p.id === passageValide)?.athleteId ?? "",
    )?.categorieId;
    const suivant = avenir.find(
      (p) => parId.get(p.athleteId)?.categorieId === cat,
    );
    if (suivant) agir(() => appelerAuPlateau(suivant.id));
  }

  /* ── Rendu ────────────────────────────────────────────────────────── */

  const ateliers = (epreuve.ateliers ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // Une catégorie n'a fini son épreuve que quand plus personne n'attend :
  // ni en file, ni au plateau, ni un résultat du jury.
  const toutEstRendu =
    avenir.length === 0 && auPlateau.length === 0 && enAttente.length === 0;
  const epreuveTerminee = termines.length > 0 && toutEstRendu;
  const lienResultats = `/admin/impression/resultats?epreuve=${epreuve.id}&categorie=${groupeCourantId}`;

  return (
    <div>
      {/* ── Sélection de l'épreuve et du passage ── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderRadius: 14,
          padding: "16px 18px",
          marginBottom: 18,
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <Etiquette>Épreuve en cours</Etiquette>
          <select
            value={epreuve.id}
            title="Épreuve dont on gère le plateau"
            onChange={(e) => {
              const v = e.target.value;
              demarrer(async () => {
                await choisirEpreuve(
                  competitionId,
                  v,
                  melange ? null : groupeCourantId,
                );
                router.push(
                  `/admin/plateau?epreuve=${v}&categorie=${groupeCourantId}`,
                );
              });
            }}
            style={styleChamp({
              padding: "10px 12px",
              borderRadius: 9,
              fontSize: 15,
              fontWeight: 600,
            })}
          >
            {epreuves.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <Etiquette>Passage</Etiquette>
          <select
            value={groupeCourantId}
            title="Par groupe de poids, ou tout le monde mélangé. Les classements restent séparés."
            onChange={(e) => {
              const v = e.target.value;
              demarrer(async () => {
                await choisirEpreuve(
                  competitionId,
                  epreuve.id,
                  v === "tous" ? null : v,
                );
                router.push(
                  `/admin/plateau?epreuve=${epreuve.id}&categorie=${v}`,
                );
              });
            }}
            style={styleChamp({
              padding: "10px 12px",
              borderRadius: 9,
              fontSize: 15,
              fontWeight: 600,
            })}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
            <option value="tous">Toutes catégories mélangées</option>
          </select>
        </div>

        <button
          type="button"
          title="Reconstruit la liste À venir de cette épreuve dans l'ordre théorique"
          onClick={() =>
            demarrer(async () => {
              const ordre = melange
                ? entrelacer(parCategorie.map((c) => c.ordre))
                : (parCategorie[0]?.ordre ?? []);
              // Le périmètre : les athlètes des catégories affichées. Les
              // autres catégories gardent leur file intacte.
              const r = await construireFile(
                competitionId,
                epreuve.id,
                ordre,
                athletes.map((a) => a.id),
              );
              setMessage(
                r.erreur ??
                  (r.ok
                    ? `Ordre de passage reconstruit : ${ordre.length} athlète(s). Les passages déjà validés sont conservés.`
                    : "Reconstruction impossible."),
              );
              setMessageOk(r.ok);
            })
          }
          style={styleBouton("creme")}
        >
          Reconstruire l&apos;ordre
        </button>

        <button
          type="button"
          title="Charge tous les athlètes dans toutes les épreuves d'un coup, catégorie par catégorie. Les ordres déjà construits ne sont pas touchés."
          onClick={() =>
            demarrer(async () => {
              const r = await preparerToutes(competitionId);
              setMessage(
                r.erreur ??
                  (r.ok
                    ? "Toutes les épreuves sont préchargées."
                    : "Préchargement impossible."),
              );
              setMessageOk(r.ok);
            })
          }
          style={styleBouton("noir")}
        >
          Précharger toutes les épreuves
        </button>

        <Link
          href={`/admin/impression/epreuve?epreuve=${epreuve.id}&categorie=${groupeCourantId}`}
          title="Feuille de notation de cette épreuve : tous les athlètes dans l'ordre de passage, une ligne à remplir chacun. L'arbitre note sur le terrain, la table reporte ici."
          style={styleBouton("creme")}
        >
          Imprimer la feuille
        </Link>

        <Link
          href="/admin/regie"
          title="Raccourci vers la régie : changer ce qu'affichent les écrans géants sans quitter le plateau"
          style={styleBouton("orange")}
        >
          Régie des écrans
        </Link>

        {suspendue ? null : (
          <button
            type="button"
            title="Interrompt la compétition et l'affiche sur les écrans publics"
            onClick={() => {
              const motif = window.prompt(
                "Motif de la suspension, affiché sur les écrans publics :",
                "Incident technique",
              );
              if (motif === null) return;
              demarrer(async () => {
                await suspendre(competitionId, motif);
              });
            }}
            style={styleBouton("rouge", { fontWeight: 600 })}
          >
            Suspendre
          </button>
        )}
      </div>

      {/* ── Épreuve à niveaux ── */}
      {epreuve.niveau ? (
        <div
          style={{
            marginBottom: 18,
            padding: "13px 16px",
            borderRadius: 11,
            background: C.ambreFond,
            border: `1px solid ${C.ambreBord}`,
            borderLeft: `4px solid ${C.ambreTrait}`,
            color: C.ambreEncre,
            fontSize: 13,
            lineHeight: 1.5,
            fontWeight: 600,
            textWrap: "pretty",
          }}
        >
          Épreuve à niveaux : chaque athlète concourt au niveau qu&apos;il a
          déclaré sur sa fiche. Le niveau est rappelé dans la file
          d&apos;attente, au plateau et sur le mur LED. Un niveau manquant se
          corrige à l&apos;étape Athlètes.
        </div>
      ) : null}

      {/* ── Medley ── */}
      {epreuve.mesure === "medley" && ateliers.length > 0 ? (
        <div
          style={{
            marginBottom: 18,
            padding: "14px 16px",
            borderRadius: 11,
            background: C.blanc,
            border: `1px solid ${C.bordure}`,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "baseline",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Medley — ateliers dans l&apos;ordre
            </div>
            <div
              style={{ fontSize: 13, color: C.orange, fontWeight: 700 }}
            >
              {epreuve.distanceTotale ?? ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ateliers.map((txt, i) => (
              <div
                key={txt}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 9,
                  background: C.papier2,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: C.encre,
                    color: C.papier,
                    fontSize: 12,
                    fontWeight: 700,
                    flex: "none",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {message ? (
        <div
          style={{
            marginBottom: 18,
            padding: "12px 16px",
            borderRadius: 11,
            background: messageOk ? "rgba(11,146,55,.07)" : C.rougeFond,
            border: `1px solid ${messageOk ? "rgba(11,146,55,.18)" : C.rougeBord}`,
            color: messageOk ? C.vertFonce : C.rougeFonce,
            fontSize: 13,
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      ) : null}

      {/* ── Suspension ── */}
      {suspendue ? (
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            background: C.ambreFond,
            border: `1px solid ${C.ambreBord}`,
            borderLeft: `4px solid ${C.ambreTrait}`,
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: 600,
              color: C.ambreEncre,
            }}
          >
            Compétition suspendue — {motifSuspension}
          </div>
          <button
            type="button"
            title="Reprendre la compétition"
            onClick={() =>
              agir(() => reprendre(competitionId))
            }
            style={styleBouton("vert", { padding: "9px 16px", borderRadius: 9 })}
          >
            Reprendre
          </button>
        </div>
      ) : null}

      {/* ── Appel : un athlète par catégorie ── */}
      {melange ? (
        <div
          style={{
            background: C.blanc,
            border: `2px solid ${C.encre}`,
            borderRadius: 14,
            padding: "16px 18px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: C.encre3,
              marginBottom: 12,
            }}
          >
            Appel — un athlète par catégorie
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))",
              gap: 12,
            }}
          >
            {parCategorie.map((cat) => {
              const prochain = avenir.find(
                (p) => parId.get(p.athleteId)?.categorieId === cat.id,
              );
              const a = prochain ? parId.get(prochain.athleteId) : undefined;
              return (
                <div
                  key={cat.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    border: `1px solid ${C.bordure}`,
                    borderLeft: `5px solid ${cat.couleur}`,
                    borderRadius: 11,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: cat.couleur,
                      flex: "none",
                    }}
                  >
                    {a?.dossard ?? "—"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        color: C.encre4,
                      }}
                    >
                      {cat.nom}
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        lineHeight: 1.2,
                      }}
                    >
                      {a ? nomComplet(a) : "Catégorie terminée"}
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Appelle cet athlète au plateau"
                    disabled={!prochain}
                    onClick={() =>
                      prochain &&
                      demarrer(
                        async () =>
                          void (await appelerAuPlateau(prochain.id)),
                      )
                    }
                    style={styleBouton("noir", {
                      padding: "9px 14px",
                      borderRadius: 9,
                      fontSize: 13,
                      flex: "none",
                      opacity: prochain ? 1 : 0.4,
                    })}
                  >
                    Appeler
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Les trois colonnes ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* À venir */}
        <div
          style={{
            background: C.blanc,
            border: `1px solid ${C.bordure}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <EnteteColonne>À venir · {avenir.length}</EnteteColonne>
          {sansPassage.length > 0 ? (
            // Un athlète rangé, pesé, numéroté — mais inscrit après le
            // préchargement : il n'a pas de passage, donc pas de ligne ici, et
            // rien ne le disait. C'est ce silence qui a fait chercher un bug.
            <div
              style={{
                margin: "10px 16px 0",
                padding: "10px 12px",
                borderRadius: 9,
                background: C.ambreFond,
                border: `1px solid ${C.ambreBord}`,
                color: C.ambreEncre,
                fontSize: 13,
                lineHeight: 1.45,
                fontWeight: 600,
              }}
            >
              {sansPassage.length} athlète{sansPassage.length > 1 ? "s" : ""} de
              cette sélection {sansPassage.length > 1 ? "n'ont" : "n'a"} pas
              encore de passage dans cette épreuve :{" "}
              {sansPassage.map((a) => `n°${a.dossard ?? "—"} ${a.nom}`).join(", ")}.
              Cliquez <strong>Précharger toutes les épreuves</strong> pour les
              ajouter en fin de file, partout d&apos;un coup.
            </div>
          ) : null}
          {avenir.map((p) => {
            const a = parId.get(p.athleteId);
            if (!a) return null;
            const cat = catDe(p.athleteId);
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 16px",
                  borderTop: `1px solid ${C.papier3}`,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: C.papier3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.encre3,
                    flex: "none",
                  }}
                >
                  {a.dossard ?? "—"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      lineHeight: 1.25,
                    }}
                  >
                    {nomComplet(a)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginTop: 3,
                    }}
                  >
                    <PastilleCategorie
                      nom={cat?.nom ?? "—"}
                      couleur={cat?.couleur ?? C.orange}
                    />
                    {epreuve.niveau ? (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: C.ambreFond,
                          border: `1px solid ${C.ambreBord}`,
                          color: C.ambreEncre,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {niveaux[a.id] ?? "Niveau non déclaré"}
                      </span>
                    ) : null}
                    <span style={{ fontSize: 13, color: C.encre4 }}>
                      {clubAffiche(a.club)}
                      {a.horsClassement ? " · Invité, hors classement" : ""}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  title="Appelle cet athlète au plateau"
                  onClick={() =>
                    agir(() => appelerAuPlateau(p.id))
                  }
                  style={styleBouton("noir", {
                    padding: "8px 13px",
                    borderRadius: 8,
                    fontSize: 13,
                    flex: "none",
                  })}
                >
                  Appeler
                </button>
              </div>
            );
          })}
          {avenir.length === 0 ? (
            <div
              style={{
                padding: "20px 18px",
                fontSize: 14,
                color: C.encre4,
                lineHeight: 1.5,
              }}
            >
              {/* Une file vide n'est pas une information : sans elle, il n'y a
                  aucun bouton « Appeler » nulle part, et rien ne le dit. On
                  nomme donc la cause la plus probable et le geste qui la
                  corrige. */}
              {athletes.length === 0 ? (
                <>
                  Aucun athlète n&apos;est rattaché à une catégorie retenue :
                  il n&apos;y a donc personne à appeler.{" "}
                  <Link
                    href="/admin/preparation?etape=3"
                    style={{ fontWeight: 600 }}
                  >
                    Affectez les catégories
                  </Link>
                  , puis revenez construire l&apos;ordre.
                </>
              ) : (
                <>
                  Aucun passage en attente pour cette épreuve. Cliquez{" "}
                  <strong>Reconstruire l&apos;ordre</strong> ci-dessus pour
                  placer les {athletes.length} athlète(s) de cette sélection —
                  ou <strong>Précharger toutes les épreuves</strong> pour faire
                  la même chose partout d&apos;un coup.
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Au plateau */}
        <div
          style={{
            background: C.blanc,
            border: `2px solid ${C.encre}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <EnteteColonne fond={C.encre} encre={C.papier}>
            {auPlateau.length > 1
              ? `Au plateau · ${auPlateau.length} athlètes`
              : "Au plateau"}
          </EnteteColonne>

          <div style={{ padding: 18 }}>
            {melange ? (
              <button
                type="button"
                title="Appelle en une fois le prochain athlète de chaque catégorie : les passages s'ouvrent côte à côte, ici et sur le mur LED"
                onClick={() =>
                  demarrer(async () => {
                    for (const cat of parCategorie) {
                      const prochain = avenir.find(
                        (p) => parId.get(p.athleteId)?.categorieId === cat.id,
                      );
                      if (prochain) await appelerAuPlateau(prochain.id);
                    }
                  })
                }
                style={styleBouton("noir", {
                  width: "100%",
                  marginBottom: 14,
                  padding: 14,
                  borderRadius: 11,
                  fontSize: 15,
                  fontWeight: 700,
                  // Orange plein, à la demande de Kevin : l'appel en duo est
                  // LE bouton du passage mélangé, il doit se voir de loin.
                  // Même orange que la pastille dossard (valeur de la charte).
                  background: C.orange,
                })}
              >
                Appeler les {Math.max(2, parCategorie.length)} athlètes (un par
                catégorie)
              </button>
            ) : null}

            {/* Chronomètre */}
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#0A0D0B",
                textAlign: "center",
                border: `2px solid ${
                  finale ? C.rouge : flash ? C.orange : "transparent"
                }`,
              }}
            >
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color:
                    phase === "encours"
                      ? finale
                        ? "#FF6B52"
                        : flash
                          ? C.orangeClair
                          : C.papier
                      : C.papier,
                  lineHeight: 1,
                  animation:
                    finale || flash
                      ? "clignote .6s steps(1,end) infinite"
                      : "none",
                }}
              >
                <ChiffresStables texte={mmss(reste)} />
              </div>
              <div style={{ fontSize: 12, color: "#9AA79E", marginTop: 6 }}>
                {limite > 0
                  ? `Décompte préparé : ${limite} s`
                  : "Chronomètre montant"}
              </div>
              <button
                type="button"
                title="Premier appui : démarrer à l'annonce officielle. Second appui : arrêter au commencement réglementaire de l'essai."
                onClick={basculerChrono}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: 16,
                  borderRadius: 11,
                  border: "none",
                  background:
                    phase === "encours"
                      ? C.rouge
                      : auPlateau.length === 0
                        ? C.encre5
                        : C.vert,
                  color: C.blanc,
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {phase === "pret"
                  ? auPlateau.length
                    ? "Démarrer à l'annonce"
                    : "Appelez un athlète d'abord"
                  : phase === "encours"
                    ? "Arrêter au commencement"
                    : "Réarmer"}
              </button>
            </div>

            {epreuve.critere ? (
              <div
                style={{
                  marginTop: 14,
                  borderLeft: `3px solid ${C.orange}`,
                  padding: "8px 0 8px 12px",
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: C.encre2,
                }}
              >
                {epreuve.critere}
              </div>
            ) : null}

            {auPlateau.length === 0 ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 11,
                  background: C.papier2,
                  fontSize: 14,
                  color: C.encre4,
                  lineHeight: 1.5,
                }}
              >
                Appelez un athlète depuis la liste À venir : son passage
                quittera cette liste et deviendra visible ici.
              </div>
            ) : null}

            {auPlateau.map((p) => {
              const a = parId.get(p.athleteId);
              if (!a) return null;
              const cat = catDe(p.athleteId);
              const pa = pays(a.pays);
              const s = saisieDe(p.id);
              const lp = tours[p.id] ?? [];

              return (
                <div
                  key={p.id}
                  style={{
                    marginTop: 14,
                    border: `1px solid ${C.bordure}`,
                    borderTop: `4px solid ${cat?.couleur ?? C.orange}`,
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
                  >
                    <div
                      style={{
                        width: 84,
                        height: 100,
                        borderRadius: 9,
                        border: `1px solid ${C.bordure2}`,
                        backgroundColor: C.papier2,
                        backgroundImage: a.photoUrl
                          ? `url("${a.photoUrl}")`
                          : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        fontWeight: 700,
                        color: C.encre4,
                        flex: "none",
                        overflow: "hidden",
                      }}
                    >
                      {a.photoUrl ? null : initiales(a)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 30,
                            height: 26,
                            padding: "0 7px",
                            borderRadius: 7,
                            background: C.orange,
                            color: C.blanc,
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {a.dossard ?? "—"}
                        </span>
                        <Drapeau couleurs={pa.c} />
                        <span style={{ fontSize: 13, color: C.encre4 }}>
                          {pa.n}
                        </span>
                      </div>
                      <PastilleCategorie
                        nom={cat?.nom ?? "—"}
                        couleur={cat?.couleur ?? C.orange}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "4px 10px",
                          fontSize: 12,
                          letterSpacing: ".08em",
                          marginBottom: 6,
                        }}
                      />
                      <div
                        style={{
                          fontSize: 21,
                          fontWeight: 700,
                          lineHeight: 1.15,
                        }}
                      >
                        {nomComplet(a)}
                      </div>
                      <div style={{ fontSize: 14, color: C.encre3 }}>
                        {clubAffiche(a.club)} ·{" "}
                        {a.poidsCorps === null
                          ? "Non pesé"
                          : `${virgule(a.poidsCorps)} kg`}
                      </div>
                      {epreuve.niveau ? (
                        <div
                          style={{
                            display: "inline-flex",
                            marginTop: 6,
                            padding: "4px 10px",
                            borderRadius: 8,
                            background: C.ambreFond,
                            border: `1px solid ${C.ambreBord}`,
                            color: C.ambreEncre,
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {niveaux[a.id] ?? "Niveau non déclaré"}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      title="Erreur d'appel : remet cet athlète dans la liste À venir, sans résultat"
                      onClick={() =>
                        agir(() => renvoyerEnFile(p.id))
                      }
                      style={styleBouton("rouge", {
                        flex: "none",
                        padding: "8px 12px",
                        borderRadius: 9,
                        fontSize: 13,
                        fontWeight: 600,
                      })}
                    >
                      ← Retour file
                    </button>
                  </div>

                  {/* Comptage des tours */}
                  {epreuve.tours ? (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 12,
                        borderRadius: 11,
                        background: "#0A0D0B",
                      }}
                    >
                      <button
                        type="button"
                        title="Un appui à chaque répétition validée : pierre chargée, pneu renversé, levée verrouillée. Le compteur et le temps du dernier tour se remplissent tout seuls."
                        onClick={() => compterTour(p.id)}
                        style={{
                          width: "100%",
                          padding: 15,
                          borderRadius: 10,
                          border: `1.5px solid ${C.papier}`,
                          background: "transparent",
                          color: C.papier,
                          fontSize: 16,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Tour — répétition validée
                      </button>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          marginTop: 10,
                        }}
                      >
                        <div
                          style={{ flex: 1, fontSize: 12, color: "#9AA79E" }}
                        >
                          {lp.length
                            ? `${lp.length} répétition${lp.length > 1 ? "s" : ""} validée${lp.length > 1 ? "s" : ""}`
                            : "Aucune répétition encore comptée"}
                        </div>
                        {lp.length > 0 ? (
                          <button
                            type="button"
                            title="Retire le dernier tour compté"
                            onClick={() => annulerTour(p.id)}
                            style={{
                              flex: "none",
                              padding: "6px 11px",
                              borderRadius: 7,
                              border: "1px solid rgba(252,250,246,.4)",
                              background: "transparent",
                              color: C.papier,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Retirer le dernier
                          </button>
                        ) : null}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 8,
                        }}
                      >
                        {lp.map((t, i) => (
                          <span
                            key={`${t}-${i}`}
                            style={{
                              padding: "4px 9px",
                              borderRadius: 7,
                              background: "rgba(252,250,246,.12)",
                              color: C.papier,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {i + 1} · {virgule(t)} s
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Saisie de la performance */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(min(140px,100%),1fr))",
                      gap: 10,
                      marginTop: 14,
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <Etiquette style={{ minHeight: 16 }}>
                        {uniteValeur(epreuve.mesure)}
                      </Etiquette>
                      <input
                        value={s.valeur}
                        onChange={(e) =>
                          majSaisie(p.id, "valeur", e.target.value)
                        }
                        title="Performance mesurée sur cet essai"
                        style={styleChamp({
                          padding: "11px 12px",
                          borderRadius: 9,
                          fontSize: 17,
                          fontWeight: 700,
                        })}
                      />
                    </div>
                    {mesureMixte(epreuve.mesure) ? (
                      <div>
                        <Etiquette style={{ minHeight: 16 }}>
                          {libelleTemps(epreuve.mesure)}
                        </Etiquette>
                        <input
                          value={s.temps}
                          onChange={(e) =>
                            majSaisie(p.id, "temps", e.target.value)
                          }
                          title="Temps total, sert à départager les égalités"
                          style={styleChamp({
                            padding: "11px 12px",
                            borderRadius: 9,
                            fontSize: 17,
                            fontWeight: 700,
                          })}
                        />
                      </div>
                    ) : null}
                    {aCaseChrono(epreuve.mesure) ? (
                      <div>
                        <Etiquette style={{ minHeight: 16 }}>
                          {LIBELLE_CHRONO}
                        </Etiquette>
                        <input
                          value={s.chrono}
                          onChange={(e) =>
                            majSaisie(p.id, "chrono", e.target.value)
                          }
                          placeholder="à l'arrêt du chrono"
                          title="Se remplit tout seul quand le chronomètre s'arrête, au bout du temps imparti ou à la main. Ne départage pas : c'est le temps de la dernière répétition qui départage."
                          style={styleChamp({
                            padding: "11px 12px",
                            borderRadius: 9,
                            fontSize: 17,
                            fontWeight: 700,
                            background: s.chrono ? C.papier2 : undefined,
                          })}
                        />
                      </div>
                    ) : null}
                  </div>

                  {s.erreur ? (
                    <div
                      role="alert"
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: 9,
                        background: C.rougeFond,
                        border: `1px solid ${C.rougeBord}`,
                        color: C.rougeFonce,
                        fontSize: 13,
                        fontWeight: 600,
                        lineHeight: 1.45,
                      }}
                    >
                      {s.erreur}
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 16,
                      paddingTop: 14,
                      borderTop: `1px solid ${C.papier3}`,
                    }}
                  >
                    <button
                      type="button"
                      title="Enregistre la performance saisie par la table, met à jour le classement et appelle automatiquement l'athlète suivant"
                      onClick={() => valider(p.id, "ok")}
                      style={styleBouton("vert", {
                        flex: 1,
                        minWidth: "100%",
                        padding: 16,
                        borderRadius: 11,
                        fontSize: 16,
                        fontWeight: 700,
                      })}
                    >
                      Valider la performance et appeler le suivant
                    </button>
                    <button
                      type="button"
                      title="Essai nul : l'athlète a concouru mais aucune performance n'est validée. Il reste classé dans l'épreuve avec 0 point, contrairement au forfait où il ne se présente pas."
                      onClick={() => valider(p.id, "zero")}
                      style={styleBouton("creme", {
                        padding: "13px 15px",
                        borderRadius: 10,
                      })}
                    >
                      Zéro
                    </button>
                    <button
                      type="button"
                      title="Forfait de l'athlète sur cette épreuve"
                      onClick={() => valider(p.id, "forfait")}
                      style={styleBouton("creme", {
                        padding: "13px 15px",
                        borderRadius: 10,
                      })}
                    >
                      Forfait
                    </button>
                  </div>

                  <button
                    type="button"
                    title="Le passage est fini mais le jury n'a pas encore rendu la performance : libère le plateau, appelle le suivant, et garde ce passage dans « En attente de résultat » où la valeur se saisira à l'arrivée de la feuille"
                    onClick={() => libererSansResultat(p.id)}
                    style={styleBouton("blanc", {
                      width: "100%",
                      marginTop: 8,
                      padding: 12,
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                    })}
                  >
                    Passage fini, résultat plus tard → appeler le suivant
                  </button>
                </div>
              );
            })}

            {epreuveTerminee ? (
              <div
                style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(11,146,55,.07)",
                  border: "1px solid rgba(11,146,55,.18)",
                  color: C.vertFonce,
                  fontSize: 13,
                  lineHeight: 1.45,
                  fontWeight: 600,
                  textWrap: "pretty",
                }}
              >
                Épreuve terminée pour {melange ? "toutes les catégories" : "cette catégorie"} :
                {" "}{termines.length} passage{termines.length > 1 ? "s" : ""} validé{termines.length > 1 ? "s" : ""}.
                <Link
                  href={lienResultats}
                  style={styleBouton("vert", {
                    display: "block",
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 10,
                    textAlign: "center",
                    fontSize: 14,
                  })}
                >
                  Imprimer les résultats
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {/* Passages terminés */}
        <div
          style={{
            background: C.blanc,
            border: `1px solid ${C.bordure}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <EnteteColonne>Passages terminés · {termines.length}</EnteteColonne>
          {termines.length > 0 ? (
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                padding: "10px 16px",
                borderTop: `1px solid ${C.papier3}`,
                fontSize: 12,
                color: C.encre4,
                lineHeight: 1.45,
              }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                Un passage validé ne s&apos;annule pas ici. Une correction passe
                par la feuille de notation et la signature du juge principal.
              </div>
            </div>
          ) : null}
          {termines.map((p) => {
            const a = parId.get(p.athleteId);
            if (!a) return null;
            const hs =
              p.resultatStatut === "zero" || p.resultatStatut === "forfait";
            const texte =
              p.resultatStatut === "zero"
                ? "ZÉRO"
                : p.resultatStatut === "forfait"
                  ? "FORFAIT"
                  : performanceLisible(epreuve.mesure, p.valeur, p.tempsS) +
                    (p.chronoS !== null && aCaseChrono(epreuve.mesure)
                      ? ` · chrono ${virgule(p.chronoS)} s`
                      : "");
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 16px",
                  borderTop: `1px solid ${C.papier3}`,
                  background: hs ? C.rougeFond : "transparent",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: C.papier3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.encre3,
                    flex: "none",
                  }}
                >
                  {a.dossard ?? "—"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      lineHeight: 1.25,
                      color:
                        p.resultatStatut === "forfait"
                          ? C.rougeFonce
                          : C.encre,
                    }}
                  >
                    {nomComplet(a)}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color:
                        p.resultatStatut === "forfait"
                          ? C.rouge
                          : p.resultatStatut === "zero"
                            ? C.rougeFonce
                            : C.encre,
                    }}
                  >
                    {texte}
                  </div>
                </div>
              </div>
            );
          })}
          {termines.length === 0 ? (
            <div
              style={{
                padding: "20px 18px",
                fontSize: 14,
                color: C.encre4,
                lineHeight: 1.5,
              }}
            >
              Les passages officialisés s&apos;empilent ici, consultables à tout
              moment.
            </div>
          ) : null}
        </div>
      </div>

      {/* ── En attente de résultat : la feuille du jury se recopie ici ── */}
      {enAttente.length > 0 ? (
        <div
          style={{
            marginTop: 22,
            background: C.blanc,
            border: `1px solid ${C.bordure}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <EnteteColonne fond={C.ambreFond} encre={C.ambreEncre}>
            En attente de résultat · {enAttente.length}
          </EnteteColonne>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              padding: "10px 16px",
              fontSize: 13,
              color: C.encre3,
              lineHeight: 1.45,
              borderBottom: `1px solid ${C.papier3}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 240 }}>
              Ces athlètes sont passés, le plateau a été libéré. Recopiez la
              feuille du jury ligne à ligne : un passage ne compte au classement
              qu&apos;une fois validé ici.
            </div>
            <button
              type="button"
              title="Valide d'un coup toutes les lignes qui portent une valeur. Une ligne vide reste en attente ; Zéro et Forfait se décident ligne à ligne."
              onClick={toutValider}
              style={styleBouton("vert", {
                flex: "none",
                padding: "11px 16px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
              })}
            >
              Tout valider ({enAttente.length})
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: C.papier2 }}>
                  {[
                    "Dossard",
                    "Athlète",
                    ...(melange ? ["Catégorie"] : []),
                    ...(epreuve.tours ? ["Tours comptés"] : []),
                    uniteValeur(epreuve.mesure),
                    ...(mesureMixte(epreuve.mesure)
                      ? [libelleTemps(epreuve.mesure)]
                      : []),
                    ...(aCaseChrono(epreuve.mesure) ? [LIBELLE_CHRONO] : []),
                    "Verdict",
                    "",
                  ].map((t, i) => (
                    <th
                      key={`${t}-${i}`}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        color: C.encre4,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enAttente.map((p) => {
                  const a = parId.get(p.athleteId);
                  if (!a) return null;
                  const cat = catDe(p.athleteId);
                  const s = saisieAttenteDe(p);
                  const lp = p.tours ?? [];
                  const cellule = {
                    padding: "8px 10px",
                    borderTop: `1px solid ${C.papier3}`,
                    verticalAlign: "middle" as const,
                  };
                  return (
                    <tr key={p.id}>
                      <td style={{ ...cellule, fontWeight: 700, fontSize: 16 }}>
                        {a.dossard ?? "—"}
                      </td>
                      <td style={{ ...cellule, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {nomComplet(a)}
                        {s.erreur ? (
                          <div
                            role="alert"
                            style={{
                              marginTop: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              color: C.rougeFonce,
                              whiteSpace: "normal",
                            }}
                          >
                            {s.erreur}
                          </div>
                        ) : null}
                      </td>
                      {melange ? (
                        <td style={cellule}>
                          <PastilleCategorie
                            nom={cat?.nom ?? "—"}
                            couleur={cat?.couleur ?? C.orange}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "3px 9px",
                              fontSize: 11,
                              letterSpacing: ".08em",
                            }}
                          />
                        </td>
                      ) : null}
                      {epreuve.tours ? (
                        <td style={{ ...cellule, fontSize: 12, color: C.encre3, whiteSpace: "nowrap" }}>
                          {lp.length
                            ? `${lp.length} au plateau · dernier à ${virgule(lp[lp.length - 1])} s`
                            : "Aucun tour compté"}
                        </td>
                      ) : null}
                      <td style={cellule}>
                        <input
                          value={s.valeur}
                          onChange={(e) => majSaisieAttente(p, "valeur", e.target.value)}
                          title="Performance rendue par le jury"
                          style={styleChamp({
                            width: 110,
                            padding: "9px 10px",
                            borderRadius: 8,
                            fontSize: 16,
                            fontWeight: 700,
                          })}
                        />
                      </td>
                      {mesureMixte(epreuve.mesure) ? (
                        <td style={cellule}>
                          <input
                            value={s.temps}
                            onChange={(e) => majSaisieAttente(p, "temps", e.target.value)}
                            title="Temps rendu par le jury, sert à départager les égalités"
                            style={styleChamp({
                              width: 110,
                              padding: "9px 10px",
                              borderRadius: 8,
                              fontSize: 16,
                              fontWeight: 700,
                            })}
                          />
                        </td>
                      ) : null}
                      {aCaseChrono(epreuve.mesure) ? (
                        <td style={cellule}>
                          <input
                            value={s.chrono}
                            onChange={(e) => majSaisieAttente(p, "chrono", e.target.value)}
                            title="Temps lu au chrono à l'arrêt, relevé au plateau"
                            style={styleChamp({
                              width: 90,
                              padding: "9px 10px",
                              borderRadius: 8,
                              fontSize: 16,
                              fontWeight: 700,
                            })}
                          />
                        </td>
                      ) : null}
                      <td style={{ ...cellule, whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          title="Enregistre la performance rendue par le jury et met à jour le classement"
                          onClick={() => validerEnAttente(p, "ok")}
                          style={styleBouton("vert", {
                            padding: "9px 14px",
                            borderRadius: 9,
                            fontSize: 14,
                            marginRight: 6,
                          })}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          title="Essai nul : a concouru, aucune performance validée, 0 point"
                          onClick={() => validerEnAttente(p, "zero")}
                          style={styleBouton("creme", {
                            padding: "9px 12px",
                            borderRadius: 9,
                            fontSize: 13,
                            marginRight: 6,
                          })}
                        >
                          Zéro
                        </button>
                        <button
                          type="button"
                          title="Forfait de l'athlète sur cette épreuve"
                          onClick={() => validerEnAttente(p, "forfait")}
                          style={styleBouton("creme", {
                            padding: "9px 12px",
                            borderRadius: 9,
                            fontSize: 13,
                          })}
                        >
                          Forfait
                        </button>
                      </td>
                      <td style={{ ...cellule, textAlign: "right" }}>
                        <button
                          type="button"
                          title="Erreur : remet cet athlète dans la liste À venir, sans résultat"
                          onClick={() => agir(() => renvoyerEnFile(p.id))}
                          style={styleBouton("blanc", {
                            padding: "7px 11px",
                            borderRadius: 8,
                            fontSize: 12,
                          })}
                        >
                          ← Retour file
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ── Ordre de passage par catégorie (passage mélangé) ── */}
      {melange ? (
        <div style={{ marginTop: 22 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: C.encre3,
              marginBottom: 12,
            }}
          >
            Ordre de passage par catégorie — mis à jour à chaque validation
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))",
              gap: 14,
            }}
          >
            {parCategorie.map((cat) => {
              const liste = avenir.filter(
                (p) => parId.get(p.athleteId)?.categorieId === cat.id,
              );
              return (
                <div
                  key={cat.id}
                  style={{
                    background: C.blanc,
                    border: `1px solid ${C.bordure}`,
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "11px 16px",
                      background: cat.couleur,
                      color: C.blanc,
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: ".04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {cat.nom}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>
                      {liste.length} à venir
                    </div>
                  </div>
                  {liste.map((p, i) => {
                    const a = parId.get(p.athleteId);
                    if (!a) return null;
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          padding: "10px 16px",
                          borderTop: `1px solid ${C.papier3}`,
                        }}
                      >
                        <div
                          style={{
                            width: 22,
                            fontSize: 13,
                            fontWeight: 700,
                            color: C.encre4,
                            flex: "none",
                          }}
                        >
                          {i + 1}
                        </div>
                        <div
                          style={{
                            width: 32,
                            height: 30,
                            borderRadius: 7,
                            background: C.papier3,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: C.encre2,
                            flex: "none",
                          }}
                        >
                          {a.dossard ?? "—"}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 14,
                            fontWeight: 600,
                            lineHeight: 1.2,
                          }}
                        >
                          {nomComplet(a)}
                        </div>
                        <button
                          type="button"
                          title="Appeler cet athlète au plateau maintenant"
                          onClick={() =>
                            agir(() => appelerAuPlateau(p.id))
                          }
                          style={styleBouton("creme", {
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            flex: "none",
                          })}
                        >
                          Appeler
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Classements ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))",
          gap: 16,
          marginTop: 22,
        }}
      >
        {parCategorie.map((cat) => (
          <div
            key={`ep-${cat.id}`}
            style={{
              background: C.blanc,
              border: `1px solid ${C.bordure}`,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <EnteteColonne>
              {epreuve.nom} · {cat.nom} ·{" "}
              {tempsImpartiLisible(epreuve.tempsLimiteS)}
            </EnteteColonne>
            {cat.classementEpreuve.map((l) => (
              <div
                key={l.athleteId}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  padding: "11px 18px",
                  borderTop: `1px solid ${C.papier3}`,
                }}
              >
                <div
                  style={{
                    width: 26,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.orange,
                    flex: "none",
                  }}
                >
                  {l.rang}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  {nomAthlete(parId, l.athleteId)}
                </div>
                <div
                  style={{ fontSize: 14, color: C.encre3, flex: "none" }}
                >
                  {performanceLisible(epreuve.mesure, l.valeur, l.temps)}
                </div>
                <div
                  style={{
                    width: 56,
                    textAlign: "right",
                    fontSize: 15,
                    fontWeight: 700,
                    flex: "none",
                  }}
                >
                  {l.points} pts
                </div>
              </div>
            ))}
            {cat.classementEpreuve.length === 0 ? (
              <div
                style={{ padding: "20px 18px", fontSize: 14, color: C.encre4 }}
              >
                Aucun résultat officialisé sur cette épreuve.
              </div>
            ) : null}
          </div>
        ))}

        {parCategorie.map((cat) => (
          <div
            key={`gen-${cat.id}`}
            style={{
              background: C.blanc,
              border: `1px solid ${C.bordure}`,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <EnteteColonne>Classement général · {cat.nom}</EnteteColonne>
            {cat.classementGeneral.map((l) => (
              <div
                key={l.athleteId}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  padding: "11px 18px",
                  borderTop: `1px solid ${C.papier3}`,
                }}
              >
                <div
                  style={{
                    width: 26,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.vertFonce,
                    flex: "none",
                  }}
                >
                  {l.rang}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  {nomAthlete(parId, l.athleteId)}
                </div>
                <div
                  style={{
                    width: 70,
                    textAlign: "right",
                    fontSize: 15,
                    fontWeight: 700,
                    flex: "none",
                  }}
                >
                  {l.total} pts
                </div>
              </div>
            ))}
            {cat.classementGeneral.length === 0 ? (
              <div
                style={{ padding: "20px 18px", fontSize: 14, color: C.encre4 }}
              >
                Aucun athlète classé dans cette catégorie.
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Aides ────────────────────────────────────────────────────────────── */

const nomAthlete = (
  parId: Map<string, AthletePublic>,
  id: string,
): string => {
  const a = parId.get(id);
  return a ? nomComplet(a) : "—";
};

/**
 * Entrelace les ordres de plusieurs catégories : un athlète de chacune, puis
 * le suivant de chacune. C'est ce qui fait qu'en passage mélangé, l'appel en
 * duo trouve toujours un athlète par catégorie en tête de file.
 */
function entrelacer(listes: string[][]): string[] {
  const sortie: string[] = [];
  const max = Math.max(0, ...listes.map((l) => l.length));
  for (let i = 0; i < max; i++)
    for (const l of listes) if (l[i]) sortie.push(l[i]);
  return sortie;
}
