require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ]
});

client.commands = new Collection();

// Load command files from SAME folder (not subfolder)
const commandFiles = [
  'balance.js',
  'setaddress.js',
  'mybalance.js',
  'ltcprice.js',
  'fakebalance.js',
  'iplog.js',
  'avatar.js',
  'roblox.js'
];

for (const file of commandFiles) {
  const command = require(path.join(__dirname, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity('/bal | /mybal | /ltcprice', { type: 'WATCHING' });
  
  try {
    const commands = [];
    for (const file of commandFiles) {
      const command = require(path.join(__dirname, file));
      if ('data' in command) {
        const cmdData = command.data.toJSON();
        cmdData.default_member_permissions = null;
        cmdData.dm_permission = true;
        commands.push(cmdData);
      }
    }
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`✅ ${commands.length} commands deployed`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    const reply = { content: '❌ Error!', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
