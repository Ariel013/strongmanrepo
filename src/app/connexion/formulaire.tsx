"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { C } from "@/lib/charte";
import { seConnecter, type EtatConnexion } from "./actions";

/**
 * La carte de compte du fichier d'origine : on clique sur la ligne, le champ
 * de code se déplie dessous. Rien n'est saisi tant que le compte n'est pas
 * choisi — c'est ce qui évite qu'un code parte dans le mauvais champ quand
 * deux postes sont ouverts côte à côte.
 */
function Bouton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Ouvrir la session"
      style={{
        padding: "12px 20px",
        borderRadius: 10,
        border: "none",
        background: C.vert,
        color: C.blanc,
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
        opacity: pending ? 0.5 : 1,
      }}
    >
      {pending ? "Vérification…" : "Entrer"}
    </button>
  );
}

export function FormulaireConnexion({ suite }: { suite?: string }) {
  const [etat, action] = useActionState<EtatConnexion, FormData>(
    seConnecter,
    {},
  );
  const [ouvert, setOuvert] = useState(true);

  return (
    <form action={action}>
      <input type="hidden" name="suite" value={suite ?? "/admin"} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            background: C.blanc,
            border: `1px solid ${ouvert ? C.encre : C.bordure}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            title="Ouvrir la session de cette personne"
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              textAlign: "left",
              background: "transparent",
              border: "none",
              padding: "15px 18px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: 999,
                background: C.papier2,
                color: C.vertFonce,
                fontSize: 15,
                fontWeight: 700,
                flex: "none",
              }}
            >
              AD
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 600 }}>
                Administrateur du logiciel
              </span>
              <span
                style={{ display: "block", fontSize: 13, color: C.encre4 }}
              >
                Direction et table · Préparation, plateau, régie
              </span>
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.vert,
                flex: "none",
              }}
            >
              {ouvert ? "Code ci-dessous" : "Se connecter"}
            </span>
          </button>

          {ouvert ? (
            <div
              style={{
                padding: "0 18px 16px",
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                id="motdepasse"
                name="motdepasse"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                autoFocus
                required
                placeholder="Code d'accès"
                style={{
                  flex: 1,
                  minWidth: 150,
                  padding: "12px 14px",
                  border: `1px solid ${C.bordure2}`,
                  borderRadius: 10,
                  background: C.papier,
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: ".22em",
                  outline: "none",
                }}
              />
              <Bouton />
            </div>
          ) : null}
        </div>
      </div>

      {etat.erreur ? (
        // `role=alert` : le message est annoncé même si l'officiel a le regard
        // sur le plateau et non sur l'écran.
        <div
          role="alert"
          style={{
            marginTop: 14,
            padding: "12px 16px",
            borderRadius: 10,
            background: C.rougeFond,
            border: `1px solid ${C.rougeBord}`,
            color: C.rougeFonce,
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {etat.erreur}
        </div>
      ) : null}
    </form>
  );
}
