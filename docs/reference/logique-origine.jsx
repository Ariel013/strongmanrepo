
const CLE = "fibda-strongman-2026-prepa";
const CLE_ESSAI = "fibda-strongman-2026-essai";
let OUTILS = null;
async function outils() {
  if (!OUTILS) OUTILS = await import("./outils-liste.js");
  return OUTILS;
}
const sansAcc = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const MESURES = [
  { cle:"nb_temps", lbl:"Nombre, puis temps", aide:"la quantité classe ; à égalité, le temps intermédiaire de la dernière répétition départage" },
  { cle:"poids",    lbl:"Charge maximale (kg)", aide:"la charge la plus lourde validée l'emporte" },
  { cle:"duree",    lbl:"Temps de maintien", aide:"le temps le plus long l'emporte" },
  { cle:"distance", lbl:"Distance parcourue (m)", aide:"la distance classe ; à distance égale, le temps le plus rapide" },
  { cle:"chrono",   lbl:"Temps sur distance", aide:"le temps le plus court l'emporte" }
];

const ROLES = [
  { cle:"directeur", lbl:"Directeur de compétition" },
  { cle:"technique", lbl:"Responsable technique" },
  { cle:"arbitrage", lbl:"Responsable arbitrage" },
  { cle:"juge", lbl:"Juge principal" },
  { cle:"chrono", lbl:"Chronométreur" },
  { cle:"secretaire", lbl:"Secrétaire de table" },
  { cle:"regie", lbl:"Régie" },
  { cle:"speaker", lbl:"Speaker" }
];

const PAYS = {
  CIV:{ n:"Côte d'Ivoire", c:["#EC6D23","#FFFFFF","#0B9237"] },
  BEN:{ n:"Bénin", c:["#0B9237","#FCD116","#E8112D"] },
  BFA:{ n:"Burkina Faso", c:["#EF2B2D","#EF2B2D","#009E49"] },
  CMR:{ n:"Cameroun", c:["#007A5E","#CE1126","#FCD116"] },
  FRA:{ n:"France", c:["#002395","#FFFFFF","#ED2939"] },
  GHA:{ n:"Ghana", c:["#CE1126","#FCD116","#006B3F"] },
  GIN:{ n:"Guinée", c:["#CE1126","#FCD116","#009460"] },
  MAR:{ n:"Maroc", c:["#C1272D","#C1272D","#006233"] },
  MLI:{ n:"Mali", c:["#14B53A","#FCD116","#CE1126"] },
  NGA:{ n:"Nigéria", c:["#008751","#FFFFFF","#008751"] },
  SEN:{ n:"Sénégal", c:["#00853F","#FDEF42","#E31B23"] },
  TGO:{ n:"Togo", c:["#006A4E","#FFCE00","#D21034"] },
  USA:{ n:"États-Unis", c:["#B22234","#FFFFFF","#3C3B6E"] },
  ISL:{ n:"Islande", c:["#02529C","#FFFFFF","#DC1E35"] }
};

const BANDES = ["#EC6D23","#0B9237","#141210","#CB7C4A","#03562A"];

function epreuvesOfficielles() {
  return [
    { id:"ep1", nom:"Atlas Stones", mesure:"nb_temps", temps:"60 s", essais:"1", passage:"groupe", tours:true,
      critere:"Nombre de pierres validées dans le temps imparti ; à égalité, le temps intermédiaire de la dernière pierre chargée",
      materiel:"4 boules (2 de 120 kg, 2 de 90 kg), 4 barrières métalliques",
      equipements:"Genouillères, ceinture de force" },
    { id:"ep2", nom:"Renversement de pneu", mesure:"nb_temps", temps:"60 s", essais:"1", passage:"groupe", tours:true,
      critere:"Nombre de renversements réussis dans le temps imparti ; à égalité, le temps intermédiaire du dernier renversement",
      materiel:"2 pneus (300 kg et 200 kg)",
      equipements:"Ceinture de force, genouillères, gants ou magnésie" },
    { id:"ep3", nom:"Deadlift voiture", mesure:"nb_temps", temps:"60 s", essais:"3", passage:"groupe", tours:true,
      critere:"Nombre de levées validées avec verrouillage (maintien 2 secondes minimum) ; à égalité, le temps intermédiaire de la dernière levée",
      materiel:"2 voitures, cadre métallique à pivot",
      equipements:"Sangles de tirage, magnésie" },
    { id:"ep4", nom:"Piliers d'Hercule", mesure:"duree", temps:"Illimité", essais:"1", passage:"groupe", tours:true,
      niveau:true, niveauxOptions:"Niveau 1 — prise basse, Niveau 2 — prise médiane, Niveau 3 — prise haute",
      critere:"Temps de maintien en isométrie (le plus long temps l'emporte)",
      materiel:"2 piliers métalliques de 150 kg chacun",
      equipements:"Magnésie, ceinture de force, genouillères et coudières, chaussures plates rigides" },
    { id:"ep5", nom:"Tirage de camion", mesure:"distance", temps:"90 s", essais:"1", passage:"groupe", tours:false,
      critere:"Distance parcourue dans le temps imparti, mesurée de la ligne de départ à la marque du pneu avant ; à distance égale, le temps le plus rapide",
      materiel:"1 camion, 1 corde de stabilisation, 1 harnais",
      equipements:"Chaussures à forte traction, manchons, ceinture de force" }
  ];
}

const MOIS_FR = { janvier:0, fevrier:1, "février":1, mars:2, avril:3, mai:4, juin:5, juillet:6,
  aout:7, "août":7, septembre:8, octobre:9, novembre:10, "décembre":11, decembre:11 };
function dateCible(champ) {
  if (!champ) return null;
  const m = String(champ.date || "").toLowerCase().match(/(\d{1,2})\s+([a-zéûîà]+)\s+(\d{4})/);
  if (!m) return null;
  const mois = MOIS_FR[m[2]];
  if (mois == null) return null;
  const h = String(champ.heure || "").match(/(\d{1,2})\s*h\s*(\d{2})?/);
  return new Date(parseInt(m[3], 10), mois, parseInt(m[1], 10),
    h ? parseInt(h[1], 10) : 0, h && h[2] ? parseInt(h[2], 10) : 0, 0);
}

const ROLES_LBL = { directeur:"Directeur de compétition", technique:"Responsable technique",
  arbitrage:"Responsable arbitrage", juge:"Juge principal", chrono:"Chronométreur",
  secretaire:"Secrétaire de table", regie:"Régie", speaker:"Speaker" };
const DROITS = { directeur:"tout", technique:"tout", arbitrage:"tout", secretaire:"tout",
  juge:"plateau", chrono:"plateau", speaker:"plateau", regie:"regie" };

function parseDuree(txt) {
  const m = String(txt || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}
function mmss(sec) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  const d = Math.floor((s * 10) % 10);
  return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r + "," + d;
}

function etatVide() {
  return {
    champ: {
      nom: "Championnat National de Strongman 2026",
      date: "Samedi 19 Septembre 2026",
      heure: "14h00",
      fin: "23h00",
      lieu: "Espace pétanque Sococé",
      adresse: "Deux Plateaux, boulevard Latrille, Abidjan"
    },
    comp: { epreuveId: null, groupeId: null, suspendu: false, motif: "" },
    passages: [],
    ecrans: [
      { id:"e1", nom:"Mur LED principal", contenu:"plateau" },
      { id:"e2", nom:"Écran secondaire", contenu:"ordre" }
    ],
    regie: { theme:"nuit" },
    epreuves: epreuvesOfficielles(),
    groupes: [
      { id:"g1", nom:"Moins de 100 kg", min:"", max:"100" },
      { id:"g2", nom:"Plus de 100 kg", min:"100", max:"" }
    ],
    officiels: [
      { id:"o1", nom:"", role:"directeur", code:"" },
      { id:"o2", nom:"", role:"arbitrage", code:"" },
      { id:"o3", nom:"", role:"juge", code:"" },
      { id:"o4", nom:"", role:"juge", code:"" },
      { id:"o5", nom:"", role:"juge", code:"" },
      { id:"o6", nom:"", role:"chrono", code:"" },
      { id:"o7", nom:"", role:"secretaire", code:"" },
      { id:"o8", nom:"", role:"regie", code:"" }
    ],
    athletes: [],
    logos: {},
    programme: [
      { id:"p1", h:"14h00", txt:"Accueil des athlètes, pesée, vérification des équipements" },
      { id:"p2", h:"15h30", txt:"Briefing technique, présentation des épreuves, rappel des consignes" },
      { id:"p3", h:"16h30", txt:"Démarrage des épreuves" },
      { id:"p4", h:"22h30", txt:"Fin des épreuves, délibérations, proclamation des résultats" },
      { id:"p5", h:"22h45", txt:"Remise des récompenses, photo officielle, clôture" }
    ],
    partenaires: "",
    acces: { admin:"", regie:"" },
    recompenses: RECOMPENSES_DEF.map(r => Object.assign({}, r))
  };
}

const NOMS_DEMO = [
  ["Koné","Ibrahim"],["Yao","Serge Aristide"],["Diomandé","Moussa"],["Bamba","Cheick Oumar"],
  ["Traoré","Lassina"],["Gbagbo","Emmanuel"],["Kouassi","Jean-Marc"],["Ouattara","Adama"],
  ["Doumbia","Vakaba"],["Assi","Franck"],["Touré","Souleymane"],["N'Guessan","Patrick"],
  ["Coulibaly","Yacouba"],["Aka","Désiré"],["Sanogo","Karim"],["Zadi","Olivier"],
  ["Fofana","Mamadou"],["Boni","Ange"],["Cissé","Abdoulaye"],["Tanoh","Eric"],
  ["Konan","Hervé"],["Dosso","Salif"],["Guéi","Théodore"],["Sylla","Bakary"]
];
const CLUBS_DEMO = ["Iron Club Abidjan","Force Yopougon","Titan Cocody","Power Treichville","Indépendant","Bouaké Strength"];

let _seq = 0;
const nouvelId = (p) => p + Date.now().toString(36) + (_seq++).toString(36);

const RECOMPENSES_DEF = [
  { titre:"Médaille d'or", prime:"500 000 fr", lot:"Trophée du champion" },
  { titre:"Médaille d'argent", prime:"300 000 fr", lot:"" },
  { titre:"Médaille de bronze", prime:"200 000 fr", lot:"" }
];

function jeuDemo(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const [nom, prenoms] = NOMS_DEMO[i % NOMS_DEMO.length];
    const poids = (i % 2 === 0) ? (86 + (i * 1.4) % 13).toFixed(1) : (104 + (i * 2.1) % 28).toFixed(1);
    const club = CLUBS_DEMO[i % CLUBS_DEMO.length];
    out.push({
      id: nouvelId("a"), nom, prenoms, club: club === "Indépendant" ? "" : club,
      pays: i === 3 ? "GHA" : (i === 9 ? "BFA" : "CIV"),
      photo:"", poids:String(poids).replace(".", ","), groupeId:null, verrou:false, dossard:"",
      note:"", taille:"", age:"", commune:"", tel:"", urgence:"", poidsDeclare:"", aVerifier:false
    });
  }
  return out;
}

class Component extends DCLogic {
  state = { vue:"accueil", etape:0, d:etatVide(), modifie:false, charge:false,
            solo:null, soloTheme:"nuit", session:null, apercu:null, espace:"officielle",
            connexionId:null, codeSaisi:"", erreurCode:"",
            ch:{ phase:"pret", duree:60, reste:60, laps:[] },
            saisie:{ valeur:"", temps:"" }, saisies:{}, erreurSaisie:{}, erreurCat:{}, erreurPesee:{},
            imp:null, photos:null, recherche:"", filtre:"tous", ouvertes:{} };

  cle() { return this.state.espace === "essai" ? CLE_ESSAI : CLE; }

  componentDidMount() {
    const par = new URLSearchParams(location.search);
    const espace = par.get("espace") === "essai" ? "essai" : "officielle";
    const cle = espace === "essai" ? CLE_ESSAI : CLE;
    let d = null;
    try {
      const brut = localStorage.getItem(cle);
      if (brut) d = JSON.parse(brut);
    } catch (e) { d = null; }
    const base = d && d.epreuves ? Object.assign(etatVide(), d) : this.state.d;
    const off = epreuvesOfficielles();
    base.epreuves = (base.epreuves || []).map(e => {
      const o = off.find(x => x.id === e.id && sansAcc(e.nom) === sansAcc(x.nom));
      /* Rattrapage des niveaux officiels, quelle que soit l'ancienneté de la sauvegarde */
      const niv = o ? { niveau: e.niveau !== undefined ? e.niveau : !!o.niveau,
                        niveauxOptions: e.niveauxOptions || o.niveauxOptions || "" } : {};
      if (e.tours !== undefined) return Object.assign({}, e, niv);
      if (o) return Object.assign({}, e, { mesure:o.mesure, temps:o.temps, critere:o.critere, tours:o.tours }, niv);
      return Object.assign({}, e, { tours: e.mesure === "nb_temps" || e.mesure === "duree" });
    });
    const solo = par.get("ecran");
    this.setState({
      d: base, charge:true, espace,
      vue: solo ? "solo" : this.state.vue,
      solo: solo || null,
      soloTheme: par.get("theme") || "nuit"
    });
    this._pg = setInterval(() => this.setState(s => ({ pgEng: (s.pgEng || 0) + 1 })), 8000);
    if (solo) {
      this._sync = setInterval(() => this.relire(), 1500);
      this._chs = setInterval(() => this.lireChrono(), 400);
      this._sec = setInterval(() => this.setState({ tic: Date.now() }), 100);
      window.addEventListener("storage", this._st = () => this.relire());
    }
  }

  componentWillUnmount() {
    if (this._sync) clearInterval(this._sync);
    if (this._chs) clearInterval(this._chs);
    if (this._sec) clearInterval(this._sec);
    if (this._pg) clearInterval(this._pg);
    if (this._st) window.removeEventListener("storage", this._st);
    if (this._tick) clearInterval(this._tick);
  }

  relire() {
    try {
      const brut = localStorage.getItem(this.cle());
      if (!brut || brut === this._brut) return;
      this._brut = brut;
      this.setState({ d: JSON.parse(brut) });
    } catch (e) {}
  }

  maj(fn) {
    const d = JSON.parse(JSON.stringify(this.state.d));
    fn(d);
    let err = "";
    try { const j = JSON.stringify(d); localStorage.setItem(this.cle(), j); this._brut = j; }
    catch (e) { err = "Mémoire du poste saturée : les dernières photos n'ont pas pu être enregistrées. Exportez la sauvegarde, puis allégez les photos."; }
    this.setState({ d, modifie:false, heureEnreg: new Date(), erreurEnreg: err });
  }

  enregistrer = () => {
    try { localStorage.setItem(this.cle(), JSON.stringify(this.state.d)); } catch (e) {}
    this.setState({ modifie:false, heureEnreg: new Date() });
  };

