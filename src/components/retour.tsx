"use client";

import { useRouter } from "next/navigation";
import { C } from "@/lib/charte";

/**
 * « ← Retour » : la page d'avant si le navigateur en a une, sinon l'accueil
 * de l'administration. Sur une tablette sans barre de navigation visible,
 * c'est le seul moyen de revenir d'une impression ou d'une étape.
 */
export function BoutonRetour() {
  const router = useRouter();
  return (
    <button
      type="button"
      title="Revenir à la page précédente"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/admin");
      }}
      style={{
        padding: "7px 13px",
        borderRadius: 8,
        border: `1px solid ${C.bordure}`,
        background: C.blanc,
        color: C.encre,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      ← Retour
    </button>
  );
}
