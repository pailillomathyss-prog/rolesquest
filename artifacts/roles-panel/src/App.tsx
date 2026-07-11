import { useState } from "react";

const ROLE_COLORS = [
  { hex: "#99AAB5", label: "Gris défaut" },
  { hex: "#1ABC9C", label: "Turquoise" },
  { hex: "#2ECC71", label: "Vert émeraude" },
  { hex: "#3498DB", label: "Bleu ciel" },
  { hex: "#9B59B6", label: "Violet" },
  { hex: "#E91E63", label: "Rose vif" },
  { hex: "#F1C40F", label: "Jaune or" },
  { hex: "#E67E22", label: "Orange" },
  { hex: "#E74C3C", label: "Rouge" },
  { hex: "#11806A", label: "Vert foncé" },
  { hex: "#1F8B4C", label: "Forêt" },
  { hex: "#206694", label: "Bleu marine" },
  { hex: "#71368A", label: "Pourpre" },
  { hex: "#AD1457", label: "Bordeaux" },
  { hex: "#C27C0E", label: "Bronze" },
  { hex: "#A84300", label: "Brun roux" },
  { hex: "#992D22", label: "Cramoisi" },
  { hex: "#979C9F", label: "Gris clair" },
  { hex: "#7289DA", label: "Bleuet Discord" },
  { hex: "#FFFFFF", label: "Blanc" },
];

const ROLE_EMOJIS = [
  "⚔️","🛡️","🏹","🧙","🔮","🌟","👑","🦁","🐉","🦅",
  "🌊","🔥","⚡","❄️","🌸","🍀","🌙","☀️","💎","🏆",
  "🎭","🎮","🎯","🎵","🎸","🦊","🐺","🦋","🌹","💀",
  "🗡️","🧨","💥","🌈","🦄","🐲","🏰","⚗️","🎪","🧩",
];

const ROLE_NAMES = [
  "Guerrier", "Mage", "Archer", "Paladin", "Assassin",
  "Druide", "Barde", "Nécromancien", "Invocateur", "Chevalier",
  "Sorcier", "Ranger", "Voleur", "Prêtre", "Barbare",
  "Moine", "Chaman", "Démoniste", "Enchanteur", "Forgeron",
  "Explorateur", "Gardien", "Sage", "Légende", "Champion",
];

type Status = "idle" | "loading" | "success" | "error";

