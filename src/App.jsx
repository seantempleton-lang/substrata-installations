import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "substrata-installations:latest";

const T = {
  bg: "#f4f5f7",
  surface: "#ffffff",
  surface2: "#f8f9fa",
  border: "#e5e7eb",
  border2: "#d1d5db",
  text: "#111318",
  dim: "#6b7280",
  dimmer: "#9ca3af",
  nav: "#13151a",
  accent: "#10b981",
  accentDark: "#047857",
  amber: "#e8a020",
  red: "#ef4444",
  white: "#ffffff",
  sans: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const LAYER_STYLES = {
  sand_pack: { fill: "#f5e642", stroke: "#c9bc00", label: "Sand Pack" },
  pea_gravel: { fill: "#d4a96a", stroke: "#a07840", label: "Pea Gravel" },
  bentonite_pellets: { fill: "#c084fc", stroke: "#7e22ce", label: "Bentonite Pellets" },
  bentonite_grout: { fill: "#a855f7", stroke: "#6b21a8", label: "Bentonite Grout" },
  cement_grout: { fill: "#94a3b8", stroke: "#475569", label: "Cement Grout" },
  concrete: { fill: "#6b7280", stroke: "#374151", label: "Concrete" },
  native_backfill: { fill: "#92400e", stroke: "#78350f", label: "Native Backfill" },
};

const PIPE_COLOURS = {
  PVC: "#3b82f6",
  HDPE: "#f59e0b",
  SS: "#6b7280",
  Other: "#8b5cf6",
};

const SURFACE_COMPLETIONS = [
  { v: "flush_toby", l: "Flush Toby Box" },
  { v: "monument", l: "Above-Ground Monument" },
  { v: "concrete_pad", l: "Concrete Pad" },
  { v: "bollard", l: "Bollard Protection" },
  { v: "flush_cover", l: "Flush Cover Plate" },
  { v: "other", l: "Other" },
];

const BACKFILL_MATERIALS = Object.keys(LAYER_STYLES);
const PIPE_MATERIALS = ["PVC", "HDPE", "SS", "Other"];
const INST_TYPES = [
  { v: "standpipe_piezometer", l: "Standpipe Piezometer" },
  { v: "vwp", l: "VWP" },
  { v: "inclinometer", l: "Inclinometer" },
  { v: "monitoring_well", l: "Monitoring Well" },
  { v: "gas_monitoring", l: "Gas Monitoring" },
];

let idCounter = 0;
const uid = () => `id_${++idCounter}_${Math.random().toString(36).slice(2, 5)}`;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const createLayer = (material = "bentonite_grout") => ({
  id: uid(),
  material,
  top: "",
  base: "",
  qty: "",
  unit: "kg",
});

const createInstrument = () => ({
  id: uid(),
  inst_type: "standpipe_piezometer",
  ref_id: "",
  pipe_material: "PVC",
  pipe_diameter: "50",
  pipe_length: "",
  stickup: "0.30",
  casing_top: "0.00",
  casing_bottom: "",
  screen_top: "",
  screen_bottom: "",
  seal_top: "",
  seal_bottom: "",
  backfill: [createLayer("sand_pack"), createLayer("bentonite_pellets"), createLayer("cement_grout")],
  surface: "flush_toby",
  surface_other: "",
  remarks: "",
});

const createDraft = () => ({
  projectName: "",
  location: "",
  totalDepth: 15,
  surface: "flush_toby",
  instruments: [createInstrument()],
});

function useIsMobile(breakpoint = 880) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = (event) => setIsMobile(event.matches);
    setIsMobile(media.matches);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, [breakpoint]);

  return isMobile;
}

