import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import Database from 'better-sqlite3';

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

const TOKEN = process.env.DISCORD_TOKEN || 'PUT_YOUR_TOKEN_HERE';

// All relevant role IDs (for reference and +perks display)
const LADDER = [
  "1467183899275821180", // lowest
  "1467183698792284255",
  "1467183999146528962",
  "1467184107594186843",
  "1467184238259474698",
  "1467184373496283348",
  "1467184478102487237",
  "1467184633958502465",
  "1467184754368446658",
  "1467184829236773017",
  "1467184894491885568"  // highest
];

// Promotion permissions: who can give up to which max role
const PROMOTION_RULES = [
  { granter: "1467184894491885568", maxTarget: "1467184373496283348" },
  { granter: "1467184829236773017", maxTarget: "1467184107594186843" },
  { granter: "1467184633958502465", maxTarget: "1467183771169194249" },
  { granter: "1467184754368446658", maxTarget: "1467183899275821180" }
];

function getLevel(roleId) {
  const idx = LADDER.indexOf(roleId);
  return idx === -1 ? 0 : idx + 1;
}

function getHighestLevel(roles) {
  let max = 0;
  for (const role of roles.cache.values()) {
    const lvl = getLevel(role.id);
    if (lvl > max) max = lvl;
  }
  return max;
}

function canPromote(roles) {
  return PROMOTION_RULES.some(rule => roles.cache.has(rule.granter));
}

function getMaxAllowedTargetLevel(roles) {
  let maxLvl = 0;
  for (const rule of PROMOTION_RULES) {
    if (roles.cache.has(rule.granter)) {
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
