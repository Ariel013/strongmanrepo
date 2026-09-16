"use client";

import { useEffect, useState } from "react";
import { C, clubAffiche, initiales, nomComplet } from "@/lib/charte";
import type { AthletePublic } from "@/lib/donnees";

/** Les engagés défilent dix par dix, en changeant toutes les dix secondes. */
const PAR_PAGE = 10;
const DUREE_PAGE_MS = 10000;

/**
 * La colonne des athlètes engagés, sur l'écran d'attente.
 *
 * Le défilement tourne dans le navigateur : rendu côté serveur, il dépendrait
 * du rafraîchissement de la page et sauterait des pages entières. Ici, chaque
 * écran tourne à son rythme mais tous montrent bien toute la liste.
 */
export function Engages({
  athletes,
  second,
  bord,
  carte,
}: {
  athletes: AthletePublic[];
  second: string;
  bord: string;
  carte: string;
}) {
  const nbPages = Math.max(1, Math.ceil(athletes.length / PAR_PAGE));
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (nbPages <= 1) return;
    const t = setInterval(
      () => setPage((p) => (p + 1) % nbPages),
      DUREE_PAGE_MS,
    );
    return () => clearInterval(t);
  }, [nbPages]);

  const depart = Math.min(page, nbPages - 1) * PAR_PAGE;
  const visibles = athletes.slice(depart, depart + PAR_PAGE);

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "1.5vw",
          alignItems: "center",
          marginBottom: "1.5vh",
          flex: "none",
        }}
      >
        <div
          style={{
            fontSize: "2.4vh",
            fontWeight: 600,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: second,
          }}
        >
          {nbPages > 1
            ? `Athlètes engagés · ${depart + 1}–${Math.min(
                athletes.length,
                depart + PAR_PAGE,
              )} sur ${athletes.length}`
            : `Athlètes engagés · ${athletes.length}`}
        </div>
        {nbPages > 1 ? (
          <div
            style={{
              display: "flex",
              gap: "0.6vw",
              alignItems: "center",
              marginLeft: "auto",
            }}
          >
            {Array.from({ length: nbPages }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === page ? "4vw" : "1.4vw",
                  height: "0.7vh",
                  borderRadius: 999,
                  background: i === page ? C.orange : "rgba(154,167,158,.35)",
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          gap: "0.4vh",
        }}
      >
        {visibles.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              gap: "1.4vw",
              alignItems: "center",
              padding: "0.7vh 0",
              borderBottom: `1px solid ${bord}`,
            }}
          >
            <div
              style={{
                width: "5.2vh",
                height: "6.4vh",
                borderRadius: "0.7vh",
                border: `1px solid ${bord}`,
                backgroundColor: carte,
                backgroundImage: a.photoUrl ? `url("${a.photoUrl}")` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2vh",
                fontWeight: 700,
                color: second,
                flex: "none",
                overflow: "hidden",
              }}
            >
              {a.photoUrl ? null : initiales(a)}
            </div>
            <div
              style={{
                width: "3.6vw",
                fontSize: "2.8vh",
                fontWeight: 700,
                color: C.orange,
                flex: "none",
              }}
            >
              {a.dossard ?? "—"}
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: "2.8vh",
                fontWeight: 600,
                overflowWrap: "anywhere",
              }}
            >
              {nomComplet(a)}
            </div>
            <div style={{ fontSize: "2vh", color: second, flex: "none" }}>
              {clubAffiche(a.club)}
            </div>
          </div>
        ))}
        {athletes.length === 0 ? (
          <div style={{ fontSize: "2.6vh", color: second }}>
            Aucun dossard attribué pour l&apos;instant.
          </div>
        ) : null}
      </div>
    </>
  );
}