function NumberField({ label, value, onChange, min = 0, max = 999, step = 0.01, unit = "m" }) {
  const [local, setLocal] = useState(value === "" ? "" : String(value));

  useEffect(() => {
    setLocal(value === "" ? "" : String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(local);
    if (Number.isNaN(parsed)) {
      setLocal(value === "" ? "" : String(value));
      return;
    }
    const next = parseFloat(clamp(parsed, min, max).toFixed(2));
    setLocal(String(next));
    onChange(next);
  };

  return (
    <div style={{ flex: 1 }}>
      {label ? <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, marginBottom: 4 }}>{label}</div> : null}
      <div style={{ display: "flex", alignItems: "center", background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: 8 }}>
        <input
          type="number"
          value={local}
          step={step}
          inputMode="decimal"
          onChange={(event) => setLocal(event.target.value)}
          onBlur={commit}
          style={{ flex: 1, border: 0, outline: "none", background: "transparent", padding: "10px 12px", textAlign: "center", fontWeight: 700 }}
        />
        <span style={{ paddingRight: 10, fontSize: 11, color: T.dim }}>{unit}</span>
      </div>
    </div>
  );
}

function ChoicePills({ options, value, onChange, palette = {} }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.v;
        const optionLabel = typeof option === "string" ? option : option.l;
        const selected = value === optionValue;
        const colour = palette[optionValue] || T.accent;
        return (
          <button
            key={optionValue}
            onClick={() => onChange(optionValue)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `2px solid ${selected ? colour : T.border}`,
              background: selected ? colour : T.surface2,
              color: selected ? T.white : T.text,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}

function MobileSelect({ label, value, options, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      {label ? <span style={{ fontSize: 10, fontWeight: 700, color: T.dim }}>{label}</span> : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          padding: "11px 12px",
          borderRadius: 10,
          border: `1px solid ${T.border}`,
          background: T.surface2,
          color: T.text,
          outline: "none",
        }}
      >
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.v;
          const optionLabel = typeof option === "string" ? option : option.l;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 800, color: T.dimmer, letterSpacing: "0.1em", textTransform: "uppercase", margin: "14px 0 8px" }}>{children}</div>;
}

