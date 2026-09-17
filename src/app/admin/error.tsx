"use client";

/**
 * Frontière d'erreur de l'administration : une page qui tombe dit ce qui
 * s'est passé et ce qu'on fait, au lieu du message générique de Next. Le
 * détail technique reste dans les journaux du serveur, pas à l'écran.
 */
export default function ErreurAdmin({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: "60px auto",
        padding: "24px 28px",
        borderRadius: 14,
        background: "#FFFFFF",
        border: "1px solid #E7E1D6",
        color: "#141210",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Cette page n&apos;a pas pu s&apos;afficher
      </div>
      <p style={{ margin: "0 0 14px", color: "#4A443B" }}>
        Le serveur n&apos;a pas répondu correctement — le plus souvent une base
        de données momentanément injoignable ou une session expirée. Rien de ce
        qui a été validé n&apos;est perdu.
      </p>
      <ol style={{ margin: "0 0 18px 20px", color: "#4A443B" }}>
        <li>Réessayez avec le bouton ci-dessous.</li>
        <li>Si l&apos;erreur revient, reconnectez-vous.</li>
        <li>
          Si elle persiste, ouvrez <code>/api/sante</code> : la page dit ce qui
          manque au déploiement.
        </li>
      </ol>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={reset}
          style={{ padding: "11px 18px", borderRadius: 9, border: "none", background: "#0B9237", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}
        >
          Réessayer
        </button>
        <a href="/connexion" style={{ padding: "11px 18px", borderRadius: 9, border: "1px solid #DDD6C9", background: "#FFFFFF", color: "#141210", fontWeight: 600 }}>
          Se reconnecter
        </a>
        <a href="/admin" style={{ padding: "11px 18px", borderRadius: 9, border: "1px solid #DDD6C9", background: "#FFFFFF", color: "#141210", fontWeight: 600 }}>
          Accueil de l&apos;administration
        </a>
      </div>
    </div>
  );
}
