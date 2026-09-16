"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  appelerAuPlateau,
  construireFile,
  rouvrirPassage,
  validerPassage,
} from "@/lib/actions";
import type { AthletePublic, EpreuveVue, PassageVue } from "@/lib/donnees";

/** Libellé et unité de la valeur à saisir, selon la mesure de l'épreuve. */
const UNITES: Record<string, string> = {
  nb_temps: "Nombre validé",
  poids: "Charge (kg)",
  duree: "Maintien (s)",
  distance: "Distance (m)",
  chrono: "Temps (s)",
};

/** Formate un temps en secondes : 83.4 → « 01:23,4 ». */
function mmss(secondes: number): string {
  const s = Math.max(0, secondes);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  const d = Math.floor((s * 10) % 10);
  return `${m < 10 ? "0" : ""}${m}:${r < 10 ? "0" : ""}${r},${d}`;
}

export function Plateau({
  competitionId,
  epreuve,
  categorieNom,
  athletes,
  ordre,
  passages,
}: {
  competitionId: string;
  epreuve: EpreuveVue;
  categorieNom: string;
  athletes: AthletePublic[];
  ordre: string[];
  passages: PassageVue[];
}) {
  const [enCours, demarrer] = useTransition();
  const parId = new Map(athletes.map((a) => [a.id, a]));

  const auPlateau = passages.find((p) => p.statut === "plateau") ?? null;
  const aVenir = passages
    .filter((p) => p.statut === "avenir")
    .sort((a, b) => a.ordre - b.ordre);
  const termines = passages
    .filter((p) => p.statut === "termine")
    .sort((a, b) => a.ordre - b.ordre);

  /* ── Chronomètre ──────────────────────────────────────────────────── */

  const limite = epreuve.tempsLimiteS ?? 0;
  const [phase, setPhase] = useState<"pret" | "encours" | "arrete">("pret");
  const [ecoule, setEcoule] = useState(0);
  const [tours, setTours] = useState<number[]>([]);
  const depart = useRef<number | null>(null);
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);

  // Le chronomètre se remet à zéro dès qu'on change d'athlète : le laisser
  // courir d'un passage au suivant fausserait la performance enregistrée.
  useEffect(() => {
    if (minuteur.current) clearInterval(minuteur.current);
    minuteur.current = null;
    depart.current = null;
    setPhase("pret");
    setEcoule(0);
    setTours([]);
  }, [auPlateau?.id]);

  useEffect(() => {
    return () => {
      if (minuteur.current) clearInterval(minuteur.current);
    };
  }, []);

  const reste = limite > 0 ? Math.max(0, limite - ecoule) : ecoule;
  const derniereLigneDroite = phase === "encours" && limite > 0 && reste <= 30;

  function basculerChrono() {
    if (phase === "encours") {
      if (minuteur.current) clearInterval(minuteur.current);
      minuteur.current = null;
      setPhase("arrete");
      return;
    }
    if (phase === "arrete") {
      setPhase("pret");
      setEcoule(0);
      setTours([]);
      depart.current = null;
      return;
    }
    const t0 = Date.now();
    depart.current = t0;
    setPhase("encours");
    minuteur.current = setInterval(() => {
      const e = (Date.now() - t0) / 1000;
      setEcoule(e);
      if (limite > 0 && e >= limite) {
        if (minuteur.current) clearInterval(minuteur.current);
        minuteur.current = null;
        setEcoule(limite);
        setPhase("arrete");
      }
    }, 100);
  }

  /**
   * Un appui = une répétition validée. Le temps du tour est relevé au moment
   * de l'appui : c'est lui qui départage deux athlètes à égalité de nombre.
   */
  function compterTour() {
    if (phase !== "encours") return;
    const t = Math.round(ecoule * 10) / 10;
    setTours((l) => {
      const suite = [...l, t];
      setValeur(String(suite.length));
      setTemps(String(t).replace(".", ","));
      return suite;
    });
  }

  function annulerTour() {
    setTours((l) => {
      const suite = l.slice(0, -1);
      setValeur(suite.length ? String(suite.length) : "");
      setTemps(
        suite.length ? String(suite[suite.length - 1]).replace(".", ",") : "",
      );
      return suite;
    });
  }

  /* ── Saisie du résultat ───────────────────────────────────────────── */

  const [valeur, setValeur] = useState("");
  const [temps, setTemps] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    setValeur("");
    setTemps("");
    setErreur("");
  }, [auPlateau?.id]);

  const nombreOuNull = (s: string): number | null => {
    const t = s.trim().replace(",", ".");
    if (!t) return null;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : null;
  };

  function valider(statut: "ok" | "zero" | "forfait") {
    if (!auPlateau) return;
    if (statut === "ok") {
      const v = nombreOuNull(valeur);
      if (v === null) {
        setErreur("Saisissez la performance mesurée avant de valider.");
        return;
      }
      demarrer(async () => {
        const r = await validerPassage(auPlateau.id, {
          statut: "ok",
          valeur: v,
          tempsS: nombreOuNull(temps),
          tours,
        });
        if (!r.ok) setErreur(r.erreur ?? "Enregistrement impossible.");
      });
      return;
    }
    demarrer(async () => {
      await validerPassage(auPlateau.id, { statut });
    });
  }

  const bouton =
    "rounded-lg px-4 py-2.5 font-titre text-sm font-semibold uppercase tracking-wide transition disabled:opacity-40";

  /* ── Rendu ────────────────────────────────────────────────────────── */

  if (passages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-bordure-2 bg-papier-2 p-6 text-center">
        <p className="mb-1 font-medium">
          Aucun ordre de passage pour « {epreuve.nom} » en {categorieNom}.
        </p>
        <p className="mx-auto mb-4 max-w-lg text-sm text-encre-2">
          {athletes.length === 0
            ? "Cette catégorie ne compte aucun athlète. Affectez-en depuis l'écran Athlètes."
            : `${athletes.length} athlète(s) dans cette catégorie. Créez la file pour commencer.`}
        </p>
        <button
          type="button"
          disabled={enCours || athletes.length === 0}
          onClick={() =>
            demarrer(async () => {
              await construireFile(competitionId, epreuve.id, ordre);
            })
          }
          className={`${bouton} bg-encre text-papier hover:bg-vert-fonce`}
        >
          Créer l&apos;ordre de passage
        </button>
      </div>
    );
  }

  const athleteAuPlateau = auPlateau ? parId.get(auPlateau.athleteId) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* ── Athlète au plateau ── */}
      <section className="rounded-xl border border-bordure bg-white p-5">
        <h2 className="mb-4 font-titre text-base font-semibold uppercase">
          Au plateau — {epreuve.nom}
        </h2>

        {!athleteAuPlateau ? (
          <p className="rounded-lg bg-papier-2 px-4 py-8 text-center text-sm text-encre-2">
            Aucun athlète au plateau. Appelez le suivant depuis la file
            d&apos;attente à droite.
          </p>
        ) : (
          <>
            <div className="mb-5 flex items-baseline gap-4">
              <span className="font-titre text-5xl font-bold tabular-nums">
                {athleteAuPlateau.dossard ?? "—"}
              </span>
              <span>
                <span className="text-xl font-semibold">
                  {athleteAuPlateau.nom}
                </span>{" "}
                <span className="text-xl text-encre-2">
                  {athleteAuPlateau.prenoms}
                </span>
                <span className="block text-sm text-encre-3">
                  {athleteAuPlateau.club ?? "Indépendant"} · {categorieNom}
                </span>
              </span>
            </div>

            {/* ── Chronomètre ── */}
            <div className="mb-5 rounded-lg bg-encre p-5 text-center text-papier">
              <div
                className={`font-titre text-6xl font-bold tabular-nums ${
                  derniereLigneDroite ? "clignote text-rouge" : ""
                }`}
              >
                {mmss(reste)}
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide opacity-60">
                {limite > 0
                  ? `temps imparti ${limite} s`
                  : "temps de maintien"}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={basculerChrono}
                  className={`${bouton} ${
                    phase === "encours"
                      ? "bg-rouge text-white"
                      : "bg-vert text-white"
                  }`}
                >
                  {phase === "encours"
                    ? "Arrêter"
                    : phase === "arrete"
                      ? "Remettre à zéro"
                      : "Démarrer"}
                </button>
                <button
                  type="button"
                  onClick={compterTour}
                  disabled={phase !== "encours"}
                  className={`${bouton} bg-orange text-white`}
                >
                  + Répétition
                </button>
                {tours.length > 0 && (
                  <button
                    type="button"
                    onClick={annulerTour}
                    className={`${bouton} bg-white/15 text-papier`}
                  >
                    Annuler la dernière
                  </button>
                )}
              </div>

              {tours.length > 0 && (
                <p className="mt-3 text-xs tabular-nums opacity-70">
                  {tours.length} répétition(s) — {tours.map(mmss).join(" · ")}
                </p>
              )}
            </div>

            {/* ── Saisie ── */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-encre-2">
                  {UNITES[epreuve.mesure] ?? "Performance"}
                </span>
                <input
                  value={valeur}
                  onChange={(e) => {
                    setValeur(e.target.value);
                    setErreur("");
                  }}
                  inputMode="decimal"
                  className="w-full rounded-lg border border-bordure-2 bg-papier px-3 py-2 text-lg tabular-nums outline-none focus:border-orange"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-encre-2">
                  Temps intermédiaire (s)
                </span>
                <input
                  value={temps}
                  onChange={(e) => setTemps(e.target.value)}
                  inputMode="decimal"
                  placeholder="départage les ex æquo"
                  className="w-full rounded-lg border border-bordure-2 bg-papier px-3 py-2 text-lg tabular-nums outline-none focus:border-orange"
                />
              </label>
            </div>

            {erreur && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-rouge/10 px-3 py-2 text-sm text-rouge-fonce"
              >
                {erreur}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={enCours}
                onClick={() => valider("ok")}
                className={`${bouton} bg-vert text-white`}
              >
                Valider la performance
              </button>
              <button
                type="button"
                disabled={enCours}
                onClick={() => valider("zero")}
                className={`${bouton} border border-bordure-2 bg-white`}
              >
                Zéro
              </button>
              <button
                type="button"
                disabled={enCours}
                onClick={() => valider("forfait")}
                className={`${bouton} border border-bordure-2 bg-white`}
              >
                Forfait
              </button>
            </div>
            <p className="mt-2 text-xs text-encre-3">
              « Zéro » et « forfait » closent le passage sans performance :
              aucun rang, zéro point.
            </p>
          </>
        )}
      </section>

      {/* ── File d'attente et passages faits ── */}
      <aside className="space-y-5">
        <section className="rounded-xl border border-bordure bg-white p-4">
          <h2 className="mb-3 font-titre text-sm font-semibold uppercase">
            File d&apos;attente ({aVenir.length})
          </h2>
          {aVenir.length === 0 ? (
            <p className="text-sm text-encre-3">
              Tous les athlètes de cette catégorie sont passés.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {aVenir.map((p, i) => {
                const a = parId.get(p.athleteId);
                if (!a) return null;
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
                      i === 0 ? "bg-orange/10" : ""
                    }`}
                  >
                    <span className="w-8 font-semibold tabular-nums">
                      {a.dossard ?? "—"}
                    </span>
                    <span className="flex-1 truncate">
                      {a.nom} {a.prenoms}
                    </span>
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() =>
                        demarrer(async () => {
                          await appelerAuPlateau(p.id);
                        })
                      }
                      className="rounded bg-encre px-2 py-1 text-xs font-medium text-papier transition hover:bg-vert-fonce disabled:opacity-40"
                    >
                      Appeler
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-bordure bg-white p-4">
          <h2 className="mb-3 font-titre text-sm font-semibold uppercase">
            Passages validés ({termines.length})
          </h2>
          {termines.length === 0 ? (
            <p className="text-sm text-encre-3">Aucun passage validé.</p>
          ) : (
            <ul className="space-y-1.5">
              {termines.map((p) => {
                const a = parId.get(p.athleteId);
                if (!a) return null;
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm"
                  >
                    <span className="w-8 font-semibold tabular-nums">
                      {a.dossard ?? "—"}
                    </span>
                    <span className="flex-1 truncate">{a.nom}</span>
                    <span className="tabular-nums font-medium">
                      {p.resultatStatut === "ok"
                        ? p.valeur
                        : p.resultatStatut === "zero"
                          ? "0"
                          : "forfait"}
                    </span>
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() => {
                        if (
                          !confirm(
                            `Reprendre le passage de ${a.nom} ?\n\n` +
                              "Le résultat enregistré sera effacé et l'athlète " +
                              "reviendra au plateau. L'opération est tracée.",
                          )
                        )
                          return;
                        demarrer(async () => {
                          await rouvrirPassage(p.id);
                        });
                      }}
                      className="text-xs text-encre-3 underline transition hover:text-orange-fonce"
                    >
                      reprendre
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
