/**
 * Bascule DATABASE_URL de la connexion directe vers le pooler Supabase.
 *
 *   pnpm exec tsx scripts/basculer-pooler.ts <hote-pooler> [port]
 *
 * Pourquoi le pooler : l'adresse directe `db.<ref>.supabase.co` ne résout
 * qu'en IPv6, injoignable depuis WSL2. Et en serverless, chaque invocation
 * ouvrirait sa propre connexion à la base — le pooler est le bon choix, pas
 * un contournement.
 *
 * Le mot de passe est repris de l'URL existante et réencodé. Il n'est ni
 * affiché, ni journalisé, ni demandé.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const CHEMIN = ".env";

function principal() {
  const hote = process.argv[2];
  const port = process.argv[3] ?? "6543";
  if (!hote) {
    console.error(
      "Usage : tsx scripts/basculer-pooler.ts <hote-pooler> [port]\n" +
        "Exemple : ... aws-1-eu-west-1.pooler.supabase.com 6543",
    );
    process.exit(1);
  }
  if (!existsSync(CHEMIN)) {
    console.error(`✗ Aucun fichier ${CHEMIN}.`);
    process.exit(1);
  }

  const lignes = readFileSync(CHEMIN, "utf8").split("\n");
  const index = lignes.findIndex((l) => l.startsWith("DATABASE_URL="));
  if (index < 0) {
    console.error("✗ Aucune ligne DATABASE_URL.");
    process.exit(1);
  }

  const brut = lignes[index]
    .slice("DATABASE_URL=".length)
    .trim()
    .replace(/^["']|["']$/g, "");

  const m = brut.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^@/]+)(\/.*)?$/);
  if (!m) {
    console.error("✗ URL existante illisible. Recollez-la depuis Supabase.");
    process.exit(1);
  }
  const [, utilisateurBrut, motDePasse, ancienHote, chemin] = m;

  // L'identifiant du projet se lit dans l'ancien hôte : db.<ref>.supabase.co
  const ref = ancienHote.match(/^db\.([a-z0-9]+)\.supabase\.co/i)?.[1];
  const utilisateur =
    utilisateurBrut.includes(".") || !ref
      ? utilisateurBrut // déjà au format pooler
      : `${utilisateurBrut}.${ref}`;

  // Le mot de passe vient d'une URL : il est déjà encodé. On le décode avant
  // de le réencoder, sinon un `%23` deviendrait `%2523`.
  let clair: string;
  try {
    clair = decodeURIComponent(motDePasse);
  } catch {
    clair = motDePasse;
  }

  const nouvelle = `postgresql://${utilisateur}:${encodeURIComponent(clair)}@${hote}:${port}${chemin || "/postgres"}`;

  try {
    const u = new URL(nouvelle);
    console.log(`✓ URL valide — hôte : ${u.hostname}:${u.port}`);
    console.log(`  utilisateur : ${decodeURIComponent(u.username)}`);
  } catch (e) {
    console.error("✗ URL invalide :", (e as Error).message);
    process.exit(1);
  }

  copyFileSync(CHEMIN, `${CHEMIN}.avant-pooler`);
  lignes[index] = `DATABASE_URL="${nouvelle}"`;
  writeFileSync(CHEMIN, lignes.join("\n"), "utf8");
  console.log(`✓ ${CHEMIN} mis à jour.`);
}

principal();
