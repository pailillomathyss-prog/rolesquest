import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { logger } from "./logger";

let client: Client | null = null;

export function getDiscordClient(): Client {
  if (client) return client;

  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is required");
  }

  client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to login to Discord");
    client = null;
  });

  client.once("ready", () => {
    logger.info({ tag: client?.user?.tag }, "Discord bot ready");
  });

  return client;
}

export interface CreateRoleOptions {
  guildId: string;
  name: string;
  color: string;
  emoji?: string;
}

function hexToNumber(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export async function createDiscordRole(options: CreateRoleOptions): Promise<{ id: string; name: string }> {
  const discord = getDiscordClient();

  await new Promise<void>((resolve, reject) => {
    if (discord.isReady()) return resolve();
    discord.once("ready", resolve);
    discord.once("error", reject);
    setTimeout(() => reject(new Error("Discord client timeout")), 10000);
  });

  const guild = await discord.guilds.fetch(options.guildId);
  const roleName = options.emoji ? `${options.emoji} ${options.name}` : options.name;

  const role = await guild.roles.create({
    name: roleName,
    color: hexToNumber(options.color),
    reason: "Created via RolesQuest panel",
  });

  logger.info({ roleId: role.id, roleName: role.name }, "Discord role created");
  return { id: role.id, name: role.name };
}
