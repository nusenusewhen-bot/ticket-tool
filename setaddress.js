const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('./database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setaddy')
    .setDescription('Set your LTC address for /mybal')
    .setDMPermission(true)
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Your LTC address')
        .setRequired(true)),

  async execute(interaction) {
    const address = interaction.options.getString('address');
    
    if (!address.startsWith('L') && !address.startsWith('M') && !address.startsWith('ltc1')) {
      return interaction.reply({ 
        content: '❌ Invalid LTC address format!', 
        ephemeral: true 
      });
    }
    
    await Database.setAddress(interaction.user.id, address);
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Address Saved')
      .setDescription(`Your LTC address has been set to:\n\`\`\`${address}\`\`\``)
      .setFooter({ text: 'Use /mybal to check your balance anytime!' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
