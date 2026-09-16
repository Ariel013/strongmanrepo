/**
 * Authentification de l'espace d'administration.
 *
 * Trois règles tiennent tout ce fichier :
 *
 * 1. Le secret ne descend JAMAIS côté client. Le navigateur ne reçoit qu'un
 *    cookie de session signé ; il n'a aucun moyen de retrouver le mot de passe,
 *    ni de forger un cookie valide sans la clé serveur.
 *
 * 2. Le mot de passe n'est pas stocké en clair, même côté serveur. On garde
 *    une empreinte PBKDF2 salée dans `ADMIN_PASSWORD_HASH`. Qui lirait les
 *    variables d'environnement Vercel n'obtiendrait pas le mot de passe.
 *
 * 3. Tout est en Web Crypto, donc le même code fonctionne dans le middleware
 *    (runtime Edge) et dans les routes (runtime Node). Pas de branche
 *    conditionnelle sur l'environnement — une branche, c'est un trou.
 */

const encodeur = new TextEncoder();

/** Durée de validité d'une session. Une compétition tient dans la journée. */
const DUREE_SESSION_S = 12 * 60 * 60;

export const NOM_COOKIE = "sm_session";

export interface Session {
  role: "admin";
  /** Émise le (secondes Unix). */
  iat: number;
  /** Expire le (secondes Unix). */
  exp: number;
}

/* ── Base64 URL, sans dépendance ──────────────────────────────────────── */

function versBase64Url(octets: Uint8Array): string {
  let binaire = "";
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function depuisBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const binaire = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
  const out = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) out[i] = binaire.charCodeAt(i);
  return out;
}

/**
 * Comparaison à temps constant.
 *
 * Un `===` sur des secrets fuit leur contenu : il s'arrête au premier octet
 * différent, et la durée de l'appel renseigne l'attaquant caractère par
 * caractère. Ici la boucle parcourt toujours toute la longueur.
 */
function egalitéConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* ── Empreinte du mot de passe ────────────────────────────────────────── */

const ITERATIONS = 210_000; // recommandation OWASP pour PBKDF2-SHA256

async function pbkdf2(
  motDePasse: string,
  sel: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const cle = await crypto.subtle.importKey(
    "raw",
    encodeur.encode(motDePasse),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: sel as BufferSource, iterations, hash: "SHA-256" },
    cle,
    256,
  );
  return new Uint8Array(bits);
}

/**
 * Fabrique l'empreinte à déposer dans `ADMIN_PASSWORD_HASH`.
 * Format : `pbkdf2$<iterations>$<sel>$<empreinte>`.
 */
export async function empreinteMotDePasse(motDePasse: string): Promise<string> {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const empreinte = await pbkdf2(motDePasse, sel, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${versBase64Url(sel)}$${versBase64Url(empreinte)}`;
}

/**
 * Vérifie un mot de passe contre l'empreinte configurée.
 *
 * Rend `false` — jamais une exception détaillée — si l'empreinte est absente
 * ou malformée : un message d'erreur précis renseignerait l'attaquant sur
 * l'état de la configuration.
 */
export async function motDePasseValide(motDePasse: string): Promise<boolean> {
  const stocke = process.env.ADMIN_PASSWORD_HASH;
  if (!stocke) return false;
  const parts = stocke.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  try {
    const sel = depuisBase64Url(parts[2]);
    const attendu = depuisBase64Url(parts[3]);
    const calcule = await pbkdf2(motDePasse, sel, iterations);
    return egalitéConstante(calcule, attendu);
  } catch {
    return false;
  }
}

/* ── Cookie de session signé ──────────────────────────────────────────── */

async function cleHmac(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  // Pas de valeur de repli : un secret par défaut rendrait toutes les
  // installations forgeables par quiconque a lu le dépôt.
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET manquant ou trop court (32 caractères minimum).",
    );
  }
  return crypto.subtle.importKey(
    "raw",
    encodeur.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Émet un jeton de session signé. */
export async function creerSession(): Promise<string> {
  const maintenant = Math.floor(Date.now() / 1000);
  const session: Session = {
    role: "admin",
    iat: maintenant,
    exp: maintenant + DUREE_SESSION_S,
  };
  const charge = versBase64Url(encodeur.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await cleHmac(),
    encodeur.encode(charge),
  );
  return `${charge}.${versBase64Url(new Uint8Array(signature))}`;
}

/**
 * Relit un jeton et rend la session, ou `null`.
 *
 * L'ordre compte : on vérifie la signature AVANT de faire confiance au
 * contenu. Lire la charge utile d'abord reviendrait à traiter une donnée
 * fournie par l'attaquant comme si elle était nôtre.
 */
export async function lireSession(jeton: string | undefined): Promise<Session | null> {
  if (!jeton) return null;
  const point = jeton.lastIndexOf(".");
  if (point <= 0) return null;
  const charge = jeton.slice(0, point);
  const signature = jeton.slice(point + 1);
  try {
    const valide = await crypto.subtle.verify(
      "HMAC",
      await cleHmac(),
      depuisBase64Url(signature) as BufferSource,
      encodeur.encode(charge),
    );
    if (!valide) return null;
    const session = JSON.parse(
      new TextDecoder().decode(depuisBase64Url(charge)),
    ) as Session;
    if (session.role !== "admin") return null;
    if (typeof session.exp !== "number") return null;
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

/** Options du cookie de session — verrouillées, identiques partout. */
export function optionsCookie() {
  return {
    httpOnly: true, // inaccessible au JavaScript de la page
    secure: process.env.NODE_ENV === "production", // HTTPS uniquement en ligne
    sameSite: "lax" as const, // bloque les envois depuis un autre site
    path: "/",
    maxAge: DUREE_SESSION_S,
  };
}
