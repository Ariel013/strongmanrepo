/**
 * L'âge d'un athlète, calculé — jamais stocké.
 *
 * On le compte **au jour de la compétition**, pas au jour où l'on regarde
 * l'écran : c'est la règle sportive, et c'est ce qui évite qu'une fiche change
 * d'âge entre la pesée et le podium parce qu'un anniversaire tombe ce
 * jour-là.
 */

/** Années révolues entre une naissance et une date de référence. */
export function ageA(naissance: Date, reference: Date): number {
  let age = reference.getFullYear() - naissance.getFullYear();
  const anniversairePasse =
    reference.getMonth() > naissance.getMonth() ||
    (reference.getMonth() === naissance.getMonth() &&
      reference.getDate() >= naissance.getDate());
  if (!anniversairePasse) age--;
  return age;
}

/**
 * Lit une date de naissance venue de la base (`YYYY-MM-DD`) et rend l'âge à
 * la date de la compétition — ou `null` si l'une des deux manque.
 */
export function ageDe(
  dateNaissance: string | null,
  jourCompetition: Date | null,
): number | null {
  if (!dateNaissance) return null;
  const [a, m, j] = dateNaissance.split("-").map(Number);
  if (!a || !m || !j) return null;
  const naissance = new Date(a, m - 1, j);
  return ageA(naissance, jourCompetition ?? new Date());
}
