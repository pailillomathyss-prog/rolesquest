import { useState, useEffect, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────── */
type Tab = "roles" | "salon";
type Status = "idle" | "loading" | "success" | "error";

interface Member { id: string; username: string; displayName: string; avatarUrl: string | null }

/* ── Avatar ─────────────────────────────────────────────── */
function Avatar({ member, size = 10 }: { member: Member; size?: number }) {
  const [err, setErr] = useState(false);
  const s = `w-${size} h-${size}`;
  const initial = (member.displayName[0] ?? "?").toUpperCase();
  if (!member.avatarUrl || err)
    return <div className={`${s} rounded-full bg-indigo-500/40 flex items-center justify-center text-white font-bold text-sm shrink-0`}>{initial}</div>;
  return <img src={member.avatarUrl} alt={member.displayName} className={`${s} rounded-full object-cover shrink-0`} onError={() => setErr(true)} />;
}

/* ── COLORS ─────────────────────────────────────────────── */
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
const NAMES  = ["Guerrier","Mage","Archer","Paladin","Assassin","Druide","Barde","Nécromancien","Invocateur","Chevalier","Sorcier","Ranger","Voleur","Prêtre","Barbare","Moine","Chaman","Démoniste","Enchanteur","Forgeron","Explorateur","Gardien","Sage","Légende","Champion"];

/* ── Roles Tab ──────────────────────────────────────────── */
function RolesTab() {
  const [color, setColor]   = useState<string | null>(null);
  const [name, setName]     = useState<string | null>(null);
  const [emoji, setEmoji]   = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg]       = useState("");
  const canCreate = !!color && !!name;

  const create = async () => {
    if (!canCreate) return;
    setStatus("loading"); setMsg("");
    try {
      const res  = await fetch("/api/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color, emoji: emoji ?? undefined }) });
      const data = await res.json() as { success?: boolean; role?: { name: string }; error?: string };
      if (!res.ok || !data.success) { setStatus("error"); setMsg(data.error ?? "Erreur"); return; }
      setStatus("success"); setMsg(`Rôle "${data.role?.name}" créé !`);
      setTimeout(() => setStatus("idle"), 3500);
    } catch { setStatus("error"); setMsg("Serveur inaccessible"); }
  };

  return (
    <div className="space-y-4">
      {/* Commande info */}
      <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground flex items-center gap-2">
        <span className="text-base">💡</span>
        <span>Commande Discord : <code className="bg-muted px-1.5 py-0.5 rounded">-setroles</code></span>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
        <div className="w-3.5 h-3.5 rounded-full shrink-0 transition-all" style={{ backgroundColor: color ?? "#4f5660" }} />
        <span className="font-semibold text-sm transition-all" style={{ color: color ?? "#72767d" }}>
          {[emoji, name].filter(Boolean).join(" ") || "Aperçu du rôle"}
        </span>
      </div>

      {/* Colors */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Couleur</p>
        <div className="grid grid-cols-9 gap-2">
          {COLORS.map((c) => (
            <button key={c.hex} title={c.label} onClick={() => setColor(c.hex)}
              className="relative w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{ backgroundColor: c.hex, border: color === c.hex ? "3px solid white" : "3px solid transparent" }}>
              {color === c.hex && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                style={{ color: c.hex === "#FFFFFF" ? "#000" : "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Emoji */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Emoji <span className="normal-case font-normal text-muted-foreground/50">(optionnel)</span></p>
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

      {/* Names */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nom du rôle</p>
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
      </div>

      {/* Feedback */}
      {status === "error" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-400 flex gap-2 items-center">
          ⚠️ {msg} <button onClick={() => setStatus("idle")} className="ml-auto text-muted-foreground hover:text-white">✕</button>
        </div>
      )}
      {status === "success" && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-400">✅ {msg}</div>
      )}

      {/* CTA */}
      <button onClick={create} disabled={!canCreate || status === "loading"}
        className={`w-full py-4 rounded-xl font-bold text-base transition-all ${!canCreate || status === "loading" ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed" : "text-white hover:scale-[1.02] active:scale-[0.98]"}`}
        style={canCreate ? { backgroundColor: color ?? "#7289DA", boxShadow: `0 8px 28px ${color ?? "#7289DA"}44` } : {}}>
        {status === "loading"
          ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Création…</span>
          : <span>{emoji && `${emoji} `}Créer mon rôle{name ? ` — ${name}` : ""}</span>}
      </button>
      {!canCreate && <p className="text-center text-xs text-muted-foreground">{!color && !name ? "Choisis une couleur et un nom" : !color ? "Choisis une couleur" : "Choisis un nom"}</p>}
    </div>
  );
}

/* ── Salon Tab ──────────────────────────────────────────── */
function SalonTab() {
  const [members, setMembers]   = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [status, setStatus]     = useState<Status>("idle");
  const [msg, setMsg]           = useState("");
  const [search, setSearch]     = useState("");

  const load = useCallback(async () => {
    setStatus("loading"); setMsg("");
    try {
      const res  = await fetch("/api/members");
      const data = await res.json() as { members?: Member[]; error?: string };
      if (!res.ok || !data.members) { setStatus("error"); setMsg(data.error ?? "Erreur"); return; }
      setMembers(data.members); setStatus("idle");
    } catch { setStatus("error"); setMsg("Serveur inaccessible"); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendInvite = async () => {
    if (!selected) return;
    setStatus("loading"); setMsg("");
    try {
      const res  = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviterId: "panel", targetId: selected.id, inviterName: "Panel RolesQuest" }) });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) { setStatus("error"); setMsg(data.error ?? "Erreur"); return; }
      setStatus("success"); setMsg(`Invitation envoyée à ${selected.displayName} !`);
      setTimeout(() => { setStatus("idle"); setSelected(null); }, 4000);
    } catch { setStatus("error"); setMsg("Serveur inaccessible"); }
  };

  const filtered = members.filter(m =>
    m.displayName.toLowerCase().includes(search.toLowerCase()) ||
    m.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-1">
        <p className="text-xs font-semibold text-white flex gap-2">🔒 Salon privé temporaire</p>
        <p className="text-xs text-muted-foreground">La personne choisie reçoit un DM avec <strong>Accepter/Refuser</strong>. Si elle accepte, un salon est créé et supprimé après <strong>5 min d'inactivité</strong>.</p>
        <p className="text-xs text-muted-foreground">Commande Discord : <code className="bg-muted px-1.5 py-0.5 rounded">-setpriv @utilisateur</code></p>
      </div>

      {/* Members */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Choisir une personne</p>
          <button onClick={load} disabled={status === "loading"} className="text-xs px-2 py-1 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-white transition-colors disabled:opacity-40">
            {status === "loading" && members.length === 0 ? "…" : "↻"}
          </button>
        </div>

        {members.length > 5 && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Filtrer…"
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        )}

        {status === "loading" && members.length === 0 && (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Chargement…
          </div>
        )}

        {members.length === 0 && status !== "loading" && (
          <p className="text-muted-foreground/50 text-sm text-center py-4">
            Aucun membre.<br/><span className="text-xs">Configure <code>DISCORD_BOT_TOKEN</code> + <code>DISCORD_GUILD_ID</code></span>
          </p>
        )}

        {filtered.length > 0 && (
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {filtered.map(m => (
              <button key={m.id} onClick={() => setSelected(m)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                  selected?.id === m.id ? "border-indigo-500/60 bg-indigo-500/10 ring-1 ring-indigo-500/30" : "border-border hover:bg-muted"
                }`}>
                <Avatar member={m} size={8} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{m.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{m.username}</p>
                </div>
                {selected?.id === m.id && <span className="ml-auto text-indigo-400 text-lg">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected preview */}
      {selected && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 flex items-center gap-3">
          <Avatar member={selected} size={9} />
          <div>
            <p className="text-sm font-semibold text-white">{selected.displayName}</p>
            <p className="text-xs text-muted-foreground">recevra une invitation en DM</p>
          </div>
        </div>
      )}

      {/* Feedback */}
      {status === "error" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-400 flex gap-2 items-center">
          ⚠️ {msg} <button onClick={() => setStatus("idle")} className="ml-auto hover:text-white">✕</button>
        </div>
      )}
      {status === "success" && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-400">📨 {msg}</div>
      )}

      {/* CTA */}
      <button onClick={sendInvite} disabled={!selected || status === "loading"}
        className={`w-full py-4 rounded-xl font-bold text-base transition-all ${!selected || status === "loading" ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed" : "text-white bg-indigo-500 hover:bg-indigo-400 hover:scale-[1.02] active:scale-[0.98]"}`}
        style={selected && status !== "loading" ? { boxShadow: "0 8px 28px rgba(99,102,241,0.35)" } : {}}>
        {status === "loading"
          ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Envoi…</span>
          : `💬 Inviter${selected ? ` ${selected.displayName}` : ""}`}
      </button>
      {!selected && status === "idle" && members.length > 0 && <p className="text-center text-xs text-muted-foreground">Sélectionne une personne</p>}
    </div>
  );
}

/* ── App ────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState<Tab>("roles");
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center mb-2">
          <div className="text-4xl mb-3">⚔️</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">RolesQuest</h1>
          <p className="text-muted-foreground text-sm mt-1">Panneau de gestion Discord</p>
        </div>

        <div className="flex rounded-xl border border-border bg-card p-1 gap-1">
          <button onClick={() => setTab("roles")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === "roles" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-white hover:bg-muted"}`}>
            🎭 Créer un rôle
          </button>
          <button onClick={() => setTab("salon")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === "salon" ? "bg-indigo-500 text-white shadow" : "text-muted-foreground hover:text-white hover:bg-muted"}`}>
            🔒 Salon privé
          </button>
        </div>

        {tab === "roles" ? <RolesTab /> : <SalonTab />}
      </div>
    </div>
  );
}
