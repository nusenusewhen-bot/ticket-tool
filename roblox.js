const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const CryptoAPI = require('./api.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roblox')
    .setDescription('Lookup Roblox user info')
    .setDMPermission(true)
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Roblox username')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const username = interaction.options.getString('username');
    
    try {
      const data = await CryptoAPI.getRobloxInfo(username);
      
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`👤 ${data.displayName} (@${data.username})`)
        .setURL(`https://www.roblox.com/users/${data.id}/profile`)
        .setThumbnail(data.avatarUrl)
        .addFields(
          { name: '🆔 User ID', value: `**${data.id}**`, inline: true },
          { name: '👥 Followers', value: `**${data.followers.toLocaleString()}**`, inline: true },
          { name: '🤝 Friends', value: `**${data.friends.toLocaleString()}**`, inline: true },
          { name: '📅 Joined', value: `<t:${Math.floor(new Date(data.created).getTime() / 1000)}:R>`, inline: false }
        )
        .setFooter({ text: 'Roblox Profile Lookup' })
        .setTimestamp();

      if (data.description) {
        embed.addFields({ 
          name: '📝 About', 
          value: data.description.substring(0, 100) + (data.description.length > 100 ? '...' : ''), 
          inline: false 
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ 
        content: `❌ Error: ${error.message}\nMake sure the username is correct.` 
      });
    }
  }
};
