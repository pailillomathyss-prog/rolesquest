import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  type Message,
  type Interaction,
  type TextChannel,
} from "discord.js";
import { logger } from "./logger";

/* ── Constants ─────────────────────────────────────────── */

const COLORS = [
  { label: "Gris défaut",    hex: "#99AAB5" },
  { label: "Turquoise",      hex: "#1ABC9C" },
  { label: "Vert émeraude",  hex: "#2ECC71" },
  { label: "Bleu ciel",      hex: "#3498DB" },
  { label: "Violet",         hex: "#9B59B6" },
  { label: "Rose vif",       hex: "#E91E63" },
  { label: "Jaune or",       hex: "#F1C40F" },
  { label: "Orange",         hex: "#E67E22" },
  { label: "Rouge",          hex: "#E74C3C" },
  { label: "Vert foncé",     hex: "#11806A" },
  { label: "Bleu marine",    hex: "#206694" },
  { label: "Pourpre",        hex: "#71368A" },
  { label: "Bordeaux",       hex: "#AD1457" },
  { label: "Bronze",         hex: "#C27C0E" },
  { label: "Cramoisi",       hex: "#992D22" },
  { label: "Gris clair",     hex: "#979C9F" },
  { label: "Bleuet Discord", hex: "#7289DA" },
  { label: "Blanc",          hex: "#FFFFFF" },
];

const ROLE_NAMES = [
  "Guerrier","Mage","Archer","Paladin","Assassin",
  "Druide","Barde","Nécromancien","Invocateur","Chevalier",
  "Sorcier","Ranger","Voleur","Prêtre","Barbare",
  "Moine","Chaman","Démoniste","Enchanteur","Forgeron",
  "Explorateur","Gardien","Sage","Légende","Champion",
];

const EMOJIS = [
  { label: "Aucun emoji",  value: "none",  emoji: "❌" },
  { label: "Épée",         value: "⚔️",    emoji: "⚔️" },
  { label: "Bouclier",     value: "🛡️",    emoji: "🛡️" },
  { label: "Arc",          value: "🏹",    emoji: "🏹" },
  { label: "Mage",         value: "🧙",    emoji: "🧙" },
  { label: "Boule magique",value: "🔮",    emoji: "🔮" },
  { label: "Étoile",       value: "🌟",    emoji: "🌟" },
  { label: "Couronne",     value: "👑",    emoji: "👑" },
  { label: "Lion",         value: "🦁",    emoji: "🦁" },
  { label: "Dragon",       value: "🐉",    emoji: "🐉" },
  { label: "Aigle",        value: "🦅",    emoji: "🦅" },
  { label: "Vague",        value: "🌊",    emoji: "🌊" },
  { label: "Feu",          value: "🔥",    emoji: "🔥" },
  { label: "Éclair",       value: "⚡",    emoji: "⚡" },
  { label: "Glace",        value: "❄️",    emoji: "❄️" },
  { label: "Fleur",        value: "🌸",    emoji: "🌸" },
  { label: "Trèfle",       value: "🍀",    emoji: "🍀" },
  { label: "Lune",         value: "🌙",    emoji: "🌙" },
  { label: "Diamant",      value: "💎",    emoji: "💎" },
  { label: "Trophée",      value: "🏆",    emoji: "🏆" },
  { label: "Renard",       value: "🦊",    emoji: "🦊" },
  { label: "Loup",         value: "🐺",    emoji: "🐺" },
  { label: "Crâne",        value: "💀",    emoji: "💀" },
  { label: "Arc-en-ciel",  value: "🌈",    emoji: "🌈" },
  { label: "Licorne",      value: "🦄",    emoji: "🦄" },
];

const INACTIVITY_MS = 5 * 60 * 1000;

/* ── State ─────────────────────────────────────────────── */

interface RoleState { color?: string; colorLabel?: string; name?: string; emoji?: string }
const pendingRoles = new Map<string, RoleState>();
const channelTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once("ready", () => logger.info({ tag: client?.user?.tag }, "Bot ready"));
  client.on("messageCreate", onMessage);
  client.on("interactionCreate", onInteraction);
  client.on("messageCreate", onMessageInactivity);

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
    setTimeout(() => reject(new Error("timeout")), 15000);
  });
}

