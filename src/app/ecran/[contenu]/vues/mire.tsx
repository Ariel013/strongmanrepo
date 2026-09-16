/**
 * La mire de lisibilité, à régler avant l'ouverture au public.
 */

import type { Palette } from "../commun";

export function Mire({ t }: { t: Palette }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "2vh",
      }}
    >
      <div style={{ display: "flex", gap: 0, height: "8vh" }}>
        {["#EC6D23", "#FFFFFF", "#0B9237", "#03562A", "#141210", "#CB7C4A"].map(
          (c) => (
            <div key={c} style={{ flex: 1, background: c }} />
          ),
        )}
      </div>
      <div style={{ fontSize: "9vh", fontWeight: 700, lineHeight: 1 }}>
        KONÉ IBRAHIM
      </div>
      <div style={{ fontSize: "6vh", fontWeight: 700, lineHeight: 1 }}>
        KONÉ IBRAHIM
      </div>
      <div style={{ fontSize: "4vh", fontWeight: 600, lineHeight: 1 }}>
        KONÉ IBRAHIM · Iron Club Abidjan
      </div>
      <div style={{ fontSize: "2.6vh", fontWeight: 500, lineHeight: 1 }}>
        Renversement de pneu · 4 renversements · 58,2 s
      </div>
      <div style={{ fontSize: "1.8vh", color: t.second }}>
        Lisez la plus petite ligne encore nette depuis le dernier rang :
        c&apos;est votre plancher de taille de texte pour cette sortie.
      </div>
    </div>
  );
}
