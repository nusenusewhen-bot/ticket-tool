import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
dotenv.config();

const db = new Database('./cooldowns.db');

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS cooldowns (
    userId TEXT PRIMARY KEY,
    lastUse INTEGER NOT NULL DEFAULT 0
  )
`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN_HERE_REPLACE_ME';

// All known roles in the system (for reference and +perks display)
const LADDER = [
  "1467183899275821180", // 1
  "1467183698792284255", // 2
  "1467183999146528962", // 3
  "1467184107594186843", // 4
  "1467184238259474698", // 5
  "1467184373496283348", // 6
  "1467184478102487237", // 7
  "1467184633958502465", // 8
  "1467184754368446658", // 9
  "1467184829236773017", // 10
  "1467184894491885568"  // 11 - top
];

// Who can promote → and up to which maximum role
const PROMOTION_RULES = [
  { granter: "1467185545431224421", maxTarget: "1467184894491885568" }, // FULL ACCESS
  { granter: "1467184894491885568", maxTarget: "1467184373496283348" },
  { granter: "1467184829236773017", maxTarget: "1467184107594186843" },
  { granter: "1467184633958502465", maxTarget: "1467183771169194249" },
  { granter: "1467184754368446658", maxTarget: "1467183899275821180" }
];

function getLevel(roleId) {
  const idx = LADDER.indexOf(roleId);
  return idx === -1 ? 0 : idx + 1;
}

function getHighestLevel(memberRoles) {
  let max = 0;
  for (const role of memberRoles.cache.values()) {
    const lvl = getLevel(role.id);
    if (lvl > max) max = lvl;
  }
  return max;
}

function canPromote(memberRoles) {
  return PROMOTION_RULES.some(rule => memberRoles.cache.has(rule.granter));
}

function getMaxAllowedTargetLevel(memberRoles) {
  let maxLvl = 0;
  for (const rule of PROMOTION_RULES) {
    if (memberRoles.cache.has(rule.granter)) {
      const thisMax = getLevel(rule.maxTarget);
      if (thisMax > maxLvl) maxLvl = thisMax;
    }
  }
  return maxLvl;
}

function getCooldown(userId) {
  const row = db.prepare('SELECT lastUse FROM cooldowns WHERE userId = ?').get(userId);
  return row?.lastUse || 0;
}

function setCooldown(userId) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO cooldowns (userId, lastUse)
    VALUES (?, ?)
    ON CONFLICT(userId) DO UPDATE SET lastUse = excluded.lastUse
  `).run(userId, now);
}

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag} — ${new Date().toUTCString()}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith('+')) return;

  const content = message.content.trim().toLowerCase();

  // ──── +perks ────
  if (content === '+perks' || content.startsWith('+perks ')) {
    let target = message.member;
    if (message.mentions.members.size > 0) {
      target = message.mentions.members.first();
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: `Permissions • ${target.user.username}`, iconURL: target.displayAvatarURL({ size: 64 }) })
      .setColor(0x5865F2)
      .setTimestamp();

    if (!canPromote(target.roles)) {
      embed.setDescription("This user cannot promote anyone.");
      return message.reply({ embeds: [embed] });
    }

    const maxLvl = getMaxAllowedTargetLevel(target.roles);
    const isFullAccess = maxLvl >= getLevel("1467184894491885568");

    let desc = `**You can promote up to:**\n→ **${message.guild.roles.cache.get(LADDER[maxLvl - 1])?.name ?? 'Unknown'}** (<@&${LADDER[maxLvl - 1]}>)\n\n`;

    if (isFullAccess) {
      desc += "**Full access** — you can promote to **any rank** in the system.\n\nAll ranks:\n";
    } else {
      desc += "Allowed ranks:\n";
    }

    // Display all roles descending (best first)
    const sortedLadder = [...LADDER].reverse();
    sortedLadder.slice(0, maxLvl).forEach((id, i) => {
      const r = message.guild.roles.cache.get(id);
      if (r) desc += `• ${i + 1}. ${r.name} (<@&${id}>)\n`;
    });

    embed.setDescription(desc);
    embed.setFooter({ text: "1 promotion per hour • Strict max limit" });

    return message.reply({ embeds: [embed] });
  }

  // ──── +rank @user <role> ────
  if (content.startsWith('+rank')) {
    const args = message.content.slice(5).trim().split(/\s+/);
    if (args.length < 2) {
      return message.reply("Usage: `+rank @user <role>` (mention, name or ID)");
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply("Mention a valid user.");

    let roleQuery = args.slice(1).join(' ');
    if (message.mentions.roles.size > 0) {
      roleQuery = message.mentions.roles.first().id;
    }

    const role = message.guild.roles.cache.find(r =>
      r.id === roleQuery ||
      r.name.toLowerCase() === roleQuery.toLowerCase() ||
      r.id === roleQuery.replace(/[<@&>]/g, '')
    );

    if (!role || !LADDER.includes(role.id)) {
      return message.reply("That role is **not** in the ranking system.");
    }

    if (!canPromote(message.member.roles)) {
      return message.reply("You are not allowed to use +rank.");
    }

    const authorMaxLvl = getMaxAllowedTargetLevel(message.member.roles);
    const wantedLvl = getLevel(role.id);

    if (wantedLvl > authorMaxLvl) {
      return message.reply("That rank is above your allowed maximum.");
    }

    const targetLvl = getHighestLevel(target.roles);

    if (targetLvl >= wantedLvl) {
      return message.reply("Target already has equal or higher rank.");
    }

    // ──── Cooldown check ────
    const lastUse = getCooldown(message.author.id);
    const now = Date.now();
    const bypassCooldown = message.member.roles.cache.has("1467185545431224421"); // special bypass

    if (!bypassCooldown && now - lastUse < 3600000) {
      const remaining = Math.ceil((3600000 - (now - lastUse)) / 60000);
      return message.reply(`You can promote again in **${remaining} minute${remaining === 1 ? '' : 's'}**.`);
    }

    try {
      await target.roles.add(role.id);
      if (!bypassCooldown) setCooldown(message.author.id);

      const embed = new EmbedBuilder()
        .setColor(0x00CC66)
        .setDescription(`**${target.user.tag}** → **${role.name}**`)
        .setFooter({ text: `Promoted by ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("Couldn't assign the role (check bot permissions / hierarchy).");
    }
  }
});

client.login(TOKEN).catch(err => {
  console.error('Login failed:', err);
});
