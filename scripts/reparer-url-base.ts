/**
 * Encode le mot de passe contenu dans DATABASE_URL.
 *
 *   pnpm exec tsx scripts/reparer-url-base.ts
 *
 * Un mot de passe de base contient souvent `#`, `&`, `/` ou `?`. Dans une URL,
 * ces caractères ont un sens : `#` ouvre un fragment, `&` sépare des
 * paramètres. Non encodés, ils tronquent l'adresse — le symptôme est un
 * « Invalid URL » qui ne dit pas d'où il vient.
 *
 * Le script réécrit `.env` en place après sauvegarde. Il n'affiche jamais le
 * mot de passe, ni avant, ni après.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const CHEMIN = ".env";

function principal() {
  if (!existsSync(CHEMIN)) {
    console.error(`✗ Aucun fichier ${CHEMIN}.`);
    process.exit(1);
  }
  const contenu = readFileSync(CHEMIN, "utf8");
  const lignes = contenu.split("\n");
  const index = lignes.findIndex((l) => l.startsWith("DATABASE_URL="));
  if (index < 0) {
    console.error("✗ Aucune ligne DATABASE_URL.");
    process.exit(1);
  }

  const brut = lignes[index]
    .slice("DATABASE_URL=".length)
    .trim()
    .replace(/^["']|["']$/g, "");

  // On découpe à la main : `new URL` échoue précisément sur ce qu'on répare.
  const m = brut.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.*)@([^@]+)$/);
  if (!m) {
    console.error(
      "✗ Format non reconnu. Attendu : postgresql://utilisateur:motdepasse@hote:port/base",
    );
    process.exit(1);
  }
  const [, schema, utilisateur, motDePasse, reste] = m;

  // Déjà encodé ? On ne ré-encode pas : `%23` deviendrait `%2523`.
  const dejaEncode = /%[0-9A-Fa-f]{2}/.test(motDePasse);
  const encode = dejaEncode ? motDePasse : encodeURIComponent(motDePasse);

  if (encode === motDePasse) {
    console.log("Le mot de passe ne demandait aucun encodage. Rien n'a changé.");
    return;
  }

  const nouvelle = `${schema}${encodeURIComponent(utilisateur)}:${encode}@${reste}`;
  try {
    const u = new URL(nouvelle);
    console.log(`✓ URL désormais valide — hôte : ${u.hostname}`);
  } catch (e) {
    console.error("✗ Toujours invalide après encodage :", (e as Error).message);
    process.exit(1);
  }

  copyFileSync(CHEMIN, `${CHEMIN}.avant-encodage`);
  lignes[index] = `DATABASE_URL="${nouvelle}"`;
  writeFileSync(CHEMIN, lignes.join("\n"), "utf8");
  console.log(
    `✓ ${CHEMIN} mis à jour (copie de l'ancien dans ${CHEMIN}.avant-encodage).`,
  );
  console.log(
    "  Reportez cette même valeur encodée dans les variables Vercel.",
  );
}

principal();
