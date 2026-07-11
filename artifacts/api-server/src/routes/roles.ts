import { Router } from "express";
import { createDiscordRole, getYumenStatus } from "../lib/discord";
import { logger } from "../lib/logger";

const router = Router();

router.post("/roles", async (req, res) => {
  try {
    const { name, color, emoji } = req.body as { name?: string; color?: string; emoji?: string };

    if (!name?.trim()) { res.status(400).json({ error: "Nom requis" }); return; }
    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) { res.status(400).json({ error: "Couleur invalide (#RRGGBB)" }); return; }

    const guildId = process.env["DISCORD_GUILD_ID"];
    if (!guildId) { res.status(500).json({ error: "DISCORD_GUILD_ID non configuré" }); return; }

    const role = await createDiscordRole({ guildId, name: name.trim(), color, emoji: emoji?.trim() || undefined });
    res.status(201).json({ success: true, role });
  } catch (err) {
    logger.error({ err }, "Error creating role");
    res.status(500).json({ error: "Impossible de créer le rôle" });
  }
});

router.get("/yumen", async (_req, res) => {
  try {
    const guildId = process.env["DISCORD_GUILD_ID"];
    if (!guildId) { res.status(500).json({ error: "DISCORD_GUILD_ID non configuré" }); return; }
    const status = await getYumenStatus(guildId);
    res.json(status);
  } catch (err) {
    logger.error({ err }, "Error fetching yumen status");
    res.status(500).json({ error: "Impossible de récupérer le statut" });
  }
});

export default router;