  /* ── Espace officiel / essai ── */
  basculerEspace = (cible) => {
    const vers = cible || (this.state.espace === "essai" ? "officielle" : "essai");
    if (vers === this.state.espace) return;
    const droit = this.state.session ? this.state.session.droit : "tout";
    if (droit !== "tout") { alert("Seul l'administrateur peut changer de mode."); return; }
    try { localStorage.setItem(this.cle(), JSON.stringify(this.state.d)); } catch (e) {}
    let d = null;
    const cle = vers === "essai" ? CLE_ESSAI : CLE;
    try { const brut = localStorage.getItem(cle); if (brut) d = JSON.parse(brut); } catch (e) { d = null; }
    if (vers === "essai" && !(d && d.epreuves)) {
      d = etatVide();
      try { localStorage.setItem(CLE_ESSAI, JSON.stringify(d)); } catch (e) {}
    }
    this.setState({ espace:vers, d: d && d.epreuves ? Object.assign(etatVide(), d) : etatVide(),
                    vue:"accueil", etape:0, imp:null, photos:null });
  };
  demander = (quoi) => this.setState({ demande: quoi });
  annulerDemande = () => this.setState({ demande:null });
  confirmerDemande = () => {
    const q = this.state.demande;
    if (q === "liste" || q === "vierge") this.maj(d => { d.athletes = []; d.passages = []; });
    if (q === "tout") {
      const v = etatVide();
      try { localStorage.setItem(this.cle(), JSON.stringify(v)); } catch (e) {}
      this.setState({ d:v, etape:0 });
    }
    if (q === "videdemo") {
      const v = etatVide();
      try { localStorage.setItem(CLE_ESSAI, JSON.stringify(v)); } catch (e) {}
      if (this.state.espace === "essai") this.setState({ d:v, etape:0 });
    }
    this.setState({ demande:null });
  };
  copierVersDemo = () => {
    const d = JSON.parse(JSON.stringify(this.state.d));
    try { localStorage.setItem(CLE_ESSAI, JSON.stringify(d)); }
    catch (e) { alert("Mémoire du poste insuffisante pour copier cette liste dans la démonstration."); return; }
    this.setState({ espace:"essai", d, vue:"accueil", etape:0, demande:null });
  };

  nid(p) { return p + Math.random().toString(36).slice(2, 8); }

  groupePour(poids) {
    const v = parseFloat(String(poids).replace(",", "."));
    if (isNaN(v)) return null;
    const g = this.state.d.groupes.filter(x => x.actif !== false).find(x => {
      const min = x.min === "" ? -Infinity : parseFloat(x.min);
      const max = x.max === "" ? Infinity : parseFloat(x.max);
      return v > min - 0.0001 && v <= max;
    });
    return g || null;
  }

  erreurPesee(id, msg) {
    this.setState(st => { const e = Object.assign({}, st.erreurPesee); e[id] = msg; return { erreurPesee:e }; });
  }
  effacerErreurPesee(id) {
    this.setState(st => { const e = Object.assign({}, st.erreurPesee); delete e[id]; return { erreurPesee:e }; });
  }
  majRecompense(i, champ, v) {
    this.maj(x => {
      const l = (x.recompenses && x.recompenses.length ? x.recompenses : RECOMPENSES_DEF.map(r => Object.assign({}, r))).slice();
      l[i] = Object.assign({ titre:"", prime:"", lot:"" }, l[i], { [champ]: v });
      x.recompenses = l;
    });
  }
  prochainDossard() {
    const pris = this.state.d.athletes.map(a => parseInt(a.dossard, 10)).filter(n => !isNaN(n));
    return pris.length ? Math.max.apply(null, pris) + 1 : 1;
  }
  /* Dossards : impairs pour la catégorie la plus lourde, pairs pour la plus légère */
  pariteGroupe(g, groupes) {
    if (!g) return null;
    if (g.parite === "impair" || g.parite === "pair") return g.parite;
    const act = (groupes || this.state.d.groupes || []).filter(x => x.actif !== false);
    if (act.length !== 2) return null;
    const val = x => (x.min === "" || x.min == null) ? -Infinity : parseFloat(x.min);
    const lourd = val(act[0]) >= val(act[1]) ? act[0] : act[1];
    return g.id === lourd.id ? "impair" : "pair";
  }
  /* Numéro libre tiré au hasard dans la bonne parité, jamais à la suite du précédent */
  numeroLibre(athletes, parite, exclureId) {
    const pris = {};
    athletes.forEach(a => {
      if (a.id === exclureId) return;
      const n = parseInt(a.dossard, 10);
      if (!isNaN(n)) pris[n] = true;
    });
    const pas = parite ? 2 : 1;
    const base = parite === "pair" ? 2 : 1;
    const etendue = Math.max(30, athletes.length * 3);
    const libres = [];
    for (let n = base; n <= base + etendue * pas; n += pas) if (!pris[n]) libres.push(n);
    if (!libres.length) return base;
    return libres[Math.floor(Math.random() * Math.min(libres.length, 25))];
  }
  poidsHorsLimite(poids, g) {
    const v = parseFloat(String(poids).replace(",", "."));
    if (!g || isNaN(v)) return "";
    const min = (g.min === "" || g.min == null) ? -Infinity : parseFloat(g.min);
    const max = (g.max === "" || g.max == null) ? Infinity : parseFloat(g.max);
    if (v < min) return "Poids refusé : " + String(poids).replace(".", ",") + " kg est en dessous de la limite basse de « " + g.nom + " » (" + g.min + " kg). Choisissez la catégorie qui correspond à ce poids.";
    if (v > max) return "Poids refusé : " + String(poids).replace(".", ",") + " kg dépasse la limite haute de « " + g.nom + " » (" + g.max + " kg). Choisissez la catégorie qui correspond à ce poids.";
    return "";
  }
  /* Applique l'affectation sur un brouillon déjà cloné (une seule écriture pour tout un lot) */
  appliquerCategorie(draft, id, v) {
    const t = draft.athletes.find(y => y.id === id);
    if (!t) return "";
    if (v === "hors") { t.hors = true; t.groupeId = null; return ""; }
    if (!v) { t.hors = false; t.groupeId = null; return ""; }
    const g = (draft.groupes || []).find(x => x.id === v);
    const err = this.poidsHorsLimite(t.poids, g);
    if (err) return err;
    t.hors = false; t.groupeId = v;
    return "";
  }
  affecterCategorie(id, v) {
    const d = this.state.d;
    const a = d.athletes.find(x => x.id === id);
    if (!a) return "";
    const g = (d.groupes || []).find(x => x.id === v);
    if (v && v !== "hors") {
      const err = this.poidsHorsLimite(a.poids, g);
      if (err) return err;
    }
    this.maj(x => { this.appliquerCategorie(x, id, v); });
    return "";
  }
  viderDossards = () => {
    this.maj(d => { d.athletes.forEach(a => { a.dossard = ""; }); d.passages = []; });
    this.setState({ msgAffectation: "Dossards effacés. Saisissez les numéros à la main dans la colonne Dossard : l'ordre de passage de la première épreuve suivra ces numéros, du plus petit au plus grand." });
  };

  chargerDemo = () => {
    const n = this.props.jeuDemo === "24 athlètes" ? 24 : 12;
    this.maj(d => { d.athletes = jeuDemo(n); d.passages = []; });
  };

  toutEffacer = () => {
    const v = etatVide();
    try { localStorage.setItem(this.cle(), JSON.stringify(v)); } catch (e) {}
    this.setState({ d: v, modifie:false, etape:0 });
  };

  exporter = () => {
    const blob = new Blob([JSON.stringify(this.state.d, null, 2)], { type:"application/json" });
    this.telecharger(blob, (this.state.espace === "essai" ? "ESSAI-" : "") + "strongman-2026-competition.json");
  };
  /* ── Classeur Excel (format XML Excel 2003, lisible par Excel et LibreOffice) ── */
  xmlEsc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  feuilleXml(nom, entetes, lignes) {
    const cellule = (c) => {
      const num = typeof c === "number" && isFinite(c);
      return '<Cell><Data ss:Type="' + (num ? "Number" : "String") + '">' + this.xmlEsc(c) + "</Data></Cell>";
    };
    const ligne = (cs) => "<Row>" + cs.map(cellule).join("") + "</Row>";
    return '<Worksheet ss:Name="' + this.xmlEsc(nom).slice(0, 31) + '"><Table>' +
      ligne(entetes) + lignes.map(ligne).join("") + "</Table></Worksheet>";
  }
  exporterExcel = () => {
    const d = this.state.d;
    const nomG = (id) => { const g = (d.groupes || []).find(x => x.id === id); return g ? g.nom : (id === "tous" ? "Toutes catégories" : "Sans catégorie"); };
    const nomA = (id) => { const a = d.athletes.find(x => x.id === id); return a ? ((a.nom || "").toUpperCase() + " " + (a.prenoms || "")).trim() : ""; };

    const athletes = d.athletes.map(a => [
      a.dossard || "", (a.nom || "").toUpperCase(), a.prenoms || "", a.club || "", a.pays || "CIV",
      a.poids || "", nomG(a.groupeId), this.horsClassement(a) ? "Hors classement" : "Classé",
      a.verrou ? "Oui" : "Non", a.taille || "", a.age || "", a.commune || "", a.tel || "", a.urgence || "", a.note || ""
    ]);
    const categories = (d.groupes || []).map(g => [
      g.nom, g.min || "", g.max || "", g.actif === false ? "Mise de côté" : "Retenue",
      this.pariteGroupe(g) === "pair" ? "Pairs" : (this.pariteGroupe(g) === "impair" ? "Impairs" : "Libre")
    ]);
    const epreuves = (d.epreuves || []).map(e => [e.nom, e.mesure || "", e.temps || "", e.essais || "", e.critere || "", e.materiel || ""]);
    const resultats = [];
    (d.passages || []).forEach(p => {
      const e = (d.epreuves || []).find(x => x.id === p.epreuveId);
      const a = d.athletes.find(x => x.id === p.athleteId);
      resultats.push([
        e ? e.nom : "", nomG(p.groupeId), p.ordre || "", a ? (a.dossard || "") : "", nomA(p.athleteId),
        p.statut || "", p.resultat ? (p.resultat.statut || "") : "",
        p.resultat && p.resultat.valeur != null ? p.resultat.valeur : "",
        p.resultat && p.resultat.temps != null ? p.resultat.temps : "",
        p.resultat && p.resultat.tours ? p.resultat.tours.join(" ") : ""
      ]);
    });
    const classements = [];
    (d.groupes || []).forEach(g => {
      this.tableauGeneral(g.id).forEach(x => {
        classements.push([g.nom, x.rang || "", nomA(x.athleteId), x.total]
          .concat((d.epreuves || []).map(e => {
            const t = this.tableauEpreuve(e.id, g.id).find(y => y.athleteId === x.athleteId);
            return t ? t.points : "";
          })));
      });
    });

    const xml = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
      this.feuilleXml("Athletes", ["Dossard","Nom","Prenoms","Club","Nationalite","Poids","Categorie","Classement","Pesee validee","Taille","Age","Commune","Telephone","Urgence","Note"], athletes) +
      this.feuilleXml("Categories", ["Categorie","Min","Max","Etat","Dossards"], categories) +
      this.feuilleXml("Epreuves", ["Epreuve","Mesure","Temps","Essais","Critere","Materiel"], epreuves) +
      this.feuilleXml("Resultats", ["Epreuve","Categorie de passage","Ordre","Dossard","Athlete","Statut","Resultat","Valeur","Temps","Tours"], resultats) +
      this.feuilleXml("Classements", ["Categorie","Rang","Athlete","Total"].concat((d.epreuves || []).map(e => e.nom)), classements) +
      "</Workbook>";
    this.telecharger(new Blob([xml], { type:"application/vnd.ms-excel;charset=utf-8" }),
      (this.state.espace === "essai" ? "DEMO-" : "") + "strongman-2026-competition.xls");
  };
  importerExcel = async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    const txt = await f.text();
    try {
      if (/^\s*[{[]/.test(txt)) {
        const d = JSON.parse(txt);
        if (!d || !d.athletes) throw new Error("Fichier de sauvegarde illisible");
        try { const j = JSON.stringify(d); localStorage.setItem(this.cle(), j); this._brut = j; } catch (e) {}
        this.setState({ d, msgImportComp: "Sauvegarde rechargée : " + d.athletes.length + " athlètes." });
        return;
      }
      const doc = new DOMParser().parseFromString(txt, "application/xml");
      if (doc.getElementsByTagName("parsererror").length) throw new Error("Fichier illisible");
      const feuilles = {};
      Array.from(doc.getElementsByTagName("Worksheet")).forEach(ws => {
        const nom = ws.getAttribute("ss:Name") || ws.getAttribute("Name") || "";
        feuilles[nom.toLowerCase()] = Array.from(ws.getElementsByTagName("Row")).map(r =>
          Array.from(r.getElementsByTagName("Cell")).map(c => {
            const dd = c.getElementsByTagName("Data")[0];
            return dd ? dd.textContent : "";
          }));
      });
      const fa = feuilles["athletes"] || feuilles["athlètes"];
      if (!fa || fa.length < 2) throw new Error("Aucune feuille « Athletes » trouvée dans ce classeur");
      const corps = fa.slice(1).filter(r => (r[1] || "").trim());
      let nAth = 0, nRes = 0;
      this.maj(d => {
        const parNom = {};
        d.groupes.forEach(g => { parNom[sansAcc(g.nom)] = g.id; });
        d.athletes = corps.map(r => {
          nAth++;
          return {
            id: this.nid("at"), dossard: String(r[0] || "").trim(),
            nom: String(r[1] || "").trim().toUpperCase(), prenoms: String(r[2] || "").trim(),
            club: String(r[3] || "").trim(), pays: String(r[4] || "CIV").trim() || "CIV",
            poids: String(r[5] || "").trim(), groupeId: parNom[sansAcc(r[6] || "")] || null,
            hors: sansAcc(r[7] || "").indexOf("hors") === 0,
            verrou: sansAcc(r[8] || "") === "oui",
            taille: String(r[9] || ""), age: String(r[10] || ""), commune: String(r[11] || ""),
            tel: String(r[12] || ""), urgence: String(r[13] || ""), note: String(r[14] || ""),
            photo: "", invite: false, poidsDeclare: "", aVerifier: false
          };
        });
        d.passages = [];
        const fr = feuilles["resultats"] || feuilles["résultats"];
        if (fr && fr.length > 1) {
          fr.slice(1).forEach(r => {
            const ep = d.epreuves.find(e => sansAcc(e.nom) === sansAcc(r[0] || ""));
            const gid = sansAcc(r[1] || "").indexOf("toutes") === 0 ? "tous" : (parNom[sansAcc(r[1] || "")] || null);
            const at = d.athletes.find(a => String(a.dossard) === String(r[3] || "").trim());
            if (!ep || !gid || !at) return;
            const st = String(r[5] || "avenir").trim() || "avenir";
            const val = String(r[7] || "").trim();
            d.passages.push({
              id: this.nid("ps"), epreuveId: ep.id, groupeId: gid, athleteId: at.id,
              ordre: parseInt(r[2], 10) || 1, statut: st,
              resultat: (r[6] ? { statut:String(r[6]).trim(),
                valeur: val === "" ? null : parseFloat(val.replace(",", ".")),
                temps: String(r[8] || "").trim() === "" ? null : parseFloat(String(r[8]).replace(",", ".")),
                tours: String(r[9] || "").trim() ? String(r[9]).trim().split(/\s+/).map(Number) : [] } : null),
              ts: null
            });
            nRes++;
          });
        }
      });
      this.setState({ msgImportComp: nAth + " athlètes et " + nRes + " passages importés depuis « " + f.name + " ». Les photos ne sont pas contenues dans un classeur Excel : rechargez-les si besoin." });
    } catch (e) {
      this.setState({ msgImportComp: "Import impossible : " + e.message + ". Utilisez un classeur exporté par ce logiciel (.xls) ou une sauvegarde .json." });
    }
  };
  telecharger(blob, nom) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nom;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async exporterListe() {
    const o = await outils();
    const d = this.state.d;
    const lignes = d.athletes.map(a => {
      const g = d.groupes.find(x => x.id === a.groupeId);
      return [a.dossard || "", (a.nom || "").toUpperCase(), a.prenoms || "",
              (a.club && a.club.trim()) ? a.club : "Indépendant",
              (PAYS[a.pays || "CIV"] || PAYS.CIV).n, a.poids || "", g ? g.nom : "",
              a.taille || "", a.age || "", a.commune || "", a.tel || "", a.urgence || "",
              a.verrou ? "oui" : "non"];
    });
    const csv = o.versCSV(["Dossard","Nom","Prénoms","Club","Nationalité","Poids","Groupe",
      "Taille","Âge","Commune","Téléphone","Contact d'urgence","Pesée validée"], lignes);
    this.telecharger(new Blob([csv], { type:"text/csv;charset=utf-8" }),
      (this.state.espace === "essai" ? "ESSAI-" : "") + "strongman-2026-athletes.csv");
  }
  async exporterClassements() {
    const o = await outils();
    const d = this.state.d;
    const lignes = [];
    d.groupes.forEach(g => {
      this.tableauGeneral(g.id).forEach(x => {
        const parEp = d.epreuves.map(e => {
          const t = this.tableauEpreuve(e.id, g.id).find(y => y.athleteId === x.athleteId);
          return t ? t.points : 0;
        });
        lignes.push([g.nom, x.rang, this.nomAthlete(x.athleteId), x.total].concat(parEp));
      });
    });
    const csv = o.versCSV(["Groupe","Rang","Athlète","Total"].concat(d.epreuves.map(e => e.nom)), lignes);
    this.telecharger(new Blob([csv], { type:"text/csv;charset=utf-8" }),
      (this.state.espace === "essai" ? "ESSAI-" : "") + "strongman-2026-classements.csv");
  }
  modeleCSV = async () => {
    const o = await outils();
    const csv = o.versCSV(["N°","NOM ET PRENOMS","POIDS","TAILLE","AGE","COMMUNE","CONTACT","CONTACT EN CAS D'URGENCE","CLUB"],
      [["1","AGBOKRA JEAN-BAPTISTE","78 kg","1,81 m","28","Cocody","0564996328","0700000000","teamstrong"]]);
    this.telecharger(new Blob([csv], { type:"text/csv;charset=utf-8" }), "modele-liste-athletes.csv");
  };

  aller = (vue, etape) => {
    this.setState({ vue, etape: etape == null ? this.state.etape : etape });
    window.scrollTo(0, 0);
  };

  async photoFichier(id, ev) {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    let img = "";
    try { const o = await outils(); img = await o.recadrerPortrait(f, 260, 0.6); }
    catch (e) {
      img = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
    }
    this.maj(d => { const a = d.athletes.find(x => x.id === id); if (a) a.photo = img; });
  }

  /* ── Plateau ─────────────────────────────────────── */
  /* ── Import d'une liste ── */
  ouvrirImport = () => this.setState({ imp:{ etape:"source", texte:"", lignes:[], source:"", erreur:"", resume:null, avant:null } });
  fermerImport = () => this.setState({ imp:null });
  majImp(fn) {
    const imp = Object.assign({}, this.state.imp);
    fn(imp);
    this.setState({ imp });
  }
  async preparerLignes(lignes, source) {
    const o = await outils();
    const existants = this.state.d.athletes;
    const prep = lignes.map(l => {
      const motifs = o.douteuse(l);
      const cle = sansAcc((l.nom || "") + " " + (l.prenoms || ""));
      const doublon = existants.find(a => sansAcc((a.nom || "") + " " + (a.prenoms || "")) === cle) || null;
      return Object.assign({}, l, {
        garder: true, motifs, doublonId: doublon ? doublon.id : null,
        modeDoublon: doublon ? "fusionner" : ""
      });
    });
    this.setState({ imp: Object.assign({}, this.state.imp, { etape:"verif", lignes:prep, source, erreur:"" }) });
  }
  importerFichier = async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    this.majImp(i => { i.etape = "lecture"; i.erreur = ""; });
    try {
      const o = await outils();
      const r = await o.lireFichier(f);
      if (!r.lignes.length) throw new Error("Aucune ligne reconnue dans ce fichier");
      await this.preparerLignes(r.lignes, r.source + " — " + f.name);
    } catch (e) {
      this.majImp(i => { i.etape = "source";
        i.erreur = (String(e.message || e).includes("import") || String(e.message || e).includes("etch"))
          ? "Lecture du PDF impossible sans internet. Enregistrez le fichier en Excel ou collez la liste."
          : "Lecture impossible : " + (e.message || e); });
    }
  };
  importerTexte = async () => {
    const t = this.state.imp && this.state.imp.texte;
    if (!t || !t.trim()) { this.majImp(i => { i.erreur = "Collez d'abord la liste."; }); return; }
    try {
      const o = await outils();
      const lignes = o.analyserTexte(t);
      if (!lignes.length) throw new Error("Aucun nom reconnu");
      await this.preparerLignes(lignes, "Liste collée");
    } catch (e) {
      this.majImp(i => { i.erreur = "Lecture impossible : " + (e.message || e); });
    }
  };
  validerImport = () => {
    const imp = this.state.imp;
    if (!imp) return;
    const avant = JSON.parse(JSON.stringify(this.state.d.athletes));
    let ajoutes = 0, fusionnes = 0, ignores = 0, aVerifier = 0, aCompleter = 0;
    this.maj(d => {
      imp.lignes.forEach(l => {
        if (!l.garder) { ignores++; return; }
        if (l.doublonId && l.modeDoublon === "ignorer") { ignores++; return; }
        const champs = {
          nom: (l.nom || "").toUpperCase(), prenoms: l.prenoms || "",
          club: l.club || "", taille: l.taille || "", age: String(l.age || ""),
          commune: l.commune || "", tel: l.tel || "", urgence: l.urgence || "",
          poidsDeclare: l.poids != null ? String(l.poids).replace(".", ",") : "",
          aVerifier: (l.motifs || []).length > 0
        };
        if (l.doublonId && l.modeDoublon === "fusionner") {
          const a = d.athletes.find(x => x.id === l.doublonId);
          if (a) {
            Object.keys(champs).forEach(k => {
              if (k === "aVerifier") return;
              if (!String(a[k] || "").trim() && String(champs[k] || "").trim()) a[k] = champs[k];
            });
            fusionnes++;
            if (champs.aVerifier) { a.aVerifier = true; aVerifier++; }
            if (!a.poids) aCompleter++;
          }
          return;
        }
        d.athletes.push(Object.assign({
          id: nouvelId("a"), pays:"CIV", photo:"", poids:"", groupeId:null,
          verrou:false, dossard:"", note:""
        }, champs));
        ajoutes++;
        if (champs.aVerifier) aVerifier++;
        aCompleter++;
      });
    });
    this.setState({ imp: Object.assign({}, imp, {
      etape:"resume", avant,
      resume:{ ajoutes, fusionnes, ignores, aVerifier, aCompleter }
    }) });
  };
  annulerImport = () => {
    const imp = this.state.imp;
    if (!imp || !imp.avant) return;
    if (!confirm("Annuler cet import et revenir à la liste d'avant ?")) return;
    this.maj(d => { d.athletes = JSON.parse(JSON.stringify(imp.avant)); });
    this.setState({ imp:null });
  };

