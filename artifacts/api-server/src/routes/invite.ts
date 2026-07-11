import { Router } from "express";
import { getGuildMembers, sendPrivateInvite, createPrivateChannel } from "../lib/discord";
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

// Send a DM invite (used by -setpriv Discord command flow)
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

// Create private channel directly from the panel
router.post("/salon", async (req, res) => {
  try {
    const { user1Id, user2Id } = req.body as { user1Id?: string; user2Id?: string };
    if (!user1Id || !user2Id) {
      res.status(400).json({ error: "user1Id et user2Id sont requis" });
      return;
    }
    if (user1Id === user2Id) {
      res.status(400).json({ error: "Les deux utilisateurs doivent être différents" });
      return;
    }
    const guildId = process.env["DISCORD_GUILD_ID"];
    if (!guildId) { res.status(500).json({ error: "DISCORD_GUILD_ID non configuré" }); return; }
    const channel = await createPrivateChannel(guildId, user1Id, user2Id);
    res.status(201).json({ success: true, channelId: channel.id, channelName: channel.name });
  } catch (err) {
    logger.error({ err }, "Error creating salon");
    res.status(500).json({ error: "Impossible de créer le salon privé" });
  }
});

export default router;
