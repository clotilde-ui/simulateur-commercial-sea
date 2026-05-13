import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { SECTORS, getDefaultValues } from "./src/config/defaults";

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
  return <>{Math.round(v).toLocaleString("fr-FR")}</>;
}

// ─── SVG Funnel ──────────────────────────────────────────────
function Funnel({ stages, color }) {
  const W = 240, rowH = 66, H = rowH * stages.length + 4;
  const max = Math.max(stages[0]?.value || 1, 1);
  const MIN = 52;
  const widths = stages.map(s => MIN + (W - MIN) * Math.sqrt(Math.max(s.value, 0) / max));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      {stages.map((s, i) => {
        const y = i * rowH;
        const w = widths[i];
        const wN = i < stages.length - 1 ? widths[i + 1] : w * 0.6;
        const x1 = (W - w) / 2, x2 = (W + w) / 2;
        const x3 = (W + wN) / 2, x4 = (W - wN) / 2;
        const op = 1 - i * 0.22;
        const ratio = i > 0 && stages[i - 1].value > 0
          ? ((s.value / stages[i - 1].value) * 100).toFixed(1) : null;
        return (
          <g key={i}>
            <polygon points={`${x1},${y} ${x2},${y} ${x3},${y + rowH} ${x4},${y + rowH}`}
              fill={color} fillOpacity={op} />
            <text x={W / 2} y={y + rowH * 0.36} textAnchor="middle"
              fill="rgba(255,255,255,0.65)" fontSize="9.5" fontWeight="500">{s.label}</text>
            <text x={W / 2} y={y + rowH * 0.7} textAnchor="middle"
              fill="white" fontSize="13" fontWeight="700">
              {Math.round(s.value).toLocaleString("fr-FR")}
            </text>
            {ratio && (
              <text x={W - 4} y={y + 11} textAnchor="end"
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
          border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
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

// ─── App ─────────────────────────────────────────────────────
export default function Simulator() {
  const [channel, setChannel] = useState("google-ads");
  const [sector, setSector]   = useState("saas");
  const [mode, setMode]       = useState("budget");
  const [budget, setBudget]   = useState(5000);
  const [tLeads, setTLeads]   = useState(50);
  const [cpc, setCpc]         = useState(8);
  const [ctr, setCtr]         = useState(4);
  const [conv, setConv]       = useState(3.5);
  const [panierMoyen, setPanierMoyen] = useState(300);
  const [prospect, setProspect] = useState("");
  const [logo, setLogo]       = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied]   = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const [exporting, setExporting]   = useState(false);

  const ch     = CFG.channels[channel];
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
        if (d.ctr   > 0)   setCtr(d.ctr);
        if (d.conv  > 0)   setConv(d.conv);
        if (d.panierMoyen > 0) setPanierMoyen(d.panierMoyen);
        if (d.prospect)    setProspect(d.prospect);
      }
    } catch (_) {}
  }, []);

  // ── Funnel computation ────────────────────────────────────
  const isDirectLeadChannel = false;
  let impr = 0, clicks = 0, leads = 0, cpl = 0, budgetOut = 0;
  const safeDiv = (a, b) => b > 0 ? a / b : 0;

  if (mode === "budget") {
    clicks = Math.round(safeDiv(budget, cpc));
    impr = Math.round(safeDiv(clicks, ctr / 100));
    leads = Math.round(clicks * conv / 100);
    budgetOut = budget;
  } else {
    leads = tLeads;
    clicks = Math.round(safeDiv(leads, conv / 100));
    impr = Math.round(safeDiv(clicks, ctr / 100));
    budgetOut = Math.round(clicks * cpc);
  }
  cpl = leads > 0 ? safeDiv(mode === "budget" ? budget : budgetOut, leads) : 0;
  const caPotentiel = leads * panierMoyen;
  const spend = mode === "budget" ? budget : budgetOut;
  const roi = spend > 0 ? ((caPotentiel - spend) / spend) * 100 : 0;

  const stages = isDirectLeadChannel
    ? [
      { label: ch.funnel[0], value: clicks },
      { label: ch.funnel[1], value: leads },
    ]
    : [
      { label: ch.funnel[0], value: impr },
      { label: ch.funnel[1], value: clicks },
      { label: ch.funnel[2], value: leads },
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
    const encoded = btoa(JSON.stringify({ channel, sector, mode, budget, tLeads, cpc, ctr, conv, panierMoyen, prospect }));
    const url = `${window.location.origin}${window.location.pathname}?s=${encoded}`;
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

  // Inject Google Fonts
  useEffect(() => {
    if (document.getElementById("sim-gf")) return;
    const el = document.createElement("link");
    el.id = "sim-gf"; el.rel = "stylesheet";
    el.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(el);
  }, []);

  const cpcDisplay = `${cpc.toFixed(ch.cpcDigits ?? 1)} €`;

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
                style={{ background: "transparent", border: "none", outline: "none", fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: "#F6F1E8", width: 200 }} />
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

              {/* Mode toggle */}
              <div style={{ background: "rgba(0,0,0,0.06)", borderRadius: 9, padding: 4, display: "flex", marginBottom: 14, border: "1px solid rgba(0,0,0,0.1)" }}>
                {[["budget", "Budget → Leads"], ["leads", "Leads → Budget"]].map(([m, l]) => (
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
                    <div style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", marginBottom: 5 }}>Objectif leads / mois</div>
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
                {ch.cpcLabel && (
                  <Slider label={ch.cpcLabel} value={cpc} min={ch.cpcStep} max={ch.cpcMax}
                    step={ch.cpcStep} onChange={setCpc} accent={accent} display={cpcDisplay}
                    labelColor="rgba(0,0,0,0.45)" trackBg="rgba(0,0,0,0.1)" />
                )}
                {ch.showCtr && (
                  <Slider label={ch.ctrLabel} value={ctr} min={0.1} max={ch.ctrMax}
                    step={0.1} onChange={setCtr} accent={accent} display={`${ctr.toFixed(1)} %`}
                    labelColor="rgba(0,0,0,0.45)" trackBg="rgba(0,0,0,0.1)" />
                )}
                <Slider label="Taux de conversion (%)" value={conv} min={0.1} max={20}
                  step={0.1} onChange={setConv} accent={accent} display={`${conv.toFixed(1)} %`}
                  labelColor="rgba(0,0,0,0.45)" trackBg="rgba(0,0,0,0.1)" />
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

            </div>

            {/* RIGHT — Results */}
            <div style={{ background: "rgba(255,255,255,0.04)", padding: "20px 22px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Résultats</div>
              {/* Financial KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <KCard label="CA potentiel" value={caPotentiel} fmt="eur"
                  sub={`${leads.toLocaleString("fr-FR")} leads × ${panierMoyen.toLocaleString("fr-FR")} €`} accent={accent} highlight />
                <KCard label="ROI net" value={roi} fmt="pct"
                  sub={roi >= 0 ? "retour sur investissement" : "investissement non rentable"} accent={accent} highlight />
              </div>

              {/* 6 KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
                <KCard label={mode === "budget" ? "Leads générés" : "Objectif leads"} value={leads} fmt="int"
                  sub={`CPL · ${Math.round(cpl).toLocaleString("fr-FR")} €`} accent={accent} highlight />
                <KCard label={mode === "budget" ? "Coût par lead" : "Budget requis"} value={mode === "budget" ? cpl : budgetOut} fmt="eur"
                  sub={mode === "budget" ? "par lead qualifié" : "investissement mensuel"} accent={accent} />
                <KCard label={isDirectLeadChannel ? ch.funnel[0] : ch.funnel[1]} value={clicks} fmt="int"
                  sub={isDirectLeadChannel ? "volume de contacts" : `${ctr.toFixed(1)}% de taux`} accent={accent} />
                <KCard label={isDirectLeadChannel ? "Conversion contact → lead" : ch.funnel[0]} value={isDirectLeadChannel ? conv : impr} fmt={isDirectLeadChannel ? "pctS" : "int"}
                  sub={isDirectLeadChannel ? "taux appliqué" : "volume estimé"} accent={accent} />
                <KCard label={isDirectLeadChannel ? "Taux contacts → leads" : "Taux impressions → leads"} value={isDirectLeadChannel ? (clicks > 0 ? (leads / clicks * 100) : 0) : (impr > 0 ? (leads / impr * 100) : 0)} fmt="pct"
                  sub={isDirectLeadChannel ? `${ch.funnel[0]} → ${ch.funnel[1]}` : `${ch.funnel[0]} → ${ch.funnel[2]}`} accent={accent} />
                <KCard label={isDirectLeadChannel ? "Taux de conversion" : "Taux de clics → leads"} value={clicks > 0 ? (leads / clicks * 100) : 0} fmt="pctS"
                  sub={isDirectLeadChannel ? `${ch.funnel[0]} → ${ch.funnel[1]}` : `${ch.funnel[1]} → ${ch.funnel[2]}`} accent={accent} />
              </div>

              {/* Funnel + bar visualization */}
              <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
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
                      { l: "CPL", v: `${Math.round(cpl).toLocaleString("fr-FR")} €` },
                      { l: isDirectLeadChannel ? "Taux contacts → leads" : "Taux impressions → leads", v: `${isDirectLeadChannel ? (clicks > 0 ? (leads / clicks * 100).toFixed(3) : "0.000") : (impr > 0 ? (leads / impr * 100).toFixed(3) : "0.000")} %` },
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
