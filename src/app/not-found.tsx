import Link from "next/link";

/** Page absente : dire où aller plutôt qu'un « 404 » nu. */
export default function PageIntrouvable() {
  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif", color: "#141210", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 24 }}>Cette page n&apos;existe pas</h1>
      <p style={{ color: "#4A443B" }}>
        L&apos;adresse est peut-être mal recopiée. Les écrans publics sont sous{" "}
        <code>/ecran/…</code>, l&apos;administration sous <code>/admin</code>.
      </p>
      <p style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Link href="/">Accueil</Link>
        <Link href="/aide">Mode d&apos;emploi</Link>
        <Link href="/admin">Administration</Link>
      </p>
    </div>
  );
}
