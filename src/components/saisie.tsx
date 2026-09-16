"use client";

import { useRef, useState, useTransition, type CSSProperties } from "react";
import { C } from "@/lib/charte";
import { styleBouton, styleChamp, type TonBouton } from "./ui";

/**
 * Saisie qui s'enregistre toute seule.
 *
 * Le poste d'origine écrivait dans son fichier à chaque frappe. Ici, l'écriture
 * part au serveur : on attend donc que la frappe se calme (600 ms) ou que le
 * champ soit quitté. Ce délai n'est pas un confort d'implémentation, c'est ce
 * qui évite d'envoyer douze requêtes pour saisir « Atlas Stones » pendant que
 * la compétition tourne.
 *
 * Le témoin du fil d'Ariane promet à la table que sa saisie est enregistrée :
 * un champ qui échoue le dit donc sur place, en rouge, plutôt que de laisser
 * croire que c'est écrit.
 */
export function ChampTexte({
  valeur,
  enregistrer,
  style,
  multiligne = false,
  ...reste
}: {
  valeur: string;
  enregistrer: (v: string) => Promise<{ ok: boolean; erreur?: string }>;
  style?: CSSProperties;
  multiligne?: boolean;
  placeholder?: string;
  title?: string;
  rows?: number;
  type?: string;
  inputMode?: "numeric" | "text" | "decimal";
  disabled?: boolean;
}) {
  const [v, setV] = useState(valeur);
  const [precedente, setPrecedente] = useState(valeur);
  const [erreur, setErreur] = useState("");
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, demarrer] = useTransition();

  // La valeur venue du serveur ne reprend la main que lorsqu'elle change
  // VRAIMENT : sinon, un rafraîchissement en pleine frappe effacerait ce qui
  // est tapé. Ajustement pendant le rendu plutôt que dans un effet — c'est la
  // forme recommandée, et elle évite un rendu intermédiaire à l'ancienne
  // valeur, visible comme un clignotement du champ.
  if (valeur !== precedente) {
    setPrecedente(valeur);
    setV(valeur);
  }

  const pousser = (val: string) => {
    demarrer(async () => {
      try {
        const r = await enregistrer(val);
        setErreur(r.ok ? "" : (r.erreur ?? "Enregistrement refusé."));
      } catch {
        setErreur(MESSAGE_TRANSPORT);
      }
    });
  };

  const changer = (val: string) => {
    setV(val);
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => pousser(val), 600);
  };

  const quitter = () => {
    if (minuterie.current) clearTimeout(minuterie.current);
    if (v !== valeur) pousser(v);
  };

  const commun = {
    value: v,
    onChange: (e: { target: { value: string } }) => changer(e.target.value),
    onBlur: quitter,
    style: styleChamp({
      ...style,
      borderColor: erreur ? C.rouge : undefined,
    }),
    ...reste,
  };

  return (
    <>
      {multiligne ? (
        <textarea {...commun} style={{ ...commun.style, resize: "vertical" }} />
      ) : (
        <input {...commun} />
      )}
      {erreur ? <Avertissement>{erreur}</Avertissement> : null}
    </>
  );
}

/**
 * Ce qu'on dit quand l'action n'a même pas pu répondre.
 *
 * Une Server Action qui lève — session expirée, réseau coupé, erreur serveur —
 * fait tomber TOUT l'écran sur « This page couldn't load » si personne ne
 * l'attrape. En pleine compétition, perdre le plateau parce qu'une case a mal
 * pris est hors de question : on attrape, on nomme, et le reste de la page
 * continue de vivre.
 */
const MESSAGE_TRANSPORT =
  "Le serveur n'a pas répondu. Votre session a peut-être expiré : " +
  "rechargez la page, puis réessayez.";

/** Le message rouge qui accompagne un champ refusé. */
function Avertissement({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        marginTop: 4,
        fontSize: 12,
        fontWeight: 600,
        color: C.rougeFonce,
        lineHeight: 1.4,
      }}
    >
      {children}
    </div>
  );
}

