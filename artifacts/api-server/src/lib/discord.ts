import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  type TextChannel,
  type GuildMember,
} from "discord.js";
import { logger } from "./logger";

let client: Client | null = null;

const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes
const channelTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function getDiscordClient(): Client {
  if (client) return client;

  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is required");
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once("ready", async () => {
    logger.info({ tag: client?.user?.tag }, "Discord bot ready");
    await registerSlashCommands(token);
  });

  client.on("interactionCreate", handleInteraction);
  client.on("messageCreate", handleMessageForInactivity);

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to login to Discord");
    client = null;
  });

  return client;
}

async function waitForReady(discord: Client): Promise<void> {
  return new Promise((resolve, reject) => {
    if (discord.isReady()) return resolve();
    discord.once("ready", resolve);
    discord.once("error", reject);
    setTimeout(() => reject(new Error("Discord client timeout")), 15000);
  });
}

async function registerSlashCommands(token: string): Promise<void> {
  const clientId = client?.user?.id;
  if (!clientId) return;

  const guildId = process.env["DISCORD_GUILD_ID"];

  const commands = [
    new SlashCommandBuilder()
      .setName("salon-prive")
      .setDescription("Envoie une invitation à quelqu'un pour créer un salon privé")
      .addUserOption((opt) =>
        opt.setName("utilisateur").setDescription("La personne à inviter").setRequired(true)
      )
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(token);
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
    }
    logger.info("Slash commands registered");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}

async function handleInteraction(interaction: import("discord.js").Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "salon-prive") {
      const target = interaction.options.getUser("utilisateur", true);

      if (target.id === interaction.user.id) {
        await interaction.reply({ content: "❌ Tu ne peux pas t'inviter toi-même.", ephemeral: true });
        return;
      }
      if (target.bot) {
        await interaction.reply({ content: "❌ Tu ne peux pas inviter un bot.", ephemeral: true });
        return;
      }

      const guildId = interaction.guildId ?? process.env["DISCORD_GUILD_ID"] ?? "";
      await interaction.reply({ content: `📨 Invitation envoyée à **${target.username}** !`, ephemeral: true });
      await sendPrivateRoomInvite(interaction.user.id, target.id, guildId, interaction.user.username);
      return;
    }

    if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId.startsWith("accept_invite_") || customId.startsWith("reject_invite_")) {
        const [action, , inviterId, targetId, guildId] = customId.split("_");
        const accepted = action === "accept";
        const discord = getDiscordClient();

        if (accepted) {
          await interaction.update({
            content: "✅ **Invitation acceptée !** Le salon privé est en cours de création…",
            components: [],
          });

          const channel = await createPrivateChannel(guildId, inviterId, targetId);

          const inviter = await discord.users.fetch(inviterId);
          await inviter.send(`✅ **${interaction.user.username}** a accepté ton invitation ! → <#${channel.id}>`);
        } else {
          await interaction.update({
            content: "❌ **Invitation refusée.**",
            components: [],
          });

          const inviter = await discord.users.fetch(inviterId);
          await inviter.send(`❌ **${interaction.user.username}** a refusé ton invitation de salon privé.`);
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error handling interaction");
  }
}

function handleMessageForInactivity(message: import("discord.js").Message): void {
  if (message.author.bot) return;
  const channelId = message.channelId;
  if (!channelTimers.has(channelId)) return;

  resetInactivityTimer(channelId, message.guild?.id ?? "");
}

function resetInactivityTimer(channelId: string, guildId: string): void {
  const existing = channelTimers.get(channelId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    channelTimers.delete(channelId);
    try {
      const discord = getDiscordClient();
      const guild = await discord.guilds.fetch(guildId);
      const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
      if (channel) {
        await channel.send("⏱️ **5 minutes d'inactivité détectées — ce salon sera supprimé dans 10 secondes.**");
        await new Promise((r) => setTimeout(r, 10000));
        await channel.delete("Inactivité de 5 minutes");
        logger.info({ channelId }, "Private channel deleted after inactivity");
      }
    } catch (err) {
      logger.error({ err, channelId }, "Failed to delete inactive channel");
    }
  }, INACTIVITY_MS);

  channelTimers.set(channelId, timer);
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

export async function createDiscordRole(
  options: CreateRoleOptions
): Promise<{ id: string; name: string }> {
  const discord = getDiscordClient();
  await waitForReady(discord);

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

export interface GuildMemberInfo {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export async function getGuildMembers(guildId: string): Promise<GuildMemberInfo[]> {
  const discord = getDiscordClient();
  await waitForReady(discord);

  const guild = await discord.guilds.fetch(guildId);
  const members = await guild.members.fetch();

  return members
    .filter((m: GuildMember) => !m.user.bot)
    .map((m: GuildMember) => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.displayName,
      avatarUrl: m.user.displayAvatarURL({ size: 64 }) ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function sendPrivateRoomInvite(
  inviterId: string,
  targetId: string,
  guildId: string,
  inviterName: string
): Promise<void> {
  const discord = getDiscordClient();
  await waitForReady(discord);

  const target = await discord.users.fetch(targetId);

  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle("💬 Invitation à un salon privé")
    .setDescription(
      `**${inviterName}** t'invite à rejoindre un **salon privé**.\nIl sera supprimé après **5 minutes d'inactivité**.`
    )
    .setFooter({ text: "Cette invitation expire dans 2 minutes." });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_invite_${inviterId}_${targetId}_${guildId}`)
      .setLabel("Accepter ✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_invite_${inviterId}_${targetId}_${guildId}`)
      .setLabel("Refuser ❌")
      .setStyle(ButtonStyle.Danger)
  );

  await target.send({ embeds: [embed], components: [row] });
  logger.info({ inviterId, targetId }, "Private room invite sent");
}

export async function createPrivateChannel(
  guildId: string,
  user1Id: string,
  user2Id: string
): Promise<TextChannel> {
  const discord = getDiscordClient();
  await waitForReady(discord);

  const guild = await discord.guilds.fetch(guildId);
  const [member1, member2] = await Promise.all([
    guild.members.fetch(user1Id),
    guild.members.fetch(user2Id),
  ]);

  const channelName = `privé-${member1.user.username}-${member2.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user1Id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: user2Id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ],
    reason: "Salon privé créé via RolesQuest panel",
  }) as TextChannel;

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("🔒 Salon privé créé !")
        .setDescription(
          `Bienvenue <@${user1Id}> et <@${user2Id}> !\n\nCe salon est **privé** — seuls vous deux pouvez le voir.\n⏱️ Il sera **automatiquement supprimé après 5 minutes d'inactivité**.`
        ),
    ],
  });

  resetInactivityTimer(channel.id, guildId);
  logger.info({ channelId: channel.id, user1Id, user2Id }, "Private channel created");

  return channel;
}