/* ── Prefix command router ──────────────────────────────── */

async function onMessage(msg: Message) {
  if (msg.author.bot || !msg.guild) return;
  const content = msg.content.trim();

  if (content.startsWith("-setroles")) return handleSetRoles(msg);
  if (content.startsWith("-setpriv"))  return handleSetPriv(msg);
}

/* ── -setroles ──────────────────────────────────────────── */

async function handleSetRoles(msg: Message) {
  const key = `${msg.author.id}_${msg.guild!.id}`;
  pendingRoles.set(key, {});

  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle("🎭 Créer mon rôle")
    .setDescription("**1.** Choisis une couleur\n**2.** Choisis un nom\n**3.** Choisis un emoji *(optionnel)*\n**4.** Clique sur **Créer** !")
    .setFooter({ text: "Expire dans 5 minutes" });

  const colorRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`sr_color_${msg.author.id}`)
      .setPlaceholder("🎨  Couleur du rôle")
      .addOptions(COLORS.map((c) => ({ label: c.label, value: c.hex, description: c.hex })))
  );

  const nameRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`sr_name_${msg.author.id}`)
      .setPlaceholder("📝  Nom du rôle")
      .addOptions(ROLE_NAMES.map((n) => ({ label: n, value: n })))
  );

  const emojiRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`sr_emoji_${msg.author.id}`)
      .setPlaceholder("😀  Emoji (optionnel)")
      .addOptions(EMOJIS.map((e) => ({ label: e.label, value: e.value, emoji: e.emoji })))
  );

  const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`sr_create_${msg.author.id}`)
      .setLabel("Créer mon rôle")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true)
  );

  await msg.reply({ embeds: [embed], components: [colorRow, nameRow, emojiRow, btnRow] });
}

/* ── -setpriv ───────────────────────────────────────────── */

async function handleSetPriv(msg: Message) {
  const mentioned = msg.mentions.users.first();

  if (!mentioned) {
    await msg.reply("❌ Utilise la commande comme ceci : `-setpriv @utilisateur`");
    return;
  }
  if (mentioned.id === msg.author.id) {
    await msg.reply("❌ Tu ne peux pas t'inviter toi-même.");
    return;
  }
  if (mentioned.bot) {
    await msg.reply("❌ Tu ne peux pas inviter un bot.");
    return;
  }

  const guildId = msg.guild!.id;
  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle("💬 Invitation à un salon privé")
    .setDescription(
      `**${msg.author.username}** t'invite à rejoindre un **salon privé**.\n\n` +
      `Ce salon sera **supprimé automatiquement après 5 minutes d'inactivité**.`
    )
    .setFooter({ text: "Cette invitation expire dans 2 minutes." });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`priv_accept_${msg.author.id}_${mentioned.id}_${guildId}`)
      .setLabel("Accepter ✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`priv_reject_${msg.author.id}_${mentioned.id}_${guildId}`)
      .setLabel("Refuser ❌")
      .setStyle(ButtonStyle.Danger)
  );

  try {
    await mentioned.send({ embeds: [embed], components: [row] });
    await msg.reply(`📨 Invitation envoyée à **${mentioned.username}** en DM !`);
  } catch {
    await msg.reply(`❌ Impossible d'envoyer un DM à **${mentioned.username}**. Il a peut-être les DMs désactivés.`);
  }
}

/* ── Interaction handler ────────────────────────────────── */

