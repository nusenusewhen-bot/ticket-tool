import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import Database from 'better-sqlite3';

const db = new Database('./cooldowns.db', { verbose: console.log });

// Ensure table exists
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

const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_TOKEN_HERE_PUT_IN_ENV';

// Ladder: lowest → highest
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
  "1467184894491885568"  // GOD
];

const GOD_ROLE_ID = LADDER[LADDER.length - 1];

function getLevel(roleId) {
  const index = LADDER.indexOf(roleId);
  return index === -1 ? 0 : index + 1;
}

function getHighestLevel(roles) {
  let max = 0;
  for (const role of roles.cache.values()) {
    const lvl = getLevel(role.id);
    if (lvl > max) max = lvl;
  }
  return max;
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
  console.log(`✅ Bot online | ${client.user.tag} | ${new Date().toUTCString()}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  if (!content.startsWith('+')) return;

  // ────────────────────────────────
  // +perks   or   +perks @user
  // ────────────────────────────────
  if (content.startsWith('+perks')) {
    let target = message.member;

    if (message.mentions.members.size > 0) {
      target = message.mentions.members.first();
    }

    const highest = getHighestLevel(target.roles);
    const isGod = target.roles.cache.has(GOD_ROLE_ID);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `Rank Perks • ${target.user.username}`, iconURL: target.displayAvatarURL({ size: 64 }) })
      .setColor(isGod ? 0xFFD700 : 0x5865F2)
      .setTimestamp();

    if (highest === 0) {
      embed.setDescription(`${target === message.member ? "You don't" : `<@${target.id}> doesn't`} have any ranking role yet.`);
      return message.reply({ embeds: [embed] });
    }

    const currentRoleId = LADDER[highest - 1];
    const currentRole = message.guild.roles.cache.get(currentRoleId);

    if (isGod) {
      let desc = "**GOD RANK** — Full control\nYou can promote anyone to **any lower rank**:\n\n";
      LADDER.slice(0, -1).forEach((id, i) => {
        const r = message.guild.roles.cache.get(id);
        desc += `• **${i + 1}**. ${r?.name ?? 'Deleted Role'} (<@&${id}>)\n`;
      });
      embed.setDescription(desc);
      embed.setFooter({ text: "Can assign any rank below GOD • 1 promotion/hour" });
    } else {
      const nextId = LADDER[highest];
      const nextRole = message.guild.roles.cache.get(nextId);

      embed.setDescription(
        `**Current rank**: ${currentRole?.name ?? '???'} (Level ${highest})\n\n` +
        `You can promote users **one step up** to:\n` +
        `→ **${nextRole?.name ?? 'Next rank'}** (<@&${nextId}>)\n\n` +
        `*Strict ladder rule: only the immediate next rank is allowed.*`
      );
      embed.setFooter({ text: `Level ${highest} • 1 promotion per hour` });
    }

    return message.reply({ embeds: [embed] });
  }

  // ────────────────────────────────
  // +rank @user <role>
  // ────────────────────────────────
  if (content.startsWith('+rank')) {
    const args = content.slice(5).trim().split(/\s+/);
    if (args.length < 2) {
      return message.reply("Usage: `+rank @user <role>` (mention, name or ID)");
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply("Please mention a valid user.");

    // Role can be mention, name or ID
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
      return message.reply("That role is **not** in the ranking ladder.");
    }

    const authorLvl = getHighestLevel(message.member.roles);
    const targetLvl = getHighestLevel(target.roles);
    const wantedLvl = getLevel(role.id);

    if (authorLvl === 0) {
      return message.reply("You don't have permission to rank anyone.");
    }

    if (wantedLvl > authorLvl) {
      return message.reply("You cannot assign a rank **higher** than your own.");
    }

    if (targetLvl >= wantedLvl) {
      return message.reply("That user already has equal or higher rank.");
    }

    // Non-GOD: only allow exact next step
    if (!message.member.roles.cache.has(GOD_ROLE_ID)) {
      if (wantedLvl !== authorLvl + 1) {
        return message.reply("You can only promote to the **next rank** in the ladder.");
      }
    }

    // Cooldown: 1 hour = 3600 seconds
    const lastUse = getCooldown(message.author.id);
    const now = Date.now();
    if (now - lastUse < 3_600_000) {
      const left = Math.ceil((3_600_000 - (now - lastUse)) / 60_000);
      return message.reply(`Wait **${left} minute${left === 1 ? '' : 's'}** before ranking again.`);
    }

    // Do the promotion
    try {
      await target.roles.add(role.id);
      setCooldown(message.author.id);

      const successEmbed = new EmbedBuilder()
        .setColor(0x00FF88)
        .setDescription(`✅ **${target.user.tag}** promoted to **${role.name}**`)
        .setFooter({ text: `By ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [successEmbed] });
    } catch (err) {
      console.error(err);
      return message.reply("Failed to assign role (check my permissions / role hierarchy).");
    }
  }
});

client.login(TOKEN).catch(err => {
  console.error("Login failed:", err);
});