  /* ── Photos ── */
  photosGroupees = async (ev) => {
    const fichiers = Array.from(ev.target.files || []);
    if (!fichiers.length) return;
    const o = await outils();
    const corresp = [];
    for (const f of fichiers) {
      const app = o.apparier(f.name, this.state.d.athletes);
      let apercu = "";
      try { apercu = await o.recadrerPortrait(f, 260, 0.6); } catch (e) { apercu = ""; }
      corresp.push({ nomFichier:f.name, athleteId:app.athleteId, apercu });
    }
    this.setState({ photos:{ corresp } });
  };
  changerCorresp = (i, athleteId) => {
    const photos = { corresp: this.state.photos.corresp.slice() };
    photos.corresp[i] = Object.assign({}, photos.corresp[i], { athleteId });
    this.setState({ photos });
  };
  appliquerPhotos = () => {
    const c = this.state.photos ? this.state.photos.corresp : [];
    let n = 0;
    this.maj(d => {
      c.forEach(x => {
        if (!x.athleteId || !x.apercu) return;
        const a = d.athletes.find(y => y.id === x.athleteId);
        if (a) { a.photo = x.apercu; n++; }
      });
    });
    this.setState({ photos:null });
    alert(n + " photo(s) appliquée(s).");
  };
  logoClub = async (club, ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const o = await outils();
    const img = await o.reduireImage(f, 320);
    this.maj(d => { d.logos = Object.assign({}, d.logos || {}); d.logos[club] = img; });
  };

  connexion(o) {
    const saisi = String(this.state.codeSaisi || "").trim();
    if (!saisi) { this.setState({ erreurCode:"Saisissez le code d'accès." }); return; }
    if (saisi !== String(o.code).trim()) {
      this.setState({ erreurCode:"Code refusé pour " + o.nom + ". Réessayez.", codeSaisi:"" });
      return;
    }
    const droit = o.droit || "tout";
    this.setState({ session:{ nom:o.nom, role:o.id, droit },
                    connexionId:null, codeSaisi:"", erreurCode:"",
                    vue: droit === "regie" ? "regie" : (droit === "plateau" ? "plateau" : "accueil") });
  }
  ignorerCodes = () => this.setState({ session:{ nom:"Poste responsable", role:"directeur", droit:"tout" },
                                       connexionId:null, codeSaisi:"", erreurCode:"", vue:"accueil" });
  deconnecter = () => this.setState({ session:null, vue:"accueil" });

