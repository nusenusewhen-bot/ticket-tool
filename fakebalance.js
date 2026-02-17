const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fakebal')
    .setDescription('Generate a fake balance screenshot')
    .setDMPermission(true),

  async execute(interaction) {
    const balance = 84.814;
    const balanceUsd = 5937;
    const received = 847.2;
    const receivedUsd = 59279;
    const sent = 762.386;
    const sentUsd = 53342;
    const unconfirmed = 0;
    
    const netGain = received - sent;
    const netGainUsd = receivedUsd - sentUsd;
    
    const fakeAddress = 'ltc1q' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const embed = new EmbedBuilder()
      .setColor('#00D4AA')
      .setTitle('💎 LTC Balance Lookup')
      .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
      .addFields(
        { name: '📍 Address', value: `\`\`\`${fakeAddress}\`\`\``, inline: false },
        { name: '💰 Balance', value: `**${balance.toFixed(8)} LTC**\n*$${balanceUsd.toLocaleString()} USD*`, inline: true },
        { name: '⏳ Unconfirmed', value: `**${unconfirmed.toFixed(8)} LTC**`, inline: true },
        { name: '📥 Total Received', value: `**${received.toFixed(8)} LTC**\n*$${receivedUsd.toLocaleString()} USD*`, inline: true },
        { name: '📤 Total Sent', value: `**${sent.toFixed(8)} LTC**\n*$${sentUsd.toLocaleString()} USD*`, inline: true },
        { name: '📊 Net Gain/Loss', value: `**+${netGain.toFixed(8)} LTC**\n**+$${netGainUsd.toLocaleString()}**`, inline: false }
      )
      .addFields({ 
        name: '🔄 Recent Activity', 
        value: `**1.** \`a3f7d2e9b1c8...\` +12.50 LTC\n**2.** \`e8b4c1a7f3d2...\` +45.20 LTC\n**3.** \`c9a2e7b4f1d8...\` +8.14 LTC`, 
        inline: false 
      })
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
