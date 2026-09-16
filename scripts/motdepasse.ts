/**
 * Fabrique l'empreinte du mot de passe d'administration.
 *
 *   pnpm run motdepasse
 *
 * Le mot de passe est demandé sans écho — il n'apparaît ni à l'écran, ni dans
 * l'historique du shell. Seule l'empreinte s'affiche : c'est elle, et elle
 * seule, qui va dans `ADMIN_PASSWORD_HASH`.
 */

import { createInterface } from "node:readline";
import { empreinteMotDePasse } from "../src/lib/auth";

/** Lit une saisie en masquant la frappe. */
function demanderMasque(question: string): Promise<string> {
  return new Promise((resoudre) => {
    const lecteur = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const sortie = process.stdout;
    // On intercepte l'écriture pour ne rien rendre visible pendant la saisie.
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
  const motDePasse = await demanderMasque("Mot de passe d'administration : ");
  const confirmation = await demanderMasque("Confirmez le mot de passe    : ");

  if (motDePasse !== confirmation) {
    console.error("\n✗ Les deux saisies diffèrent. Rien n'a été généré.");
    process.exit(1);
  }
  if (motDePasse.length < 10) {
    console.error(
      "\n✗ Mot de passe trop court : 10 caractères minimum.\n" +
        "  Ce mot de passe garde les résultats d'une compétition nationale.",
    );
    process.exit(1);
  }

  const empreinte = await empreinteMotDePasse(motDePasse);
  console.log("\nCollez cette ligne dans votre fichier .env :\n");
  console.log(`ADMIN_PASSWORD_HASH="${empreinte}"`);
  console.log(
    "\nPuis reportez la même valeur dans les variables d'environnement Vercel.",
  );
  console.log(
    "Le mot de passe lui-même n'est stocké nulle part : notez-le de votre côté.\n",
  );
}

principal();
