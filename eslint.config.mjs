import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Le code du poste autonome, conservé en référence pour le portage : il
    // n'est ni compilé ni exécuté, et le corriger n'aurait aucun sens — c'est
    // la pièce à comparer, elle doit rester telle qu'elle était.
    "docs/reference/**",
  ]),
]);

export default eslintConfig;
