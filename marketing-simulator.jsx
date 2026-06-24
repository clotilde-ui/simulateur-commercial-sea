import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { SECTORS, getDefaultValues, getSectorSalesCycle, CONVERSION_SUPPORTS, getSupportConversionRate, BUSINESS_TYPES, CONTACT_TYPES } from "./src/config/defaults";

const CFG = {
  channels: {
    "google-ads": {
      label: "Google Ads",
      color: "#FF6B3D",
      funnel: ["Impressions", "Clics", "Leads"],
      cpcLabel: "CPC (€)",
      ctrLabel: "CTR (%)",
      ctrMax: 15,
      cpcMax: 20,
      cpcStep: 0.1,
      cpcDigits: 1,
      cpmLabel: "CPM (€)",
      cpmMax: 60,
      cpmStep: 0.5,
      cpmDigits: 1,
      cpmDefault: 30,
      showCtr: true,
    },
    "meta-ads": {
      label: "Meta Ads",
      color: "#FF6B3D",
      funnel: ["Impressions", "Clics", "Leads"],
      cpcLabel: "CPC (€)",
      ctrLabel: "CTR (%)",
      ctrMax: 10,
      cpcMax: 15,
      cpcStep: 0.1,
      cpcDigits: 1,
      cpmLabel: "CPM (€)",
      cpmMax: 40,
      cpmStep: 0.5,
      cpmDigits: 1,
      cpmDefault: 12,
      showCtr: true,
    },
    "linkedin-ads": {
      label: "LinkedIn Ads",
      color: "#FF6B3D",
      funnel: ["Impressions", "Clics", "Leads"],
      cpcLabel: "CPC (€)",
      ctrLabel: "CTR (%)",
      ctrMax: 5,
      cpcMax: 25,
      cpcStep: 0.5,
      cpcDigits: 1,
      cpmLabel: "CPM (€)",
      cpmMax: 120,
      cpmStep: 1,
      cpmDigits: 1,
      cpmDefault: 60,
      showCtr: true,
    },
    "tiktok-ads": {
      label: "TikTok Ads",
      color: "#FF6B3D",
      funnel: ["Impressions", "Clics", "Leads"],
      cpcLabel: "CPC (€)",
      ctrLabel: "CTR (%)",
      ctrMax: 8,
      cpcMax: 10,
      cpcStep: 0.1,
      cpcDigits: 1,
      cpmLabel: "CPM (€)",
      cpmMax: 30,
      cpmStep: 0.5,
      cpmDigits: 1,
      cpmDefault: 8,
      showCtr: true,
    },

  },
  sectors: SECTORS,
};

// ─── Animated counter ────────────────────────────────────────
function useCountUp(target, ms = 600) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  const raf = useRef(null);
  useEffect(() => {
    const from = prev.current;
    const diff = target - from;
    if (!diff) return;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / ms, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const next = from + diff * e;
      prev.current = next;
      setVal(next);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else { prev.current = target; setVal(target); }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, ms]);
  return val;
}

function Num({ value, fmt }) {
  const v = useCountUp(value);
  if (fmt === "eur")  return <>{Math.round(v).toLocaleString("fr-FR")} €</>;
  if (fmt === "pct")  return <>{v.toFixed(2)} %</>;
  if (fmt === "pctS") return <>{v.toFixed(1)} %</>;
  if (fmt === "coef") return <>x{v.toFixed(2)}</>;
  return <>{Math.round(v).toLocaleString("fr-FR")}</>;
}

