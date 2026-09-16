import { C } from "@/lib/charte";
import { Bandeau, Conteneur } from "@/components/chrome";
import { seDeconnecter } from "../connexion/actions";

/**
 * Rien n'est prérendu sous `/admin`.
 *
 * Sans cela, Next fige ces pages au moment du build : la table de marque
 * verrait la liste des athlètes telle qu'elle était à la compilation, et une
 * pesée validée n'apparaîtrait jamais. Sur un outil qui suit une compétition
 * en direct, la fraîcheur prime sur la vitesse de rendu.
 */
export const dynamic = "force-dynamic";

/** Les deux actions de droite du bandeau, comme sur le poste d'origine. */
function Actions() {
  return (
    <>
      <form action={seDeconnecter}>
        <button
          type="submit"
          title="Fermer la session et revenir à l'écran de connexion"
          style={{
            padding: "8px 13px",
            borderRadius: 9,
            border: "1px solid rgba(252,250,246,.22)",
            background: "transparent",
            color: "#9AA79E",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Fermer la session
        </button>
      </form>
      <a
        href="/api/admin/export"
        title="Télécharge le fichier de sauvegarde à conserver hors du poste : clé USB, second ordinateur. À faire avant la compétition et après chaque épreuve."
        style={{
          padding: "10px 16px",
          borderRadius: 9,
          border: "1px solid rgba(252,250,246,.28)",
          background: "rgba(252,250,246,.08)",
          color: C.papier,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Exporter la sauvegarde
      </a>
    </>
  );
}

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <Conteneur>
      <Bandeau actions={<Actions />} />
      {children}
    </Conteneur>
  );
}
