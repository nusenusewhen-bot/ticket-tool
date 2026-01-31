const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

// ────────────────────────────────────────────────
// File to store data (vouches for now)
const DATA_FILE = './image.json';
let data = {};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading image.json, starting fresh:', err);
    data = {};
  }
} else {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,          // needed for roles
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag} | In ${client.guilds.cache.size} servers`);
});

// ────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('$')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  // ────────────────────────────────────────────────
  // $ping (test command)
  if (command === 'ping') {
    return message.reply('Pong! 🏓');
  }

  // ────────────────────────────────────────────────
  // $mminfo
  if (command === 'mminfo') {
    const mmText = `
• A middleman is a trusted go-between who holds payment until the seller delivers goods or services.
• The funds are released once the buyer confirms everything is as agreed.
• This process helps prevent scams, build trust, and resolve disputes.
• Common in valuable games, real-life money trades, in-game currency, and collectibles.
• Only works safely if the middleman is reputable and verified.
    `.trim();

    const imageUrl = 'https://cdn.discordapp.com/attachments/1466651539778175100/1467235981433503907/middleman1.webp?ex=697fa57d&is=697e53fd&hm=c6976730fb89e6ad39c6371c1a8b524f21cbd1e190a648325fc16985c1eb9a66&';

    try {
      await message.channel.send({
        content: mmText,
        files: [{
          attachment: imageUrl,
          name: 'middleman-diagram.webp'
        }]
      });
      // Optional: await message.delete().catch(() => {});
    } catch (err) {
      console.error('Failed $mminfo:', err);
      await message.reply('Could not send MM info — check perms or logs.');
    }
    return;
  }

  // ────────────────────────────────────────────────
  // $mercy @user
  if (command === 'mercy') {
    const targetMember = message.mentions.members.first();

    if (!targetMember) {
      return message.reply('Mention someone! → `$mercy @user`');
    }

    if (targetMember.id === message.author.id) {
      return message.reply("Can't mercy yourself bro 😭");
    }
    if (targetMember.user.bot) {
      return message.reply("Bots don't need mercy, they're built different 🤖");
    }

    const roleId = '1467183595561943124';

    try {
      await targetMember.roles.add(roleId);

      const learnLink = 'https://discord.com/channels/1467177582951661570/1467182217003532338';
      const rulesLink = 'https://discord.com/channels/1467177582951661570/1467182178499563751';

      const recruitMsg = `${targetMember} has been recruited! 🎉\n` +
                         `Go learn shit here → ${learnLink}\n` +
                         `And read the fuckass rules here → ${rulesLink}\n\n` +
                         `made by love from schior 😎`;

      await message.channel.send(recruitMsg);

      // Optional cleanup
      // await message.delete().catch(() => {});

    } catch (error) {
      console.error('Mercy failed:', error);
      let msg = 'Failed to mercy — ';

      if (error.code === 50013) msg += '(bot role too low or missing MANAGE_ROLES)';
      else if (error.code === 10007) msg += '(user not in server)';
      else if (error.code === 50001) msg += '(missing channel/role access)';

      await message.reply(msg + ' Check Railway logs.');
    }
    return;
  }

  // ────────────────────────────────────────────────
  // $vouch @user reason...
  if (command === 'vouch') {
    if (args.length < 2) {
      return message.reply('Usage: `$vouch @user great trader`');
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply('Mention a valid user.');

    const reason = args.slice(1).join(' ');

    if (!data[target.id]) data[target.id] = [];
    data[target.id].push({
      from: message.author.id,
      reason,
      timestamp: new Date().toISOString()
    });

    saveData();

    return message.reply(`Vouch added for ${target.tag}! ✅`);
  }

  // ────────────────────────────────────────────────
  // $vouches [@user]
  if (command === 'vouches') {
    const target = message.mentions.users.first() || message.author;

    if (!data[target.id] || data[target.id].length === 0) {
      return message.reply(`${target.tag} has no vouches yet.`);
    }

    const list = data[target.id]
      .map((v, i) => `${i+1}. <@${v.from}> (${v.timestamp.slice(0,10)}): ${v.reason}`)
      .join('\n');

    return message.reply(`**Vouches for ${target.tag}:**\n${list}`);
  }

  // Unknown command
  // message.reply('Unknown command. Try $mminfo, $mercy, $vouch, $vouches');
});

// ────────────────────────────────────────────────
client.login(process.env.TOKEN);
