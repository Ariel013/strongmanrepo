/**
 * Vérifie que la base est joignable et dit ce qu'elle contient.
 *
 *   pnpm run db:verifier
 *
 * N'affiche jamais l'URL ni le mot de passe : seulement l'hôte et le nom de
 * la base, de quoi confirmer qu'on parle bien au bon serveur.
 */

import postgres from "postgres";

async function principal() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL absent de l'environnement.");
    process.exit(1);
  }

  let hote: string;
  let base: string;
  try {
    const u = new URL(url);
    hote = u.hostname;
    base = u.pathname.slice(1) || "(défaut)";
  } catch (e) {
    console.error(
      "✗ DATABASE_URL malformé :",
      (e as Error).message,
      "\n  Vérifiez que la ligne est entière et entourée de guillemets.",
    );
    process.exit(1);
  }
  console.log(`URL lisible — hôte : ${hote} | base : ${base}`);

  const sql = postgres(url, { connect_timeout: 15, max: 1 });
  try {
    const [info] = await sql<{ base: string }[]>`select current_database() as base`;
    console.log(`✓ Connexion établie sur « ${info.base} »`);

    const tables = await sql<{ nom: string }[]>`
      select table_name as nom from information_schema.tables
      where table_schema = 'public' order by table_name`;
    if (tables.length === 0) {
      console.log("  Aucune table : la base est vierge, prête à migrer.");
    } else {
      console.log(`  ${tables.length} table(s) : ${tables.map((t) => t.nom).join(", ")}`);
    }
  } catch (e) {
    console.error("✗ Connexion refusée :", (e as Error).message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

principal();