async function onInteraction(interaction: Interaction) {
  try {
    // ── Role panel selects ──
    if (interaction.isStringSelectMenu()) {
      const { customId, values, user } = interaction;

      if (customId.startsWith("sr_color_")) {
        const userId = customId.replace("sr_color_", "");
        if (user.id !== userId) { await interaction.deferUpdate(); return; }
        const key = `${userId}_${interaction.guildId ?? ""}`;
        const state = pendingRoles.get(key) ?? {};
        state.color = values[0];
        state.colorLabel = COLORS.find((c) => c.hex === values[0])?.label ?? values[0];
        pendingRoles.set(key, state);
        await updateRolePanel(interaction, state, userId);
        return;
      }

      if (customId.startsWith("sr_name_")) {
        const userId = customId.replace("sr_name_", "");
        if (user.id !== userId) { await interaction.deferUpdate(); return; }
        const key = `${userId}_${interaction.guildId ?? ""}`;
        const state = pendingRoles.get(key) ?? {};
        state.name = values[0];
        pendingRoles.set(key, state);
        await updateRolePanel(interaction, state, userId);
        return;
      }

      if (customId.startsWith("sr_emoji_")) {
        const userId = customId.replace("sr_emoji_", "");
        if (user.id !== userId) { await interaction.deferUpdate(); return; }
        const key = `${userId}_${interaction.guildId ?? ""}`;
        const state = pendingRoles.get(key) ?? {};
        state.emoji = values[0] === "none" ? undefined : values[0];
        pendingRoles.set(key, state);
        await updateRolePanel(interaction, state, userId);
        return;
      }
    }

    // ── Role create button ──
    if (interaction.isButton()) {
      const { customId, user } = interaction;

      if (customId.startsWith("sr_create_")) {
        const userId = customId.replace("sr_create_", "");
        if (user.id !== userId) { await interaction.deferUpdate(); return; }
        const guildId = interaction.guildId ?? process.env["DISCORD_GUILD_ID"] ?? "";
        const key = `${userId}_${guildId}`;
        const state = pendingRoles.get(key);

        if (!state?.color || !state?.name) {
          await interaction.reply({ content: "❌ Choisis d'abord une couleur et un nom.", ephemeral: true });
          return;
        }

        await interaction.deferUpdate();
        const role = await createDiscordRole({ guildId, name: state.name, color: state.color, emoji: state.emoji });
        pendingRoles.delete(key);

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(hexToNumber(state.color))
              .setTitle("✅ Rôle créé !")
              .setDescription(`Le rôle **${role.name}** a été créé sur le serveur.`),
          ],
          components: [],
        });
        return;
      }

      // ── Private salon accept/reject ──
      if (customId.startsWith("priv_accept_") || customId.startsWith("priv_reject_")) {
        const parts = customId.split("_");
        const action = parts[1]; // accept | reject
        const inviterId = parts[2];
        const targetId = parts[3];
        const guildId = parts[4];

        if (user.id !== targetId) { await interaction.deferUpdate(); return; }

        if (action === "accept") {
          await interaction.update({ content: "✅ Invitation acceptée ! Création du salon…", embeds: [], components: [] });
          const channel = await createPrivateChannel(guildId, inviterId, targetId);
          const inviter = await client!.users.fetch(inviterId);
          await inviter.send(`✅ **${user.username}** a accepté ! → <#${channel.id}>`);
        } else {
          await interaction.update({ content: "❌ Invitation refusée.", embeds: [], components: [] });
          const inviter = await client!.users.fetch(inviterId);
          await inviter.send(`❌ **${user.username}** a refusé ton invitation de salon privé.`);
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Interaction error");
  }
}

/* ── Helpers ────────────────────────────────────────────── */

async function updateRolePanel(
  interaction: import("discord.js").StringSelectMenuInteraction,
  state: RoleState,
  userId: string
) {
  const ready = !!state.color && !!state.name;
  const preview = [state.emoji, state.name].filter(Boolean).join(" ");

  const embed = new EmbedBuilder()
    .setColor(state.color ? hexToNumber(state.color) : 0x7289da)
    .setTitle("🎭 Créer mon rôle")
    .setDescription(
      `**Couleur :** ${state.colorLabel ?? "*non choisie*"}\n` +
      `**Nom :** ${state.name ?? "*non choisi*"}\n` +
      `**Emoji :** ${state.emoji ?? "*aucun*"}\n\n` +
      (ready ? `Aperçu : **${preview}**` : "*Choisis une couleur et un nom pour continuer.*")
    )
    .setFooter({ text: "Expire dans 5 minutes" });

  const colorRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`sr_color_${userId}`)
      .setPlaceholder(state.color ? `✓ ${state.colorLabel}` : "🎨  Couleur du rôle")
      .addOptions(COLORS.map((c) => ({ label: c.label, value: c.hex, description: c.hex })))
  );

  const nameRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`sr_name_${userId}`)
      .setPlaceholder(state.name ? `✓ ${state.name}` : "📝  Nom du rôle")
      .addOptions(ROLE_NAMES.map((n) => ({ label: n, value: n })))
  );

  const emojiRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`sr_emoji_${userId}`)
      .setPlaceholder(state.emoji ? `✓ ${state.emoji}` : "😀  Emoji (optionnel)")
      .addOptions(EMOJIS.map((e) => ({ label: e.label, value: e.value, emoji: e.emoji })))
  );

  const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`sr_create_${userId}`)
      .setLabel("Créer mon rôle")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!ready)
  );

  await interaction.update({ embeds: [embed], components: [colorRow, nameRow, emojiRow, btnRow] });
}