  epreuveCourante() {
    const d = this.state.d;
    return d.epreuves.find(e => e.id === d.comp.epreuveId) || d.epreuves[0] || null;
  }
  groupeCourant() {
    const d = this.state.d;
    if (d.comp.groupeId === "tous") return { id:"tous", nom:"Toutes catégories" };
    return d.groupes.find(g => g.id === d.comp.groupeId) || d.groupes[0] || null;
  }
  urlImage(dataUrl) {
    if (!dataUrl) return "";
    if (String(dataUrl).indexOf("data:") !== 0) return dataUrl;
    this._blobs = this._blobs || {};
    const k = dataUrl.length + "|" + dataUrl.slice(-32);
    if (this._blobs[k]) return this._blobs[k];
    try {
      const i = dataUrl.indexOf(",");
      const type = dataUrl.slice(5, i).split(";")[0] || "image/jpeg";
      const bin = atob(dataUrl.slice(i + 1));
      const u8 = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) u8[j] = bin.charCodeAt(j);
      const u = URL.createObjectURL(new Blob([u8], { type }));
      this._blobs[k] = u;
      return u;
    } catch (e) { return ""; }
  }
  fondImage(dataUrl) {
    const u = this.urlImage(dataUrl);
    return u ? "url(\"" + u + "\")" : "none";
  }
  estInvite(a) { return !!a.invite || (a.pays || "CIV") !== "CIV"; }
  groupeDe(a) { return (this.state.d.groupes || []).find(g => g.id === a.groupeId) || null; }
  horsClassement(a) { return this.estInvite(a) || !!a.hors || !this.groupeDe(a); }
  athletesDuGroupe(gid) {
    const d = this.state.d;
    const l = (gid === "tous" || !gid) ? d.athletes.slice() : d.athletes.filter(a => a.groupeId === gid);
    return l.sort((a, b) => (parseInt(a.dossard, 10) || 999) - (parseInt(b.dossard, 10) || 999));
  }
  file(statut) {
    const d = this.state.d;
    const ep = this.epreuveCourante(), g = this.groupeCourant();
    if (!ep || !g) return [];
    const vivants = {};
    d.athletes.forEach(a => { vivants[a.id] = true; });
    /* Un athlète déjà passé sur cette épreuve — sous n'importe quelle vue — ne repasse pas */
    const faits = {};
    d.passages.forEach(p => {
      if (p.epreuveId === ep.id && p.statut === "termine" && p.resultat) faits[p.athleteId] = p;
    });
    if (statut === "termine") {
      const vus = {};
      return d.passages
        .filter(p => {
          if (p.epreuveId !== ep.id || p.statut !== "termine" || !vivants[p.athleteId]) return false;
          if (g.id !== "tous") {
            const a = d.athletes.find(x => x.id === p.athleteId);
            if (!a || a.groupeId !== g.id) return false;
          }
          if (vus[p.athleteId]) return false;
          vus[p.athleteId] = true;
          return true;
        })
        .sort((a, b) => a.ordre - b.ordre);
    }
    return d.passages
      .filter(p => p.epreuveId === ep.id && p.groupeId === g.id && p.statut === statut
                && vivants[p.athleteId] && !faits[p.athleteId])
      .sort((a, b) => a.ordre - b.ordre);
  }
  construireFile = () => {
    const ep = this.epreuveCourante(), g = this.groupeCourant();
    if (!ep || !g) return;
    const ath = this.ordreDePassage(ep.id, g.id);
    if (!ath.length) { alert("Aucun athlète dans ce groupe. Validez les pesées d'abord."); return; }
    this.maj(d => {
      d.passages = d.passages.filter(p => !(p.epreuveId === ep.id && p.groupeId === g.id));
      ath.forEach((a, i) => d.passages.push({
        id: this.nid("ps"), epreuveId: ep.id, groupeId: g.id, athleteId: a.id,
        ordre: i + 1, statut: "avenir", votes:[null,null,null], resultat: null, ts: null
      }));
    });
    this.prepareChrono(parseDuree(ep.temps));
  };
  assurerFile = () => {
    const ep = this.epreuveCourante(), g = this.groupeCourant();
    if (!ep || !g) return;
    const vivants = {};
    this.state.d.athletes.forEach(a => { vivants[a.id] = true; });
    if (this.state.d.passages.some(p => !vivants[p.athleteId])) {
      this.maj(d => { d.passages = d.passages.filter(p => vivants[p.athleteId]); });
    }
    if (this.state.d.passages.some(p => p.epreuveId === ep.id && p.groupeId === g.id && vivants[p.athleteId])) return;
    const ath = this.ordreDePassage(ep.id, g.id);
    if (!ath.length) return;
    this.maj(d => {
      ath.forEach((a, i) => d.passages.push({
        id: this.nid("ps"), epreuveId: ep.id, groupeId: g.id, athleteId: a.id,
        ordre: i + 1, statut: "avenir", resultat: null, ts: null
      }));
    });
  };
  preparerToutes = () => {
    const d0 = this.state.d;
    const cibles = (d0.groupes || []).filter(g => g.actif !== false).map(g => g.id).concat(["tous"]);
    let n = 0;
    this.maj(d => {
      (d.epreuves || []).forEach(ep => {
        cibles.forEach(gid => {
          if (d.passages.some(p => p.epreuveId === ep.id && p.groupeId === gid)) return;
          const ath = this.ordreDePassage(ep.id, gid);
          ath.forEach((a, i) => {
            d.passages.push({ id: this.nid("ps"), epreuveId: ep.id, groupeId: gid, athleteId: a.id,
              ordre: i + 1, statut: "avenir", resultat: null, ts: null });
            n++;
          });
        });
      });
    });
    this.setState({ msgPreparation: n === 0
      ? "Toutes les épreuves avaient déjà leur ordre de passage."
      : n + " passages préparés : chaque épreuve a maintenant sa liste d'athlètes, par catégorie et toutes catégories mélangées." });
  };
  groupeDuPassage(p) {
    const a = this.state.d.athletes.find(x => x.id === p.athleteId);
    return a && a.groupeId ? a.groupeId : "sans";
  }
  appelerDuo = () => {
    /* Le vivier = file d'attente + athlètes déjà au plateau, tous remis dans l'ordre des dossards */
    const vivier = this.file("avenir").concat(this.file("plateau")).sort((a, b) => a.ordre - b.ordre);
    const vus = {}, choisis = [];
    vivier.forEach(p => {
      const k = this.groupeDuPassage(p);
      if (vus[k]) return;
      vus[k] = true; choisis.push(p.id);
    });
    if (!choisis.length) return;
    const h = new Date().toISOString();
    const concernes = vivier.map(p => p.id);
    this.maj(d => {
      d.passages.forEach(p => {
        if (concernes.indexOf(p.id) >= 0) p.statut = "avenir";
        if (choisis.indexOf(p.id) >= 0) { p.statut = "plateau"; p.ts = h; }
      });
    });
    const ep = this.epreuveCourante();
    this.prepareChrono(parseDuree(ep && ep.temps));
  };
  suivantPour(p) {
    const gid = this.groupeDuPassage(p);
    const av = this.file("avenir");
    return av.find(x => this.groupeDuPassage(x) === gid) || null;
  }
  appeler = (pid) => {
    const cible = this.state.d.passages.find(p => p.id === pid);
    const gid = cible ? this.groupeDuPassage(cible) : null;
    const deja = this.file("plateau").find(p => this.groupeDuPassage(p) === gid);
    this.maj(d => {
      if (deja) { const x = d.passages.find(p => p.id === deja.id); if (x) x.statut = "avenir"; }
      const p = d.passages.find(p => p.id === pid);
      if (p) { p.statut = "plateau"; p.ts = new Date().toISOString(); }
    });
    const ep = this.epreuveCourante();
    this.prepareChrono(parseDuree(ep && ep.temps));
    this.setState({ saisie:{ valeur:"", temps:"" } });
  };
  renvoyer = (pid) => this.maj(d => { const p = d.passages.find(p => p.id === pid); if (p) p.statut = "avenir"; });
  saisieDe(pid) { return (this.state.saisies || {})[pid] || { valeur:"", temps:"" }; }
  setSaisie(pid, champ, v) {
    this.setState(st => {
      const m = Object.assign({}, st.saisies);
      m[pid] = Object.assign({ valeur:"", temps:"" }, m[pid], { [champ]: v });
      const e = Object.assign({}, st.erreurSaisie); delete e[pid];
      return { saisies:m, erreurSaisie:e };
    });
  }
  officialiser = (pid, statut) => {
    const ep = this.epreuveCourante();
    const s = this.saisieDe(pid);
    const p0 = this.state.d.passages.find(p => p.id === pid);
    const valeur = statut === "ok" ? parseFloat(String(s.valeur).replace(",", ".")) : null;
    if (statut === "ok" && (valeur == null || isNaN(valeur))) {
      this.setState(st => ({ erreurSaisie: Object.assign({}, st.erreurSaisie, { [pid]:"Saisissez la performance mesurée avant de valider." }) }));
      return;
    }
    const temps = s.temps ? parseFloat(String(s.temps).replace(",", ".")) : null;
    const suivant = p0 ? this.suivantPour(p0) : null;
    this.maj(d => {
      const p = d.passages.find(p => p.id === pid);
      if (!p) return;
      p.statut = "termine";
      const propres = (this.state.toursPar || {})[pid];
      p.resultat = statut === "ok"
        ? { statut:"ok", valeur, temps: isNaN(temps) ? null : temps,
            tours: (propres && propres.length ? propres : (this.state.ch.laps || [])).slice() }
        : { statut, valeur:null, temps:null, tours:[] };
      p.ts = new Date().toISOString();
      if (suivant) {
        const n = d.passages.find(x => x.id === suivant.id);
        if (n) { n.statut = "plateau"; n.ts = new Date().toISOString(); }
      }
    });
    this.prepareChrono(parseDuree(ep && ep.temps));
    this.setState(st => {
      const m = Object.assign({}, st.saisies); delete m[pid];
      const e = Object.assign({}, st.erreurSaisie); delete e[pid];
      const tp = Object.assign({}, st.toursPar); delete tp[pid];
      return { saisies:m, erreurSaisie:e, toursPar:tp, msgChrono:"" };
    });
  };
  retourPassage = () => {
    const term = this.file("termine").slice()
      .sort((a, b) => String(a.ts || "").localeCompare(String(b.ts || "")));
    const last = term[term.length - 1];
    if (!last) { alert("Aucun passage validé à reprendre."); return; }
    const gid = this.groupeDuPassage(last);
    const encours = this.file("plateau").find(p => this.groupeDuPassage(p) === gid) || null;
    this.maj(d => {
      if (encours) { const x = d.passages.find(p => p.id === encours.id); if (x) x.statut = "avenir"; }
      const p = d.passages.find(p => p.id === last.id);
      if (p) { p.statut = "plateau"; p.resultat = null; }
    });
    const ep = this.epreuveCourante();
    this.prepareChrono(parseDuree(ep && ep.temps));
  };
  retourEcran = () => {
    if (this.state.apercu) { this.setState({ apercu:null }); return; }
    if (window.opener && !window.opener.closed) { window.close(); return; }
    try {
      const u = new URL(location.href);
      u.searchParams.delete("ecran");
      history.replaceState(null, "", u.pathname + (u.searchParams.toString() ? "?" + u.searchParams.toString() : ""));
    } catch (e) {}
    this.setState({ solo:null, vue:"regie" });
  };
  suspendre = () => {
    const motif = prompt("Motif de la suspension (blessure, panne matériel, météo, réclamation, disqualification…)");
    if (motif == null) return;
    this.maj(d => { d.comp.suspendu = true; d.comp.motif = motif || "Suspension"; });
  };
  reprendre = () => this.maj(d => { d.comp.suspendu = false; d.comp.motif = ""; });

  /* ── Chronomètre, deux appuis ────────────────────── */
  prepareChrono(sec) {
    if (this._tick) { clearInterval(this._tick); this._tick = null; }
    this.setState({ ch:{ phase:"pret", duree: sec || 0, reste: sec || 0, laps:[] } });
    this.pousserChrono({ phase:"pret", duree: sec || 0, reste: sec || 0, t0:null, laps:[] });
  }
  /* Tour propre à un athlète : chaque carte du plateau compte ses répétitions */
  tourPour = (pid) => {
    const ch = this.state.ch;
    if (ch.phase !== "encours") return;
    const t = ch.duree > 0 ? ch.duree - (ch.t0 ? Math.max(0, ch.duree - (Date.now() - ch.t0) / 1000) : ch.reste)
                           : (ch.t0 ? (Date.now() - ch.t0) / 1000 : ch.reste);
    const v = Math.round(t * 10) / 10;
    this.setState(st => {
      const tp = Object.assign({}, st.toursPar);
      tp[pid] = (tp[pid] || []).concat([v]);
      const m = Object.assign({}, st.saisies);
      m[pid] = Object.assign({ valeur:"", temps:"" }, m[pid], {
        valeur: String(tp[pid].length), temps: String(v).replace(".", ",")
      });
      return { toursPar:tp, saisies:m };
    });
  };
  annulerTour = (pid) => this.setState(st => {
    const tp = Object.assign({}, st.toursPar);
    const l = (tp[pid] || []).slice(0, -1);
    tp[pid] = l;
    const m = Object.assign({}, st.saisies);
    m[pid] = Object.assign({ valeur:"", temps:"" }, m[pid], {
      valeur: l.length ? String(l.length) : "", temps: l.length ? String(l[l.length - 1]).replace(".", ",") : ""
    });
    return { toursPar:tp, saisies:m };
  });
  tour = () => {
    const ch = this.state.ch;
    if (ch.phase !== "encours") return;
    const ecoule = ch.duree > 0 ? (ch.duree - ch.reste) : ch.reste;
    const laps = (ch.laps || []).concat([Math.round(ecoule * 10) / 10]);
    const cible = this.file("plateau");
    this.setState(st => {
      const m = Object.assign({}, st.saisies);
      if (cible.length === 1) {
        m[cible[0].id] = { valeur:String(laps.length), temps:String(laps[laps.length - 1]).replace(".", ",") };
      }
      return { ch: Object.assign({}, ch, { laps }), saisies:m };
    });
    this.pousserChrono({ phase:ch.phase, duree:ch.duree, reste:ch.reste, t0:this._t0 || null, laps });
  };
  pousserChrono(o) {
    try { localStorage.setItem(CLE + ":ch", JSON.stringify(o)); } catch (e) {}
  }
  lireChrono() {
    let brut = null;
    try { brut = localStorage.getItem(CLE + ":ch"); } catch (e) { brut = null; }
    if (!brut || brut === this._chBrut) return;
    this._chBrut = brut;
    let o = null;
    try { o = JSON.parse(brut); } catch (e) { o = null; }
    if (!o) return;
    this.setState({ ch:{ phase:o.phase, duree:o.duree, reste:o.reste, laps:o.laps || [], t0:o.t0 || null } });
  }
  chronoAction = () => {
    const ch = this.state.ch;
    if (ch.phase === "pret" && this.file("plateau").length === 0) {
      this.setState({ msgChrono: "Appelez d'abord un athlète au plateau : le chronomètre ne peut pas démarrer sur un plateau vide." });
      return;
    }
    if (this.state.msgChrono) this.setState({ msgChrono:"" });
    if (ch.phase === "encours") {
      if (this._tick) { clearInterval(this._tick); this._tick = null; }
      this.setState({ ch: Object.assign({}, ch, { phase:"arrete" }) });
      this.pousserChrono({ phase:"arrete", duree:ch.duree, reste:ch.reste, t0:null, laps:ch.laps || [] });
      return;
    }
    if (ch.phase === "arrete") { this.prepareChrono(ch.duree); return; }
    const t0 = Date.now();
    this._t0 = t0;
    const base = ch.duree > 0 ? ch.duree : 0;
    this.setState({ ch: Object.assign({}, ch, { phase:"encours" }) });
    this.pousserChrono({ phase:"encours", duree:ch.duree, reste:ch.reste, t0, laps:ch.laps || [] });
    this._tick = setInterval(() => {
      const e = (Date.now() - t0) / 1000;
      const reste = ch.duree > 0 ? Math.max(0, base - e) : e;
      this.setState(st => ({ ch: Object.assign({}, st.ch, { reste }) }));
      if (ch.duree > 0 && reste <= 0) { clearInterval(this._tick); this._tick = null;
        this.setState(st => ({ ch: Object.assign({}, st.ch, { phase:"arrete", reste:0 }) })); }
    }, 100);
  };

  /* ── Barème et classements ───────────────────────── */
  meilleurResultat(epId, athleteId) {
    const ep = this.state.d.epreuves.find(e => e.id === epId);
    const l = this.state.d.passages.filter(p => p.epreuveId === epId && p.athleteId === athleteId
      && p.statut === "termine" && p.resultat && p.resultat.statut === "ok");
    if (!l.length || !ep) return null;
    const min = ep.mesure === "chrono";
    return l.map(p => p.resultat).sort((a, b) => {
      if (a.valeur !== b.valeur) return min ? a.valeur - b.valeur : b.valeur - a.valeur;
      const at = a.temps == null ? Infinity : a.temps, bt = b.temps == null ? Infinity : b.temps;
      return at - bt;
    })[0];
  }
  /* Ordre de passage : 1re épreuve = dossards croissants ; ensuite, du moins de points au plus de points */
  ordreDePassage(epId, gid) {
    const d = this.state.d;
    const idx = d.epreuves.findIndex(e => e.id === epId);
    const ath = (gid === "tous" ? d.athletes.slice() : d.athletes.filter(a => a.groupeId === gid));
    const doss = (a) => { const n = parseInt(a.dossard, 10); return isNaN(n) ? 9999 : n; };
    if (idx <= 0) return ath.sort((a, b) => doss(a) - doss(b));
    const pts = {};
    d.epreuves.slice(0, idx).forEach(e => {
      (d.groupes || []).forEach(g => {
        this.tableauEpreuve(e.id, g.id).forEach(x => { pts[x.athleteId] = (pts[x.athleteId] || 0) + x.points; });
      });
    });
    return ath.sort((a, b) => (pts[a.id] || 0) - (pts[b.id] || 0) || doss(a) - doss(b));
  }
  tableauEpreuve(epId, gid) {
    const ep = this.state.d.epreuves.find(e => e.id === epId);
    const ath = this.athletesDuGroupe(gid).filter(a => !this.horsClassement(a));
    const N = ath.length;
    const avec = [], sans = [];
    ath.forEach(a => {
      const r = this.meilleurResultat(epId, a.id);
      (r ? avec : sans).push({ a, r });
    });
    const min = ep && ep.mesure === "chrono";
    const pdc = (a) => { const v = parseFloat(String(a.poids).replace(",", ".")); return isNaN(v) ? Infinity : v; };
    /* Égalité : temps intermédiaire le plus court, puis poids de corps le plus léger */
    avec.sort((x, y) => {
      if (x.r.valeur !== y.r.valeur) return min ? x.r.valeur - y.r.valeur : y.r.valeur - x.r.valeur;
      const xt = x.r.temps == null ? Infinity : x.r.temps, yt = y.r.temps == null ? Infinity : y.r.temps;
      if (xt !== yt) return xt - yt;
      return pdc(x.a) - pdc(y.a);
    });
    const out = [];
    let rang = 0, prec = null, pas = 0;
    avec.forEach(x => {
      pas++;
      const cle = x.r.valeur + "|" + (x.r.temps == null ? "" : x.r.temps) + "|" + pdc(x.a);
      if (cle !== prec) { rang = pas; prec = cle; }
      out.push({ athleteId:x.a.id, rang, points: Math.max(0, N - rang + 1), r:x.r });
    });
    sans.forEach(x => out.push({ athleteId:x.a.id, rang:null, points:0, r:null }));
    return out;
  }
  tableauGeneral(gid) {
    const d = this.state.d;
    const ath = this.athletesDuGroupe(gid).filter(a => !this.horsClassement(a));
    const par = d.epreuves.map(e => ({ e, m: new Map(this.tableauEpreuve(e.id, gid).map(x => [x.athleteId, x])) }));
    const lignes = ath.map(a => {
      let total = 0; const rangs = [];
      par.forEach(({ m }) => { const x = m.get(a.id); if (x) { total += x.points; if (x.rang) rangs.push(x.rang); } });
      const compte = (n) => rangs.filter(r => r === n).length;
      return { a, total, cle:[ -total, -compte(1), -compte(2), -compte(3) ] };
    });
    lignes.sort((x, y) => {
      for (let i = 0; i < 4; i++) if (x.cle[i] !== y.cle[i]) return x.cle[i] - y.cle[i];
      return 0;
    });
    let rang = 0, prec = null, pas = 0;
    return lignes.map(l => {
      pas++;
      const k = l.cle.join(",");
      if (k !== prec) { rang = pas; prec = k; }
      return { athleteId:l.a.id, rang, total:l.total };
    });
  }
  nomAthlete(id) {
    const a = this.state.d.athletes.find(x => x.id === id);
    if (!a) return "—";
    return ((a.nom || "").toUpperCase() + " " + (a.prenoms || "")).trim();
  }

  bilan() {
    const d = this.state.d;
    const peses = d.athletes.filter(a => a.verrou);
    const juges = d.officiels.filter(o => o.role === "juge" && o.nom.trim());
    const nommes = d.officiels.filter(o => o.nom.trim());
    return {
      epreuves: d.epreuves.length,
      groupes: d.groupes.length,
      athletes: d.athletes.length,
      complets: d.athletes.filter(a => a.nom.trim() && a.prenoms.trim()).length,
      peses: peses.length,
      juges: juges.length,
      officiels: nommes.length,
      programme: d.programme.length
    };
  }

  renderVals() {
    const d = this.state.d;
    const b = this.bilan();
    const etape = this.state.etape;
    const aide = this.props.afficherAide !== false;

    const titresEtapes = ["Épreuves","Groupes","Officiels","Athlètes","Pesée","Programme"];
    const etapes = titresEtapes.map((t, i) => ({
      num: i + 1, titre: t,
      fond: i === etape ? "#141210" : "#FFFFFF",
      encre: i === etape ? "#FCFAF6" : "#4A443B",
      bord: i === etape ? "#141210" : "#E7E1D6",
      puceFond: i === etape ? "#EC6D23" : "#F0EBE1",
      puceEncre: i === etape ? "#FFFFFF" : "#8A8378",
      aller: () => this.setState({ etape: i })
    }));

    const epreuves = d.epreuves.map((ep, i) => {
      const m = MESURES.find(x => x.cle === ep.mesure) || MESURES[0];
      const set = (champ) => (e) => { const v = e.target.value; this.maj(x => { const t = x.epreuves.find(y => y.id === ep.id); if (t) t[champ] = v; }); };
      return {
        id: ep.id,
        num: i + 1, nom: ep.nom, mesure: ep.mesure, temps: ep.temps, essais: ep.essais,
        passage: ep.passage || "groupe", critere: ep.critere, materiel: ep.materiel,
        equipements: ep.equipements, aide: aide ? m.aide : "",
        bande: BANDES[i % BANDES.length],
        niveau: !!ep.niveau,
        estMedley: ep.mesure === "medley",
        libNiveau: ep.niveau ? "Épreuve à niveaux" : "Sans niveau",
        fondNiveau: ep.niveau ? "#0B9237" : "#FFFFFF",
        encreNiveau: ep.niveau ? "#FFFFFF" : "#6E675C",
        bordNiveau: ep.niveau ? "#0B9237" : "#DDD6C9",
        aideNiveau: ep.niveau
          ? "Chaque athlète déclare son niveau sur sa fiche. Il est rappelé à la sélection de l'épreuve et affiché sur le mur LED pendant son passage."
          : "Pour une épreuve de tenue où la prise dépend de la taille de l'athlète — les Piliers d'Hercule par exemple — activez les niveaux.",
        niveauxOptions: ep.niveauxOptions || "",
        setNiveauxOptions: set("niveauxOptions"),
        ateliers: ep.ateliers || "", distanceTotale: ep.distanceTotale || "", regleFin: ep.regleFin || "",
        setAteliers: set("ateliers"), setDistanceTotale: set("distanceTotale"), setRegleFin: set("regleFin"),
        basculerNiveau: () => this.maj(x => { const t = x.epreuves.find(y => y.id === ep.id); if (t) t.niveau = !t.niveau; }),
        setNom: set("nom"), setMesure: set("mesure"), setTemps: set("temps"), setEssais: set("essais"),
        setPassage: set("passage"), setCritere: set("critere"), setMateriel: set("materiel"),
        setEquipements: set("equipements"),
        suppr: () => this.maj(x => { x.epreuves = x.epreuves.filter(y => y.id !== ep.id); })
      };
    });

    const groupes = d.groupes.map((g, i) => {
      const set = (champ) => (e) => { const v = e.target.value; this.maj(x => { const t = x.groupes.find(y => y.id === g.id); if (t) t[champ] = v; }); };
      const n = d.athletes.filter(a => a.groupeId === g.id).length;
      const actif = g.actif !== false;
      const aSupprimer = this.state.groupeASupprimer === g.id;
      return {
        nom: g.nom, min: g.min, max: g.max, bande: i === 0 ? "#0B9237" : "#EC6D23",
        effectif: n === 0 ? "Aucun athlète affecté" : (n === 1 ? "1 athlète affecté" : n + " athlètes affectés"),
        setNom: set("nom"), setMin: set("min"), setMax: set("max"),
        actif,
        fondRetenue: actif ? "#0B9237" : "#FFFFFF",
        encreRetenue: actif ? "#FFFFFF" : "#0B9237",
        bordRetenue: actif ? "#0B9237" : "#B7DCC4",
        fondCote: actif ? "#FFFFFF" : "#C4361F",
        encreCote: actif ? "#C4361F" : "#FFFFFF",
        bordCote: actif ? "#E9CFC4" : "#C4361F",
        etatCategorie: actif ? "Retenue : cette catégorie est proposée au plateau et affichée sur les écrans."
                             : "Mise de côté : cette catégorie n'apparaît ni au plateau, ni sur les écrans.",
        pariteVal: g.parite || "",
        libParite: this.pariteGroupe(g) === "pair" ? "Dossards pairs (2, 4, 6…)"
                 : (this.pariteGroupe(g) === "impair" ? "Dossards impairs (1, 3, 5…)" : "Dossards à la suite"),
        setParite: (e) => { const v = e.target.value; this.maj(x => { const t = x.groupes.find(y => y.id === g.id); if (t) t.parite = v; }); },
        retenir: () => this.maj(x => { const t = x.groupes.find(y => y.id === g.id); if (t) t.actif = true; }),
        mettreDeCote: () => this.maj(x => { const t = x.groupes.find(y => y.id === g.id); if (t) t.actif = false; }),
        aSupprimer,
        avertSuppr: n === 0 ? "Cette catégorie ne contient aucun athlète. Confirmez la suppression."
          : (n === 1 ? "1 athlète est affecté à cette catégorie. Il sera remis sans catégorie et sortira des classements tant qu'il n'est pas réaffecté."
                     : n + " athlètes sont affectés à cette catégorie. Ils seront remis sans catégorie et sortiront des classements tant qu'ils ne sont pas réaffectés."),
        demanderSuppr: () => this.setState({ groupeASupprimer: g.id }),
        annulerSuppr: () => this.setState({ groupeASupprimer: null }),
        suppr: () => {
          this.maj(x => {
            x.groupes = x.groupes.filter(y => y.id !== g.id);
            x.athletes.forEach(a => { if (a.groupeId === g.id) { a.groupeId = null; a.verrou = false; } });
            x.passages = (x.passages || []).filter(p => p.groupeId !== g.id);
          });
          this.setState({ groupeASupprimer: null });
        }
      };
    });

    const officiels = d.officiels.map(o => {
      const set = (champ) => (e) => { const v = e.target.value; this.maj(x => { const t = x.officiels.find(y => y.id === o.id); if (t) t[champ] = v; }); };
      return {
        nom: o.nom, role: o.role, code: o.code,
        setNom: set("nom"), setRole: set("role"), setCode: set("code"),
        suppr: () => this.maj(x => { x.officiels = x.officiels.filter(y => y.id !== o.id); })
      };
    });

    const epsNiveau = (d.epreuves || []).filter(e => e.niveau);
    const catsNiveauOpt = (d.groupes || []).filter(g => g.actif !== false).map(g => ({ id:g.id, nom:g.nom }));
    const athletes = (() => {
      const q = sansAcc(this.state.recherche);
      const f = this.state.filtre;
      const avecDossard = d.athletes.some(a => a.dossard);
      let liste = d.athletes.slice().sort((a, b) => avecDossard
        ? ((parseInt(a.dossard, 10) || 999) - (parseInt(b.dossard, 10) || 999))
        : String(a.nom || "").localeCompare(String(b.nom || ""), "fr"));
      if (q) liste = liste.filter(a => sansAcc((a.nom || "") + " " + (a.prenoms || "") + " " + (a.club || "")).includes(q));
      if (f === "acompleter") liste = liste.filter(a => a.aVerifier || !a.prenoms || !a.poids);
      else if (f && f.indexOf("club:") === 0) {
        const c = f.slice(5);
        liste = liste.filter(a => ((a.club && a.club.trim()) ? a.club : "Indépendant") === c);
      }
      return liste.map(a => {
        const set = (champ) => (e) => { const v = e.target.value; this.maj(x => { const t = x.athletes.find(y => y.id === a.id); if (t) t[champ] = v; }); };
        const p = PAYS[a.pays] || PAYS.CIV;
        const invite = this.estInvite(a);
        const ini = ((a.nom || "?").charAt(0) + (a.prenoms || "").charAt(0)).toUpperCase();
        const g = d.groupes.find(x => x.id === a.groupeId);
        const manque = [];
        if (!a.prenoms) manque.push("prénoms");
        if (!a.poids) manque.push("pesée");
        if (!a.photo) manque.push("photo");
        return {
          id: a.id, ouvert: !!this.state.ouvertes[a.id],
          basculer: () => this.setState(st => {
            const o = Object.assign({}, st.ouvertes); o[a.id] = !o[a.id]; return { ouvertes:o };
          }),
          nom: a.nom, prenoms: a.prenoms, club: a.club, pays: a.pays || "CIV", note: a.note || "",
          taille: a.taille || "", age: a.age || "", commune: a.commune || "",
          tel: a.tel || "", urgence: a.urgence || "", poidsDeclare: a.poidsDeclare || "",
          nomAffiche: ((a.nom || "").toUpperCase() + " " + (a.prenoms || "")).trim() || "Fiche sans nom",
          clubAffiche: (a.club && a.club.trim()) ? a.club : "Indépendant",
          dossard: a.dossard || "—", groupeNom: g ? g.nom : (a.hors ? "Indépendant" : "—"),
          initiales: a.photo ? "" : ini,
          photoFond: this.fondImage(a.photo),
          sansPhoto: !a.photo,
          d1: p.c[0], d2: p.c[1], d3: p.c[2],
          categorieId: a.hors ? "hors" : (g ? a.groupeId : ""),
          erreurCat: (this.state.erreurCat || {})[a.id] || "",
          dossardSaisi: a.dossard || "",
          setDossard: (e) => { const v = e.target.value; this.maj(x => { const t = x.athletes.find(y => y.id === a.id); if (t) t.dossard = v; }); },
          niveaux: epsNiveau.map(ep => ({
            nom: ep.nom,
            val: ((a.niveaux || {})[ep.id]) || "",
            options: String(ep.niveauxOptions || "").split(",").map(s => s.trim()).filter(Boolean).map(s => ({ v:s })),
            set: (e) => { const v = e.target.value; this.maj(x => { const t = x.athletes.find(y => y.id === a.id); if (t) t.niveaux = Object.assign({}, t.niveaux, { [ep.id]: v }); }); }
          })),
          aNiveaux: epsNiveau.length > 0,
          poidsPesee: a.poids ? String(a.poids).replace(".", ",") + " kg" : "Pas encore pesé",
          poidsCouleur: a.poids ? (a.verrou ? "#03562A" : "#141210") : "#8A8378",
          poidsMention: a.verrou ? "Pesée validée — dossard et catégorie verrouillés" : (a.poids ? "Poids saisi, pesée non validée" : "À relever à l'étape Pesée"),
          setCategorie: (e) => {
            const err = this.affecterCategorie(a.id, e.target.value);
            this.setState(st => { const m = Object.assign({}, st.erreurCat); if (err) m[a.id] = err; else delete m[a.id]; return { erreurCat:m }; });
          },
          invite: !!a.invite,
          libInvite: a.invite ? "Invité — hors classement" : "Classer cet athlète",
          fondInvite: a.invite ? "#BC4F14" : "#FCFAF6",
          encreInvite: a.invite ? "#FFFFFF" : "#6E675C",
          bordInvite: a.invite ? "#BC4F14" : "#DDD6C9",
          basculerInvite: () => this.maj(x => { const t = x.athletes.find(y => y.id === a.id); if (t) t.invite = !t.invite; }),
          statut: invite ? "Invité" : (a.verrou ? "Pesée validée" : "Engagé"),
          statutCouleur: invite ? "#BC4F14" : (a.verrou ? "#0B9237" : "#8A8378"),
          alerte: a.aVerifier ? "À vérifier" : (manque.length ? "Manque : " + manque.join(", ") : ""),
          alerteCouleur: a.aVerifier ? "#BC4F14" : "#8A8378",
          libBasculer: this.state.ouvertes[a.id] ? "Replier" : "Modifier",
          setNom: set("nom"), setPrenoms: set("prenoms"), setClub: set("club"),
          setPays: set("pays"), setNote: set("note"), setTaille: set("taille"),
          setAge: set("age"), setCommune: set("commune"), setTel: set("tel"), setUrgence: set("urgence"),
          setPhoto: (e) => this.photoFichier(a.id, e),
          vu: () => this.maj(x => { const t = x.athletes.find(y => y.id === a.id); if (t) t.aVerifier = false; }),
          suppr: () => this.maj(x => { x.athletes = x.athletes.filter(y => y.id !== a.id); })
        };
      });
    })();

    const categoriesOptions = catsNiveauOpt;
    const idsGroupes = new Set((d.groupes || []).map(g => g.id));
    const selAth = this.state.selAthletes || {};
    const sansCategorie = d.athletes.filter(a => !a.hors && !idsGroupes.has(a.groupeId)).map(a => ({
      id: a.id,
      nom: ((a.nom || "").toUpperCase() + " " + (a.prenoms || "")).trim() || "Fiche sans nom",
      detail: (a.poids ? a.poids + " kg pesé" : "Pas encore pesé") + " · " + ((a.club && a.club.trim()) ? a.club : "Indépendant"),
      coche: !!selAth[a.id],
      libCoche: selAth[a.id] ? "✓" : "",
      fondCoche: selAth[a.id] ? "#0B9237" : "#FFFFFF",
      bordCoche: selAth[a.id] ? "#0B9237" : "#DDD6C9",
      basculerCoche: () => this.setState(st => {
        const s = Object.assign({}, st.selAthletes); if (s[a.id]) delete s[a.id]; else s[a.id] = true;
        return { selAthletes:s, msgAffectation:"" };
      }),
      choix: "",
      erreur: (this.state.erreurCat || {})[a.id] || "",
      setChoix: (e) => {
        const v = e.target.value;
        if (!v) return;
        const err = this.affecterCategorie(a.id, v);
        this.setState(st => { const m = Object.assign({}, st.erreurCat); if (err) m[a.id] = err; else delete m[a.id]; return { erreurCat:m }; });
      }
    }));

    const clubsListe = Array.from(new Set(d.athletes.map(a => (a.club || "").trim()).filter(Boolean))).sort();
    const clubs = clubsListe.map(c => ({
      nom: c,
      effectif: d.athletes.filter(a => (a.club || "").trim() === c).length + " athlète(s)",
      logo: (d.logos && d.logos[c]) ? this.fondImage(d.logos[c]) : "none",
      setLogo: (e) => this.logoClub(c, e),
      retirer: () => this.maj(x => { x.logos = Object.assign({}, x.logos || {}); delete x.logos[c]; })
    }));

    const pesee = d.athletes.map(a => {
      const g = d.groupes.find(x => x.id === a.groupeId);
      const gPrev = this.groupePour(a.poids);
      return {
        dossard: a.dossard || "—",
        dossardCouleur: a.dossard ? "#141210" : "#C4BCAC",
        nomComplet: ((a.nom || "") + " " + (a.prenoms || "")).trim() || "Athlète sans nom",
        sousTitre: (a.club && a.club.trim() ? a.club : "Indépendant") + " · " + ((PAYS[a.pays] || PAYS.CIV).n),
        poids: a.poids || "",
        verrou: !!a.verrou,
        champFond: a.verrou ? "#F5F1E8" : "#FCFAF6",
        groupe: g ? g.nom : (gPrev ? gPrev.nom + " (prévu)" : "—"),
        btnTexte: a.verrou ? "Déverrouiller" : "Valider la pesée",
        btnFond: a.verrou ? "#FFFFFF" : "#0B9237",
        btnEncre: a.verrou ? "#141210" : "#FFFFFF",
        btnBord: a.verrou ? "#DDD6C9" : "#0B9237",
        setPoids: (e) => { const v = e.target.value; this.maj(x => { const t = x.athletes.find(y => y.id === a.id); if (t) t.poids = v; }); },
        erreur: (this.state.erreurPesee || {})[a.id] || "",
        dossardSaisi: a.dossard || "",
        setDossard: (e) => { const v = e.target.value; this.maj(x => { const t = x.athletes.find(y => y.id === a.id); if (t) t.dossard = v; }); },
        categorieId: a.hors ? "hors" : (g && g.actif !== false ? a.groupeId : ""),
        setCategorie: (e) => {
          const err = this.affecterCategorie(a.id, e.target.value);
          if (err) this.erreurPesee(a.id, err); else this.effacerErreurPesee(a.id);
        },
        basculer: () => {
          if (a.verrou) {
            this.maj(x => { const t = x.athletes.find(y => y.id === a.id); if (t) t.verrou = false; });
            return;
          }
          const poidsOk = !isNaN(parseFloat(String(a.poids).replace(",", ".")));
          if (!poidsOk) { this.erreurPesee(a.id, "Poids manquant : relevez le poids à la bascule avant de valider."); return; }
          const deja = (d.groupes || []).find(x => x.id === a.groupeId && x.actif !== false);
          const gg = deja || this.groupePour(a.poids);
          if (!gg && !a.hors) {
            this.erreurPesee(a.id, "Catégorie non sélectionnée : aucune catégorie retenue ne correspond à " + a.poids + " kg. Choisissez la catégorie dans la colonne Catégorie, ou ajustez les limites à l'étape Groupes de poids.");
            return;
          }
          if (gg) {
            const err = this.poidsHorsLimite(a.poids, gg);
            if (err) { this.erreurPesee(a.id, err); return; }
          }
          this.maj(x => {
            const t = x.athletes.find(y => y.id === a.id);
            if (!t) return;
            if (gg) { t.groupeId = gg.id; t.hors = false; }
            t.verrou = true;
          });
          this.effacerErreurPesee(a.id);
        }
      };
    });

    const programme = d.programme.map(pr => {
      const set = (champ) => (e) => { const v = e.target.value; this.maj(x => { const t = x.programme.find(y => y.id === pr.id); if (t) t[champ] = v; }); };
      return { h: pr.h, txt: pr.txt, setH: set("h"), setTxt: set("txt"),
        suppr: () => this.maj(x => { x.programme = x.programme.filter(y => y.id !== pr.id); }) };
    });

    const ligne = (ok, titre, detail, i) => ({
      signe: ok ? "✓" : "!", couleur: ok ? "#0B9237" : "#EC6D23",
      pucefond: ok ? "rgba(11,146,55,.12)" : "rgba(236,109,35,.14)",
      titre, detail, aller: () => this.aller("prepa", i)
    });
    const recap = [
      ligne(b.epreuves >= 1, "Épreuves", b.epreuves + " épreuve(s) définie(s)", 0),
      ligne(b.groupes >= 1, "Groupes de poids", b.groupes + " groupe(s)", 1),
      ligne(b.officiels >= 5, "Officiels", b.officiels + " officiel(s) nommé(s), dont " + b.juges + " juge(s) de terrain", 2),
      ligne(b.athletes >= 2 && b.complets === b.athletes, "Athlètes", b.athletes + " engagé(s), " + b.complets + " fiche(s) complète(s)", 3),
      ligne(b.athletes > 0 && b.peses === b.athletes, "Pesée", b.peses + " / " + b.athletes + " pesée(s) validée(s)", 4),
      ligne(b.programme >= 3, "Programme", b.programme + " ligne(s) au programme", 5)
    ];
    const manques = recap.filter(r => r.signe === "!").length;

    /* ── Connexion par rôle ── */
    const acces = d.acces || { admin:"", regie:"" };
    const ACCES = [
      { id:"admin", nom:"Administrateur du logiciel", role:"Direction et table", initiales:"AD",
        portee:"Préparation, plateau, saisie des performances, impressions", droit:"tout", code:(acces.admin || "").trim() },
      { id:"regie", nom:"Régie de diffusion", role:"Écrans géants", initiales:"RG",
        portee:"Choix des contenus et ouverture des écrans LED", droit:"regie", code:(acces.regie || "").trim() }
    ];
    const comptes = ACCES.filter(o => o.code).map(o => {
      const ouvert = this.state.connexionId === o.id;
      return Object.assign({}, o, {
        ouvert,
        bord: ouvert ? "#141210" : "#E7E1D6",
        libAction: ouvert ? "Code ci-dessous" : "Se connecter",
        choisir: () => this.setState({ connexionId: ouvert ? null : o.id, codeSaisi:"", erreurCode:"" }),
        valider: () => this.connexion(o),
        touche: (e) => { if (e.key === "Enter") this.connexion(o); }
      });
    });
    const besoinLogin = this.state.vue !== "solo" && !this.state.session && comptes.length > 0;
    const droit = this.state.session ? this.state.session.droit : "tout";

    /* ── Identité du championnat ── */
    const ch = d.champ || {};
    const setChamp = (k) => (e) => { const v = e.target.value; this.maj(x => { x.champ = Object.assign({}, x.champ); x.champ[k] = v; }); };

    /* ── Plateau ── */
    const epC = this.epreuveCourante();
    const grC = this.groupeCourant();
    const mC = epC ? (MESURES.find(x => x.cle === epC.mesure) || MESURES[0]) : MESURES[0];
    const uniteVal = { nb_temps:"Nombre validé", poids:"Charge (kg)", duree:"Maintien (s)", distance:"Distance (m)", chrono:"Temps (s)" }[mC.cle];
    const chrono = this.state.ch;
    let resteAffiche = chrono.reste;
    if (chrono.phase === "encours" && chrono.t0) {
      const ecoule = (Date.now() - chrono.t0) / 1000;
      resteAffiche = chrono.duree > 0 ? Math.max(0, chrono.duree - ecoule) : ecoule;
    }
    /* Alerte visuelle : flash à chaque demi-minute, rouge clignotant sur les 30 dernières secondes */
    const passeChrono = chrono.duree > 0 ? chrono.duree - resteAffiche : resteAffiche;
    const finalChrono = chrono.phase === "encours" && chrono.duree > 0 && resteAffiche <= 30;
    const flashChrono = chrono.phase === "encours" && !finalChrono
      && passeChrono >= 29 && (Math.floor(passeChrono) % 30) < 2;
    const couleurChrono = finalChrono ? "#C4361F" : (flashChrono ? "#EC6D23" : "");
    const animChrono = (finalChrono || flashChrono) ? "clignote .6s steps(1,end) infinite" : "none";
    const COUL_CAT = ["#EC6D23","#0B9237","#3E7CB1","#B4692F","#8E44AD","#C4361F","#0F8B8D"];
    const infoCat = (a) => {
      const i = (d.groupes || []).findIndex(g => g.id === a.groupeId);
      const g = i >= 0 ? d.groupes[i] : null;
      return { id: g ? g.id : "sans", nom: g ? g.nom : "Sans catégorie", couleur: COUL_CAT[(i < 0 ? 6 : i) % COUL_CAT.length] };
    };
    const ligneAthlete = (p) => {
      const a = d.athletes.find(x => x.id === p.athleteId) || {};
      const pays = PAYS[a.pays || "CIV"] || PAYS.CIV;
      const cat = infoCat(a);
      return {
        catId: cat.id, categorie: cat.nom, catCouleur: cat.couleur,
        poidsTexte: a.poids ? String(a.poids).replace(".", ",") + " kg" : "Non pesé",
        niveau: (epC && epC.niveau) ? (((a.niveaux || {})[epC.id]) || "Niveau non déclaré") : "",
        aNiveau: !!(epC && epC.niveau),
        nationalite: pays.n,
        id: p.id, ordre: p.ordre, dossard: a.dossard || "—",
        nom: ((a.nom || "").toUpperCase() + " " + (a.prenoms || "")).trim() || "Athlète",
        club: (a.club && a.club.trim()) ? a.club : "Indépendant",
        clubMention: ((a.club && a.club.trim()) ? a.club : "Indépendant") + (this.estInvite(a) ? " · Invité, hors classement" : ""),
        photoBg: this.fondImage(a.photo),
        aPhoto: !!a.photo,
        logoBg: this.fondImage((d.logos || {})[(a.club || "").trim()]),
        aLogo: !!((d.logos || {})[(a.club || "").trim()]),
        sansPhoto: !a.photo,
        initiales: ((a.nom || "?").charAt(0) + (a.prenoms || "").charAt(0)).toUpperCase(),
        invite: this.estInvite(a),
        mention: this.estInvite(a) ? "Invité — hors classement" : "",
        d1: pays.c[0], d2: pays.c[1], d3: pays.c[2], paysNom: pays.n,
        note: a.note || ""
      };
    };
    const texteResultat = (p) => {
      if (!p.resultat) return "—";
      if (p.resultat.statut === "zero") return "ZÉRO";
      if (p.resultat.statut === "forfait") return "FORFAIT";
      const v = p.resultat.valeur;
      const u = { nb_temps:"", poids:" kg", duree:" s", chrono:" s", distance:" m", medley:" m" }[epC ? epC.mesure : "poids"] || "";
      return String(v).replace(".", ",") + u + (p.resultat.temps != null ? " · " + String(p.resultat.temps).replace(".", ",") + " s" : "");
    };
    const avenir = this.file("avenir").map(p => Object.assign(ligneAthlete(p), {
      appeler: () => this.appeler(p.id)
    }));
    const lPlateau = this.file("plateau");
    const pPlateau = lPlateau[0] || null;
    const pPlateau2 = lPlateau[1] || null;
    const uniteVal2 = epC ? ({
      distance:"Distance (m)", medley:"Distance parcourue (m)", duree:"Durée tenue (s)",
      poids:"Charge (kg)", chrono:"Temps (s)"
    }[epC.mesure] || "Nombre validé") : "Performance";
    const libTemps2 = (epC && (epC.mesure === "distance" || epC.mesure === "medley" || epC.mesure === "chrono"))
      ? "Temps mis (s)" : "Temps du dernier tour (s)";
    const plateaux = lPlateau.map(p => {
      const s = this.saisieDe(p.id);
      const tp = (this.state.toursPar || {})[p.id] || [];
      return Object.assign(ligneAthlete(p), {
        valeur: s.valeur, temps: s.temps,
        toursActifs: !!(epC && epC.tours),
        tours: tp.map((t, i) => ({ num:i + 1, t: String(t).replace(".", ",") + " s" })),
        nbTours: tp.length ? tp.length + (tp.length > 1 ? " répétitions validées" : " répétition validée") : "Aucune répétition encore comptée",
        aDesTours: tp.length > 0,
        tour: () => this.tourPour(p.id),
        annulerTour: () => this.annulerTour(p.id),
        uniteValeur: uniteVal2, libTemps: libTemps2,
        mixte: !!(epC && (epC.mesure === "nb_temps" || epC.mesure === "distance" || epC.mesure === "medley")),
        erreur: (this.state.erreurSaisie || {})[p.id] || "",
        setValeur: (e) => this.setSaisie(p.id, "valeur", e.target.value),
        setTemps: (e) => this.setSaisie(p.id, "temps", e.target.value),
        officialiser: () => this.officialiser(p.id, "ok"),
        zero: () => this.officialiser(p.id, "zero"),
        forfait: () => this.officialiser(p.id, "forfait"),
        renvoyer: () => this.renvoyer(p.id)
      });
    });
    const termines = this.file("termine").map(p => {
      const st = p.resultat ? p.resultat.statut : "";
      const hs = st === "forfait" || st === "zero";
      return Object.assign(ligneAthlete(p), {
        texte: texteResultat(p),
        couleurTexte: st === "forfait" ? "#C4361F" : (st === "zero" ? "#A6371C" : "#141210"),
        fondLigneRes: hs ? "#FBEFEA" : "transparent",
        encreNom: st === "forfait" ? "#A6371C" : "#141210",
        renvoyer: () => this.renvoyer(p.id)
      });
    }).reverse();
    const auPlateau = pPlateau ? Object.assign(ligneAthlete(pPlateau), {
      officialiser: () => this.officialiser(pPlateau.id, "ok"),
      zero: () => this.officialiser(pPlateau.id, "zero"),
      forfait: () => this.officialiser(pPlateau.id, "forfait"),
      renvoyer: () => this.renvoyer(pPlateau.id)
    }) : null;

    const clEpreuve = epC && grC ? this.tableauEpreuve(epC.id, grC.id)
      .filter(x => x.rang)
      .map(x => ({ rang:x.rang, nom:this.nomAthlete(x.athleteId), points:x.points,
                   perf: x.r ? (String(x.r.valeur).replace(".", ",")) : "—" })) : [];
    const clGeneral = grC ? this.tableauGeneral(grC.id)
      .map(x => ({ rang:x.rang, nom:this.nomAthlete(x.athleteId), total:x.total })) : [];

    /* Classements toujours séparés par catégorie, jamais fusionnés */
    const ligneCl = (x) => {
      const at = d.athletes.find(y => y.id === x.athleteId) || {};
      return { rang:x.rang, nom:this.nomAthlete(x.athleteId), total:x.total,
        photoBg: this.fondImage(at.photo), sansPhoto: !at.photo,
        initiales: ((at.nom || "?").charAt(0) + (at.prenoms || "").charAt(0)).toUpperCase() };
    };
    const catsActives = (d.groupes || []).filter(g => g.actif !== false);
    const clParCat = catsActives.map((g, i) => ({
      id: g.id, nom: g.nom, couleur: COUL_CAT[i % COUL_CAT.length],
      lignes: this.tableauGeneral(g.id).map(ligneCl).slice(0, 10)
    }));
    const epParCat = epC ? catsActives.map((g, i) => ({
      id: g.id, nom: g.nom, couleur: COUL_CAT[i % COUL_CAT.length],
      lignes: this.tableauEpreuve(epC.id, g.id).filter(x => x.rang).map(x => {
        const l = ligneCl(x);
        l.points = x.points;
        l.perf = x.r ? (String(x.r.valeur).replace(".", ",") + (x.r.temps != null ? " · " + String(x.r.temps).replace(".", ",") + " s" : "")) : "—";
        return l;
      }),
      aucun: this.tableauEpreuve(epC.id, g.id).filter(x => x.rang).length === 0
    })) : [];

    /* ── Régie et écrans ── */
    const CONTENUS = [
      { cle:"attente", lbl:"Écran d'attente" },
      { cle:"plateau", lbl:"Athlète au plateau + chronomètre" },
      { cle:"ordre", lbl:"Ordre de passage à venir" },
      { cle:"verdict", lbl:"Dernier verdict validé" },
      { cle:"classement", lbl:"Classement général par catégorie" },
      { cle:"podium", lbl:"Podium et palmarès" },
      { cle:"mire", lbl:"Mire de lisibilité" }
    ];
    const theme = (d.regie && d.regie.theme) || "nuit";
    const ecrans = (d.ecrans || []).map(e => ({
      nom: e.nom, contenuCle: e.contenu,
      libContenu: (CONTENUS.find(c => c.cle === e.contenu) || CONTENUS[0]).lbl,
      setNom: (ev) => { const v = ev.target.value; this.maj(x => { const t = x.ecrans.find(y => y.id === e.id); if (t) t.nom = v; }); },
      setContenu: (ev) => { const v = ev.target.value; this.maj(x => { const t = x.ecrans.find(y => y.id === e.id); if (t) t.contenu = v; }); },
      ouvrir: () => window.open(location.pathname + "?ecran=" + e.contenu + "&theme=" + theme + "&espace=" + this.state.espace, "_blank", "width=1280,height=720"),
      apercu: () => this.setState({ apercu: e.contenu }),
      mire: () => window.open(location.pathname + "?ecran=mire&theme=" + theme, "_blank", "width=1280,height=720"),
      suppr: () => this.maj(x => { x.ecrans = x.ecrans.filter(y => y.id !== e.id); })
    }));

    /* ── Écran plein cadre ── */
    const solo = this.state.solo || this.state.apercu || null;
    const nuit = this.state.apercu ? (theme === "nuit") : (this.state.soloTheme !== "jour");
    const dernier = d.passages.filter(p => p.statut === "termine" && p.resultat)
      .sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || "")))[0] || null;

    /* ── Ordre de passage détaillé par catégorie ── */
    const ordreCats = [];
    avenir.forEach(l => {
      let c = ordreCats.find(x => x.id === l.catId);
      if (!c) { c = { id:l.catId, nom:l.categorie, couleur:l.catCouleur, liste:[] }; ordreCats.push(c); }
      c.liste.push(Object.assign({}, l, {
        rangCat: c.liste.length + 1,
        prochainCat: c.liste.length === 0,
        fondLigne: c.liste.length === 0 ? (nuit ? "rgba(252,250,246,.10)" : "rgba(20,18,16,.05)") : "transparent",
        fondClair: c.liste.length === 0 ? "#FFF6E8" : "#FFFFFF"
      }));
    });
    ordreCats.forEach(c => {
      c.nb = c.liste.length;
      c.compte = c.liste.length + (c.liste.length > 1 ? " athlètes à passer" : " athlète à passer");
      c.prochainDossard = c.liste[0] ? c.liste[0].dossard : "—";
      c.prochainNom = c.liste[0] ? c.liste[0].nom : "Catégorie terminée";
      c.prochainClub = c.liste[0] ? c.liste[0].club : "";
      c.liste = c.liste.slice(0, 8);
      c.appelerProchain = c.liste[0] ? c.liste[0].appeler : (() => {});
    });
    const melange = !!(grC && grC.id === "tous" && ordreCats.length > 1);
    /* ── Compte à rebours de l'écran d'attente ── */
    const cible = dateCible(ch);
    let compteur = "", compteurLib = "";
    if (cible) {
      const reste = cible.getTime() - Date.now();
      if (reste > 0) {
        const j = Math.floor(reste / 86400000);
        const hh = Math.floor((reste % 86400000) / 3600000);
        const mm = Math.floor((reste % 3600000) / 60000);
        const ss = Math.floor((reste % 60000) / 1000);
        const p2 = (n) => (n < 10 ? "0" + n : String(n));
        compteur = j > 0 ? j + "j " + p2(hh) + "h " + p2(mm) + "min"
                         : p2(hh) + ":" + p2(mm) + ":" + p2(ss);
        compteurLib = j > 0 ? "Avant le coup d'envoi" : "Coup d'envoi dans";
      } else {
        compteur = "En cours";
        compteurLib = "Championnat";
      }
    } else {
      compteur = ch.heure || "";
      compteurLib = "Coup d'envoi";
    }
    const prochain = avenir[0] || null;

    /* Écran d'attente : liste complète, par pages de 10 qui défilent toutes les 8 secondes */
    const tousEngages = d.athletes
      .slice()
      .sort((a, b) => (parseInt(a.dossard, 10) || 999) - (parseInt(b.dossard, 10) || 999))
      .map(a => ({
        dossard: a.dossard || "—",
        nom: ((a.nom || "").toUpperCase() + " " + (a.prenoms || "")).trim() || "—",
        club: (a.club && a.club.trim()) ? a.club : "Indépendant",
        photoBg: this.fondImage(a.photo), sansPhoto: !a.photo,
        initiales: ((a.nom || "?").charAt(0) + (a.prenoms || "").charAt(0)).toUpperCase()
      }));
    const nbPagesEng = Math.max(1, Math.ceil(tousEngages.length / 10));
    const pageEng = nbPagesEng > 1 ? (this.state.pgEng || 0) % nbPagesEng : 0;
    const pageEngages = tousEngages.slice(pageEng * 10, pageEng * 10 + 10);
    const pagesEng = [];
    for (let i = 0; i < nbPagesEng; i++) {
      pagesEng.push({ n:i + 1, fond: i === pageEng ? "#EC6D23" : "rgba(154,167,158,.35)", large: i === pageEng ? "4vw" : "1.4vw" });
    }

    const recs = (d.recompenses && d.recompenses.length ? d.recompenses : RECOMPENSES_DEF);
    const podium = grC ? this.tableauGeneral(grC.id).slice(0, 3).map((x, i) => {
      const at = d.athletes.find(y => y.id === x.athleteId) || {};
      const r = recs[i] || {};
      return {
        rang: x.rang, nom: this.nomAthlete(x.athleteId), total: x.total,
        photoBg: this.fondImage(at.photo), sansPhoto: !at.photo,
        initiales: ((at.nom || "?").charAt(0) + (at.prenoms || "").charAt(0)).toUpperCase(),
        prime: r.prime || "",
        metal: r.titre || ["Médaille d'or","Médaille d'argent","Médaille de bronze"][i] || "",
        couleur: ["#D9A441","#9AA0A6","#B4692F"][i] || "#8A8378"
      };
    }) : [];
    const recompenses = recs.map((r, i) => ({
      rang: i + 1,
      libRang: ["1ère place","2e place","3e place","4e place","5e place","6e place"][i] || (i + 1) + "e place",
      titre: r.titre || "", prime: r.prime || "", lot: r.lot || "",
      couleur: ["#D9A441","#9AA0A6","#B4692F"][i] || "#8A8378",
      setTitre: (e) => this.majRecompense(i, "titre", e.target.value),
      setPrime: (e) => this.majRecompense(i, "prime", e.target.value),
      setLot: (e) => this.majRecompense(i, "lot", e.target.value),
      suppr: () => this.maj(x => { x.recompenses = (x.recompenses && x.recompenses.length ? x.recompenses : RECOMPENSES_DEF.slice()).filter((y, j) => j !== i); })
    }));

    return {
      /* identité */
      champNom: ch.nom || "", champDate: ch.date || "", champHeure: ch.heure || "",
      champFin: ch.fin || "", champLieu: ch.lieu || "", champAdresse: ch.adresse || "",
      setChampNom: setChamp("nom"), setChampDate: setChamp("date"), setChampHeure: setChamp("heure"),
      setChampFin: setChamp("fin"), setChampLieu: setChamp("lieu"), setChampAdresse: setChamp("adresse"),
      /* plateau */
      estPlateau: this.state.vue === "plateau" && !besoinLogin,
      estRegie: this.state.vue === "regie" && !besoinLogin,
      estSolo: !!solo,
      apercuOuvert: !!this.state.apercu,
      fermerApercu: () => this.setState({ apercu:null }),
      versPlateau: () => { this.aller("plateau"); setTimeout(this.assurerFile, 0); },
      versRegie: () => this.aller("regie"),
      epreuveCouranteId: epC ? epC.id : "",
      groupeCourantId: grC ? grC.id : "",
      nomEpreuveCourante: epC ? epC.nom : "—",
      critereCourant: epC ? epC.critere : "",
      epreuveANiveaux: !!(epC && epC.niveau),
      messageNiveaux: epC && epC.niveau
        ? "Épreuve à niveaux : chaque athlète concourt au niveau qu'il a déclaré sur sa fiche. Le niveau est rappelé dans la file d'attente, au plateau et sur le mur LED. Un niveau manquant se corrige à l'étape Athlètes."
        : "",
      ateliersCourants: epC && epC.mesure === "medley" ? String(epC.ateliers || "").split("\n").map(s => s.trim()).filter(Boolean).map((s, i) => ({ num:i + 1, txt:s })) : [],
      estMedleyCourant: !!(epC && epC.mesure === "medley"),
      distanceMedley: epC ? (epC.distanceTotale || "") : "",
      nomGroupeCourant: grC ? grC.nom : "—",
      uniteValeur: uniteVal,
      mixte: !!(epC && (epC.mesure === "nb_temps" || epC.mesure === "distance")),
      toursActifs: !!(epC && epC.tours),
      tour: this.tour,
      chronoEnCours: chrono.phase === "encours",
      laps: (chrono.laps || []).map((t, i) => ({ num:i + 1, t: String(t).replace(".", ",") + " s" })),
      aucunLap: (chrono.laps || []).length === 0,
      libTemps: (epC && epC.mesure === "distance") ? "Temps mis (s)" : "Temps du dernier tour (s)",
      setEpreuveCourante: (e) => { const v = e.target.value; this.maj(x => { x.comp.epreuveId = v; }); setTimeout(this.assurerFile, 0); },
      setGroupeCourant: (e) => { const v = e.target.value; this.maj(x => { x.comp.groupeId = v; }); setTimeout(this.assurerFile, 0); },
      preparerToutes: this.preparerToutes,
      msgPreparation: this.state.msgPreparation || "",
      groupesPlateau: (d.groupes || []).filter(g => g.actif !== false).map(g => ({ id:g.id, nom:g.nom })).concat([{ id:"tous", nom:"Toutes catégories mélangées" }]),
      construireFile: this.construireFile,
      avenir, auPlateau, termines,
      aucunAvenir: avenir.length === 0,
      aucunPlateau: !pPlateau,
      aucunTermine: termines.length === 0,
      nbAvenir: avenir.length, nbTermine: termines.length,
      chronoTexte: mmss(resteAffiche),
      chronoLibelle: chrono.phase === "pret" ? (plateaux.length ? "Démarrer à l'annonce" : "Appelez un athlète d'abord")
        : (chrono.phase === "encours" ? "Arrêter au commencement" : "Réarmer"),
      chronoFond: chrono.phase === "encours" ? "#C4361F" : (chrono.phase === "pret" && !plateaux.length ? "#B8B0A2" : "#0B9237"),
      msgChrono: this.state.msgChrono || "",
      chronoAnim: animChrono,
      chronoCouleurEcran: finalChrono ? "#FF4A2E" : (flashChrono ? "#F7A76C" : (nuit ? "#FCFAF6" : "#141210")),
      chronoCouleurClair: chrono.phase === "encours"
        ? (finalChrono ? "#FF6B52" : (flashChrono ? "#F7A76C" : "#FCFAF6")) : "#FCFAF6",
      chronoEtat: chrono.duree > 0 ? "Décompte préparé : " + chrono.duree + " s" : "Chronomètre montant",
      chronoLibelleEcran: chrono.phase === "encours" ? (chrono.duree > 0 ? "Temps restant" : "Temps écoulé")
        : (chrono.phase === "arrete" ? "Temps arrêté" : "Prêt — " + (grC ? grC.nom : "")),
      chronoAction: this.chronoAction,
      saisieValeur: this.state.saisie.valeur,
      saisieTemps: this.state.saisie.temps,
      setSaisieValeur: (e) => { const v = e.target.value; this.setState(st => ({ saisie: Object.assign({}, st.saisie, { valeur:v }) })); },
      setSaisieTemps: (e) => { const v = e.target.value; this.setState(st => ({ saisie: Object.assign({}, st.saisie, { temps:v }) })); },
      suspendu: !!d.comp.suspendu,
      motifSuspension: d.comp.motif || "",
      suspendre: this.suspendre, reprendre: this.reprendre,
      clEpreuve, clGeneral, clParCat, epParCat,
      aucunClassement: clEpreuve.length === 0,
      /* régie */
      ecrans, contenus: CONTENUS, theme,
      themeLibelle: theme === "nuit" ? "Mur LED en mode nuit" : "Mur LED en mode jour",
      basculerTheme: () => this.maj(x => { x.regie = Object.assign({}, x.regie, { theme: theme === "nuit" ? "jour" : "nuit" }); }),
      ajouterEcran: () => this.maj(x => { x.ecrans = (x.ecrans || []).concat([{ id:this.nid("e"), nom:"Nouvelle sortie", contenu:"attente" }]); }),
      ouvrirMire: () => window.open(location.pathname + "?ecran=mire&theme=" + theme + "&espace=" + this.state.espace, "_blank", "width=1280,height=720"),
      /* écran plein cadre */
      soloAttente: solo === "attente", soloMire: solo === "mire",
      soloPlateauActif: solo === "plateau" && plateaux.length > 0,
      soloPlateauVide: solo === "plateau" && plateaux.length === 0,
      compteur, compteurLib,
      soloProchainBg: prochain ? prochain.photoBg : "none",
      soloProchainAPhoto: !!(prochain && prochain.aPhoto),
      soloProchainDossard: prochain ? prochain.dossard : "",
      soloProchainNom: prochain ? prochain.nom : "",
      soloProchainClub: prochain ? prochain.club : "",
      soloAucunProchain: !prochain,
      soloProchain: !!prochain,
      plateaux,
      plateauVide: plateaux.length === 0,
      annulationOuverte: termines.length > 0 && !(avenir.length === 0 && plateaux.length === 0),
      annulationVerrouillee: termines.length > 0 && avenir.length === 0 && plateaux.length === 0,
      nbPlateau: plateaux.length,
      duoActif: plateaux.length >= 2,
      soloUnSeul: plateaux.length === 1,
      chronoEncadre: (finalChrono || flashChrono) ? (finalChrono ? "#C4361F" : "#EC6D23") : "transparent",
      libPlateau: plateaux.length > 1 ? "Au plateau · " + plateaux.length + " athlètes" : "Au plateau",
      duoA: plateaux[0] || null,
      duoB: plateaux[1] || null,
      appelerDuo: this.appelerDuo,
      libAppelerDuo: "Appeler les " + Math.max(2, ordreCats.length) + " athlètes (un par catégorie)",
      ordreCats, melange,
      retourPassage: this.retourPassage,
      retourEcran: this.retourEcran,
      libRetourEcran: this.state.apercu ? "← Fermer l'aperçu" : "← Retour",
      soloCategorie: auPlateau ? auPlateau.categorie : "",
      soloCatCouleur: auPlateau ? auPlateau.catCouleur : "#EC6D23",
      soloProchainCat: prochain ? prochain.categorie : "",
      soloProchainCatCouleur: prochain ? prochain.catCouleur : "#EC6D23",
      soloOrdre: solo === "ordre" && !melange,
      soloOrdreCats: solo === "ordre" && melange,
      soloVerdict: solo === "verdict",
      soloClassement: solo === "classement", soloPodium: solo === "podium",
      soloFond: nuit ? "#0A0D0B" : "#FCFAF6",
      soloEncre: nuit ? "#FCFAF6" : "#141210",
      soloSecond: nuit ? "#9AA79E" : "#6E675C",
      soloCarte: nuit ? "#141A16" : "#FFFFFF",
      soloBord: nuit ? "#26302A" : "#E7E1D6",
      recompenses,
      ajouterRecompense: () => this.maj(x => {
        const l = (x.recompenses && x.recompenses.length ? x.recompenses : RECOMPENSES_DEF.slice()).slice();
        l.push({ titre:"", prime:"", lot:"" });
        x.recompenses = l;
      }),
      retablirRecompenses: () => this.maj(x => { x.recompenses = RECOMPENSES_DEF.map(r => Object.assign({}, r)); }),
      soloEngages: pageEngages,
      pagesEng,
      plusieursPagesEng: nbPagesEng > 1,
      soloEngagesTitre: nbPagesEng > 1
        ? "Athlètes engagés · " + (pageEng * 10 + 1) + "–" + Math.min(tousEngages.length, pageEng * 10 + 10) + " sur " + tousEngages.length
        : "Athlètes engagés · " + tousEngages.length,
      soloPartenaires: d.partenaires || "",
      soloVerdictNom: dernier ? this.nomAthlete(dernier.athleteId) : "—",
      soloVerdictTexte: dernier ? (dernier.resultat.statut === "ok"
        ? String(dernier.resultat.valeur).replace(".", ",") : (dernier.resultat.statut === "zero" ? "ZÉRO" : "FORFAIT")) : "—",
      soloVerdictValide: !!(dernier && dernier.resultat.statut === "ok"),
      soloVerdictCouleur: dernier && dernier.resultat.statut === "ok" ? "#0B9237" : "#C4361F",
      podium,
      besoinLogin, comptes,
      accesAdmin: acces.admin || "",
      accesRegie: acces.regie || "",
      setAccesAdmin: (e) => { const v = e.target.value; this.maj(x => { x.acces = Object.assign({}, x.acces, { admin:v }); }); },
      setAccesRegie: (e) => { const v = e.target.value; this.maj(x => { x.acces = Object.assign({}, x.acces, { regie:v }); }); },
      erreurEnreg: this.state.erreurEnreg || "",
      codeSaisi: this.state.codeSaisi || "",
      erreurCode: this.state.erreurCode || "",
      setCodeSaisi: (e) => { const v = e.target.value; this.setState({ codeSaisi:v, erreurCode:"" }); },
      ignorerCodes: this.ignorerCodes,
      connecte: !!this.state.session,
      libSession: this.state.session ? (this.state.session.nom + " — changer") : "",
      deconnecter: this.deconnecter,
      peutPreparer: droit === "tout",
      peutPlateau: droit === "tout" || droit === "plateau",
      peutRegie: droit === "tout" || droit === "regie",
      pasSolo: this.state.vue !== "solo" && !besoinLogin,
      estAccueil: this.state.vue === "accueil" && !besoinLogin,
      estPrepa: this.state.vue === "prepa" && !besoinLogin,
      estRecap: this.state.vue === "recap" && !besoinLogin,
      etape0: etape === 0, etape1: etape === 1, etape2: etape === 2,
      etape3: etape === 3, etape4: etape === 4, etape5: etape === 5,
      filAriane: this.state.vue === "accueil" ? "Strongman 2026" :
                 (this.state.vue === "recap" ? "Récapitulatif" :
                 (this.state.vue === "plateau" ? "Plateau · " + (epC ? epC.nom : "") :
                 (this.state.vue === "regie" ? "Régie de diffusion" : "Préparation · " + titresEtapes[etape]))),
      etatTexte: this.state.modifie ? "Modifications non enregistrées" : "À jour",
      etatCouleur: this.state.modifie ? "#BC4F14" : "#0B9237",
      libEnregistrer: this.state.modifie ? "Enregistrer" : "Enregistré",
      libAutoEnreg: this.state.heureEnreg
        ? "Enregistré automatiquement · " + this.state.heureEnreg.getHours() + "h" +
          (this.state.heureEnreg.getMinutes() < 10 ? "0" : "") + this.state.heureEnreg.getMinutes()
        : "Enregistrement automatique actif",
      libPreparer: b.athletes ? "Reprendre la préparation" : "Commencer",
      libSuivant: etape >= 5 ? "Voir le récapitulatif" : "Étape suivante",
      libDemo: "Charger le jeu de démo (" + (this.props.jeuDemo === "24 athlètes" ? "24" : "12") + " athlètes)",
      nbAthletes: b.athletes, nbEpreuves: b.epreuves, nbPeses: b.peses,
      etapes, epreuves, groupes, officiels, athletes, pesee, programme, recap,
      categoriesOptions, sansCategorie,
      aucunSansCategorie: sansCategorie.length === 0,
      ilYaSansCategorie: sansCategorie.length > 0,
      choixGroupe: this.state.choixGroupe || "",
      setChoixGroupe: (e) => { const v = e.target.value; this.setState({ choixGroupe:v, msgAffectation:"" }); },
      libSelection: Object.keys(selAth).length + " sélectionné(s)",
      msgAffectation: this.state.msgAffectation || "",
      toutSelectionner: () => this.setState(() => {
        const s = {}; sansCategorie.forEach(x => { s[x.id] = true; }); return { selAthletes:s, msgAffectation:"" };
      }),
      toutDeselectionner: () => this.setState({ selAthletes:{}, msgAffectation:"" }),
      viderDossards: this.viderDossards,
      affecterSelection: () => {
        const ids = Object.keys(this.state.selAthletes || {});
        if (!ids.length) { this.setState({ msgAffectation:"Cochez d'abord les athlètes à affecter." }); return; }
        const v = this.state.choixGroupe || "";
        if (!v) { this.setState({ msgAffectation:"Choisissez la catégorie d'arrivée dans le menu." }); return; }
        const g = (d.groupes || []).find(x => x.id === v);
        const refus = [];
        const retenus = [];
        ids.forEach(id => {
          const a = d.athletes.find(y => y.id === id);
          if (v !== "hors" && g && this.poidsHorsLimite(a && a.poids, g)) { refus.push(a); return; }
          retenus.push(id);
        });
        this.maj(x => { retenus.forEach(id => this.appliquerCategorie(x, id, v)); });
        const n = retenus.length;
        this.setState({ selAthletes:{},
          msgAffectation: n + " athlète(s) affecté(s)." + (refus.length
            ? " " + refus.length + " refusé(s), poids hors des limites de « " + (g ? g.nom : "") + " » : " +
              refus.map(a => (a.nom || "") + " " + (a.poids ? a.poids + " kg" : "non pesé")).join(", ") + "."
            : "") });
      },
      repartirParPoids: () => {
        const ids = Object.keys(this.state.selAthletes || {});
        const cibles = ids.length ? ids : sansCategorie.map(x => x.id);
        let n = 0, restants = 0;
        const plan = [];
        cibles.forEach(id => {
          const t = d.athletes.find(y => y.id === id);
          if (!t) return;
          const g = this.groupePour(t.poids);
          if (!g) { restants++; return; }
          plan.push([id, g.id]);
          n++;
        });
        this.maj(x => { plan.forEach(pr => this.appliquerCategorie(x, pr[0], pr[1])); });
        this.setState({ selAthletes:{},
          msgAffectation: n + " athlète(s) classé(s) d'après leur poids pesé." +
            (restants ? " " + restants + " sans poids exploitable : affectez-les à la main." : "") });
      },
      nbSansCategorie: sansCategorie.length + (sansCategorie.length > 1 ? " athlètes sans catégorie" : " athlète sans catégorie"),
      mesures: MESURES, roles: ROLES,
      paysListe: Object.keys(PAYS).map(k => ({ code:k, nom:PAYS[k].n }))
        .sort((x, y) => x.nom.localeCompare(y.nom, "fr")),
      partenaires: d.partenaires || "",
      manqueOfficiels: b.officiels >= 5 ? "" : "Nommez au moins cinq officiels : direction, arbitrage, chronométrage, table, régie. Les juges valident l'essai sur le terrain ; c'est la table qui saisit la performance dans l'application.",
      resumePesee: b.athletes === 0 ? "Aucun athlète engagé." : (b.peses + " pesée(s) validée(s) sur " + b.athletes + ". La validation attribue le groupe et le dossard, puis verrouille la ligne."),
      verdictRecap: manques === 0 ? "Préparation complète" : (manques === 1 ? "Un point à compléter" : manques + " points à compléter"),
      verdictDetail: manques === 0
        ? "Tout est en place. La compétition pourra être lancée dès l'ouverture du plateau."
        : "Vous pouvez enregistrer et revenir plus tard : la saisie est conservée sur ce poste.",
      setPartenaires: (e) => { const v = e.target.value; this.maj(x => { x.partenaires = v; }); },
      /* espace, import, photos, clubs */
      espaceEssai: this.state.espace === "essai",
      modeReel: this.state.espace !== "essai",
      versModeReel: () => this.basculerEspace("officielle"),
      versModeDemo: () => this.basculerEspace("essai"),
      fondReel: this.state.espace === "essai" ? "transparent" : "#141210",
      encreReel: this.state.espace === "essai" ? "#6E675C" : "#FCFAF6",
      fondDemo: this.state.espace === "essai" ? "#EC6D23" : "transparent",
      encreDemo: this.state.espace === "essai" ? "#FFFFFF" : "#6E675C",
      viderDemo: () => this.demander("videdemo"),
      copierVersDemo: this.copierVersDemo,
      demanderViderListe: () => this.demander("liste"),
      demanderVierge: () => this.demander("vierge"),
      demanderTout: () => this.demander("tout"),
      annulerDemande: this.annulerDemande,
      confirmerDemande: this.confirmerDemande,
      demandeOuverte: !!this.state.demande,
      demandeTitre: {
        liste:"Supprimer la liste des athlètes ?",
        vierge:"Démarrer une compétition réelle vierge ?",
        tout:"Tout remettre à zéro ?",
        videdemo:"Vider la démonstration ?"
      }[this.state.demande] || "",
      demandeTexte: {
        liste: b.athletes + " athlète(s), leurs passages et leurs résultats seront effacés de cet espace. Épreuves, catégories et officiels sont conservés.",
        vierge: "Cet espace repart à vide pour la compétition officielle : " + b.athletes + " athlète(s), tous les passages et tous les résultats sont effacés. Épreuves, catégories, officiels et codes d'accès restent en place. Exportez la sauvegarde avant si vous voulez pouvoir revenir en arrière.",
        tout: "Toute la saisie de cet espace est effacée et les 5 épreuves et 2 catégories officielles sont rétablies.",
        videdemo: "Athlètes, passages et résultats de la démonstration sont effacés. La compétition réelle n'est pas touchée."
      }[this.state.demande] || "",
      libConfirmer: this.state.demande === "vierge" ? "Démarrer à vide" : "Effacer",
      libEspace: this.state.espace === "essai" ? "Quitter l'essai" : "Passer en essai",
      basculerEspace: this.basculerEspace,
      viderListe: this.viderListe,
      exporterExcel: this.exporterExcel,
      importerExcel: this.importerExcel,
      msgImportComp: this.state.msgImportComp || "",
      exporterListe: () => this.exporterListe(),
      exporterClassements: () => this.exporterClassements(),
      modeleCSV: this.modeleCSV,
      clubs, aucunClub: clubs.length === 0,
      recherche: this.state.recherche,
      setRecherche: (e) => { const v = e.target.value; this.setState({ recherche:v }); },
      filtre: this.state.filtre,
      setFiltre: (e) => { const v = e.target.value; this.setState({ filtre:v }); },
      filtres: [{ cle:"tous", lbl:"Tous les athlètes" }, { cle:"acompleter", lbl:"À compléter" }]
        .concat(clubsListe.map(c => ({ cle:"club:" + c, lbl:c }))),
      nbAffiches: athletes.length + " fiche(s) affichée(s) sur " + d.athletes.length,
      ouvrirImport: this.ouvrirImport,
      fermerImport: this.fermerImport,
      impOuvert: !!this.state.imp,
      impSource: !!(this.state.imp && this.state.imp.etape === "source"),
      impLecture: !!(this.state.imp && this.state.imp.etape === "lecture"),
      impVerif: !!(this.state.imp && this.state.imp.etape === "verif"),
      impResume: !!(this.state.imp && this.state.imp.etape === "resume"),
      impErreur: (this.state.imp && this.state.imp.erreur) || "",
      impTexte: (this.state.imp && this.state.imp.texte) || "",
      impNomSource: (this.state.imp && this.state.imp.source) || "",
      setImpTexte: (e) => { const v = e.target.value; this.majImp(i => { i.texte = v; }); },
      importerFichier: this.importerFichier,
      importerTexte: this.importerTexte,
      validerImport: this.validerImport,
      annulerImport: this.annulerImport,
      impLignes: (this.state.imp && this.state.imp.lignes ? this.state.imp.lignes : []).map((l, i) => ({
        nom: (l.nom || "").toUpperCase(), prenoms: l.prenoms || "",
        club: (l.club && l.club.trim()) ? l.club : "Indépendant",
        poids: l.poids != null ? String(l.poids).replace(".", ",") + " kg" : "—",
        tel: l.tel || "—", urgence: l.urgence || "—",
        motifs: (l.motifs || []).join(", "),
        marque: l.garder ? "✓" : "",
        douteuse: (l.motifs || []).length > 0,
        fondLigne: (l.motifs || []).length ? "#FDF3EF" : "#FFFFFF",
        garder: !!l.garder,
        doublon: !!l.doublonId,
        modeDoublon: l.modeDoublon || "",
        libDoublon: l.doublonId ? (l.modeDoublon === "fusionner" ? "Déjà présent — compléter la fiche" : "Déjà présent — ignorer") : "",
        basculerGarder: () => this.majImp(x => {
          x.lignes = x.lignes.slice(); x.lignes[i] = Object.assign({}, x.lignes[i], { garder: !x.lignes[i].garder });
        }),
        basculerDoublon: () => this.majImp(x => {
          x.lignes = x.lignes.slice();
          x.lignes[i] = Object.assign({}, x.lignes[i], { modeDoublon: x.lignes[i].modeDoublon === "fusionner" ? "ignorer" : "fusionner" });
        })
      })),
      impNbGardees: (this.state.imp && this.state.imp.lignes ? this.state.imp.lignes.filter(l => l.garder).length : 0),
      resAjoutes: this.state.imp && this.state.imp.resume ? this.state.imp.resume.ajoutes : 0,
      resFusionnes: this.state.imp && this.state.imp.resume ? this.state.imp.resume.fusionnes : 0,
      resIgnores: this.state.imp && this.state.imp.resume ? this.state.imp.resume.ignores : 0,
      resAVerifier: this.state.imp && this.state.imp.resume ? this.state.imp.resume.aVerifier : 0,
      photosOuvert: !!this.state.photos,
      photosGroupees: this.photosGroupees,
      appliquerPhotos: this.appliquerPhotos,
      fermerPhotos: () => this.setState({ photos:null }),
      photosCorresp: (this.state.photos ? this.state.photos.corresp : []).map((x, i) => ({
        nomFichier: x.nomFichier,
        apercu: this.fondImage(x.apercu),
        athleteId: x.athleteId || "",
        trouve: !!x.athleteId,
        etat: x.athleteId ? "Reconnu" : "À désigner",
        etatCouleur: x.athleteId ? "#0B9237" : "#BC4F14",
        choisir: (e) => this.changerCorresp(i, e.target.value)
      })),
      athletesOptions: d.athletes.map(a => ({ id:a.id, nom: ((a.nom || "").toUpperCase() + " " + (a.prenoms || "")).trim() })),
      versPesee: () => { this.setState({ imp:null }); this.aller("prepa", 4); },
      enregistrer: this.enregistrer,
      exporter: this.exporter,
      chargerDemo: this.chargerDemo,
      toutEffacer: this.toutEffacer,
      versAccueil: () => this.aller("accueil"),
      versPreparation: () => this.aller("prepa"),
      versRecap: () => this.aller("recap"),
      etapePrec: () => { if (etape === 0) this.aller("accueil"); else this.setState({ etape: etape - 1 }); },
      etapeSuiv: () => { if (etape >= 5) this.aller("recap"); else this.setState({ etape: etape + 1 }); },
      ajouterEpreuve: () => this.maj(x => { x.epreuves.push({ id:this.nid("ep"), nom:"Nouvelle épreuve", mesure:"nb_temps", temps:"60 s", essais:"1", passage:"groupe", critere:"", materiel:"", equipements:"" }); }),
      ajouterMedley: () => this.maj(x => { x.epreuves.push({
        id:this.nid("ep"), nom:"Medley", mesure:"medley", temps:"75 s", essais:"1", passage:"groupe", tours:false,
        critere:"Parcours achevé dans le temps imparti : le temps le plus court l'emporte. Parcours inachevé : la distance atteinte au coup de sifflet, puis le temps le plus court à égalité de distance.",
        ateliers:"Yoke 350 kg — 15 m\nFarmer's walk 2 × 120 kg — 15 m\nSandbag 100 kg — 15 m",
        distanceTotale:"45 m", regleFin:"Distance atteinte au coup de sifflet",
        materiel:"Yoke, farmer's handles, sandbag, plots de zone",
        equipements:"Ceinture de force, manchons, magnésie, chaussures à forte traction" }); }),
      ajouterGroupe: () => this.maj(x => { x.groupes.push({ id:this.nid("g"), nom:"Nouveau groupe", min:"", max:"" }); }),
      ajouterOfficiel: () => this.maj(x => { x.officiels.push({ id:this.nid("o"), nom:"", role:"juge", code:"" }); }),
      ajouterAthlete: () => this.maj(x => { x.athletes.push({ id:this.nid("a"), nom:"", prenoms:"", club:"", pays:"CIV", photo:"", poids:"", groupeId:null, verrou:false, dossard:"", note:"" }); }),
      ajouterProgramme: () => this.maj(x => { x.programme.push({ id:this.nid("p"), h:"00h00", txt:"" }); })
    };
  }
}
