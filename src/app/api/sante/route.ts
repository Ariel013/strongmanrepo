/**
 * Contrôle de santé du déploiement.
 *
 *   GET /api/sante
 *
 * Sert à répondre en une requête à « pourquoi le site ne démarre pas ». En
 * production, Next masque les erreurs serveur derrière un message générique :
 * sans cette route, il faut fouiller les journaux de la plateforme.
 *
 * Ce qui est exposé est délibérément pauvre : la PRÉSENCE d'une variable,
 * jamais sa valeur ; le fait que la base réponde, jamais son adresse ni son
 * utilisateur. Un attaquant n'y apprend rien qu'il ne puisse déduire en
 * constatant que le site est en panne.
 */

import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  const variables = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
    ADMIN_PASSWORD_HASH: Boolean(process.env.ADMIN_PASSWORD_HASH),
  };

  const problemes: string[] = [];
  if (!variables.DATABASE_URL)
    problemes.push("DATABASE_URL absente : le site ne peut lire aucune donnée.");
  if (!variables.SESSION_SECRET)
    problemes.push("SESSION_SECRET absente : la connexion échouera.");
  else if ((process.env.SESSION_SECRET ?? "").length < 32)
    problemes.push("SESSION_SECRET trop courte : 32 caractères minimum.");
  if (!variables.ADMIN_PASSWORD_HASH)
    problemes.push(
      "ADMIN_PASSWORD_HASH absente : aucun code d'accès ne sera accepté.",
    );
  else if (!/^pbkdf2\$\d+\$/.test(process.env.ADMIN_PASSWORD_HASH ?? ""))
    problemes.push(
      "ADMIN_PASSWORD_HASH malformée : attendu « pbkdf2$…$…$… ». " +
        "Avez-vous collé le mot de passe au lieu de son empreinte ?",
    );

  // Détecte l'erreur de copie la plus fréquente : les guillemets repris
  // depuis le fichier .env, que la plateforme prend pour une partie de
  // l'adresse.
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith('"') || url.endsWith('"')) {
    problemes.push(
      "DATABASE_URL entourée de guillemets : retirez-les dans les variables " +
        "d'environnement de la plateforme.",
    );
  }

  let base = "non testée";
  if (variables.DATABASE_URL) {
    const sql = postgres(url.replace(/^"|"$/g, ""), {
      connect_timeout: 8,
      max: 1,
      prepare: false,
    });
    try {
      const [r] = await sql<{ n: number }[]>`select count(*)::int as n from competition`;
      base = `joignable — ${r.n} compétition(s) enregistrée(s)`;
    } catch (e) {
      const msg = (e as Error).message;
      base = "injoignable";
      if (msg.includes("password authentication")) {
        problemes.push("La base refuse le mot de passe de DATABASE_URL.");
      } else if (msg.includes("ENETUNREACH") || msg.includes("ENOTFOUND")) {
        problemes.push(
          "Base injoignable : utilisez l'adresse du pooler (port 6543), " +
            "pas l'adresse directe.",
        );
      } else if (msg.includes("does not exist")) {
        problemes.push(
          "Base joignable mais vide : les tables ne sont pas créées.",
        );
      } else {
        problemes.push("Base injoignable : " + msg.slice(0, 120));
      }
    } finally {
      await sql.end({ timeout: 3 }).catch(() => {});
    }
  }

  return Response.json(
    {
      etat: problemes.length === 0 ? "en ordre" : "configuration incomplète",
      variables,
      base,
      problemes,
    },
    {
      status: problemes.length === 0 ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