function Diagram({ instruments, totalDepth, surface, onDragDepth, isMobile }) {
  const svgRef = useRef(null);
  const W = 320;
  const H = 520;
  const PAD_T = 40;
  const PAD_B = 20;
  const PAD_L = 48;
  const PAD_R = 16;
  const BH_W = W - PAD_L - PAD_R;
  const CHART_H = H - PAD_T - PAD_B;
  const BH_X = PAD_L;
  const depthToY = (depth) => PAD_T + (parseFloat(depth) / totalDepth) * CHART_H;
  const yToDepth = (y) => clamp(((y - PAD_T) / CHART_H) * totalDepth, 0, totalDepth);
  const annularW = Math.min(30, (BH_W * 0.35) / instruments.length);
  const pipeW = Math.min(24, (BH_W * 0.3) / instruments.length);
  const gapW = 6;
  const slotW = annularW * 2 + pipeW + gapW;
  const startX = BH_X + (BH_W - (slotW * instruments.length - gapW)) / 2;

  const startDrag = useCallback((instrumentId, field, event) => {
    event.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const move = (moveEvent) => {
      const clientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const rect = svg.getBoundingClientRect();
      const svgY = (clientY - rect.top) * (H / rect.height);
      onDragDepth(instrumentId, field, parseFloat(yToDepth(svgY).toFixed(2)));
    };

    const stop = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchend", stop);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
  }, [onDragDepth, totalDepth]);

  const ticks = [];
  const tickInterval = totalDepth <= 10 ? 1 : totalDepth <= 25 ? 2 : totalDepth <= 50 ? 5 : 10;
  for (let depth = 0; depth <= totalDepth; depth += tickInterval) ticks.push(depth);

  const handleRadius = isMobile ? 10 : 7;
  const handleHitRadius = isMobile ? 18 : 10;

  const Handle = ({ x, y, instrumentId, field, color }) => (
    <g onMouseDown={(event) => startDrag(instrumentId, field, event)} onTouchStart={(event) => startDrag(instrumentId, field, event)} style={{ cursor: "ns-resize" }}>
      <circle cx={x} cy={y} r={handleHitRadius} fill="transparent" />
      <circle cx={x} cy={y} r={handleRadius} fill={color} stroke={T.text} strokeWidth={1.5} />
      <line x1={x - 3} y1={y} x2={x + 3} y2={y} stroke={T.text} strokeWidth={1.5} />
    </g>
  );

  return (
    <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", touchAction: "none", userSelect: "none" }}>
      <rect width={W} height={H} fill={T.bg} />
      {ticks.map((depth) => {
        const y = depthToY(depth);
        return (
          <g key={depth}>
            <line x1={PAD_L - 4} y1={y} x2={PAD_L} y2={y} stroke={T.border2} strokeWidth={1} />
            <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize={9} fill={T.dim}>{depth}m</text>
          </g>
        );
      })}
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={T.border2} strokeWidth={1} />
      <line x1={BH_X} y1={PAD_T} x2={BH_X} y2={H - PAD_B} stroke={T.dim} strokeWidth={1.5} strokeDasharray="5,3" />
      <line x1={BH_X + BH_W} y1={PAD_T} x2={BH_X + BH_W} y2={H - PAD_B} stroke={T.dim} strokeWidth={1.5} strokeDasharray="5,3" />
      <line x1={BH_X - 8} y1={PAD_T} x2={BH_X + BH_W + 8} y2={PAD_T} stroke={T.text} strokeWidth={2} />
      {surface !== "other" ? <text x={BH_X + BH_W / 2} y={PAD_T - 8} textAnchor="middle" fontSize={9} fill={T.dim}>{SURFACE_COMPLETIONS.find((item) => item.v === surface)?.l || ""}</text> : null}

      {instruments.map((inst, index) => {
        const ix = startX + index * (slotW + gapW);
        const annL = ix;
        const pipeL = ix + annularW;
        const pipeR = pipeL + pipeW;
        const annR = pipeR;
        const pipeCol = PIPE_COLOURS[inst.pipe_material] || PIPE_COLOURS.PVC;
        const centerX = pipeL + pipeW / 2;
        const casingTopY = depthToY(parseFloat(inst.casing_top) || 0);
        const casingBottomY = depthToY(parseFloat(inst.casing_bottom) || totalDepth);
        const screenTopY = depthToY(parseFloat(inst.screen_top) || 0);
        const screenBottomY = depthToY(parseFloat(inst.screen_bottom) || 0);
        const sealTopY = depthToY(parseFloat(inst.seal_top) || 0);
        const sealBottomY = depthToY(parseFloat(inst.seal_bottom) || 0);

        return (
          <g key={inst.id}>
            {inst.backfill.map((layer) => {
              if (!layer.material || layer.top === "" || layer.base === "") return null;
              const style = LAYER_STYLES[layer.material];
              const topY = depthToY(parseFloat(layer.top));
              const baseY = depthToY(parseFloat(layer.base));
              const height = Math.max(1, baseY - topY);
              return (
                <g key={layer.id}>
                  <rect x={annL} y={topY} width={annularW} height={height} fill={style.fill} stroke={style.stroke} strokeWidth={0.5} />
                  <rect x={annR} y={topY} width={annularW} height={height} fill={style.fill} stroke={style.stroke} strokeWidth={0.5} />
                </g>
              );
            })}
            <rect x={pipeL} y={casingTopY} width={3} height={Math.max(1, casingBottomY - casingTopY)} fill={pipeCol} />
            <rect x={pipeR - 3} y={casingTopY} width={3} height={Math.max(1, casingBottomY - casingTopY)} fill={pipeCol} />
            <rect x={pipeL} y={casingBottomY - 2} width={pipeW} height={4} fill={pipeCol} />
            {inst.screen_top !== "" && inst.screen_bottom !== "" ? <rect x={pipeL} y={screenTopY} width={pipeW} height={Math.max(1, screenBottomY - screenTopY)} fill={pipeCol} opacity={0.15} /> : null}
            {inst.seal_top !== "" && inst.seal_bottom !== "" ? <rect x={annL} y={sealTopY} width={annularW * 2 + pipeW} height={Math.max(1, sealBottomY - sealTopY)} fill="#a855f7" opacity={0.18} /> : null}
            <text x={centerX} y={casingTopY - 6} textAnchor="middle" fontSize={8} fill={pipeCol} fontWeight="700">{inst.ref_id || `I${index + 1}`}</text>
            {inst.casing_bottom !== "" ? <Handle x={centerX} y={casingBottomY} instrumentId={inst.id} field="casing_bottom" color={pipeCol} /> : null}
            {inst.screen_top !== "" ? <Handle x={centerX} y={screenTopY} instrumentId={inst.id} field="screen_top" color="#22c55e" /> : null}
            {inst.screen_bottom !== "" ? <Handle x={centerX} y={screenBottomY} instrumentId={inst.id} field="screen_bottom" color="#22c55e" /> : null}
            {inst.seal_top !== "" ? <Handle x={centerX} y={sealTopY} instrumentId={inst.id} field="seal_top" color="#c084fc" /> : null}
            {inst.seal_bottom !== "" ? <Handle x={centerX} y={sealBottomY} instrumentId={inst.id} field="seal_bottom" color="#c084fc" /> : null}
          </g>
        );
      })}
    </svg>
  );
}

