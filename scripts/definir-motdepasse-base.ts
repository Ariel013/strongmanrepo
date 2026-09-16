/**
 * Met à jour le mot de passe dans DATABASE_URL, sans l'exposer.
 *
 *   pnpm run db:motdepasse
 *
 * La saisie est masquée : le mot de passe n'apparaît ni à l'écran, ni dans
 * l'historique du shell, ni dans les journaux. Il est encodé automatiquement —
 * un `#` ou un `&` non encodé tronque l'URL et produit un « Invalid URL »
 * dont la cause est introuvable.
 *
 * Le reste de l'adresse (hôte, port, utilisateur, base) est conservé tel quel.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const CHEMIN = ".env";

function demanderMasque(question: string): Promise<string> {
  return new Promise((resoudre) => {
    const lecteur = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const sortie = process.stdout;
    const ecrireOriginal = sortie.write.bind(sortie);
    let masquer = false;
    // Remplacement volontaire et temporaire de la sortie standard.
    sortie.write = ((bloc: string, ...reste: unknown[]) => {
      if (masquer && typeof bloc === "string" && !bloc.includes(question)) {
        return true;
      }
      return (ecrireOriginal as (...a: unknown[]) => boolean)(bloc, ...reste);
    }) as typeof sortie.write;
    lecteur.question(question, (reponse) => {
      masquer = false;
      sortie.write = ecrireOriginal;
      sortie.write("\n");
      lecteur.close();
      resoudre(reponse);
    });
    masquer = true;
  });
}

async function principal() {
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
  const m = brut.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@(.+)$/);
  if (!m) {
    console.error("✗ URL existante illisible.");
    process.exit(1);
  }
  const [, utilisateur, , reste] = m;

  console.log(`Utilisateur : ${decodeURIComponent(utilisateur)}`);
  console.log(`Serveur     : ${reste}\n`);

  const motDePasse = await demanderMasque("Mot de passe de la base : ");
  if (!motDePasse.trim()) {
    console.error("✗ Saisie vide. Rien n'a changé.");
    process.exit(1);
  }

  const nouvelle = `postgresql://${utilisateur}:${encodeURIComponent(motDePasse)}@${reste}`;
  try {
    new URL(nouvelle);
  } catch (e) {
    console.error("✗ URL invalide :", (e as Error).message);
    process.exit(1);
  }

  copyFileSync(CHEMIN, `${CHEMIN}.avant-motdepasse`);
  lignes[index] = `DATABASE_URL="${nouvelle}"`;
  writeFileSync(CHEMIN, lignes.join("\n"), "utf8");
  console.log("✓ .env mis à jour. Testez avec : pnpm run db:verifier");
}

principal();
