import { Suspense } from "react";
import { C } from "@/lib/charte";
import { Conteneur } from "@/components/chrome";
import { FormulaireConnexion } from "./formulaire";

export const metadata = {
  title: "Connexion — Arbitrage Strongman",
};

/**
 * « Qui utilise ce poste ? » — l'écran d'accueil du logiciel d'origine,
 * repris tel quel.
 *
 * Une seule différence de fond, assumée : le poste autonome proposait deux
 * comptes (administrateur, régie) parce qu'il gardait les deux codes dans son
 * propre fichier. Ici le code est vérifié par le serveur, qui n'en connaît
 * qu'un : la liste ne montre donc qu'un compte. Le bouton « Code perdu —
 * ouvrir sans connexion » du fichier d'origine n'est pas repris non plus ; il
 * n'avait de sens que sur un poste où la donnée ne quittait jamais la machine.
 */
export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite } = await searchParams;

  return (
    <Conteneur>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 0" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fibda.jpg"
            alt="FIBDA"
            style={{ width: 86, height: 86, objectFit: "contain" }}
          />
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: C.orange,
              marginTop: 12,
            }}
          >
            Championnat National de Strongman 2026
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
            Qui utilise ce poste ?
          </div>
          <div
            style={{
              fontSize: 15,
              color: C.encre2,
              lineHeight: 1.5,
              marginTop: 8,
              maxWidth: 440,
              textWrap: "pretty",
            }}
          >
            Deux accès seulement : l&apos;administrateur du logiciel et la régie
            de diffusion. Les juges, arbitres et chronométreurs n&apos;ont pas de
            code : ils travaillent sur le terrain.
          </div>
        </div>

        <Suspense>
          <FormulaireConnexion suite={suite} />
        </Suspense>

        <div
          style={{
            marginTop: 20,
            fontSize: 13,
            color: C.encre4,
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          Le code d&apos;accès est réglé sur le serveur, à l&apos;installation du
          logiciel. Les écrans du public et le mode d&apos;emploi restent
          consultables sans code.
        </div>
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <a href="/aide" style={{ fontSize: 13, color: C.vert }}>
            Mode d&apos;emploi
          </a>
        </div>
      </div>
    </Conteneur>
  );
}