function InstrumentCard({ instrument, index, totalDepth, onChange, onRemove, canRemove, isMobile }) {
  const [expanded, setExpanded] = useState(index === 0);
  const [expandedLayerId, setExpandedLayerId] = useState(instrument.backfill[0]?.id ?? null);

  useEffect(() => {
    if (!isMobile) {
      setExpanded(true);
      return;
    }
    if (index === 0) {
      setExpanded(true);
    }
  }, [index, isMobile]);

  useEffect(() => {
    if (!instrument.backfill.some((layer) => layer.id === expandedLayerId)) {
      setExpandedLayerId(instrument.backfill[0]?.id ?? null);
    }
  }, [expandedLayerId, instrument.backfill]);

  const updateLayer = (layerId, patch) => onChange({
    ...instrument,
    backfill: instrument.backfill.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer)),
  });

  const addLayer = () => {
    const lastBase = instrument.backfill.at(-1)?.base ?? instrument.casing_top ?? "0.00";
    onChange({ ...instrument, backfill: [...instrument.backfill, { ...createLayer("native_backfill"), top: lastBase }] });
  };

  return (
    <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, marginBottom: 12, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "12px 14px", background: `${(PIPE_COLOURS[instrument.pipe_material] || T.accent)}18`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <strong>Instrument {index + 1}</strong>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>
            {[instrument.ref_id || "Untitled", INST_TYPES.find((item) => item.v === instrument.inst_type)?.l || "Type", `${instrument.pipe_material} pipe`].join(" | ")}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isMobile ? (
            <button onClick={() => setExpanded((current) => !current)} style={{ border: `1px solid ${T.border}`, color: T.text, borderRadius: 999, padding: "6px 10px", background: T.surface, cursor: "pointer", fontWeight: 700 }}>
              {expanded ? "Hide" : "Edit"}
            </button>
          ) : null}
          {canRemove ? <button onClick={onRemove} style={{ border: `1px solid ${T.red}`, color: T.red, borderRadius: 8, padding: "6px 10px", background: "transparent", cursor: "pointer" }}>Remove</button> : null}
        </div>
      </div>
      {isMobile && !expanded ? (
        <div style={{ padding: 14, display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            <div style={{ background: T.surface2, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: T.dim, fontWeight: 700 }}>Casing</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{instrument.casing_top || "0"} - {instrument.casing_bottom || draftSafeDepth(totalDepth)}m</div>
            </div>
            <div style={{ background: T.surface2, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: T.dim, fontWeight: 700 }}>Backfill Layers</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{instrument.backfill.length}</div>
            </div>
          </div>
        </div>
      ) : (
      <div style={{ padding: 14 }}>
        <SectionLabel>Instrument Type</SectionLabel>
        <ChoicePills options={INST_TYPES} value={instrument.inst_type} onChange={(value) => onChange({ ...instrument, inst_type: value })} />

        <SectionLabel>Reference ID</SectionLabel>
        <input value={instrument.ref_id} onChange={(event) => onChange({ ...instrument, ref_id: event.target.value })} placeholder="e.g. PZ-01" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, outline: "none" }} />

        <SectionLabel>Pipe / Casing</SectionLabel>
        <ChoicePills options={PIPE_MATERIALS} value={instrument.pipe_material} onChange={(value) => onChange({ ...instrument, pipe_material: value })} palette={PIPE_COLOURS} />
        <div className="field-row" style={{ marginTop: 8 }}>
          <NumberField label="Diameter" value={instrument.pipe_diameter} onChange={(value) => onChange({ ...instrument, pipe_diameter: value })} min={10} max={300} step={1} unit="mm" />
          <NumberField label="Pipe Length" value={instrument.pipe_length} onChange={(value) => onChange({ ...instrument, pipe_length: value })} max={totalDepth + 2} />
          <NumberField label="Stick-up" value={instrument.stickup} onChange={(value) => onChange({ ...instrument, stickup: value })} max={3} />
        </div>

        <SectionLabel>Depths</SectionLabel>
        <div style={{ display: "grid", gap: 8 }}>
          <div className="field-row">
            <NumberField label="Casing Top" value={instrument.casing_top} onChange={(value) => onChange({ ...instrument, casing_top: value })} max={totalDepth} />
            <NumberField label="Casing Bottom" value={instrument.casing_bottom} onChange={(value) => onChange({ ...instrument, casing_bottom: value })} max={totalDepth} />
          </div>
          <div className="field-row">
            <NumberField label="Screen Top" value={instrument.screen_top} onChange={(value) => onChange({ ...instrument, screen_top: value })} max={totalDepth} />
            <NumberField label="Screen Bottom" value={instrument.screen_bottom} onChange={(value) => onChange({ ...instrument, screen_bottom: value })} max={totalDepth} />
          </div>
          <div className="field-row">
            <NumberField label="Seal Top" value={instrument.seal_top} onChange={(value) => onChange({ ...instrument, seal_top: value })} max={totalDepth} />
            <NumberField label="Seal Bottom" value={instrument.seal_bottom} onChange={(value) => onChange({ ...instrument, seal_bottom: value })} max={totalDepth} />
          </div>
        </div>

        <SectionLabel>Backfill Layers</SectionLabel>
        <div style={{ display: "grid", gap: 8 }}>
          {instrument.backfill.map((layer, layerIndex) => (
            <div key={layer.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 10, background: `${LAYER_STYLES[layer.material]?.fill || "#f3f4f6"}22` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <button
                  onClick={() => isMobile ? setExpandedLayerId((current) => current === layer.id ? null : layer.id) : undefined}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    cursor: isMobile ? "pointer" : "default",
                    textAlign: "left",
                    flex: 1,
                  }}
                >
                  <strong style={{ fontSize: 12 }}>Layer {layerIndex + 1}</strong>
                  {isMobile ? (
                    <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>
                      {LAYER_STYLES[layer.material]?.label} | {layer.top || "0"} - {layer.base || totalDepth}m
                    </div>
                  ) : null}
                </button>
                {instrument.backfill.length > 1 ? <button onClick={() => onChange({ ...instrument, backfill: instrument.backfill.filter((item) => item.id !== layer.id) })} style={{ border: 0, background: "transparent", color: T.dim, cursor: "pointer" }}>x</button> : null}
              </div>
              {!isMobile || expandedLayerId === layer.id ? (
                <>
                  {isMobile ? (
                    <MobileSelect
                      label="Material"
                      value={layer.material}
                      options={BACKFILL_MATERIALS.map((material) => ({ v: material, l: LAYER_STYLES[material].label }))}
                      onChange={(value) => updateLayer(layer.id, { material: value })}
                    />
                  ) : (
                    <ChoicePills options={BACKFILL_MATERIALS.map((material) => ({ v: material, l: LAYER_STYLES[material].label }))} value={layer.material} onChange={(value) => updateLayer(layer.id, { material: value })} />
                  )}
                  <div className="field-row" style={{ marginTop: 8 }}>
                    <NumberField label="Top" value={layer.top} onChange={(value) => updateLayer(layer.id, { top: value })} max={totalDepth} />
                    <NumberField label="Base" value={layer.base} onChange={(value) => updateLayer(layer.id, { base: value })} max={totalDepth} />
                    <NumberField label="Qty" value={layer.qty} onChange={(value) => updateLayer(layer.id, { qty: value })} min={0} unit="" />
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
        <button onClick={addLayer} style={{ width: "100%", marginTop: 8, padding: "10px 12px", borderRadius: 10, border: `1px dashed ${T.border2}`, background: "transparent", color: T.dim, cursor: "pointer", fontWeight: 700 }}>+ Add Backfill Layer</button>

        <SectionLabel>Surface Completion</SectionLabel>
        <ChoicePills options={SURFACE_COMPLETIONS} value={instrument.surface} onChange={(value) => onChange({ ...instrument, surface: value })} />
        {instrument.surface === "other" ? <input value={instrument.surface_other} onChange={(event) => onChange({ ...instrument, surface_other: event.target.value })} placeholder="Describe surface completion" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, outline: "none", marginTop: 8 }} /> : null}

        <SectionLabel>Remarks</SectionLabel>
        <textarea value={instrument.remarks} onChange={(event) => onChange({ ...instrument, remarks: event.target.value })} rows={3} placeholder="Installation notes, conditions, issues" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, outline: "none", resize: "vertical" }} />
      </div>
      )}
    </div>
  );
}

