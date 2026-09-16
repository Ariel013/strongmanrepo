/**
 * Diagnostique un échec d'authentification sur DATABASE_URL.
 *
 *   pnpm exec tsx --env-file=.env scripts/diagnostiquer-base.ts
 *
 * Un mot de passe contenant `%` pose un piège : dans une URL, `%` introduit
 * un caractère encodé. Écrit brut, `mon%mot` devient illisible ou se décode
 * en autre chose. Le script essaie les deux lectures — telle quelle, puis
 * avec le `%` échappé — et dit laquelle le serveur accepte.
 *
 * Aucune valeur secrète n'est affichée : seulement quelle variante fonctionne.
 */

import postgres from "postgres";

async function essayer(nom: string, url: string): Promise<boolean> {
  const sql = postgres(url, { connect_timeout: 15, max: 1 });
  try {
    await sql`select 1`;
    console.log(`✓ ${nom} : acceptée`);
    return true;
  } catch (e) {
    const msg = (e as Error).message;
    console.log(`✗ ${nom} : ${msg}`);
    return false;
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

async function principal() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL absent.");
    process.exit(1);
  }

  const m = url.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.*)@(.+)$/);
  if (!m) {
    console.error("✗ URL illisible.");
    process.exit(1);
  }
  const [, schema, utilisateur, motDePasse, serveur] = m;

  console.log(`Serveur : ${serveur}`);
  console.log(`Utilisateur : ${decodeURIComponent(utilisateur)}\n`);

  // Variante 1 : l'URL telle qu'elle est dans le fichier.
  if (await essayer("URL telle quelle", url)) return succes();

  // Variante 2 : le `%` était littéral — on l'échappe en `%25`.
  if (motDePasse.includes("%")) {
    const echappe = motDePasse.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");
    if (echappe !== motDePasse) {
      const u2 = `${schema}${utilisateur}:${echappe}@${serveur}`;
      if (await essayer("avec % échappé", u2)) return succes("%");
    }
    // Variante 3 : tout le `%` traité comme littéral, y compris `%ab`.
    const toutEchappe = motDePasse.replace(/%/g, "%25");
    if (toutEchappe !== motDePasse && toutEchappe !== echappe) {
      const u3 = `${schema}${utilisateur}:${toutEchappe}@${serveur}`;
      if (await essayer("avec tous les % échappés", u3)) return succes("%");
    }
  }

  console.log(
    "\nAucune variante n'est acceptée. Le mot de passe ne correspond pas à\n" +
      "celui enregistré chez Supabase. Réinitialisez-le dans\n" +
      "Project Settings → Database → Reset database password,\n" +
      "puis relancez : pnpm run db:motdepasse",
  );
  process.exit(1);
}

function succes(cause?: string) {
  if (cause) {
    console.log(
      `\nLe mot de passe contient un « ${cause} » qui doit être encodé.\n` +
        "Corrigez-le une fois pour toutes avec : pnpm run db:motdepasse\n" +
        "(le script encode automatiquement ce qu'il faut).",
    );
  } else {
    console.log("\nLa connexion fonctionne.");
  }
  process.exit(0);
}

principal();
