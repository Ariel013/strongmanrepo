import { redirect } from "next/navigation";

/**
 * Le logiciel d'origine n'avait pas de page d'accueil publique : il s'ouvrait
 * directement sur la connexion, puis sur l'accueil du championnat. On garde
 * cette porte unique — le middleware renvoie vers `/connexion` si la session
 * n'est pas ouverte.
 *
 * Les écrans du mur LED (`/ecran/*`) et le mode d'emploi (`/aide`) restent
 * accessibles sans passer par ici.
 */
export default function Racine() {
  redirect("/admin");
}