function draftSafeDepth(totalDepth) {
  return totalDepth || 0;
}

export default function App() {
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState("setup");
  const [draft, setDraft] = useState(createDraft);
  const [toast, setToast] = useState({ msg: "", visible: false });
  const [saved, setSaved] = useState(false);
  const toastTimer = useRef(null);
  const loadedRef = useRef(false);

  const showToast = useCallback((msg) => {
    setToast({ msg, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ msg: "", visible: false }), 2500);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setDraft({
          projectName: parsed.projectName || "",
          location: parsed.location || "",
          totalDepth: Number(parsed.totalDepth) > 0 ? Number(parsed.totalDepth) : 15,
          surface: parsed.surface || "flush_toby",
          instruments: Array.isArray(parsed.instruments) && parsed.instruments.length ? parsed.instruments : [createInstrument()],
        });
      }
    } catch {
      showToast("Unable to restore previous draft");
    } finally {
      loadedRef.current = true;
    }
  }, [showToast]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    if (!loadedRef.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const updateInstrument = (id, next) => setDraft((current) => ({
    ...current,
    instruments: current.instruments.map((instrument) => (instrument.id === id ? next : instrument)),
  }));

  const handleDragDepth = useCallback((instrumentId, field, value) => {
    setDraft((current) => ({
      ...current,
      instruments: current.instruments.map((instrument) => instrument.id === instrumentId ? { ...instrument, [field]: value } : instrument),
    }));
  }, []);

  const exportDraft = () => {
    const payload = { ...draft, savedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.projectName || "installation-record"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("JSON export downloaded");
  };

  const saveDraft = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setSaved(true);
    showToast("Installation saved");
    window.setTimeout(() => setSaved(false), 3000);
  };

  useEffect(() => {
    if (!isMobile) {
      setMobileView("setup");
    }
  }, [isMobile]);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.sans }}>
      <div style={{ background: T.nav, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: T.amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: T.nav }}>ST</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.white }}>SUBSTRATA</div>
          <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: "0.12em" }}>INSTALLATIONS</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af" }}>Coolify-ready deployment</div>
      </div>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 12px 40px" }}>
        {isMobile ? (
          <div className="mobile-tabs">
            {[
              { id: "setup", label: "Setup" },
              { id: "diagram", label: "Diagram" },
              { id: "forms", label: "Instruments" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMobileView(tab.id)}
                style={{
                  padding: "12px 10px",
                  borderRadius: 12,
                  border: `1px solid ${mobileView === tab.id ? T.accent : T.border}`,
                  background: mobileView === tab.id ? T.accent : T.surface,
                  color: mobileView === tab.id ? T.white : T.text,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: mobileView === tab.id ? "0 8px 20px rgba(16,185,129,0.2)" : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        {(!isMobile || mobileView === "setup") ? (
        <div style={{ background: T.surface, borderRadius: 16, padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 12, boxShadow: "0 6px 20px rgba(0,0,0,0.04)" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.dim, marginBottom: 6 }}>Project Name</div>
            <input value={draft.projectName} onChange={(event) => setDraft((current) => ({ ...current, projectName: event.target.value }))} placeholder="e.g. Northern embankment piezometer" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, outline: "none" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.dim, marginBottom: 6 }}>Location</div>
            <input value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Site, chainage, or area" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, outline: "none" }} />
          </div>
          <NumberField label="Borehole Depth" value={draft.totalDepth} onChange={(value) => setDraft((current) => ({ ...current, totalDepth: value }))} min={1} max={200} step={0.5} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.dim, marginBottom: 6 }}>Surface Completion</div>
            <ChoicePills options={SURFACE_COMPLETIONS} value={draft.surface} onChange={(value) => setDraft((current) => ({ ...current, surface: value }))} />
          </div>
        </div>
        ) : null}

        <div className="layout" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(!isMobile || mobileView === "diagram") ? (
          <div className="diagram-panel" style={{ flex: "0 0 340px", width: isMobile ? "100%" : undefined, padding: 4, position: "sticky", top: 0, alignSelf: "flex-start", maxHeight: "100vh", overflowY: "auto" }}>
            <div style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ padding: "8px 12px 4px", borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 700, color: T.dim, letterSpacing: "0.08em" }}>BOREHOLE CROSS-SECTION - {draft.totalDepth}m</div>
              <Diagram instruments={draft.instruments} totalDepth={draft.totalDepth} surface={draft.surface} onDragDepth={handleDragDepth} isMobile={isMobile} />
              {isMobile ? <div style={{ padding: "10px 12px 14px", borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.dim, lineHeight: 1.5 }}>Drag the handle markers to fine-tune casing, screen, and seal depths, then switch back to Instruments to review the numeric values.</div> : null}
            </div>
          </div>
          ) : null}

          {(!isMobile || mobileView === "forms") ? (
          <div style={{ flex: "1 1 340px", width: isMobile ? "100%" : undefined, padding: 4, minWidth: 0 }}>
            <div className="action-row">
              <button onClick={() => setDraft((current) => ({ ...current, instruments: [...current.instruments, createInstrument()] }))} style={{ flex: "1 1 160px", padding: "14px", borderRadius: 10, border: `2px dashed ${T.accent}`, background: "transparent", color: T.accent, fontWeight: 700, cursor: "pointer" }}>+ Add Instrument</button>
              <button onClick={exportDraft} style={{ flex: "1 1 160px", padding: "14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontWeight: 700, cursor: "pointer" }}>Export JSON</button>
              <button onClick={() => { window.localStorage.removeItem(STORAGE_KEY); setDraft(createDraft()); showToast("Draft cleared"); }} style={{ flex: "1 1 160px", padding: "14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.red, fontWeight: 700, cursor: "pointer" }}>Clear Draft</button>
            </div>

            {draft.instruments.map((instrument, index) => (
              <InstrumentCard
                key={instrument.id}
                instrument={instrument}
                index={index}
                totalDepth={draft.totalDepth}
                onChange={(next) => updateInstrument(instrument.id, next)}
                onRemove={() => setDraft((current) => ({ ...current, instruments: current.instruments.filter((item) => item.id !== instrument.id) }))}
                canRemove={draft.instruments.length > 1}
                isMobile={isMobile}
              />
            ))}

            {!isMobile ? (
            <button onClick={saveDraft} style={{ width: "100%", padding: "16px", borderRadius: 10, border: 0, background: saved ? T.accentDark : T.accent, color: T.white, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              {saved ? "Saved" : "Save Installation Record"}
            </button>
            ) : null}
          </div>
          ) : null}
        </div>
      </div>

      {isMobile ? (
        <div className="mobile-savebar">
          <button onClick={saveDraft} style={{ width: "100%", padding: "15px 16px", borderRadius: 14, border: 0, background: saved ? T.accentDark : T.accent, color: T.white, fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 12px 24px rgba(16,185,129,0.22)" }}>
            {saved ? "Saved" : "Save Installation Record"}
          </button>
        </div>
      ) : null}

      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.nav, color: T.white, padding: "10px 22px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", opacity: toast.visible ? 1 : 0, pointerEvents: "none", transition: "opacity 0.2s", fontSize: 13, fontWeight: 700 }}>
        {toast.msg}
      </div>
    </div>
  );
}