// ─── SVG Funnel ──────────────────────────────────────────────
function Funnel({ stages, color }) {
  const W = 280, rowH = 72, H = rowH * stages.length;
  const MIN = 24; // width at the very bottom
  // Straight sides: width decreases linearly from W (top) to MIN (bottom)
  const widthAt = y => W - (W - MIN) * (y / H);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      {stages.map((s, i) => {
        const y0 = i * rowH, y1 = (i + 1) * rowH;
        const wTop = widthAt(y0), wBot = widthAt(y1);
        const x1 = (W - wTop) / 2, x2 = (W + wTop) / 2;
        const x3 = (W + wBot) / 2, x4 = (W - wBot) / 2;
        const op = 1 - i * 0.18;
        const ratio = i > 0 && stages[i - 1].value > 0
          ? ((s.value / stages[i - 1].value) * 100).toFixed(1) : null;
        return (
          <g key={i}>
            <polygon points={`${x1},${y0} ${x2},${y0} ${x3},${y1} ${x4},${y1}`}
              fill={color} fillOpacity={op} />
            <text x={W / 2} y={y0 + rowH * 0.36} textAnchor="middle"
              fill="rgba(255,255,255,0.65)" fontSize="9.5" fontWeight="500">{s.label}</text>
            <text x={W / 2} y={y0 + rowH * 0.7} textAnchor="middle"
              fill="white" fontSize="13" fontWeight="700">
              {Math.round(s.value).toLocaleString("fr-FR")}
            </text>
            {ratio && (
              <text x={W - 4} y={y0 + 11} textAnchor="end"
                fill={color} fontSize="8.5" fontWeight="600" opacity="0.9">↓ {ratio}%</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Range slider with colored track ─────────────────────────
function Slider({ label, value, min, max, step, onChange, accent, display, labelColor, trackBg }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: labelColor ?? "rgba(255,255,255,0.38)" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: accent }}>{display}</span>
      </div>
      <div style={{ position: "relative", height: 16, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", width: "100%", height: 3, background: trackBg ?? "rgba(255,255,255,0.08)", borderRadius: 2 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: 2 }} />
        </div>
        <div style={{
          position: "absolute", left: `${pct}%`, transform: "translateX(-50%)",
          width: 13, height: 13, borderRadius: "50%", background: accent,
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          pointerEvents: "none", transition: "left 0.05s",
        }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", width: "100%", opacity: 0, cursor: "pointer", height: "100%", margin: 0 }} />
      </div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────
function KCard({ label, sub, value, fmt, accent, highlight }) {
  return (
    <div style={{
      background: highlight ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
      borderRadius: 10, padding: "14px 16px",
      border: `1px solid ${highlight ? accent + "55" : "rgba(255,255,255,0.06)"}`,
    }}>
      <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 7 }}>{label}</div>
      <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: highlight ? 30 : 21, letterSpacing: "-0.03em", lineHeight: 1, color: highlight ? accent : "#F6F1E8" }}>
        <Num value={value} fmt={fmt} />
      </div>
      {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.27)", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ─── Learning curve — CPL evolution over the first months ────
function LearningCurve({ data, color }) {
  const W = 560, H = 190;
  const padL = 14, padR = 14, padT = 30, padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxV = Math.max(...data.map(d => d.cpl), 1);
  const n = data.length;
  const px = i => padL + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const py = v => padT + plotH - (v / maxV) * plotH;
  const linePts = data.map((d, i) => `${px(i)},${py(d.cpl)}`).join(" ");
  const baseY = padT + plotH;
  const areaPts = `${px(0)},${baseY} ${linePts} ${px(n - 1)},${baseY}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id="lc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#lc-grad)" />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(d.cpl)} r="3.5" fill={color} stroke="#0F332B" strokeWidth="1.5" />
          <text x={px(i)} y={py(d.cpl) - 10} textAnchor="middle" fill="#F6F1E8" fontSize="10" fontWeight="700">
            {Math.round(d.cpl).toLocaleString("fr-FR")} €
          </text>
          {d.delta != null && (
            <text x={px(i)} y={py(d.cpl) - 22} textAnchor="middle" fill={color} fontSize="8" fontWeight="600">
              {d.delta < 0 ? "−" : ""}{Math.abs(d.delta)}%
            </text>
          )}
          <text x={px(i)} y={H - 7} textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize="9.5">
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Réduction marginale du CPL mois après mois (apprentissage de l'algorithme) :
//  M1 = CPL de base, M2 −10%, M3 −10% suppl., M4 et + −30% suppl. (maturité).
const LEARNING_STEPS = [
  { label: "M1", mult: 1.0, delta: null },
  { label: "M2", mult: 0.9, delta: -10 },
  { label: "M3", mult: 0.8, delta: -10 },
  { label: "M4", mult: 0.5, delta: -30 },
  { label: "M5", mult: 0.5, delta: null },
  { label: "M6", mult: 0.5, delta: null },
];

// ─── Saisonnalité (logique portée du simulateur SEO) ─────────
// Les mois cochés en "haute saison" voient leurs résultats pondérés par un
// coefficient ; les autres restent à ×1. `startMonth` décale le calendrier.
const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const SEASON_PRESETS = {
  uniforme: Array(12).fill(false),
  hivernal: [true, true, true, true, false, false, false, false, false, false, false, true], // Oct-Avr
  estival:  [false, false, false, true, true, true, true, true, true, false, false, false],  // Avr-Sep
};

// ─── Tracking des consultations de liens partagés ────────────
// Stockage 100 % local (localStorage) : chaque lien généré reçoit un identifiant
// (param ?t=). À l'ouverture d'un lien, on enregistre une visite (date + durée).
// Limite assumée : les données restent dans le navigateur courant — un suivi
// inter‑appareils nécessiterait un backend.
const TRACK_KEY = "sim-link-tracking";
function loadTracking() {
  try { return JSON.parse(localStorage.getItem(TRACK_KEY)) || {}; } catch { return {}; }
}
function saveTracking(store) {
  try { localStorage.setItem(TRACK_KEY, JSON.stringify(store)); } catch (_) {}
}
function genLinkId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function fmtDuration(sec) {
  if (!sec || sec < 1) return "< 1s";
  if (sec < 60) return `${Math.round(sec)} s`;
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return s ? `${m} min ${s} s` : `${m} min`;
}
function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

// ─── App ─────────────────────────────────────────────────────
export default function Simulator() {
  const [channel, setChannel] = useState("google-ads");
  const [sector, setSector]   = useState("saas");
  const [mode, setMode]       = useState("budget");
  const [budget, setBudget]   = useState(5000);
  const [tLeads, setTLeads]   = useState(50);
  const [cpc, setCpc]         = useState(8);
  const [billing, setBilling] = useState("cpc");
  const [cpm, setCpm]         = useState(30);
  const [ctr, setCtr]         = useState(4);
  const [conv, setConv]       = useState(3.5);
  const [support, setSupport] = useState("landing");
  const [businessType, setBusinessType] = useState("lead");
  const [contactType, setContactType] = useState(BUSINESS_TYPES.lead.defaultContact);
  const [geoScope, setGeoScope] = useState("france");
  const [geoZone, setGeoZone]   = useState("");
  const [panierMoyen, setPanierMoyen] = useState(300);
  const [closing, setClosing]         = useState(20);
  const [cycleVente, setCycleVente]   = useState(1);
  const [seasonalityEnabled, setSeasonalityEnabled] = useState(false);
  const [startMonth, setStartMonth]   = useState(0);
  const [highSeasonMonths, setHighSeasonMonths] = useState(Array(12).fill(false));
  const [highSeasonMultiplier, setHighSeasonMultiplier] = useState(3);
  const [prospect, setProspect] = useState("");
  const [logo, setLogo]       = useState(null);
  const [website, setWebsite] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied]   = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingTick, setTrackingTick] = useState(0);

  const ch     = CFG.channels[channel];
  const biz    = BUSINESS_TYPES[businessType];
  const accent = ch.color;

  const contentRef   = useRef();
  const exportBtnRef = useRef();

  const exportFileName = (() => {
    const slug = prospect
      ? prospect.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      : "";
    return slug ? `simulation-${slug}-${channel}` : `simulation-${channel}`;
  })();

  // Reset defaults when channel/sector changes — useLayoutEffect prevents a visible
  // flash of wrong metrics caused by the old CPC/CTR being used with the new channel.
  useLayoutEffect(() => {
    const d = getDefaultValues(channel, sector);
    if (d) { setCpc(d.cpc); setCtr(d.ctr); setConv(d.conversionRate); setBudget(d.budget); }
    setCpm(CFG.channels[channel]?.cpmDefault ?? 10);
    setCycleVente(getSectorSalesCycle(sector));
  }, [channel, sector]);

  // Restore state from shared URL on first load
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("s");
    if (!s) return;
    try {
      const d = JSON.parse(atob(s));
      if (CFG.channels[d.channel] && CFG.sectors[d.sector]) {
        setChannel(d.channel);
        setSector(d.sector);
        setMode(d.mode === "leads" ? "leads" : "budget");
        if (d.budget > 0)  setBudget(d.budget);
        if (d.tLeads > 0)  setTLeads(d.tLeads);
        if (d.cpc   >= 0)  setCpc(d.cpc);
        if (d.billing === "cpc" || d.billing === "cpm") setBilling(d.billing);
        if (d.cpm   > 0)   setCpm(d.cpm);
        if (d.ctr   > 0)   setCtr(d.ctr);
        if (d.conv  > 0)   setConv(d.conv);
        if (CONVERSION_SUPPORTS[d.support]) setSupport(d.support);
        if (BUSINESS_TYPES[d.businessType]) setBusinessType(d.businessType);
        if (CONTACT_TYPES[d.contactType]) setContactType(d.contactType);
        if (d.geoScope === "france" || d.geoScope === "localisee") setGeoScope(d.geoScope);
        if (d.geoZone) setGeoZone(d.geoZone);
        if (d.panierMoyen > 0) setPanierMoyen(d.panierMoyen);
        if (d.closing > 0)     setClosing(d.closing);
        if (d.cycleVente >= 1 && d.cycleVente <= 12) setCycleVente(d.cycleVente);
        if (typeof d.seasonalityEnabled === "boolean") setSeasonalityEnabled(d.seasonalityEnabled);
        if (d.startMonth >= 0 && d.startMonth <= 11) setStartMonth(d.startMonth);
        if (Array.isArray(d.highSeasonMonths) && d.highSeasonMonths.length === 12)
          setHighSeasonMonths(d.highSeasonMonths.map(Boolean));
        if (d.highSeasonMultiplier >= 1) setHighSeasonMultiplier(d.highSeasonMultiplier);
        if (d.prospect)    setProspect(d.prospect);
        if (d.website)     { setWebsite(d.website); fetchLogoFromWebsite(d.website); }
      }
    } catch (_) {}
  }, []);

  // Enregistre une visite quand la page est ouverte via un lien partagé (?t=…),
  // et mesure la durée de consultation (mise à jour périodique + à la fermeture).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkId = params.get("t");
    const encoded = params.get("s");
    if (!linkId || !encoded) return;

    let label = "Lien partagé";
    try {
      const d = JSON.parse(atob(encoded));
      if (d.prospect) label = d.prospect;
    } catch (_) {}

    const store = loadTracking();
    const entry = store[linkId] ?? { label, createdAt: new Date().toISOString(), visits: [] };
    if (!entry.label || entry.label === "Lien partagé") entry.label = label;
    const visitIndex = entry.visits.length;
    entry.visits.push({ ts: new Date().toISOString(), duration: 0 });
    store[linkId] = entry;
    saveTracking(store);

    const start = Date.now();
    const update = () => {
      const s = loadTracking();
      const v = s[linkId]?.visits?.[visitIndex];
      if (!v) return;
      v.duration = Math.round((Date.now() - start) / 1000);
      saveTracking(s);
    };
    const iv = setInterval(update, 5000);
    const onHide = () => update();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(iv); update();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  // ── Funnel computation ────────────────────────────────────
  let impr = 0, clicks = 0, leads = 0, cpl = 0, budgetOut = 0;
  const safeDiv = (a, b) => b > 0 ? a / b : 0;

  const isCpm = billing === "cpm";
  if (mode === "budget") {
    if (isCpm) {
      // CPM : le budget achète des impressions, les clics en découlent via le CTR.
      impr = Math.round(safeDiv(budget, cpm) * 1000);
      clicks = Math.round(impr * ctr / 100);
    } else {
      clicks = Math.round(safeDiv(budget, cpc));
      impr = Math.round(safeDiv(clicks, ctr / 100));
    }
    leads = Math.round(clicks * conv / 100);
    budgetOut = budget;
  } else {
    leads = tLeads;
    clicks = Math.round(safeDiv(leads, conv / 100));
    impr = Math.round(safeDiv(clicks, ctr / 100));
    budgetOut = isCpm ? Math.round(safeDiv(impr, 1000) * cpm) : Math.round(clicks * cpc);
  }
  cpl = leads > 0 ? safeDiv(mode === "budget" ? budget : budgetOut, leads) : 0;
  // En e-commerce la conversion EST une vente : pas d'étape de closing distincte.
  const clients     = biz.hasClosing ? Math.round(leads * closing / 100) : leads;
  const caPotentiel = clients * panierMoyen;
  const spend = mode === "budget" ? budget : budgetOut;
  const roi = spend > 0 ? caPotentiel / spend : 0;

  // Courbe d'apprentissage : évolution du CPL/CPA sur les premiers mois.
  const learningData = LEARNING_STEPS.map(s => ({ ...s, cpl: cpl * s.mult }));
  const learningTable = [
    { label: "Mois 1",     deltaLabel: `${biz.cplShort} de base`, isBase: true, cpl: cpl * 1.0 },
    { label: "Mois 2",     deltaLabel: "−10%",                                   cpl: cpl * 0.9 },
    { label: "Mois 3",     deltaLabel: "−10% suppl.",                            cpl: cpl * 0.8 },
    { label: "Mois 4 et +", deltaLabel: "−30% suppl.", tag: "maturité",          cpl: cpl * 0.5 },
  ];

  // Saisonnalité : projection sur 12 mois, chaque mois pondéré par son coefficient.
  const seasonalMonths = Array.from({ length: 12 }, (_, i) => {
    const calMonth = (startMonth + i) % 12;
    const high = seasonalityEnabled && highSeasonMonths[calMonth];
    const coef = high ? highSeasonMultiplier : 1;
    return {
      label: seasonalityEnabled ? MONTH_NAMES[calMonth] : `M${i + 1}`,
      high, coef,
      leads: leads * coef,
      clients: clients * coef,
      ca: caPotentiel * coef,
    };
  });
  const annualLeads   = seasonalMonths.reduce((s, m) => s + m.leads, 0);
  const annualClients = seasonalMonths.reduce((s, m) => s + m.clients, 0);
  const annualCA      = seasonalMonths.reduce((s, m) => s + m.ca, 0);
  const annualSpend   = spend * 12;
  const annualRoi     = annualSpend > 0 ? annualCA / annualSpend : 0;
  const maxMonthLeads = Math.max(...seasonalMonths.map(m => m.leads), 1);

  const stages = [
    { label: ch.funnel[0], value: impr },
    { label: ch.funnel[1], value: clicks },
    { label: biz.conversionStage, value: leads },
    ...(biz.hasClosing ? [{ label: biz.finalStage, value: clients }] : []),
  ];

  // ── Export dropdown — close on outside click ──────────────
  useEffect(() => {
    if (!exportMenu) return;
    const close = (e) => {
      if (exportBtnRef.current && !exportBtnRef.current.contains(e.target))
        setExportMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [exportMenu]);

  const captureCanvas = () =>
    import("html2canvas").then(({ default: html2canvas }) =>
      html2canvas(contentRef.current, {
        scale: 2,
        backgroundColor: "#0F332B",
        useCORS: true,
        logging: false,
        onclone: (_, el) => { el.style.paddingBottom = "32px"; },
      })
    );

  const handleExportPng = async () => {
    setExportMenu(false);
    setExporting(true);
    try {
      await document.fonts.ready;
      const canvas = await captureCanvas();
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${exportFileName}.png`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setExportMenu(false);
    setExporting(true);
    try {
      await document.fonts.ready;
      const canvas = await captureCanvas();
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
      const imgW = canvas.width * ratio;
      const imgH = canvas.height * ratio;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG",
        (pdfW - imgW) / 2, (pdfH - imgH) / 2, imgW, imgH);
      pdf.save(`${exportFileName}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  // ── Share ─────────────────────────────────────────────────
  const handleShare = async () => {
    const encoded = btoa(JSON.stringify({ channel, sector, mode, budget, tLeads, cpc, ctr, conv, billing, cpm, support, businessType, contactType, geoScope, geoZone, panierMoyen, closing, cycleVente, seasonalityEnabled, startMonth, highSeasonMonths, highSeasonMultiplier, prospect, website }));
    const linkId = genLinkId();
    const url = `${window.location.origin}${window.location.pathname}?s=${encoded}&t=${linkId}`;
    // Référence le lien dans le suivi local pour pouvoir consulter ses statistiques.
    const store = loadTracking();
    if (!store[linkId]) store[linkId] = { label: prospect || "Sans nom", createdAt: new Date().toISOString(), visits: [] };
    saveTracking(store);
    setShareUrl(url);
    try { await navigator.clipboard.writeText(url); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const logoRef = useRef();
  const handleLogo = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => setLogo(ev.target.result);
    r.readAsDataURL(f);
  };

  const fetchLogoFromWebsite = (url) => {
    if (!url) return;
    let domain;
    try {
      domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
    } catch {
      domain = url.replace(/^www\./, "").split("/")[0];
    }
    if (!domain) return;
    const img = new Image();
    img.onload = () => setLogo(`https://logo.clearbit.com/${domain}`);
    img.onerror = () => setLogo(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    img.src = `https://logo.clearbit.com/${domain}`;
  };

  // Inject Google Fonts
  useEffect(() => {
    if (document.getElementById("sim-gf")) return;
    const el = document.createElement("link");
    el.id = "sim-gf"; el.rel = "stylesheet";
    el.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(el);
  }, []);

  const cpcDisplay = `${cpc.toFixed(ch.cpcDigits ?? 1)} €`;
  const cpmDisplay = `${cpm.toFixed(ch.cpmDigits ?? 1)} €`;

  const S = {
    root: { minHeight: "100vh", background: "#0F332B", fontFamily: "'DM Sans',sans-serif", color: "#F6F1E8", position: "relative" },
    grid: { backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)", backgroundSize: "44px 44px", position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 },
    wrap: { position: "relative", zIndex: 1 },
    header: { borderBottom: "1px solid rgba(255,255,255,0.055)", padding: "14px 28px", background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
    inner: { maxWidth: 1100, margin: "0 auto", padding: "24px 24px 64px" },
    label: { fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase", marginBottom: 10 },
    pill: (active, color) => ({ padding: "6px 13px", borderRadius: 20, fontSize: 11, cursor: "pointer", transition: "all 0.14s", background: active ? "rgba(255,255,255,0.1)" : "transparent", border: `1px solid ${active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`, color: active ? "#fff" : "rgba(255,255,255,0.38)" }),
    chBtn: (active, color) => ({ padding: "7px 15px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.14s", background: active ? color : "rgba(255,255,255,0.04)", border: `1px solid ${active ? color : "rgba(255,255,255,0.07)"}`, color: active ? "#fff" : "rgba(255,255,255,0.42)" }),
    panel: { background: "rgba(255,255,255,0.03)", borderRadius: 11, padding: "16px", border: "1px solid rgba(255,255,255,0.06)" },
    modeBtn: (active, color) => ({ flex: 1, padding: "8px 6px", borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: "pointer", background: active ? color : "transparent", border: "none", color: active ? "#fff" : "rgba(255,255,255,0.36)", transition: "all 0.18s" }),
  };

  return (
    <div style={S.root}>
      <div style={S.grid} />
      <div style={S.wrap}>
        {/* Header */}
        <header style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div onClick={() => logoRef.current?.click()} style={{
              width: 34, height: 34, borderRadius: 7, overflow: "hidden",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
            }}>
              {logo
                ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              }
            </div>
            <input type="file" ref={logoRef} accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
            <div>
              <input value={prospect} onChange={e => setProspect(e.target.value)} placeholder="Nom du prospect…"
                style={{ background: "transparent", border: "none", outline: "none", fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: "#F6F1E8", width: 200, display: "block" }} />
              <input value={website} onChange={e => setWebsite(e.target.value)}
                onBlur={e => fetchLogoFromWebsite(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchLogoFromWebsite(website)}
                placeholder="Site internet…"
                style={{ background: "transparent", border: "none", outline: "none", fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.38)", width: 200, display: "block", marginTop: 2 }} />
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", marginTop: 1 }}>
                {CFG.sectors[sector]} · {ch.label}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {shareUrl && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "monospace", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shareUrl}</span>}
            <button onClick={handleShare} style={{
              padding: "7px 16px", borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: "pointer",
              background: copied ? "rgba(255,107,61,0.1)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${copied ? "rgba(255,107,61,0.3)" : "rgba(255,255,255,0.09)"}`,
              color: copied ? "#FF6B3D" : "rgba(255,255,255,0.55)", transition: "all 0.2s"
            }}>
              {copied ? "✓ Lien copié" : "Générer lien"}
            </button>
            <button onClick={() => setTrackingOpen(true)} style={{
              padding: "7px 16px", borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: "pointer",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.55)", transition: "all 0.2s"
            }}>
              Suivi
            </button>
            <div ref={exportBtnRef} style={{ position: "relative" }}>
              <button
                onClick={() => setExportMenu(m => !m)}
                disabled={exporting}
                style={{
                  padding: "7px 16px", borderRadius: 7, fontSize: 11.5, fontWeight: 500,
                  cursor: exporting ? "default" : "pointer",
                  background: exportMenu ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${exportMenu ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.09)"}`,
                  color: exporting ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.55)",
                  transition: "all 0.2s",
                }}
              >
                {exporting ? "Export…" : "Exporter ↓"}
              </button>
              {exportMenu && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
                  background: "#0F332B", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8, overflow: "hidden", minWidth: 168,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}>
                  {[
                    { label: "Exporter en PNG", action: handleExportPng },
                    { label: "Exporter en PDF", action: handleExportPdf },
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action} style={{
                      display: "block", width: "100%", padding: "10px 16px",
                      background: "transparent", border: "none", cursor: "pointer",
                      fontSize: 12, color: "#F6F1E8", textAlign: "left",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div ref={contentRef} style={S.inner}>
          {/* Personalisation hero */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {logo && (
              <img src={logo} alt="" style={{ height: 56, maxWidth: 120, borderRadius: 10, objectFit: "contain", flexShrink: 0 }} />
            )}
            <div>
              {prospect ? (
                <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em", lineHeight: 1.2, color: "#F6F1E8" }}>
                  Simulation personnalisée pour{" "}
                  <span style={{ color: accent }}>{prospect}</span>
                </div>
              ) : (
                <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.2)" }}>
                  Configurez votre simulation
                </div>
              )}
            </div>
          </div>

          {/* Main 2-col layout */}
          <div style={{ display: "grid", gridTemplateColumns: "310px 1fr", gap: 0, alignItems: "stretch", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>

            {/* LEFT — Controls */}
            <div style={{ background: "#F6F1E8", padding: "20px 18px", borderRight: "2px solid rgba(0,0,0,0.1)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(0,0,0,0.35)", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid rgba(0,0,0,0.1)" }}>Paramètres</div>

              {/* Selectors */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ ...S.label, color: "rgba(0,0,0,0.4)" }}>Canal d'acquisition</div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
                  {Object.entries(CFG.channels).map(([k, c]) => (
                    <button key={k} onClick={() => setChannel(k)} style={{
                      ...S.chBtn(channel === k, c.color),
                      ...(channel !== k ? { background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.5)" } : {}),
                    }}>{c.label}</button>
                  ))}
                </div>
                <div style={{ ...S.label, color: "rgba(0,0,0,0.4)" }}>Secteur d'activité</div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {Object.entries(CFG.sectors).map(([k, l]) => (
                    <button key={k} onClick={() => setSector(k)} style={{
                      ...S.pill(sector === k),
                      ...(sector !== k ? { background: "transparent", border: "1px solid rgba(0,0,0,0.15)", color: "rgba(0,0,0,0.45)" } : { background: "rgba(0,0,0,0.1)", border: "1px solid rgba(0,0,0,0.2)", color: "rgba(0,0,0,0.8)" }),
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", marginBottom: 14 }} />

              {/* Type de business */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...S.label, color: "rgba(0,0,0,0.4)" }}>Type de business</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(BUSINESS_TYPES).map(([k, b]) => (
                    <button key={k} onClick={() => { setBusinessType(k); setContactType(b.defaultContact); }} style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
                      padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                      fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s",
                      ...(businessType === k
                        ? { background: accent, border: `1px solid ${accent}`, color: "#fff" }
                        : { background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.55)" }),
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{b.label}</span>
                      <span style={{ fontSize: 10, opacity: 0.8 }}>{b.hint} · {b.priorityContact}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type de contact (pré-rempli selon le type de business) */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...S.label, color: "rgba(0,0,0,0.4)" }}>Type de contact</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {Object.entries(CONTACT_TYPES).map(([k, c]) => (
                    <button key={k} onClick={() => setContactType(k)} style={{
                      flex: 1, padding: "8px 6px", borderRadius: 8, cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600,
                      transition: "all 0.15s",
                      ...(contactType === k
                        ? { background: accent, border: `1px solid ${accent}`, color: "#fff" }
                        : { background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.5)" }),
                    }}>{c.label}</button>
                  ))}
                </div>
              </div>

              {/* Zone géographique */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...S.label, color: "rgba(0,0,0,0.4)" }}>Zone géographique</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[["france", "Toute la France"], ["localisee", "Localisée"]].map(([k, l]) => (
                    <button key={k} onClick={() => setGeoScope(k)} style={{
                      flex: 1, padding: "8px 6px", borderRadius: 8, cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600,
                      transition: "all 0.15s",
                      ...(geoScope === k
                        ? { background: accent, border: `1px solid ${accent}`, color: "#fff" }
                        : { background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.5)" }),
                    }}>{l}</button>
                  ))}
                </div>
                {geoScope === "localisee" && (
                  <input type="text" value={geoZone} onChange={e => setGeoZone(e.target.value)}
                    placeholder="Ville, département ou région"
                    style={{ marginTop: 8, background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, padding: "8px 10px", color: "#0F332B", fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
                )}
              </div>

              {/* Durée du cycle de vente — sans objet pour l'e-commerce (achat immédiat) */}
              {businessType !== "ecommerce" && (
                <div style={{ marginBottom: 16 }}>
                  <Slider label="Durée du cycle de vente" value={cycleVente} min={1} max={12}
                    step={1} onChange={setCycleVente} accent={accent}
                    display={`${cycleVente} mois`}
                    labelColor="rgba(0,0,0,0.45)" trackBg="rgba(0,0,0,0.1)" />
                  <div style={{ fontSize: 10, color: "rgba(0,0,0,0.35)", marginTop: -4 }}>
                    Contextualise les projections dans le temps
                  </div>
                </div>
              )}

              {/* Mode toggle */}
              <div style={{ background: "rgba(0,0,0,0.06)", borderRadius: 9, padding: 4, display: "flex", marginBottom: 14, border: "1px solid rgba(0,0,0,0.1)" }}>
                {[["budget", `Budget → ${biz.conversionStage}`], ["leads", `${biz.conversionStage} → Budget`]].map(([m, l]) => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    ...S.modeBtn(mode === m, accent),
                    ...(mode !== m ? { color: "rgba(0,0,0,0.45)" } : {}),
                  }}>{l}</button>
                ))}
              </div>

              {/* Primary input */}
              <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 11, padding: "18px 18px 14px", marginBottom: 12, border: "1px solid rgba(0,0,0,0.08)" }}>
                {mode === "budget" ? (
                  <>
                    <div style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", marginBottom: 5 }}>Budget mensuel (€)</div>
                    <input type="number" value={budget} onChange={e => setBudget(Math.min(50000, Math.max(1, Number(e.target.value))))}
                      style={{ background: "transparent", border: "none", outline: "none", fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 34, color: "#0F332B", letterSpacing: "-0.03em", width: "100%" }} />
                    <input type="range" min={100} max={50000} step={100} value={budget}
                      onChange={e => setBudget(Number(e.target.value))}
                      style={{ width: "100%", marginTop: 10, accentColor: accent }} />
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", marginBottom: 5 }}>{`${biz.objectiveLabel} / mois`}</div>
                    <input type="number" value={tLeads} onChange={e => setTLeads(Math.min(500, Math.max(1, Number(e.target.value))))}
                      style={{ background: "transparent", border: "none", outline: "none", fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 34, color: "#0F332B", letterSpacing: "-0.03em", width: "100%" }} />
                    <input type="range" min={1} max={500} step={1} value={tLeads}
                      onChange={e => setTLeads(Number(e.target.value))}
                      style={{ width: "100%", marginTop: 10, accentColor: accent }} />
                  </>
                )}
              </div>

              {/* Sliders */}
              <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 11, padding: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
                <div style={{ ...S.label, color: "rgba(0,0,0,0.4)", marginBottom: 14 }}>Paramètres du canal</div>

                {/* Mode de facturation */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...S.label, color: "rgba(0,0,0,0.45)", marginBottom: 7 }}>Mode de facturation</div>
                  <div style={{ background: "rgba(0,0,0,0.06)", borderRadius: 9, padding: 4, display: "flex", border: "1px solid rgba(0,0,0,0.1)" }}>
                    {[["cpc", "CPC", "coût par clic"], ["cpm", "CPM", "coût / 1000 impr."]].map(([m, l, t]) => (
                      <button key={m} onClick={() => setBilling(m)} title={t} style={{
                        ...S.modeBtn(billing === m, accent),
                        ...(billing !== m ? { color: "rgba(0,0,0,0.45)" } : {}),
                      }}>{l}</button>
                    ))}
                  </div>
                </div>

                {billing === "cpc"
                  ? (ch.cpcLabel && (
                    <Slider label={ch.cpcLabel} value={cpc} min={ch.cpcStep} max={ch.cpcMax}
                      step={ch.cpcStep} onChange={setCpc} accent={accent} display={cpcDisplay}
                      labelColor="rgba(0,0,0,0.45)" trackBg="rgba(0,0,0,0.1)" />
                  ))
                  : (
                    <Slider label={ch.cpmLabel ?? "CPM (€)"} value={cpm} min={ch.cpmStep ?? 0.5} max={ch.cpmMax ?? 60}
                      step={ch.cpmStep ?? 0.5} onChange={setCpm} accent={accent} display={cpmDisplay}
                      labelColor="rgba(0,0,0,0.45)" trackBg="rgba(0,0,0,0.1)" />
                  )}
                {ch.showCtr && (
                  <Slider label={ch.ctrLabel} value={ctr} min={0.1} max={ch.ctrMax}
                    step={0.1} onChange={setCtr} accent={accent} display={`${ctr.toFixed(1)} %`}
                    labelColor="rgba(0,0,0,0.45)" trackBg="rgba(0,0,0,0.1)" />
                )}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...S.label, color: "rgba(0,0,0,0.45)", marginBottom: 7 }}>Support de conversion</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {Object.entries(CONVERSION_SUPPORTS).map(([k, s]) => (
                      <button key={k} onClick={() => { setSupport(k); setConv(s.conversionRate); }} style={{
                        flex: 1, padding: "8px 6px", borderRadius: 8, cursor: "pointer",
                        fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600,
                        transition: "all 0.15s",
                        ...(support === k
                          ? { background: accent, border: `1px solid ${accent}`, color: "#fff" }
                          : { background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.5)" }),
                      }}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <Slider label="Taux de conversion (%)" value={conv} min={0.1} max={20}
                  step={0.1} onChange={setConv} accent={accent} display={`${conv.toFixed(1)} %`}
                  labelColor="rgba(0,0,0,0.45)" trackBg="rgba(0,0,0,0.1)" />
                {biz.hasClosing && (
                  <Slider label={biz.closingLabel} value={closing} min={1} max={100}
                    step={0.5} onChange={setClosing} accent={accent} display={`${closing.toFixed(1)} %`}
                    labelColor="rgba(0,0,0,0.45)" trackBg="rgba(0,0,0,0.1)" />
                )}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "rgba(0,0,0,0.45)" }}>Panier moyen (€)</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: accent }}>{panierMoyen.toLocaleString("fr-FR")} €</span>
                  </div>
                  <input type="range" min={1} max={10000} step={1} value={panierMoyen}
                    onChange={e => setPanierMoyen(Number(e.target.value))}
                    style={{ width: "100%", accentColor: accent }} />
                  <input type="number" value={panierMoyen} min={1}
                    onChange={e => setPanierMoyen(Math.max(1, Number(e.target.value)))}
                    style={{ marginTop: 6, background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "4px 8px", color: "#0F332B", fontSize: 12, width: "100%", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
              </div>

              {/* Saisonnalité */}
              <div style={{ marginTop: 14, background: "rgba(0,0,0,0.04)", borderRadius: 11, padding: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: seasonalityEnabled ? 14 : 0 }}>
                  <span style={{ ...S.label, color: "rgba(0,0,0,0.4)", marginBottom: 0 }}>Saisonnalité</span>
                  <button onClick={() => setSeasonalityEnabled(v => !v)} title={seasonalityEnabled ? "Désactiver" : "Activer"}
                    style={{ width: 38, height: 20, borderRadius: 11, border: "none", cursor: "pointer", flexShrink: 0,
                      background: seasonalityEnabled ? accent : "rgba(0,0,0,0.18)", position: "relative", transition: "background .2s" }}>
                    <span style={{ position: "absolute", top: 3, left: seasonalityEnabled ? 21 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .2s", display: "block" }} />
                  </button>
                </div>

                {seasonalityEnabled && (
                  <>
                    {/* Préréglages */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      {Object.keys(SEASON_PRESETS).map(p => {
                        const active = JSON.stringify(highSeasonMonths) === JSON.stringify(SEASON_PRESETS[p]);
                        return (
                          <button key={p} onClick={() => setHighSeasonMonths([...SEASON_PRESETS[p]])} style={{
                            flex: 1, padding: "5px 6px", borderRadius: 6, fontSize: 11, textTransform: "capitalize",
                            fontWeight: active ? 700 : 500, cursor: "pointer",
                            ...(active ? { background: accent, border: `1px solid ${accent}`, color: "#fff" }
                                       : { background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.5)" }),
                          }}>{p}</button>
                        );
                      })}
                    </div>

                    {/* Mois de haute saison */}
                    <div style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", marginBottom: 6 }}>Cliquer les mois de haute saison</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 4, marginBottom: 14 }}>
                      {MONTH_NAMES.map((m, i) => (
                        <button key={i} onClick={() => { const next = [...highSeasonMonths]; next[i] = !next[i]; setHighSeasonMonths(next); }} style={{
                          padding: "5px 2px", borderRadius: 4, fontSize: 10, fontWeight: highSeasonMonths[i] ? 700 : 400, cursor: "pointer", transition: "all .15s",
                          ...(highSeasonMonths[i] ? { background: accent, border: `1px solid ${accent}`, color: "#fff" }
                                                  : { background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.5)" }),
                        }}>{m}</button>
                      ))}
                    </div>

                    {/* Coefficient haute saison */}
                    <Slider label="Coefficient haute saison" value={highSeasonMultiplier} min={1.5} max={6}
                      step={0.5} onChange={setHighSeasonMultiplier} accent={accent} display={`×${highSeasonMultiplier.toFixed(1)}`}
                      labelColor="rgba(0,0,0,0.45)" trackBg="rgba(0,0,0,0.1)" />

                    {/* Mois de démarrage */}
                    <div style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", marginBottom: 6 }}>Mois de démarrage de la campagne</div>
                    <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))}
                      style={{ width: "100%", background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, padding: "7px 8px", color: "#0F332B", fontSize: 12, outline: "none", fontFamily: "'DM Sans',sans-serif" }}>
                      {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                  </>
                )}
              </div>

            </div>

            {/* RIGHT — Results */}
            <div style={{ background: "rgba(255,255,255,0.04)", padding: "20px 22px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Résultats</div>
              {/* Financial KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <KCard label="CA potentiel" value={caPotentiel} fmt="eur"
                  sub={`${clients.toLocaleString("fr-FR")} ${biz.finalSingular}${clients > 1 ? "s" : ""} × ${panierMoyen.toLocaleString("fr-FR")} €`} accent={accent} highlight />
                <KCard label="ROI" value={roi} fmt="coef"
                  sub={roi >= 1 ? "retour sur investissement" : "investissement non rentable"} accent={accent} highlight />
              </div>

              {/* 6 KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
                <KCard label={mode === "budget" ? biz.generatedLabel : biz.objectiveLabel} value={leads} fmt="int"
                  sub={`${biz.cplShort} · ${Math.round(cpl).toLocaleString("fr-FR")} €`} accent={accent} highlight />
                <KCard label={mode === "budget" ? biz.contactCostLabel : "Budget requis"} value={mode === "budget" ? cpl : budgetOut} fmt="eur"
                  sub={mode === "budget" ? biz.volumeNote : "investissement mensuel"} accent={accent} />
                <KCard label={ch.funnel[1]} value={clicks} fmt="int"
                  sub={`${ctr.toFixed(1)}% de taux`} accent={accent} />
                <KCard label={ch.funnel[0]} value={impr} fmt="int"
                  sub="volume estimé" accent={accent} />
                <KCard label={`Taux ${ch.funnel[0].toLowerCase()} → ${biz.conversionStage.toLowerCase()}`} value={impr > 0 ? (leads / impr * 100) : 0} fmt="pct"
                  sub={`${ch.funnel[0]} → ${biz.conversionStage}`} accent={accent} />
                <KCard label={`Taux ${ch.funnel[1].toLowerCase()} → ${biz.conversionStage.toLowerCase()}`} value={clicks > 0 ? (leads / clicks * 100) : 0} fmt="pctS"
                  sub={`${ch.funnel[1]} → ${biz.conversionStage}`} accent={accent} />
              </div>

              {/* Funnel + bar visualization */}
              <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ padding: "22px 14px 22px 22px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                  <Funnel stages={stages} color={accent} />
                </div>
                <div style={{ padding: "22px 22px" }}>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 18, color: "#F6F1E8" }}>
                    Entonnoir de conversion
                  </div>
                  {stages.map((s, i) => {
                    const pct = stages[0].value > 0 ? Math.min(s.value / stages[0].value * 100, 100) : 0;
                    const stepConv = i > 0 && stages[i - 1].value > 0
                      ? ((s.value / stages[i - 1].value) * 100).toFixed(1) : null;
                    return (
                      <div key={i} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.42)" }}>{s.label}</span>
                            {stepConv && (
                              <span style={{ fontSize: 9, background: accent + "1A", color: accent, padding: "1px 6px", borderRadius: 10 }}>
                                ↓ {stepConv}%
                              </span>
                            )}
                          </div>
                          <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: "#F6F1E8" }}>
                            {Math.round(s.value).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
                          <div style={{ height: "100%", borderRadius: 2, background: accent, opacity: 1 - i * 0.2, width: `${pct}%`, transition: "width 0.55s cubic-bezier(0.34,1.56,0.64,1)" }} />
                        </div>
                      </div>
                    );
                  })}

                  {/* Summary strip */}
                  {prospect && (
                    <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", color: "rgba(255,255,255,0.35)", marginTop: 20, marginBottom: -8 }}>
                      Récapitulatif pour <span style={{ color: accent }}>{prospect}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 0 }}>
                    {[
                      { l: "Budget", v: `${(mode === "budget" ? budget : budgetOut).toLocaleString("fr-FR")} €` },
                      { l: biz.cplShort, v: `${Math.round(cpl).toLocaleString("fr-FR")} €` },
                      { l: `Taux ${ch.funnel[0].toLowerCase()} → ${biz.conversionStage.toLowerCase()}`, v: `${impr > 0 ? (leads / impr * 100).toFixed(3) : "0.000"} %` },
                    ].map((s, i) => (
                      <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.27)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{s.l}</div>
                        <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, color: accent }}>{s.v}</div>
                      </div>
                    ))}
                  </div>

                  {shareUrl && (
                    <div style={{ marginTop: 14, padding: "9px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", marginBottom: 3 }}>LIEN DE PARTAGE</div>
                      <div style={{ fontSize: 10, color: accent, fontFamily: "monospace", wordBreak: "break-all" }}>{shareUrl}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Courbe d'apprentissage — évolution du CPL sur les premiers mois */}
              <div style={{ marginTop: 14, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, color: "#F6F1E8" }}>
                    Courbe d'apprentissage
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                    Évolution du {biz.cplShort} sur les premiers mois
                  </div>
                </div>

                <LearningCurve data={learningData} color={accent} />

                {/* Tableau mois par mois */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 8, paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Mois", "Évolution", biz.cplShort].map((h, i) => (
                      <span key={i} style={{ fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", textAlign: i === 0 ? "left" : i === 1 ? "center" : "right" }}>{h}</span>
                    ))}
                  </div>
                  {learningTable.map((r, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 8, padding: "7px 0", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                        {r.label}{r.tag && <span style={{ color: accent, fontSize: 9, marginLeft: 6 }}>· {r.tag}</span>}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, textAlign: "center", color: r.isBase ? "rgba(255,255,255,0.35)" : accent }}>{r.deltaLabel}</span>
                      <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12, textAlign: "right", color: "#F6F1E8" }}>{Math.round(r.cpl).toLocaleString("fr-FR")} €</span>
                    </div>
                  ))}
                </div>

                {/* Note explicative */}
                <div style={{ marginTop: 14, padding: "10px 12px", background: accent + "14", borderRadius: 8, border: `1px solid ${accent}33`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: accent, fontSize: 12, lineHeight: 1.4 }}>ⓘ</span>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                    Les 3 premiers mois correspondent à la phase d'apprentissage de l'algorithme.
                  </span>
                </div>
              </div>

              {/* Projection sur 12 mois — pondérée par la saisonnalité */}
              <div style={{ marginTop: 14, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, color: "#F6F1E8" }}>
                    Projection sur 12 mois
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                    {seasonalityEnabled
                      ? `${biz.conversionStage} pondérés (×${highSeasonMultiplier.toFixed(1)} en haute saison)`
                      : `Activez la saisonnalité pour pondérer les mois`}
                  </div>
                </div>

                {/* Barres mensuelles */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 130, marginTop: 16 }}>
                  {seasonalMonths.map((m, i) => {
                    const h = Math.max((m.leads / maxMonthLeads) * 100, 2);
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                        {m.high && (
                          <div style={{ fontSize: 8, fontWeight: 700, color: accent, marginBottom: 3 }}>{Math.round(m.leads).toLocaleString("fr-FR")}</div>
                        )}
                        <div style={{ width: "100%", height: `${h}%`, minHeight: 2, borderRadius: "3px 3px 0 0",
                          background: m.high ? accent : accent + "55", transition: "height .4s cubic-bezier(0.34,1.56,0.64,1)" }} />
                        <div style={{ fontSize: 8.5, color: m.high ? accent : "rgba(255,255,255,0.4)", fontWeight: m.high ? 700 : 400, marginTop: 5 }}>{m.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Récap annuel */}
                <div style={{ display: "flex", marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {[
                    { l: `${biz.conversionStage} / an`, v: Math.round(annualLeads).toLocaleString("fr-FR") },
                    ...(biz.hasClosing ? [{ l: `${biz.finalStage} / an`, v: Math.round(annualClients).toLocaleString("fr-FR") }] : []),
                    { l: "CA cumulé 12 mois", v: `${Math.round(annualCA).toLocaleString("fr-FR")} €` },
                    { l: "ROI 12 mois", v: `x${annualRoi.toFixed(2)}` },
                  ].map((s, i, arr) => (
                    <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.27)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{s.l}</div>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: accent }}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {seasonalityEnabled && (
                  <div style={{ marginTop: 14, padding: "10px 12px", background: accent + "14", borderRadius: 8, border: `1px solid ${accent}33`, fontSize: 10.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                    Démarrage en {MONTH_NAMES[startMonth]}. Les mois de haute saison sont pondérés ×{highSeasonMultiplier.toFixed(1)} ; les autres restent à leur volume de base.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panneau de suivi des consultations */}
      {trackingOpen && (() => {
        const store = loadTracking();
        const entries = Object.entries(store)
          .map(([id, e]) => ({
            id, label: e.label, createdAt: e.createdAt,
            visits: (e.visits || []).slice().sort((a, b) => new Date(b.ts) - new Date(a.ts)),
          }))
          .map(e => ({ ...e, count: e.visits.length, total: e.visits.reduce((s, v) => s + (v.duration || 0), 0) }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return (
          <div onMouseDown={() => setTrackingOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", overflowY: "auto",
          }}>
            <div onMouseDown={e => e.stopPropagation()} style={{
              width: "100%", maxWidth: 600, background: "#0F332B", borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)", overflow: "hidden",
            }}>
              {/* En-tête */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 16, color: "#F6F1E8" }}>Suivi des consultations</div>
                <button onClick={() => setTrackingOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 20, lineHeight: 1 }}>×</button>
              </div>

              <div style={{ padding: "16px 22px 22px" }}>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginBottom: 16, padding: "9px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)" }}>
                  Les statistiques sont enregistrées localement dans ce navigateur. Vous voyez les ouvertures de vos liens réalisées sur cet appareil ; un suivi des visites du prospect sur son propre appareil nécessiterait un serveur.
                </div>

                {entries.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "28px 0", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
                    Aucun lien généré pour l'instant.<br />
                    <span style={{ fontSize: 11 }}>Cliquez sur « Générer lien » pour créer un lien suivi.</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {entries.map(e => (
                      <div key={e.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: "#F6F1E8" }}>{e.label || "Sans nom"}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: accent + "1A", padding: "2px 9px", borderRadius: 12 }}>
                            {e.count} visite{e.count > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: e.count ? 10 : 0 }}>
                          Créé le {fmtDate(e.createdAt)}{e.total > 0 ? ` · ${fmtDuration(e.total)} cumulées` : ""}
                        </div>
                        {e.count > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            {e.visits.map((v, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                <span style={{ color: "rgba(255,255,255,0.55)" }}>{fmtDate(v.ts)}</span>
                                <span style={{ color: accent, fontWeight: 600 }}>{fmtDuration(v.duration)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {entries.length > 0 && (
                  <button onClick={() => { saveTracking({}); setTrackingTick(t => t + 1); }} style={{
                    marginTop: 16, width: "100%", padding: "9px", borderRadius: 8, cursor: "pointer",
                    background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)", fontSize: 11.5,
                  }}>
                    Vider le suivi
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
