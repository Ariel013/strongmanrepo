"use client";

import { useEffect, useState, useTransition } from "react";
import { C, nomComplet } from "@/lib/charte";
import { styleBouton, styleChamp } from "@/components/ui";
import { televerserPhoto } from "@/lib/actions";
import { poidsLisible, preparerImage } from "@/lib/image";
import type { FicheAthlete } from "@/lib/donnees";

const sansAcc = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

interface Correspondance {
  fichier: File;
  apercu: string;
  athleteId: string;
  /** Rapproché tout seul, ou choisi à la main. */
  devine: boolean;
}

/**
 * « Correspondance des photos » — dépose toutes les photos d'un coup.
 *
 * Le rapprochement se fait sur le NOM DU FICHIER, et il est toujours montré
 * avant d'être appliqué : une photo attribuée au mauvais athlète s'affiche
 * en 19 vw sur le mur LED devant la salle entière. Deviner est acceptable,
 * deviner en silence ne l'est pas.
 */
export function PhotosGroupees({
  athletes,
  fermer,
}: {
  athletes: FicheAthlete[];
  fermer: () => void;
}) {
  const [corresp, setCorresp] = useState<Correspondance[]>([]);
  const [etat, setEtat] = useState("");
  const [, demarrer] = useTransition();

  // Les aperçus sont des URL d'objet : les révoquer en partant, sinon les
  // images restent en mémoire tant que l'onglet est ouvert.
  useEffect(
    () => () => {
      for (const c of corresp) URL.revokeObjectURL(c.apercu);
    },
    [corresp],
  );

  function rapprocher(fichiers: FileList) {
    const sortie: Correspondance[] = [];
    for (const fichier of Array.from(fichiers)) {
      const base = sansAcc(fichier.name.replace(/\.[^.]+$/, ""));
      const mots = base.split(" ").filter((m) => m.length > 2);

      // On retient l'athlète dont le plus de mots du nom figurent dans le nom
      // de fichier. À égalité, personne : mieux vaut une case « ne pas
      // utiliser » qu'un rapprochement au hasard.
      let meilleur = "";
      let score = 0;
      let exaequo = false;
      for (const a of athletes) {
        const cible = sansAcc(`${a.nom} ${a.prenoms}`).split(" ");
        const n = cible.filter(
          (m) => m.length > 2 && mots.some((x) => x === m),
        ).length;
        if (n > score) {
          score = n;
          meilleur = a.id;
          exaequo = false;
        } else if (n === score && n > 0) {
          exaequo = true;
        }
      }
      sortie.push({
        fichier,
        apercu: URL.createObjectURL(fichier),
        athleteId: score > 0 && !exaequo ? meilleur : "",
        devine: score > 0 && !exaequo,
      });
    }
    setCorresp(sortie);
    setEtat("");
  }

  const retenues = corresp.filter((c) => c.athleteId);

  function appliquer() {
    demarrer(async () => {
      let ok = 0;
      let economise = 0;
      const echecs: string[] = [];
      for (const [i, c] of retenues.entries()) {
        setEtat(`Envoi ${i + 1} / ${retenues.length}…`);
        try {
          // Chaque image est réduite avant de partir : dix photos de
          // téléphone d'affilée, c'est vingt mégaoctets sur le réseau de la
          // salle, et un refus `413` à la première.
          const { fichier, avant, apres } = await preparerImage(
            c.fichier,
            "portrait",
          );
          economise += avant - apres;
          const fd = new FormData();
          fd.set("fichier", fichier);
          const r = await televerserPhoto(c.athleteId, fd);
          if (r.ok) ok++;
          else echecs.push(`${c.fichier.name} : ${r.erreur ?? "refusée"}`);
        } catch {
          echecs.push(`${c.fichier.name} : envoi impossible`);
        }
      }
      setEtat(
        echecs.length === 0
          ? `${ok} photo(s) enregistrée(s)` +
              (economise > 0 ? `, ${poidsLisible(economise)} économisés.` : ".")
          : `${ok} enregistrée(s). ${echecs.join(" · ")}`,
      );
      if (echecs.length === 0) setCorresp([]);
    });
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
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Correspondance des photos
        </div>
        <button
          type="button"
          title="Abandonner cet import de photos"
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
      <div style={{ fontSize: 13, color: C.encre3, marginBottom: 14 }}>
        Vérifiez à qui va chaque photo. Le rapprochement se fait sur le nom du
        fichier : « kone-ibrahim.jpg » trouve KONÉ Ibrahim.
      </div>

      {corresp.length === 0 ? (
        <label
          title="Déposez toutes les photos en une fois"
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
          Choisir les photos
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) rapprocher(e.target.files);
            }}
          />
        </label>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {corresp.map((c, i) => (
          <div
            key={c.fichier.name + i}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: 10,
              border: `1px solid ${C.bordure}`,
              borderRadius: 11,
            }}
          >
            <div
              style={{
                width: 44,
                height: 54,
                borderRadius: 7,
                border: `1px solid ${C.bordure2}`,
                backgroundColor: C.papier2,
                backgroundImage: `url("${c.apercu}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                flex: "none",
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: C.encre3 }}>
                {c.fichier.name}
              </div>
              <select
                value={c.athleteId}
                title="À qui appartient cette photo ?"
                onChange={(e) =>
                  setCorresp((t) =>
                    t.map((x, j) =>
                      j === i
                        ? { ...x, athleteId: e.target.value, devine: false }
                        : x,
                    ),
                  )
                }
                style={styleChamp({ marginTop: 5, padding: "9px 11px" })}
              >
                <option value="">— Ne pas utiliser —</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {nomComplet(a)}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                flex: "none",
                color: !c.athleteId
                  ? C.encre4
                  : c.devine
                    ? C.orangeFonce
                    : C.vert,
              }}
            >
              {!c.athleteId
                ? "À attribuer"
                : c.devine
                  ? "Deviné — à vérifier"
                  : "Choisi"}
            </div>
          </div>
        ))}
      </div>

      {corresp.length > 0 ? (
        <button
          type="button"
          title="Enregistre les photos sur les fiches désignées"
          onClick={appliquer}
          disabled={retenues.length === 0}
          style={styleBouton("vert", {
            marginTop: 14,
            padding: "12px 20px",
            fontSize: 15,
            opacity: retenues.length === 0 ? 0.5 : 1,
          })}
        >
          Appliquer les {retenues.length} photo(s)
        </button>
      ) : null}

      {etat ? (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            color: C.encre2,
            lineHeight: 1.45,
          }}
        >
          {etat}
        </div>
      ) : null}
    </div>
  );
}
