"use client";

/**
 * Dernier filet : une erreur dans la mise en page racine elle-même. Il doit
 * rendre son propre <html>, puisque celui de l'application est tombé.
 */
export default function ErreurGlobale({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FCFAF6", color: "#141210" }}>
        <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 20px", lineHeight: 1.5 }}>
          <h1 style={{ fontSize: 24 }}>Le logiciel n&apos;a pas pu démarrer cette page</h1>
          <p style={{ color: "#4A443B" }}>
            Réessayez. Si le message revient, ouvrez <code>/api/sante</code> :
            il dit ce qui manque au déploiement.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "11px 18px", borderRadius: 9, border: "none", background: "#0B9237", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
