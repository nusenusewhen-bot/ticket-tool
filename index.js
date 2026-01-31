const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

// ────────────────────────────────────────────────
// Data file
const DATA_FILE = './image.json';
let vouchData = {}; // { userID: number }

if (fs.existsSync(DATA_FILE)) {
  try {
    vouchData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading image.json, starting fresh:', err);
    vouchData = {};
  }
} else {
  fs.writeFileSync(DATA_FILE, JSON.stringify(vouchData, null, 2));
}

function saveVouchData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(vouchData, null, 2));
}

// ────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag} | In ${client.guilds.cache.size} servers`);
});

// ────────────────────────────────────────────────
// Allowed role ID – only members with this role can use commands
const ALLOWED_ROLE_ID = '1467183698792284255';

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Only allow commands from users with the specific role
  if (!message.member.roles.cache.has(ALLOWED_ROLE_ID)) {
    return; // silently ignore – or uncomment below for feedback
    // return message.reply('You do not have permission to use bot commands.');
  }

  const content = message.content.trim();

  // ────────────────────────────────────────────────
  // + prefix commands (vouch system)
  if (content.startsWith('+')) {
    const args = content.slice(1).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    // +vouch @user
    if (command === 'vouch') {
      const targetMember = message.mentions.members.first();
      if (!targetMember) {
        return message.reply('Mention a user → `+vouch @user`');
      }

      const userId = targetMember.id;
      vouchData[userId] = (vouchData[userId] || 0) + 1;
      saveVouchData();

      return message.reply(`${targetMember} now has **${vouchData[userId]}** vouches! +1 ✅`);
    }

    // +vouches [@user]
    if (command === 'vouches') {
      const target = message.mentions.users.first() || message.author;
      const count = vouchData[target.id] || 0;

      return message.reply(`${target} has **${count}** vouches.`);
    }

    // +vouchconfig @user number
    if (command === 'vouchconfig') {
      const targetMember = message.mentions.members.first();
      if (!targetMember) {
        return message.reply('Mention a user → `+vouchconfig @user number`');
      }

      const numberStr = args[1];
      if (!numberStr || isNaN(numberStr)) {
        return message.reply('Provide a valid number → `+vouchconfig @user 10`');
      }

      const newCount = parseInt(numberStr, 10);
      if (newCount < 0) {
        return message.reply('Vouch count cannot be negative.');
      }

      vouchData[targetMember.id] = newCount;
      saveVouchData();

      return message.reply(`Set ${targetMember}'s vouches to **${newCount}**.`);
    }

    return; // unknown + command – ignore silently
  }

  // ────────────────────────────────────────────────
  // $ prefix commands (old ones – still restricted to the role)
  if (content.startsWith('$')) {
    const args = content.slice(1).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

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
          files: [{ attachment: imageUrl, name: 'middleman-diagram.webp' }]
        });
      } catch (err) {
        console.error('Failed $mminfo:', err);
        await message.reply('Could not send MM info.');
      }
      return;
    }

    // $mercy @user
    if (command === 'mercy') {
      const targetMember = message.mentions.members.first();
      if (!targetMember) return message.reply('Mention someone! → `$mercy @user`');

      if (targetMember.id === message.author.id) return message.reply("Can't mercy yourself 😭");
      if (targetMember.user.bot) return message.reply("Can't mercy bots 🤖");

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
      } catch (error) {
        console.error('Mercy failed:', error);
        await message.reply('Failed to mercy – check bot perms/role position.');
      }
      return;
    }
  }

  // No command matched or no prefix → do nothing
});

// ────────────────────────────────────────────────
client.login(process.env.TOKEN);
