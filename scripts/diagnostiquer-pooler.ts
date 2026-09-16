/**
 * Cherche pourquoi le pooler Supabase refuse la connexion.
 *
 *   pnpm exec tsx --env-file=.env scripts/diagnostiquer-pooler.ts
 *
 * Essaie, dans l'ordre, les causes ordinaires d'un « password authentication
 * failed » qui n'en est pas un : espace parasite collé avec le mot de passe,
 * mauvais port (transaction 6543 / session 5432), utilisateur sans le
 * suffixe de projet. Le message renvoyé par le serveur diffère selon la
 * cause — « Tenant or user not found » désigne l'utilisateur ou la région,
 * pas le mot de passe.
 *
 * Aucun secret n'est affiché.
 */

import postgres from "postgres";

interface Essai {
  nom: string;
  url: string;
}

async function tester({ nom, url }: Essai): Promise<boolean> {
  const sql = postgres(url, { connect_timeout: 12, max: 1 });
  try {
    await sql`select 1`;
    console.log(`✓ ${nom}`);
    return true;
  } catch (e) {
    console.log(`✗ ${nom} — ${(e as Error).message}`);
    return false;
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

async function principal() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL absent.");
    process.exit(1);
  }
  const m = url.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.*)@([^:/]+):(\d+)(\/.*)$/);
  if (!m) {
    console.error("URL illisible.");
    process.exit(1);
  }
  const [, schema, utilisateur, mdpEncode, hote, port, base] = m;

  const mdp = decodeURIComponent(mdpEncode);
  const rogne = mdp.trim();

  console.log(`Hôte : ${hote}:${port}`);
  console.log(`Utilisateur : ${utilisateur}`);
  console.log(
    `Mot de passe : ${mdp.length} caractères` +
      (rogne.length !== mdp.length
        ? ` — ⚠ ${mdp.length - rogne.length} espace(s) parasite(s) détecté(s)`
        : " — pas d'espace parasite"),
  );
  console.log("");

  const fabrique = (u: string, p: string, mot: string) =>
    `${schema}${u}:${encodeURIComponent(mot)}@${hote}:${p}${base}`;

  const essais: Essai[] = [
    { nom: `tel quel (port ${port})`, url },
  ];
  if (rogne !== mdp) {
    essais.push({
      nom: "sans les espaces autour du mot de passe",
      url: fabrique(utilisateur, port, rogne),
    });
  }
  const autrePort = port === "6543" ? "5432" : "6543";
  essais.push({
    nom: `port ${autrePort} (mode ${autrePort === "5432" ? "session" : "transaction"})`,
    url: fabrique(utilisateur, autrePort, rogne),
  });

  for (const e of essais) {
    if (await tester(e)) {
      console.log("\n→ Cette variante fonctionne : reportez-la dans .env.");
      process.exit(0);
    }
  }

  console.log(
    "\nToutes les variantes échouent avec le même message.\n" +
      "Ce n'est alors ni le port, ni la mise en forme :\n" +
      "  · soit le mot de passe enregistré chez Supabase diffère de celui-ci,\n" +
      "  · soit le projet est en pause (bandeau « Restore » sur le tableau de bord).\n" +
      "Un « Tenant or user not found » aurait désigné la région ou l'utilisateur ;\n" +
      "ce n'est pas le message reçu.",
  );
  process.exit(1);
}

principal();