export default function App() {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [createdRole, setCreatedRole] = useState<{ id: string; name: string } | null>(null);

  const canCreate = selectedColor !== null && selectedName !== null;

  const handleCreate = async () => {
    if (!canCreate) return;
    setStatus("loading");
    setErrorMsg("");
    setCreatedRole(null);

    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedName,
          color: selectedColor,
          emoji: selectedEmoji ?? undefined,
        }),
      });

      const data = await res.json() as { success?: boolean; role?: { id: string; name: string }; error?: string };

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? "Erreur inconnue");
        setStatus("error");
        return;
      }

      setCreatedRole(data.role ?? null);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setErrorMsg("Impossible de contacter le serveur");
      setStatus("error");
    }
  };

  const roleLabel = [selectedEmoji, selectedName].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⚔️</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Création de rôle</h1>
          <p className="text-muted-foreground text-sm mt-1">Choisis ta couleur, un emoji et ton nom de rôle</p>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full shrink-0 transition-all duration-300"
            style={{ backgroundColor: selectedColor ?? "#4f5660" }}
          />
          <span
            className="font-semibold text-base transition-all duration-300"
            style={{ color: selectedColor ?? "#72767d" }}
          >
            {roleLabel || "Ton rôle apparaîtra ici"}
          </span>
          {!selectedColor && !selectedName && (
            <span className="ml-auto text-xs text-muted-foreground">Aperçu</span>
          )}
        </div>

        {/* Color picker */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Couleur du rôle</p>
          <div className="grid grid-cols-10 gap-2">
            {ROLE_COLORS.map((c) => (
              <button
                key={c.hex}
                title={c.label}
                onClick={() => setSelectedColor(c.hex)}
                className="relative w-8 h-8 rounded-full transition-transform duration-150 hover:scale-110 focus:outline-none"
                style={{
                  backgroundColor: c.hex,
                  border: selectedColor === c.hex ? "3px solid white" : "3px solid transparent",
                }}
              >
                {selectedColor === c.hex && (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                    style={{
                      color: c.hex === "#FFFFFF" ? "#000" : "#fff",
                      textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Emoji picker (optional) */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Emoji{" "}
              <span className="normal-case font-normal text-muted-foreground/60">(optionnel)</span>
            </p>
            <div className="flex gap-2 items-center">
              {selectedEmoji && (
                <button
                  onClick={() => setSelectedEmoji(null)}
                  className="text-xs text-muted-foreground hover:text-white transition-colors px-2 py-0.5 rounded-md hover:bg-muted"
                >
                  Retirer
                </button>
              )}
              <button
                onClick={() => setEmojiOpen((v) => !v)}
                className="text-xs px-3 py-1 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-white transition-colors"
              >
                {emojiOpen ? "Fermer" : selectedEmoji ? `${selectedEmoji} Changer` : "Choisir"}
              </button>
            </div>
          </div>
          {!emojiOpen && !selectedEmoji && (
            <p className="text-muted-foreground/50 text-sm">Aucun emoji sélectionné</p>
          )}
          {selectedEmoji && !emojiOpen && (
            <span className="text-3xl">{selectedEmoji}</span>
          )}
          {emojiOpen && (
            <div className="grid grid-cols-10 gap-1 pt-1">
              {ROLE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { setSelectedEmoji(emoji); setEmojiOpen(false); }}
                  className={`w-9 h-9 text-xl rounded-lg flex items-center justify-center transition-all duration-100 hover:scale-110 ${
                    selectedEmoji === emoji ? "bg-primary/30 ring-2 ring-primary" : "hover:bg-muted"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Role name picker */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nom du rôle</p>
          <div className="flex flex-wrap gap-2">
            {ROLE_NAMES.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedName(name)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                  selectedName === name
                    ? "border-transparent text-white shadow-lg scale-105"
                    : "border-border text-muted-foreground hover:text-white hover:border-muted-foreground bg-transparent hover:bg-muted"
                }`}
                style={
                  selectedName === name
                    ? {
                        backgroundColor: selectedColor ?? "#7289DA",
                        boxShadow: `0 0 12px ${selectedColor ?? "#7289DA"}66`,
                      }
                    : {}
                }
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {status === "error" && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-red-400 flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
            <button
              onClick={() => setStatus("idle")}
              className="ml-auto text-muted-foreground hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success message */}
        {status === "success" && createdRole && (
          <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-400 flex items-center gap-2">
            <span>✅</span>
            <span>
              Rôle <strong>{createdRole.name}</strong> créé avec succès sur Discord !
            </span>
          </div>
        )}

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!canCreate || status === "loading"}
          className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-300 ${
            !canCreate || status === "loading"
              ? "text-muted-foreground cursor-not-allowed opacity-50 bg-muted"
              : "text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-2xl"
          }`}
          style={
            canCreate
              ? {
                  backgroundColor: selectedColor ?? "#7289DA",
                  boxShadow: `0 8px 32px ${selectedColor ?? "#7289DA"}55`,
                }
              : {}
          }
        >
          {status === "loading" ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Création en cours…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {selectedEmoji && <span>{selectedEmoji}</span>}
              Créer mon rôle
              {selectedName && <span className="opacity-80">— {selectedName}</span>}
            </span>
          )}
        </button>

        {!canCreate && status !== "error" && (
          <p className="text-center text-xs text-muted-foreground">
            {!selectedColor && !selectedName
              ? "Choisis une couleur et un nom pour continuer"
              : !selectedColor
              ? "Choisis une couleur pour continuer"
              : "Choisis un nom de rôle pour continuer"}
          </p>
        )}
      </div>
    </div>
  );
}
