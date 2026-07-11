import { useState, useEffect } from "react";

/* ── Types ─────────────────────────────────────────────── */
type Status = "idle" | "loading" | "success" | "error";

interface YumenStatus {
  keyword: string;
  roleName: string;
  roleExists: boolean;
  memberCount: number;
}

/* ── Data ───────────────────────────────────────────────── */
const COLORS = [
  { hex: "#99AAB5", label: "Gris" },     { hex: "#1ABC9C", label: "Turquoise" },
  { hex: "#2ECC71", label: "Vert" },     { hex: "#3498DB", label: "Bleu" },
  { hex: "#9B59B6", label: "Violet" },   { hex: "#E91E63", label: "Rose" },
  { hex: "#F1C40F", label: "Or" },       { hex: "#E67E22", label: "Orange" },
  { hex: "#E74C3C", label: "Rouge" },    { hex: "#11806A", label: "Forêt" },
  { hex: "#206694", label: "Marine" },   { hex: "#71368A", label: "Pourpre" },
  { hex: "#AD1457", label: "Bordeaux" }, { hex: "#C27C0E", label: "Bronze" },
  { hex: "#992D22", label: "Cramoisi" }, { hex: "#979C9F", label: "Gris clair" },
  { hex: "#7289DA", label: "Discord" },  { hex: "#FFFFFF", label: "Blanc" },
];

const EMOJIS = ["⚔️","🛡️","🏹","🧙","🔮","🌟","👑","🦁","🐉","🦅","🌊","🔥","⚡","❄️","🌸","🍀","🌙","💎","🏆","🦊","🐺","💀","🌈","🦄"];

const NAMES = [
  "Guerrier","Mage","Archer","Paladin","Assassin","Druide","Barde",
  "Nécromancien","Invocateur","Chevalier","Sorcier","Ranger","Voleur",
  "Prêtre","Barbare","Moine","Chaman","Démoniste","Enchanteur","Forgeron",
  "Explorateur","Gardien","Sage","Légende","Champion",
];

/* ── Yumen Status Card ──────────────────────────────────── */
function YumenCard() {
  const [data, setData] = useState<YumenStatus | null>(null);
  const [err, setErr]   = useState(false);

  useEffect(() => {
    fetch("/api/yumen")
      .then(r => r.ok ? r.json() as Promise<YumenStatus> : Promise.reject())
      .then(setData)
      .catch(() => setErr(true));
  }, []);

  if (err) return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <span className="text-xl mt-0.5">⚡</span>
      <div>
        <p className="text-sm font-semibold text-white">Détection de statut Yumen</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure <code className="bg-muted px-1 rounded">DISCORD_BOT_TOKEN</code> + <code className="bg-muted px-1 rounded">DISCORD_GUILD_ID</code> dans les Secrets Replit pour activer la détection.
        </p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 text-muted-foreground text-sm">
      <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Chargement de la détection…
    </div>
  );

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
        <p className="text-sm font-semibold text-white">Détection de statut active</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-card border border-border p-2">
          <p className="text-xs text-muted-foreground">Mot-clé</p>
          <p className="text-sm font-mono font-bold text-indigo-300 mt-0.5">/{data.keyword}</p>
        </div>
        <div className="rounded-lg bg-card border border-border p-2">
          <p className="text-xs text-muted-foreground">Rôle attribué</p>
          <p className="text-sm font-bold text-white mt-0.5 truncate">{data.roleName}</p>
        </div>
        <div className="rounded-lg bg-card border border-border p-2">
          <p className="text-xs text-muted-foreground">Membres</p>
          <p className="text-sm font-bold text-white mt-0.5">{data.memberCount}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Quand un membre met <strong className="text-indigo-300">/{data.keyword}</strong> dans son statut Discord personnalisé → le rôle <strong className="text-white">{data.roleName}</strong> lui est attribué automatiquement. Il est retiré dès qu'il le supprime.
      </p>
    </div>
  );
}

