import { Router } from "express";
import { getGuildMembers, sendPrivateInvite } from "../lib/discord";
import { logger } from "../lib/logger";

const router = Router();

router.get("/members", async (_req, res) => {
  try {
    const guildId = process.env["DISCORD_GUILD_ID"];
    if (!guildId) { res.status(500).json({ error: "DISCORD_GUILD_ID non configuré" }); return; }
    const members = await getGuildMembers(guildId);
    res.json({ members });
  } catch (err) {
    logger.error({ err }, "Error fetching members");
    res.status(500).json({ error: "Impossible de récupérer les membres" });
  }
});

router.post("/invite", async (req, res) => {
  try {
    const { inviterId, targetId, inviterName } = req.body as {
      inviterId?: string; targetId?: string; inviterName?: string;
    };

    if (!inviterId || !targetId || !inviterName) {
      res.status(400).json({ error: "inviterId, targetId et inviterName sont requis" });
      return;
    }
    if (inviterId === targetId) { res.status(400).json({ error: "Tu ne peux pas t'inviter toi-même" }); return; }

    const guildId = process.env["DISCORD_GUILD_ID"];
    if (!guildId) { res.status(500).json({ error: "DISCORD_GUILD_ID non configuré" }); return; }

    await sendPrivateInvite(inviterId, targetId, guildId, inviterName);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error sending invite");
    res.status(500).json({ error: "Impossible d'envoyer l'invitation" });
  }
});

export default router;