function onMessageInactivity(msg: Message) {
  if (msg.author.bot) return;
  const id = msg.channelId;
  if (!channelTimers.has(id)) return;
  resetInactivity(id, msg.guild?.id ?? "");
}

function resetInactivity(channelId: string, guildId: string) {
  const existing = channelTimers.get(channelId);
  if (existing) clearTimeout(existing);

  const t = setTimeout(async () => {
    channelTimers.delete(channelId);
    try {
      const guild = await client!.guilds.fetch(guildId);
      const ch = guild.channels.cache.get(channelId) as TextChannel | undefined;
      if (!ch) return;
      await ch.send("⏱️ **5 minutes d'inactivité — salon supprimé dans 10 secondes.**");
      await new Promise((r) => setTimeout(r, 10_000));
      await ch.delete("Inactivité 5 min");
    } catch (err) {
      logger.error({ err, channelId }, "Failed to delete inactive channel");
    }
  }, INACTIVITY_MS);

  channelTimers.set(channelId, t);
}

/* ── Exported actions (used by Express API) ─────────────── */

function hexToNumber(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export interface CreateRoleOptions {
  guildId: string; name: string; color: string; emoji?: string;
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
  logger.info({ roleId: role.id }, "Role created");
  return { id: role.id, name: role.name };
}

export interface MemberInfo {
  id: string; username: string; displayName: string; avatarUrl: string | null;
}

export async function getGuildMembers(guildId: string): Promise<MemberInfo[]> {
  const discord = getDiscordClient();
  await waitReady(discord);
  const guild = await discord.guilds.fetch(guildId);
  const members = await guild.members.fetch();
  return members
    .filter((m) => !m.user.bot)
    .map((m) => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.displayName,
      avatarUrl: m.user.displayAvatarURL({ size: 64 }),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function sendPrivateInvite(inviterId: string, targetId: string, guildId: string, inviterName: string) {
  const discord = getDiscordClient();
  await waitReady(discord);
  const target = await discord.users.fetch(targetId);

  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle("💬 Invitation salon privé")
    .setDescription(
      `**${inviterName}** t'invite dans un **salon privé**.\n` +
      `Il sera supprimé après **5 min d'inactivité**.`
    )
    .setFooter({ text: "Expire dans 2 minutes." });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`priv_accept_${inviterId}_${targetId}_${guildId}`)
      .setLabel("Accepter ✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`priv_reject_${inviterId}_${targetId}_${guildId}`)
      .setLabel("Refuser ❌").setStyle(ButtonStyle.Danger)
  );

  await target.send({ embeds: [embed], components: [row] });
}

export async function createPrivateChannel(guildId: string, user1Id: string, user2Id: string): Promise<TextChannel> {
  const discord = getDiscordClient();
  await waitReady(discord);
  const guild = await discord.guilds.fetch(guildId);
  const [m1, m2] = await Promise.all([guild.members.fetch(user1Id), guild.members.fetch(user2Id)]);
  const name = `privé-${m1.user.username}-${m2.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 100);

  const ch = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: guild.id,  deny:  [PermissionFlagsBits.ViewChannel] },
      { id: user1Id,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: user2Id,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ],
    reason: "Salon privé RolesQuest",
  }) as TextChannel;

  await ch.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("🔒 Salon privé créé !")
        .setDescription(`Bienvenue <@${user1Id}> et <@${user2Id}> !\n⏱️ Suppression automatique après **5 min d'inactivité**.`),
    ],
  });

  resetInactivity(ch.id, guildId);
  return ch;
}
