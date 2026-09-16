"use client";

import { useState, useTransition } from "react";
import { C } from "@/lib/charte";
import { Etiquette, styleBouton, styleChamp } from "@/components/ui";
import {
  MODELE_CSV,
  cleRapprochement,
  lireListe,
  type LigneImport,
} from "@/lib/import-liste";
import { importerAthletes, type ResumeImport } from "@/lib/actions";

/** Une ligne, augmentée des décisions prises à l'écran de vérification. */
interface LigneVue extends LigneImport {
  garder: boolean;
  doublon: boolean;
  fusionner: boolean;
}

type Etape = "source" | "lecture" | "verification" | "resume";

/**
 * Le panneau « Importer une liste d'athlètes ».
 *
 * Trois temps, comme sur le poste d'origine : on choisit une source, on
 * VÉRIFIE ligne à ligne, puis on écrit. L'écran du milieu est le cœur du
 * dispositif — une liste d'engagés arrive toujours un peu sale, et c'est là
 * qu'un officiel décide, pas le programme.
 */
export function PanneauImport({
  competitionId,
  existants,
  fermer,
  versPesee,
}: {
  competitionId: string;
  /** Les fiches déjà en base, pour repérer les doublons. */
  existants: { nom: string; prenoms: string }[];
  fermer: () => void;
  versPesee: () => void;
}) {
  const [etape, setEtape] = useState<Etape>("source");
  const [texte, setTexte] = useState("");
  const [source, setSource] = useState("");
  const [erreur, setErreur] = useState("");
  const [lignes, setLignes] = useState<LigneVue[]>([]);
  const [resume, setResume] = useState<ResumeImport | null>(null);
  const [, demarrer] = useTransition();

  const clesExistantes = new Set(
    existants.map((a) => cleRapprochement(a.nom, a.prenoms)),
  );

  function analyser(contenu: string, nomSource: string) {
    const lues = lireListe(contenu);
    if (lues.length === 0) {
      setErreur("Aucune ligne exploitable n'a été trouvée dans cette source.");
      setEtape("source");
      return;
    }
    const vues: LigneVue[] = lues.map((l) => {
      const doublon = clesExistantes.has(cleRapprochement(l.nom, l.prenoms));
      return {
        ...l,
        doublon,
        // Un doublon n'est pas coché d'office : le cas courant est la liste
        // renvoyée deux fois, où il ne faut rien refaire.
        garder: !doublon,
        fusionner: false,
      };
    });
    setLignes(vues);
    setSource(nomSource);
    setErreur("");
    setEtape("verification");
  }

  const gardees = lignes.filter((l) => l.garder);

  function ecrire() {
    demarrer(async () => {
      try {
        const r = await importerAthletes(
          competitionId,
          gardees.map((l) => ({
            nom: l.nom,
            prenoms: l.prenoms,
            club: l.club,
            poids: l.poids,
            telephone: l.telephone,
            urgence: l.urgence,
            doute: l.motifs.length > 0,
            fusionner: l.doublon && l.fusionner,
          })),
        );
        if (!r.ok || !r.resume) {
          setErreur(r.erreur ?? "Import impossible.");
          return;
        }
        setResume(r.resume);
        setEtape("resume");
      } catch {
        // Une liste de cent engagés qui échoue au transport ne doit pas
        // effacer l'écran de vérification : la saisie est encore là, on
        // réessaie.
        setErreur(
          "Le serveur n'a pas répondu — rien n'a été importé. Rechargez la " +
            "page si le problème persiste ; votre liste est toujours là.",
        );
      }
    });
  }

  function telechargerModele() {
    // Le BOM ouvre le fichier avec les bons accents dans Excel, qui suppose
    // sinon un encodage local et affiche « KONÃ‰ ».
    const blob = new Blob(["﻿" + MODELE_CSV], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-engages.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      style={{
        background: C.blanc,
        border: `2px solid ${C.encre}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Importer une liste d&apos;athlètes
        </div>
        <button
          type="button"
          title="Fermer sans rien importer"
          onClick={fermer}
          style={styleBouton("creme", {
            marginLeft: "auto",
            padding: "8px 13px",
            borderRadius: 9,
            fontSize: 13,
            color: C.encre3,
            fontWeight: 400,
          })}
        >
          Fermer
        </button>
      </div>

      {/* ── Choix de la source ── */}
      {etape === "source" ? (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(min(260px,100%),1fr))",
              gap: 16,
            }}
          >
            <div
              style={{
                border: `1px dashed ${C.encre5}`,
                borderRadius: 12,
                padding: 18,
                textAlign: "center",
              }}
            >
              <Etiquette style={{ marginBottom: 8 }}>
                Depuis un fichier
              </Etiquette>
              <label
                title="CSV, ou texte séparé par des tabulations"
                style={{
                  display: "inline-block",
                  padding: "11px 18px",
                  borderRadius: 10,
                  background: C.encre,
                  color: C.blanc,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Choisir un fichier
                <input
                  type="file"
                  accept=".csv,.txt,.tsv,text/csv,text/plain"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setEtape("lecture");
                    analyser(await f.text(), f.name);
                  }}
                />
              </label>
              <div
                style={{
                  fontSize: 12,
                  color: C.encre4,
                  marginTop: 10,
                  lineHeight: 1.45,
                }}
              >
                CSV et texte tabulé sont les plus fiables — c&apos;est ce
                qu&apos;Excel produit en « Enregistrer sous » comme en
                copier-coller. Word et PDF ne sont pas lus : recopiez leur
                tableau dans le cadre ci-contre.
              </div>
              <button
                type="button"
                title="Télécharge un fichier vierge avec les bonnes colonnes"
                onClick={telechargerModele}
                style={styleBouton("creme", {
                  marginTop: 12,
                  padding: "8px 13px",
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 400,
                })}
              >
                Télécharger le modèle
              </button>
            </div>

            <div
              style={{
                border: `1px dashed ${C.encre5}`,
                borderRadius: 12,
                padding: 18,
              }}
            >
              <Etiquette style={{ marginBottom: 8 }}>
                Ou coller la liste
              </Etiquette>
              <textarea
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                rows={6}
                placeholder="Collez ici la liste copiée depuis Word, un PDF ou un tableau"
                style={styleChamp({
                  padding: "10px 12px",
                  borderRadius: 9,
                  lineHeight: 1.5,
                  resize: "vertical",
                })}
              />
              <button
                type="button"
                title="Analyse le texte collé"
                onClick={() => {
                  if (!texte.trim()) {
                    setErreur("Collez d'abord une liste.");
                    return;
                  }
                  analyser(texte, "texte collé");
                }}
                style={styleBouton("vert", {
                  marginTop: 10,
                  padding: "10px 16px",
                  borderRadius: 9,
                })}
              >
                Lire ce texte
              </button>
            </div>
          </div>
          {erreur ? (
            <div
              style={{
                fontSize: 13,
                color: C.rougeFonce,
                marginTop: 12,
                lineHeight: 1.45,
              }}
            >
              {erreur}
            </div>
          ) : null}
        </div>
      ) : null}

      {etape === "lecture" ? (
        <div
          style={{
            padding: "26px 0",
            textAlign: "center",
            fontSize: 15,
            color: C.encre3,
          }}
        >
          Lecture du fichier en cours…
        </div>
      ) : null}

      {/* ── Vérification ── */}
      {etape === "verification" ? (
        <div>
          <div style={{ fontSize: 13, color: C.encre3, marginBottom: 12 }}>
            Source : {source}. Vérifiez, décochez ce qui ne doit pas entrer,
            puis importez. Les lignes en rose ont un doute.
          </div>
          <div
            style={{
              border: `1px solid ${C.bordure}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1.5fr 1fr 80px 1fr",
                gap: 10,
                padding: "10px 14px",
                background: C.papier2,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: C.encre3,
              }}
            >
              <div>Garder</div>
              <div>Nom et prénoms</div>
              <div>Club</div>
              <div>Poids</div>
              <div>Téléphones</div>
            </div>

            {lignes.map((l, i) => (
              <div
                key={`${l.nom}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1.5fr 1fr 80px 1fr",
                  gap: 10,
                  padding: "10px 14px",
                  borderTop: `1px solid ${C.papier3}`,
                  alignItems: "center",
                  background:
                    l.motifs.length > 0 || l.doublon
                      ? "#FDF3EF"
                      : "transparent",
                }}
              >
                <button
                  type="button"
                  title="Cocher ou décocher cette ligne"
                  onClick={() =>
                    setLignes((t) =>
                      t.map((x, j) =>
                        j === i ? { ...x, garder: !x.garder } : x,
                      ),
                    )
                  }
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    border: `1.5px solid ${C.encre5}`,
                    background: C.blanc,
                    color: C.vert,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {l.garder ? "✓" : ""}
                </button>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {l.nom || "—"}{" "}
                    <span style={{ fontWeight: 400 }}>{l.prenoms}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.orangeFonce }}>
                    {l.motifs.join(" · ")}
                  </div>
                  {l.doublon ? (
                    <button
                      type="button"
                      title="Cet athlète existe déjà : compléter sa fiche ou ignorer la ligne"
                      onClick={() =>
                        setLignes((t) =>
                          t.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  fusionner: !x.fusionner,
                                  garder: !x.fusionner,
                                }
                              : x,
                          ),
                        )
                      }
                      style={{
                        marginTop: 4,
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: `1px solid ${C.bordure2}`,
                        background: C.papier,
                        color: C.encre3,
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {l.fusionner
                        ? "Déjà inscrit — compléter sa fiche"
                        : "Déjà inscrit — ignorer cette ligne"}
                    </button>
                  ) : null}
                </div>

                <div style={{ fontSize: 13, color: C.encre2 }}>{l.club}</div>
                <div style={{ fontSize: 13, color: C.encre2 }}>{l.poids}</div>
                <div style={{ fontSize: 12, color: C.encre3 }}>
                  {l.telephone} {l.urgence ? `/ ${l.urgence}` : ""}
                </div>
              </div>
            ))}
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
            <button
              type="button"
              title="Écrit les lignes cochées dans la liste des athlètes"
              onClick={ecrire}
              disabled={gardees.length === 0}
              style={styleBouton("vert", {
                padding: "12px 20px",
                fontSize: 15,
                fontWeight: 700,
                opacity: gardees.length === 0 ? 0.5 : 1,
              })}
            >
              Importer les {gardees.length} lignes cochées
            </button>
            <div style={{ fontSize: 13, color: C.encre4 }}>
              Le poids lu dans le fichier reste indicatif : la pesée du jour J
              fait foi.
            </div>
          </div>
          {erreur ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                color: C.rougeFonce,
                lineHeight: 1.45,
              }}
            >
              {erreur}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Résumé ── */}
      {etape === "resume" && resume ? (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(min(130px,100%),1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              { n: resume.ajoutes, lbl: "ajoutés", couleur: C.vert },
              {
                n: resume.fusionnes,
                lbl: "fiches complétées",
                couleur: C.encre,
              },
              { n: resume.ignores, lbl: "ignorés", couleur: C.encre4 },
              { n: resume.aVerifier, lbl: "à vérifier", couleur: C.orange },
            ].map((c) => (
              <div
                key={c.lbl}
                style={{
                  background: C.papier,
                  border: `1px solid ${C.bordure}`,
                  borderRadius: 11,
                  padding: 14,
                }}
              >
                <div
                  style={{ fontSize: 26, fontWeight: 700, color: c.couleur }}
                >
                  {c.n}
                </div>
                <div style={{ fontSize: 12, color: C.encre3 }}>{c.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              title="Rester sur la liste pour compléter les fiches"
              onClick={fermer}
              style={styleBouton("vert", {
                padding: "12px 20px",
                fontSize: 15,
              })}
            >
              Compléter les fiches
            </button>
            <button
              type="button"
              title="Passer à l'étape Pesée"
              onClick={versPesee}
              style={styleBouton("creme", {
                padding: "12px 20px",
                fontSize: 15,
                fontWeight: 500,
              })}
            >
              Aller à la pesée
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