/** Le même contrat, pour un menu déroulant : le choix part immédiatement. */
export function ChoixListe({
  valeur,
  enregistrer,
  style,
  children,
  ...reste
}: {
  valeur: string;
  enregistrer: (v: string) => Promise<{ ok: boolean; erreur?: string }>;
  style?: CSSProperties;
  children: React.ReactNode;
  title?: string;
  disabled?: boolean;
}) {
  const [v, setV] = useState(valeur);
  const [precedente, setPrecedente] = useState(valeur);
  const [erreur, setErreur] = useState("");
  const [, demarrer] = useTransition();

  if (valeur !== precedente) {
    setPrecedente(valeur);
    setV(valeur);
  }

  return (
    <>
      <select
        value={v}
        onChange={(e) => {
          const val = e.target.value;
          setV(val);
          demarrer(async () => {
            try {
              const r = await enregistrer(val);
              if (r.ok) {
                setErreur("");
              } else {
                // Le serveur a refusé : on remet le choix précédent à l'écran
                // plutôt que de laisser voir une valeur qui n'est pas en base.
                setErreur(r.erreur ?? "Choix refusé.");
                setV(valeur);
              }
            } catch {
              setErreur(MESSAGE_TRANSPORT);
              setV(valeur);
            }
          });
        }}
        style={styleChamp({
          ...style,
          borderColor: erreur ? C.rouge : undefined,
        })}
        {...reste}
      >
        {children}
      </select>
      {erreur ? <Avertissement>{erreur}</Avertissement> : null}
    </>
  );
}

/**
 * Bouton qui déclenche une action serveur.
 *
 * Il se désarme pendant l'appel : sur un plateau, un double clic sur
 * « Valider la performance » enverrait deux verdicts.
 */
export function BoutonAction({
  ton,
  action,
  children,
  style,
  title,
  confirmation,
  disabled,
}: {
  ton: TonBouton;
  action: () => Promise<{ ok: boolean; erreur?: string }>;
  children: React.ReactNode;
  style?: CSSProperties;
  title?: string;
  /** Question posée avant d'agir, pour ce qui ne se rattrape pas. */
  confirmation?: string;
  disabled?: boolean;
}) {
  const [encours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");

  return (
    <>
      <button
        type="button"
        title={title}
        disabled={disabled || encours}
        onClick={() => {
          if (confirmation && !window.confirm(confirmation)) return;
          demarrer(async () => {
            try {
              const r = await action();
              setErreur(
                r.ok ? (r.erreur ?? "") : (r.erreur ?? "Action refusée."),
              );
            } catch {
              setErreur(MESSAGE_TRANSPORT);
            }
          });
        }}
        style={styleBouton(ton, {
          opacity: disabled || encours ? 0.55 : 1,
          ...style,
        })}
      >
        {children}
      </button>
      {erreur ? (
        <div
          role="alert"
          style={{
            flex: "1 1 100%",
            marginTop: 8,
            padding: "10px 12px",
            borderRadius: 9,
            background: C.rougeFond,
            border: `1px solid ${C.rougeBord}`,
            color: C.rougeFonce,
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.45,
          }}
        >
          {erreur}
        </div>
      ) : null}
    </>
  );
}

/** Interrupteur à deux états — « Épreuve à niveaux », « Invité ». */
export function Bascule({
  actif,
  enregistrer,
  libelleActif,
  libelleInactif,
  title,
  style,
}: {
  actif: boolean;
  enregistrer: (v: boolean) => Promise<{ ok: boolean; erreur?: string }>;
  libelleActif: string;
  libelleInactif: string;
  title?: string;
  style?: CSSProperties;
}) {
  const [, demarrer] = useTransition();
  return (
    <button
      type="button"
      title={title}
      aria-pressed={actif}
      onClick={() =>
        demarrer(async () => {
          try {
            await enregistrer(!actif);
          } catch {
            // Rien à afficher ici : l'interrupteur reprend simplement son
            // état précédent au rafraîchissement suivant.
          }
        })
      }
      style={{
        padding: "9px 14px",
        borderRadius: 9,
        border: `1px solid ${actif ? C.vertFonce : C.bordure2}`,
        background: actif ? C.vertFonce : C.blanc,
        color: actif ? C.blanc : C.encre3,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        flex: "none",
        ...style,
      }}
    >
      {actif ? libelleActif : libelleInactif}
    </button>
  );
}
