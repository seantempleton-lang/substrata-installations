import { useState, useCallback, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────
const T = {
  bg:      "#f4f5f7",
  surface: "#ffffff",
  surface2:"#f8f9fa",
  border:  "#e5e7eb",
  border2: "#d1d5db",
  text:    "#111318",
  dim:     "#6b7280",
  dimmer:  "#9ca3af",
  nav:     "#13151a",
  accent:  "#10b981",
  red:     "#ef4444",
  white:   "#ffffff",
  sans:    "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

// ─── LAYER COLOURS ────────────────────────────────────────────────────
const LAYER_STYLES = {
  sand_pack:       { fill:"#f5e642", stroke:"#c9bc00", label:"Sand Pack"           },
  pea_gravel:      { fill:"#d4a96a", stroke:"#a07840", label:"Pea Gravel"          },
  bentonite_pellets:{ fill:"#c084fc",stroke:"#7e22ce", label:"Bentonite Pellets"   },
  bentonite_grout: { fill:"#a855f7", stroke:"#6b21a8", label:"Bentonite Grout"     },
  cement_grout:    { fill:"#94a3b8", stroke:"#475569", label:"Cement Grout"        },
  concrete:        { fill:"#6b7280", stroke:"#374151", label:"Concrete"            },
  native_backfill: { fill:"#92400e", stroke:"#78350f", label:"Native Backfill"     },
};

const PIPE_COLOURS = {
  PVC:   "#3b82f6",
  HDPE:  "#f59e0b",
  SS:    "#6b7280",
  Other: "#8b5cf6",
};

const SURFACE_COMPLETIONS = [
  { v:"flush_toby",   l:"Flush Toby Box"       },
  { v:"monument",     l:"Above-Ground Monument" },
  { v:"concrete_pad", l:"Concrete Pad"          },
  { v:"bollard",      l:"Bollard Protection"    },
  { v:"flush_cover",  l:"Flush Cover Plate"     },
  { v:"other",        l:"Other"                 },
];

const BACKFILL_MATERIALS = [
  "sand_pack","pea_gravel","bentonite_pellets",
  "bentonite_grout","cement_grout","concrete","native_backfill",
];

const PIPE_MATERIALS = ["PVC","HDPE","SS","Other"];

const INST_TYPES = [
  { v:"standpipe_piezometer", l:"Standpipe Piezometer" },
  { v:"vwp",                  l:"VWP"                  },
  { v:"inclinometer",         l:"Inclinometer"         },
  { v:"monitoring_well",      l:"Monitoring Well"      },
  { v:"gas_monitoring",       l:"Gas Monitoring"       },
];

// ─── HELPERS ──────────────────────────────────────────────────────────
let _idCounter = 0;
const uid = () => `id_${++_idCounter}_${Math.random().toString(36).slice(2,5)}`;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt   = v => v === "" || v === null || v === undefined ? "" : parseFloat(v).toFixed(2);

function newLayer(material = "bentonite_grout") {
  return { id: uid(), material, top: "", base: "", qty: "", unit: "kg" };
}

function newInstrument() {
  return {
    id:            uid(),
    inst_type:     "standpipe_piezometer",
    ref_id:        "",
    pipe_material: "PVC",
    pipe_diameter: "50",
    pipe_length:   "",
    stickup:       "0.30",
    casing_top:    "0.00",
    casing_bottom: "",
    screen_top:    "",
    screen_bottom: "",
    seal_top:      "",
    seal_bottom:   "",
    backfill:      [
      newLayer("sand_pack"),
      newLayer("bentonite_pellets"),
      newLayer("cement_grout"),
    ],
    surface:       "flush_toby",
    surface_other: "",
    remarks:       "",
  };
}

// ─── NUMBER INPUT ─────────────────────────────────────────────────────
// Controlled input — accepts string while typing, commits on blur
function DepthField({ label, value, onChange, min=0, max=999, step=0.01, unit="m", small=false }) {
  const [local, setLocal] = useState(value === "" ? "" : String(value));

  useEffect(() => {
    setLocal(value === "" ? "" : String(value));
  }, [value]);

  const commit = () => {
    const n = parseFloat(local);
    if (!isNaN(n)) {
      const clamped = clamp(n, min, max);
      onChange(parseFloat(clamped.toFixed(2)));
      setLocal(clamped.toFixed(2));
    } else {
      setLocal(value === "" ? "" : String(value));
    }
  };

  return (
    <div style={{ flex:1 }}>
      {label && (
        <div style={{ fontFamily:T.sans, fontSize:10, fontWeight:600,
          color:T.dim, marginBottom:3, letterSpacing:"0.04em" }}>
          {label}
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center",
        background:T.surface2, border:`1px solid ${T.border2}`,
        borderRadius:6, overflow:"hidden" }}>
        <input
          type="number" value={local} step={step}
          inputMode="decimal"
          onChange={e => setLocal(e.target.value)}
          onBlur={commit}
          style={{ flex:1, background:"transparent", border:"none",
            color:T.text, fontFamily:T.sans,
            fontSize: small ? 13 : 16, fontWeight:700,
            padding: small ? "5px 6px" : "8px 8px",
            textAlign:"center", outline:"none",
            WebkitAppearance:"none", width:"100%" }}
        />
        {unit && (
          <span style={{ fontFamily:T.sans, fontSize:10, color:T.dim,
            paddingRight:6, flexShrink:0 }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

// ─── BOREHOLE DIAGRAM ─────────────────────────────────────────────────
function BoreholeDiagram({ instruments, totalDepth, surface, onDragDepth }) {
  const svgRef  = useRef(null);
  const dragRef = useRef(null);

  // Layout constants
  const W      = 320;
  const H      = 520;
  const PAD_T  = 40;   // top padding (surface + stickup)
  const PAD_B  = 20;
  const PAD_L  = 48;   // depth scale
  const PAD_R  = 16;
  const BH_W   = W - PAD_L - PAD_R;   // borehole total width
  const BH_X   = PAD_L;               // borehole left edge
  const CHART_H = H - PAD_T - PAD_B;

  const depthToY = d => PAD_T + (parseFloat(d) / totalDepth) * CHART_H;
  const yToDepth = y => clamp(((y - PAD_T) / CHART_H) * totalDepth, 0, totalDepth);

  // Build rendering layers — one set per instrument, side by side
  const instCount = instruments.length;
  const pipeW     = Math.min(24, (BH_W * 0.3) / instCount);
  const annularW  = Math.min(30, (BH_W * 0.35) / instCount);
  const gapW      = 6;

  // Each instrument occupies: annularW + pipeW + annularW
  const slotW     = annularW * 2 + pipeW + gapW;
  const totalInstW = slotW * instCount - gapW;
  const startX    = BH_X + (BH_W - totalInstW) / 2;

  // Ground surface and stickup reference
  const groundY = PAD_T;

  // Drag handling
  const startDrag = useCallback((instId, field, e) => {
    e.preventDefault();
    const svg = svgRef.current;
    const pt  = svg.createSVGPoint();

    const move = ev => {
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const rect = svg.getBoundingClientRect();
      const svgY = (clientY - rect.top) * (H / rect.height);
      const depth = parseFloat(yToDepth(svgY).toFixed(2));
      onDragDepth(instId, field, depth);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive:false });
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
  }, [onDragDepth, totalDepth]);

  // Depth scale ticks
  const tickInterval = totalDepth <= 10 ? 1 : totalDepth <= 25 ? 2 : totalDepth <= 50 ? 5 : 10;
  const ticks = [];
  for (let d = 0; d <= totalDepth; d += tickInterval) ticks.push(d);

  // Surface completion icon dimensions
  const surfH = 14;
  const surfW = BH_W * 0.7;

  return (
    <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ display:"block", touchAction:"none", userSelect:"none" }}>

      {/* ── Background ── */}
      <rect width={W} height={H} fill={T.bg}/>

      {/* ── Depth scale ── */}
      {ticks.map(d => {
        const y = depthToY(d);
        return (
          <g key={d}>
            <line x1={PAD_L-4} y1={y} x2={PAD_L} y2={y}
              stroke={T.border2} strokeWidth={1}/>
            <text x={PAD_L-6} y={y+4} textAnchor="end"
              fontFamily={T.sans} fontSize={9} fill={T.dim}>
              {d}m
            </text>
          </g>
        );
      })}
      {/* Scale line */}
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H-PAD_B}
        stroke={T.border2} strokeWidth={1}/>

      {/* ── Borehole walls ── */}
      <line x1={BH_X} y1={groundY} x2={BH_X} y2={H-PAD_B}
        stroke={T.dim} strokeWidth={1.5} strokeDasharray="5,3"/>
      <line x1={BH_X+BH_W} y1={groundY} x2={BH_X+BH_W} y2={H-PAD_B}
        stroke={T.dim} strokeWidth={1.5} strokeDasharray="5,3"/>

      {/* ── Ground surface line ── */}
      <line x1={BH_X-8} y1={groundY} x2={BH_X+BH_W+8} y2={groundY}
        stroke={T.text} strokeWidth={2}/>
      <text x={BH_X+BH_W+10} y={groundY+4}
        fontFamily={T.sans} fontSize={9} fill={T.dim}>GL</text>

      {/* ── Surface completion ── */}
      {surface && surface !== "other" && (() => {
        const sc = SURFACE_COMPLETIONS.find(s => s.v === surface);
        return (
          <g>
            <rect x={BH_X + (BH_W-surfW)/2} y={groundY - surfH}
              width={surfW} height={surfH} rx={2}
              fill="#6b7280" stroke="#374151" strokeWidth={1}/>
            <text x={BH_X + BH_W/2} y={groundY - surfH/2 + 3}
              textAnchor="middle" fontFamily={T.sans} fontSize={8}
              fill={T.white} fontWeight="600">
              {sc?.l.slice(0,16)}
            </text>
          </g>
        );
      })()}

      {/* ── Per-instrument rendering ── */}
      {instruments.map((inst, ii) => {
        const ix = startX + ii * (slotW + gapW);
        // Annular space centre: between borehole wall and pipe
        const annL = ix;           // left annular left
        const pipeL = ix + annularW; // pipe left
        const pipeR = pipeL + pipeW;
        const annR  = pipeR;       // right annular left
        const pipeCol = PIPE_COLOURS[inst.pipe_material] || PIPE_COLOURS.PVC;

        const casingTop    = parseFloat(inst.casing_top)    || 0;
        const casingBottom = parseFloat(inst.casing_bottom) || totalDepth;
        const screenTop    = parseFloat(inst.screen_top)    || 0;
        const screenBottom = parseFloat(inst.screen_bottom) || 0;
        const sealTop      = parseFloat(inst.seal_top)      || 0;
        const sealBottom   = parseFloat(inst.seal_bottom)   || 0;
        const stickup      = parseFloat(inst.stickup)       || 0;

        const casingTopY    = depthToY(casingTop);
        const casingBottomY = depthToY(casingBottom);
        const screenTopY    = depthToY(screenTop);
        const screenBottomY = depthToY(screenBottom);
        const sealTopY      = depthToY(sealTop);
        const sealBottomY   = depthToY(sealBottom);
        const stickupY      = groundY - (stickup / totalDepth) * CHART_H;

        // Draggable handle dot
        const Handle = ({ y, instId, field, color="#fff" }) => (
          <g style={{ cursor:"ns-resize" }}
            onMouseDown={e => startDrag(instId, field, e)}
            onTouchStart={e => startDrag(instId, field, e)}>
            <circle cx={pipeL + pipeW/2} cy={y} r={7} fill={color}
              stroke={T.text} strokeWidth={1.5}/>
            <line x1={pipeL+pipeW/2-3} y1={y} x2={pipeL+pipeW/2+3} y2={y}
              stroke={T.text} strokeWidth={1.5}/>
            <line x1={pipeL+pipeW/2-3} y1={y-2} x2={pipeL+pipeW/2+3} y2={y-2}
              stroke={T.text} strokeWidth={1}/>
            <line x1={pipeL+pipeW/2-3} y1={y+2} x2={pipeL+pipeW/2+3} y2={y+2}
              stroke={T.text} strokeWidth={1}/>
          </g>
        );

        return (
          <g key={inst.id}>
            {/* ── Backfill layers in annular space ── */}
            {inst.backfill.map(layer => {
              if (!layer.material || layer.top === "" || layer.base === "") return null;
              const st = LAYER_STYLES[layer.material];
              if (!st) return null;
              const ly1 = depthToY(parseFloat(layer.top));
              const ly2 = depthToY(parseFloat(layer.base));
              const lh  = Math.max(1, ly2 - ly1);
              // Fill both left and right annular zones
              return (
                <g key={layer.id}>
                  <rect x={annL} y={ly1} width={annularW} height={lh}
                    fill={st.fill} stroke={st.stroke} strokeWidth={0.5}/>
                  <rect x={annR} y={ly1} width={annularW} height={lh}
                    fill={st.fill} stroke={st.stroke} strokeWidth={0.5}/>
                </g>
              );
            })}

            {/* ── Bentonite seal highlight ── */}
            {inst.seal_top !== "" && inst.seal_bottom !== "" && (
              <g>
                <rect x={annL} y={sealTopY} width={annularW}
                  height={Math.max(1, sealBottomY - sealTopY)}
                  fill="#a855f7" stroke="#7e22ce" strokeWidth={0.5} opacity={0.7}/>
                <rect x={annR} y={sealTopY} width={annularW}
                  height={Math.max(1, sealBottomY - sealTopY)}
                  fill="#a855f7" stroke="#7e22ce" strokeWidth={0.5} opacity={0.7}/>
              </g>
            )}

            {/* ── Pipe casing ── */}
            {inst.casing_top !== "" && inst.casing_bottom !== "" && (
              <g>
                {/* Stickup above ground */}
                {stickup > 0 && (
                  <rect x={pipeL} y={stickupY}
                    width={pipeW} height={groundY - stickupY}
                    fill={pipeCol} stroke={pipeCol} strokeWidth={1}/>
                )}
                {/* Pipe walls (hollow) */}
                <rect x={pipeL} y={casingTopY}
                  width={3} height={Math.max(1, casingBottomY - casingTopY)}
                  fill={pipeCol}/>
                <rect x={pipeR - 3} y={casingTopY}
                  width={3} height={Math.max(1, casingBottomY - casingTopY)}
                  fill={pipeCol}/>
                {/* Pipe cap at bottom */}
                <rect x={pipeL} y={casingBottomY - 2} width={pipeW} height={4}
                  fill={pipeCol}/>
              </g>
            )}

            {/* ── Screen interval (perforated) ── */}
            {inst.screen_top !== "" && inst.screen_bottom !== "" && screenBottom > screenTop && (
              <g>
                <rect x={pipeL} y={screenTopY}
                  width={3} height={Math.max(1, screenBottomY - screenTopY)}
                  fill={pipeCol} opacity={0.3}/>
                <rect x={pipeR-3} y={screenTopY}
                  width={3} height={Math.max(1, screenBottomY - screenTopY)}
                  fill={pipeCol} opacity={0.3}/>
                {/* Perforation marks */}
                {Array.from({ length: Math.max(1, Math.floor((screenBottomY - screenTopY)/6)) }).map((_,pi) => {
                  const py = screenTopY + pi * 6 + 3;
                  return (
                    <g key={pi}>
                      <line x1={pipeL} y1={py} x2={pipeL+8} y2={py}
                        stroke={pipeCol} strokeWidth={1}/>
                      <line x1={pipeR} y1={py} x2={pipeR-8} y2={py}
                        stroke={pipeCol} strokeWidth={1}/>
                    </g>
                  );
                })}
                {/* Screen label */}
                <text x={pipeL + pipeW/2} y={(screenTopY+screenBottomY)/2 + 3}
                  textAnchor="middle" fontFamily={T.sans} fontSize={7}
                  fill={pipeCol} fontWeight="700">SCR</text>
              </g>
            )}

            {/* ── Draggable handles ── */}
            {inst.casing_bottom !== "" && (
              <Handle y={casingBottomY} instId={inst.id} field="casing_bottom" color={pipeCol}/>
            )}
            {inst.screen_top !== "" && (
              <Handle y={screenTopY}    instId={inst.id} field="screen_top"    color="#22c55e"/>
            )}
            {inst.screen_bottom !== "" && (
              <Handle y={screenBottomY} instId={inst.id} field="screen_bottom" color="#22c55e"/>
            )}
            {inst.seal_top !== "" && (
              <Handle y={sealTopY}      instId={inst.id} field="seal_top"      color="#c084fc"/>
            )}
            {inst.seal_bottom !== "" && (
              <Handle y={sealBottomY}   instId={inst.id} field="seal_bottom"   color="#c084fc"/>
            )}

            {/* ── Instrument label ── */}
            <text x={pipeL + pipeW/2} y={casingTopY - 6}
              textAnchor="middle" fontFamily={T.sans} fontSize={8}
              fill={pipeCol} fontWeight="700">
              {inst.ref_id || `I${ii+1}`}
            </text>
          </g>
        );
      })}

      {/* ── Legend ── */}
      {(() => {
        const used = new Set();
        instruments.forEach(inst => inst.backfill.forEach(l => l.material && used.add(l.material)));
        const items = [...used];
        const legendY = H - PAD_B - items.length * 13 - 4;
        return (
          <g>
            {items.map((mat, li) => {
              const st = LAYER_STYLES[mat];
              if (!st) return null;
              return (
                <g key={mat} transform={`translate(${PAD_L+4}, ${legendY + li*13})`}>
                  <rect width={10} height={8} fill={st.fill} stroke={st.stroke}
                    strokeWidth={0.5} rx={1}/>
                  <text x={13} y={7} fontFamily={T.sans} fontSize={8} fill={T.dim}>
                    {st.label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })()}
    </svg>
  );
}

// ─── INSTRUMENT FORM SECTION ──────────────────────────────────────────
function InstrumentSection({ inst, idx, totalDepth, onChange, onRemove, isOnly }) {
  const set = (field, val) => onChange({ ...inst, [field]: val });

  const updateLayer = (lid, field, val) =>
    onChange({
      ...inst,
      backfill: inst.backfill.map(l => l.id === lid ? { ...l, [field]: val } : l),
    });

  // When a layer's base changes, snap the next layer's top to match (contiguous)
  const updateLayerBase = (lid, val) => {
    const idx2 = inst.backfill.findIndex(l => l.id === lid);
    const updated = inst.backfill.map((l, i) => {
      if (l.id === lid) return { ...l, base: val };
      if (i === idx2 + 1) return { ...l, top: val }; // snap next top
      return l;
    });
    onChange({ ...inst, backfill: updated });
  };

  const updateLayerTop = (lid, val) => {
    const idx2 = inst.backfill.findIndex(l => l.id === lid);
    const updated = inst.backfill.map((l, i) => {
      if (l.id === lid) return { ...l, top: val };
      if (i === idx2 - 1) return { ...l, base: val }; // snap prev base
      return l;
    });
    onChange({ ...inst, backfill: updated });
  };

  const addLayer = () => {
    const lastBase = inst.backfill.length
      ? inst.backfill[inst.backfill.length-1].base
      : inst.casing_top || "0.00";
    onChange({
      ...inst,
      backfill: [...inst.backfill, { ...newLayer("native_backfill"), top: lastBase, base: "" }],
    });
  };

  const removeLayer = lid =>
    onChange({ ...inst, backfill: inst.backfill.filter(l => l.id !== lid) });

  const pipeCol = PIPE_COLOURS[inst.pipe_material] || PIPE_COLOURS.PVC;

  const row = (children) => (
    <div style={{ display:"flex", gap:8, marginBottom:8 }}>{children}</div>
  );

  const pill = (options, field, colors={}) => (
    <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
      {options.map(opt => {
        const val = typeof opt === "string" ? opt : opt.v;
        const lbl = typeof opt === "string" ? opt : opt.l;
        const sel = inst[field] === val;
        const col = colors[val] || T.accent;
        return (
          <button key={val}
            onClick={() => set(field, sel ? "" : val)}
            style={{ padding:"6px 11px", borderRadius:7, fontSize:12,
              fontFamily:T.sans, fontWeight: sel ? 700 : 500,
              border:`2px solid ${sel ? col : T.border}`,
              background: sel ? col : T.surface2,
              color: sel ? T.white : T.text,
              cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
            {lbl}
          </button>
        );
      })}
    </div>
  );

  const sectionHead = (label) => (
    <div style={{ fontFamily:T.sans, fontSize:10, fontWeight:700,
      color:T.dimmer, letterSpacing:"0.1em", textTransform:"uppercase",
      marginBottom:6, marginTop:14 }}>{label}</div>
  );

  return (
    <div style={{ background:T.surface, borderRadius:12,
      border:`2px solid ${pipeCol}30`,
      marginBottom:12, overflow:"hidden" }}>

      {/* Header bar */}
      <div style={{ background:`${pipeCol}18`,
        borderBottom:`1px solid ${pipeCol}30`,
        padding:"10px 14px",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontFamily:T.sans, fontSize:14, fontWeight:700, color:pipeCol }}>
          Instrument {idx+1}
          {inst.ref_id && <span style={{ fontWeight:500, color:T.dim, marginLeft:8 }}>
            — {inst.ref_id}
          </span>}
        </div>
        {!isOnly && (
          <button onClick={onRemove}
            style={{ padding:"4px 10px", borderRadius:6,
              background:"transparent", border:`1px solid ${T.red}`,
              color:T.red, fontFamily:T.sans, fontSize:11,
              fontWeight:600, cursor:"pointer" }}>
            Remove
          </button>
        )}
      </div>

      <div style={{ padding:"12px 14px" }}>

        {sectionHead("Instrument Type")}
        {pill(INST_TYPES, "inst_type")}

        {sectionHead("Reference ID")}
        <input type="text" value={inst.ref_id}
          onChange={e => set("ref_id", e.target.value)}
          placeholder="e.g. PZ-01, VWP-A…"
          style={{ width:"100%", background:T.surface2,
            border:`1px solid ${T.border}`, borderRadius:7,
            color:T.text, fontFamily:T.sans, fontSize:14,
            padding:"8px 10px", outline:"none", marginBottom:8 }}/>

        {sectionHead("Pipe / Casing")}
        {pill(PIPE_MATERIALS, "pipe_material", PIPE_COLOURS)}
        {row(<>
          <DepthField label="Diameter" value={inst.pipe_diameter}
            onChange={v => set("pipe_diameter", v)} unit="mm" min={10} max={300} step={1}/>
          <DepthField label="Total length" value={inst.pipe_length}
            onChange={v => set("pipe_length", v)} unit="m" max={totalDepth+2}/>
          <DepthField label="Stick-up" value={inst.stickup}
            onChange={v => set("stickup", v)} unit="m" min={0} max={3}/>
        </>)}

        {sectionHead("Depths — Drag handles on diagram or edit here")}

        {/* Casing */}
        <div style={{ background:T.surface2, borderRadius:8,
          border:`1px solid ${T.border}`, padding:"10px", marginBottom:8 }}>
          <div style={{ fontFamily:T.sans, fontSize:11, fontWeight:600,
            color:T.dim, marginBottom:6 }}>Casing</div>
          {row(<>
            <DepthField label="Top (m)" value={inst.casing_top}
              onChange={v => set("casing_top", v)} max={totalDepth}/>
            <DepthField label="Bottom (m)" value={inst.casing_bottom}
              onChange={v => set("casing_bottom", v)} max={totalDepth}/>
          </>)}
        </div>

        {/* Screen */}
        <div style={{ background:"#dcfce7", borderRadius:8,
          border:"1px solid #86efac", padding:"10px", marginBottom:8 }}>
          <div style={{ fontFamily:T.sans, fontSize:11, fontWeight:600,
            color:"#15803d", marginBottom:6 }}>Screen interval</div>
          {row(<>
            <DepthField label="Top (m)" value={inst.screen_top}
              onChange={v => set("screen_top", v)} max={totalDepth}/>
            <DepthField label="Bottom (m)" value={inst.screen_bottom}
              onChange={v => set("screen_bottom", v)} max={totalDepth}/>
          </>)}
        </div>

        {/* Seal */}
        <div style={{ background:"#faf5ff", borderRadius:8,
          border:"1px solid #d8b4fe", padding:"10px", marginBottom:8 }}>
          <div style={{ fontFamily:T.sans, fontSize:11, fontWeight:600,
            color:"#7e22ce", marginBottom:6 }}>Bentonite seal</div>
          {row(<>
            <DepthField label="Top (m)" value={inst.seal_top}
              onChange={v => set("seal_top", v)} max={totalDepth}/>
            <DepthField label="Bottom (m)" value={inst.seal_bottom}
              onChange={v => set("seal_bottom", v)} max={totalDepth}/>
          </>)}
        </div>

        {sectionHead("Backfill Layers (top to bottom)")}
        {inst.backfill.map((layer, li) => {
          const st = LAYER_STYLES[layer.material];
          return (
            <div key={layer.id} style={{ background:st ? st.fill+"22" : T.surface2,
              borderRadius:8, border:`1px solid ${st ? st.stroke+"60" : T.border}`,
              padding:"10px", marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center",
                justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontFamily:T.sans, fontSize:11, fontWeight:700,
                  color:st?.stroke || T.dim }}>Layer {li+1}</span>
                {inst.backfill.length > 1 && (
                  <button onClick={() => removeLayer(layer.id)}
                    style={{ background:"none", border:"none", color:T.dim,
                      fontSize:16, cursor:"pointer", lineHeight:1 }}>×</button>
                )}
              </div>
              {/* Material pills */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
                {BACKFILL_MATERIALS.map(mat => {
                  const s = LAYER_STYLES[mat];
                  const sel = layer.material === mat;
                  return (
                    <button key={mat}
                      onClick={() => updateLayer(layer.id, "material", mat)}
                      style={{ padding:"5px 10px", borderRadius:6, fontSize:11,
                        fontFamily:T.sans, fontWeight: sel ? 700 : 500,
                        border:`2px solid ${sel ? s.stroke : T.border}`,
                        background: sel ? s.fill : T.surface2,
                        color: sel ? "#1a1a1a" : T.text,
                        cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
              {/* Depth row */}
              <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                <DepthField label="Top (m)" value={layer.top}
                  onChange={v => updateLayerTop(layer.id, v)} max={totalDepth}/>
                <DepthField label="Base (m)" value={layer.base}
                  onChange={v => updateLayerBase(layer.id, v)} max={totalDepth}/>
              </div>
              {/* Quantity row */}
              <div style={{ display:"flex", gap:8 }}>
                <DepthField label="Qty" value={layer.qty}
                  onChange={v => updateLayer(layer.id, "qty", v)} unit="" step={0.1} min={0}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.sans, fontSize:10, fontWeight:600,
                    color:T.dim, marginBottom:3 }}>Unit</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {["kg","L","m","bags","m³"].map(u => (
                      <button key={u} onClick={() => updateLayer(layer.id, "unit", u)}
                        style={{ padding:"4px 8px", borderRadius:5, fontSize:11,
                          fontFamily:T.sans, fontWeight: layer.unit===u ? 700 : 500,
                          border:`2px solid ${layer.unit===u ? "#8b5cf6" : T.border}`,
                          background: layer.unit===u ? "#8b5cf6" : T.surface2,
                          color: layer.unit===u ? T.white : T.text,
                          cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <button onClick={addLayer}
          style={{ width:"100%", padding:"8px", borderRadius:8,
            background:"transparent", border:`1.5px dashed ${T.border2}`,
            color:T.dim, fontFamily:T.sans, fontSize:13, fontWeight:600,
            cursor:"pointer", marginBottom:8,
            WebkitTapHighlightColor:"transparent" }}>
          + Add Backfill Layer
        </button>

        {sectionHead("Surface Completion")}
        {pill(SURFACE_COMPLETIONS, "surface")}
        {inst.surface === "other" && (
          <input type="text" value={inst.surface_other}
            onChange={e => set("surface_other", e.target.value)}
            placeholder="Describe surface completion…"
            style={{ width:"100%", background:T.surface2,
              border:`1px solid ${T.border}`, borderRadius:7,
              color:T.text, fontFamily:T.sans, fontSize:13,
              padding:"8px 10px", outline:"none", marginBottom:8 }}/>
        )}

        {sectionHead("Remarks")}
        <textarea value={inst.remarks} rows={2}
          onChange={e => set("remarks", e.target.value)}
          placeholder="Installation notes, conditions, issues…"
          style={{ width:"100%", background:T.surface2,
            border:`1px solid ${T.border}`, borderRadius:8,
            color:T.text, fontFamily:T.sans, fontSize:13,
            padding:"8px 10px", outline:"none",
            resize:"none", lineHeight:1.5 }}/>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────
export default function App() {
  const [totalDepth,   setTotalDepth]   = useState(15);
  const [instruments,  setInstruments]  = useState([newInstrument()]);
  const [surface,      setSurface]      = useState("flush_toby");
  const [saved,        setSaved]        = useState(false);
  const [toast,        setToast]        = useState({ msg:"", visible:false });
  const toastTimer = useRef(null);

  const showToast = msg => {
    setToast({ msg, visible:true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({...t, visible:false})), 2500);
  };

  const updateInstrument = (id, updated) =>
    setInstruments(prev => prev.map(i => i.id === id ? updated : i));

  const removeInstrument = id =>
    setInstruments(prev => prev.filter(i => i.id !== id));

  const addInstrument = () =>
    setInstruments(prev => [...prev, newInstrument()]);

  // Called by diagram drag — update a specific depth field
  const handleDragDepth = useCallback((instId, field, val) => {
    setInstruments(prev => prev.map(inst => {
      if (inst.id !== instId) return inst;
      const updated = { ...inst, [field]: parseFloat(val.toFixed(2)) };
      // Cascade: if dragging screen_top/bottom, keep seal just above screen
      return updated;
    }));
  }, []);

  const handleSave = () => {
    const hasType = instruments.every(i => i.inst_type);
    if (!hasType) { showToast("Select instrument type for all entries"); return; }
    // In full app this would dbPut — here just show confirmation
    setSaved(true);
    showToast("Installation saved ✓");
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ background:T.bg, minHeight:"100vh",
      fontFamily:T.sans, color:T.text }}>

      {/* Header */}
      <div style={{ background:T.nav, padding:"12px 16px",
        display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:28, height:28, borderRadius:6, background:"#e8a020",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:11, fontWeight:900, color:T.nav }}>ST</span>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:T.white,
            letterSpacing:"0.02em" }}>SUBSTRATA</div>
          <div style={{ fontSize:9, color:"#9ca3af", letterSpacing:"0.12em" }}>
            INSTALLATIONS
          </div>
        </div>
        <div style={{ marginLeft:"auto", fontFamily:T.sans, fontSize:12,
          color:"#9ca3af" }}>
          Interactive diagram
        </div>
      </div>

      {/* Total depth control */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`,
        padding:"10px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ fontFamily:T.sans, fontSize:12, fontWeight:600, color:T.dim }}>
          Borehole depth
        </div>
        <div style={{ width:120 }}>
          <DepthField value={totalDepth} onChange={setTotalDepth}
            unit="m" min={1} max={200} step={0.5}/>
        </div>
        <div style={{ fontFamily:T.sans, fontSize:12, color:T.dim }}>
          Surface completion
        </div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {SURFACE_COMPLETIONS.map(s => (
            <button key={s.v} onClick={() => setSurface(s.v)}
              style={{ padding:"5px 10px", borderRadius:7, fontSize:11,
                fontFamily:T.sans, fontWeight: surface===s.v ? 700 : 500,
                border:`2px solid ${surface===s.v ? T.accent : T.border}`,
                background: surface===s.v ? T.accent : T.surface2,
                color: surface===s.v ? T.white : T.text,
                cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout — diagram left, forms right on wide screens */}
      <div style={{ display:"flex", flexDirection:"row", flexWrap:"wrap",
        maxWidth:1100, margin:"0 auto" }}>

        {/* ── DIAGRAM (sticky on wide, inline on mobile) ── */}
        <div style={{ flex:"0 0 340px", padding:"12px",
          position:"sticky", top:0, alignSelf:"flex-start",
          maxHeight:"100vh", overflowY:"auto" }}>
          <div style={{ background:T.surface, borderRadius:12,
            border:`1px solid ${T.border}`,
            boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
            overflow:"hidden" }}>
            <div style={{ padding:"8px 12px 4px",
              borderBottom:`1px solid ${T.border}`,
              fontFamily:T.sans, fontSize:11, fontWeight:700,
              color:T.dim, letterSpacing:"0.08em" }}>
              BOREHOLE CROSS-SECTION — {totalDepth}m
            </div>
            <BoreholeDiagram
              instruments={instruments}
              totalDepth={totalDepth}
              surface={surface}
              onDragDepth={handleDragDepth}/>
          </div>
        </div>

        {/* ── FORMS ── */}
        <div style={{ flex:"1 1 340px", padding:"12px", minWidth:0 }}>

          {instruments.map((inst, idx) => (
            <InstrumentSection
              key={inst.id}
              inst={inst}
              idx={idx}
              totalDepth={totalDepth}
              onChange={updated => updateInstrument(inst.id, updated)}
              onRemove={() => removeInstrument(inst.id)}
              isOnly={instruments.length === 1}/>
          ))}

          {/* Add instrument button */}
          <button onClick={addInstrument}
            style={{ width:"100%", padding:"14px",
              borderRadius:10, marginBottom:12,
              background:"transparent",
              border:`2px dashed ${T.accent}`,
              color:T.accent, fontFamily:T.sans,
              fontSize:14, fontWeight:700,
              cursor:"pointer",
              WebkitTapHighlightColor:"transparent" }}>
            + Add Instrument
          </button>

          {/* Save */}
          <button onClick={handleSave}
            style={{ width:"100%", padding:"16px", borderRadius:10,
              background: saved ? "#059669" : T.accent,
              border:"none", color:T.white,
              fontFamily:T.sans, fontSize:15, fontWeight:700,
              cursor:"pointer", transition:"background 0.2s",
              WebkitTapHighlightColor:"transparent" }}>
            {saved ? "Saved ✓" : "Save Installation Record"}
          </button>
        </div>
      </div>

      {/* Toast */}
      <div style={{ position:"fixed", bottom:24, left:"50%",
        transform:"translateX(-50%)",
        background:T.nav, color:T.white,
        fontFamily:T.sans, fontSize:13, fontWeight:600,
        padding:"10px 22px", borderRadius:20,
        boxShadow:"0 4px 20px rgba(0,0,0,0.25)",
        border:"1px solid rgba(255,255,255,0.1)",
        zIndex:300, pointerEvents:"none",
        opacity: toast.visible ? 1 : 0,
        transition:"opacity 0.2s", whiteSpace:"nowrap" }}>
        {toast.msg}
      </div>
    </div>
  );
}
