import {
  Client,
  GatewayIntentBits,
  ActivityType,
  type Presence,
  type Guild,
  type Role,
} from "discord.js";
import { logger } from "./logger";

/* ── Config ────────────────────────────────────────────── */

const KEYWORD = (process.env["YUMEN_KEYWORD"] ?? "yumen").toLowerCase();
const ROLE_NAME = process.env["YUMEN_ROLE_NAME"] ?? "Yumen";

/* ── Client ─────────────────────────────────────────────── */

let client: Client | null = null;

export function getDiscordClient(): Client {
  if (client) return client;

  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) throw new Error("DISCORD_BOT_TOKEN is required");

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once("ready", () => {
    logger.info({ tag: client?.user?.tag, keyword: KEYWORD, role: ROLE_NAME }, "Bot ready — yumen detection active");
  });

  client.on("presenceUpdate", handlePresenceUpdate);

  client.login(token).catch((err) => {
    logger.error({ err }, "Login failed");
    client = null;
  });

  return client;
}

export async function waitReady(discord: Client): Promise<void> {
  if (discord.isReady()) return;
  return new Promise((resolve, reject) => {
    discord.once("ready", resolve);
    discord.once("error", reject);
    setTimeout(() => reject(new Error("timeout")), 15_000);
  });
}

/* ── Presence detection ─────────────────────────────────── */

function statusHasKeyword(presence: Presence | null): boolean {
  if (!presence) return false;
  return presence.activities.some((a) => {
    const name = a.name?.toLowerCase() ?? "";
    const state = a.state?.toLowerCase() ?? "";
    const details = a.details?.toLowerCase() ?? "";
    return name.includes(KEYWORD) || state.includes(KEYWORD) || details.includes(KEYWORD);
  });
}

async function getOrCreateYumenRole(guild: Guild): Promise<Role> {
  await guild.roles.fetch();
  const existing = guild.roles.cache.find((r) => r.name === ROLE_NAME);
  if (existing) return existing;

  const created = await guild.roles.create({
    name: ROLE_NAME,
    color: 0x7289da,
    reason: "Auto-créé par RolesQuest — détection de statut",
  });
  logger.info({ roleId: created.id }, "Yumen role auto-created");
  return created;
}

async function handlePresenceUpdate(oldPresence: Presence | null, newPresence: Presence) {
  try {
    if (!newPresence.guild || !newPresence.member) return;

    const hadKeyword = statusHasKeyword(oldPresence);
    const hasKeyword = statusHasKeyword(newPresence);

    if (hasKeyword === hadKeyword) return; // no change

    const role = await getOrCreateYumenRole(newPresence.guild);
    const member = newPresence.member;

    if (hasKeyword && !member.roles.cache.has(role.id)) {
      await member.roles.add(role, `Statut contient "${KEYWORD}"`);
      logger.info({ user: member.user.tag }, "Yumen role added");
    } else if (!hasKeyword && member.roles.cache.has(role.id)) {
      await member.roles.remove(role, `Statut ne contient plus "${KEYWORD}"`);
      logger.info({ user: member.user.tag }, "Yumen role removed");
    }
  } catch (err) {
    logger.error({ err }, "presenceUpdate error");
  }
}

/* ── Exported helpers (used by API routes) ──────────────── */

function hexToNumber(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export interface CreateRoleOptions {
  guildId: string;
  name: string;
  color: string;
  emoji?: string;
}

export async function createDiscordRole(opts: CreateRoleOptions) {
  const discord = getDiscordClient();
  await waitReady(discord);
  const guild = await discord.guilds.fetch(opts.guildId);
  const roleName = opts.emoji ? `${opts.emoji} ${opts.name}` : opts.name;
  const role = await guild.roles.create({
    name: roleName,
    color: hexToNumber(opts.color),
    reason: "RolesQuest panel",
  });
  logger.info({ roleId: role.id }, "Role created via panel");
  return { id: role.id, name: role.name };
}

export async function getYumenStatus(guildId: string) {
  const discord = getDiscordClient();
  await waitReady(discord);
  const guild = await discord.guilds.fetch(guildId);
  await guild.roles.fetch();
  const role = guild.roles.cache.find((r) => r.name === ROLE_NAME);
  const memberCount = role ? role.members.size : 0;
  return { keyword: KEYWORD, roleName: ROLE_NAME, roleExists: !!role, memberCount };
}