/* ── Role Creator ───────────────────────────────────────── */
function RoleCreator() {
  const [color, setColor]     = useState<string | null>(null);
  const [name, setName]       = useState<string | null>(null);
  const [emoji, setEmoji]     = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [useCustom, setUseCustom]   = useState(false);
  const [status, setStatus]   = useState<Status>("idle");
  const [msg, setMsg]         = useState("");

  const activeName = useCustom ? customName.trim() : name;
  const canCreate  = !!color && !!activeName;

  const create = async () => {
    if (!canCreate) return;
    setStatus("loading"); setMsg("");
    try {
      const res  = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: activeName, color, emoji: emoji ?? undefined }),
      });
      const data = await res.json() as { success?: boolean; role?: { name: string }; error?: string };
      if (!res.ok || !data.success) { setStatus("error"); setMsg(data.error ?? "Erreur"); return; }
      setStatus("success"); setMsg(`Rôle "${data.role?.name}" créé sur Discord !`);
      setTimeout(() => setStatus("idle"), 4000);
    } catch { setStatus("error"); setMsg("Serveur inaccessible"); }
  };

  return (
    <div className="space-y-4">

      {/* Aperçu */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
        <div className="w-3.5 h-3.5 rounded-full shrink-0 transition-all" style={{ backgroundColor: color ?? "#4f5660" }} />
        <span className="font-semibold text-sm transition-all" style={{ color: color ?? "#72767d" }}>
          {[emoji, activeName].filter(Boolean).join(" ") || "Aperçu du rôle"}
        </span>
      </div>

      {/* Couleur */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Couleur</p>
        <div className="grid grid-cols-9 gap-2">
          {COLORS.map((c) => (
            <button key={c.hex} title={c.label} onClick={() => setColor(c.hex)}
              className="relative w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{ backgroundColor: c.hex, border: color === c.hex ? "3px solid white" : "3px solid transparent" }}>
              {color === c.hex && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                  style={{ color: c.hex === "#FFFFFF" ? "#000" : "#fff", textShadow: "0 1px 2px rgba(0,0,0,.7)" }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Emoji */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Emoji <span className="normal-case font-normal opacity-50">(optionnel)</span></p>
          <div className="flex gap-2">
            {emoji && <button onClick={() => setEmoji(null)} className="text-xs text-muted-foreground hover:text-white px-2 py-0.5 rounded hover:bg-muted">Retirer</button>}
            <button onClick={() => setEmojiOpen(v => !v)} className="text-xs px-3 py-1 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-white transition-colors">
              {emojiOpen ? "Fermer" : emoji ? `${emoji} Changer` : "Choisir"}
            </button>
          </div>
        </div>
        {!emojiOpen && !emoji && <p className="text-muted-foreground/40 text-sm">Aucun emoji sélectionné</p>}
        {!emojiOpen && emoji && <span className="text-3xl">{emoji}</span>}
        {emojiOpen && (
          <div className="grid grid-cols-12 gap-1">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => { setEmoji(e); setEmojiOpen(false); }}
                className={`w-9 h-9 text-xl rounded-lg flex items-center justify-center hover:scale-110 transition-all ${emoji === e ? "bg-primary/30 ring-2 ring-primary" : "hover:bg-muted"}`}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nom */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nom du rôle</p>
          <button onClick={() => { setUseCustom(v => !v); setName(null); }}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${useCustom ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground hover:text-white hover:bg-accent"}`}>
            {useCustom ? "← Prédéfinis" : "Personnalisé →"}
          </button>
        </div>

        {useCustom ? (
          <input value={customName} onChange={e => setCustomName(e.target.value)}
            placeholder="Nom personnalisé…"
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {NAMES.map(n => (
              <button key={n} onClick={() => setName(n)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  name === n ? "border-transparent text-white scale-105" : "border-border text-muted-foreground hover:text-white hover:bg-muted"
                }`}
                style={name === n ? { backgroundColor: color ?? "#7289DA", boxShadow: `0 0 12px ${color ?? "#7289DA"}55` } : {}}>
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feedback */}
      {status === "error" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-400 flex items-center gap-2">
          ⚠️ {msg}
          <button onClick={() => setStatus("idle")} className="ml-auto text-muted-foreground hover:text-white">✕</button>
        </div>
      )}
      {status === "success" && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-400">✅ {msg}</div>
      )}

      {/* Bouton */}
      <button onClick={create} disabled={!canCreate || status === "loading"}
        className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
          !canCreate || status === "loading"
            ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
            : "text-white hover:scale-[1.02] active:scale-[0.98]"
        }`}
        style={canCreate ? { backgroundColor: color ?? "#7289DA", boxShadow: `0 8px 28px ${color ?? "#7289DA"}44` } : {}}>
        {status === "loading"
          ? <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Création…
            </span>
          : <span>{emoji && `${emoji} `}Créer le rôle{activeName ? ` — ${activeName}` : ""}</span>}
      </button>
      {!canCreate && (
        <p className="text-center text-xs text-muted-foreground">
          {!color && !activeName ? "Choisis une couleur et un nom" : !color ? "Choisis une couleur" : "Choisis un nom"}
        </p>
      )}
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────── */
export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-3">⚔️</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">RolesQuest</h1>
          <p className="text-muted-foreground text-sm mt-1">Panneau de gestion Discord</p>
        </div>

        {/* Yumen detection */}
        <YumenCard />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Créer un rôle</p>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Role creator */}
        <RoleCreator />

      </div>
    </div>
  );
}
