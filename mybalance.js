const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const CryptoAPI = require('./api.js');
const Database = require('./database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mybal')
    .setDescription('Check your saved LTC balance')
    .setDMPermission(true),

  async execute(interaction) {
    await interaction.deferReply();
    const address = await Database.getAddress(interaction.user.id);
    
    if (!address) {
      return interaction.editReply({ 
        content: '❌ You haven\'t set an address! Use `/setaddy` first.' 
      });
    }
    
    try {
      const data = await CryptoAPI.getLTCBalance(address);
      const priceData = await CryptoAPI.getLTCPrice();
      const ltcPrice = priceData.price_usd || priceData.market_price_usd || 70;
      
      const balance = data.balance / 100000000;
      const unconfirmed = data.unconfirmed_balance / 100000000;
      const totalReceived = data.total_received / 100000000;
      const totalSent = data.total_sent / 100000000;
      
      const usdValue = (balance * ltcPrice).toFixed(2);
      const receivedUsd = (totalReceived * ltcPrice).toFixed(2);
      const sentUsd = (totalSent * ltcPrice).toFixed(2);
      
      const netChange = totalReceived - totalSent;
      const netChangeUsd = (netChange * ltcPrice).toFixed(2);
      const changeSymbol = netChange >= 0 ? '+' : '';
      
      let sendersList = 'No recent transactions';
      if (data.txrefs && data.txrefs.length > 0) {
        const recentTxs = data.txrefs.slice(0, 3);
        sendersList = recentTxs.map((tx, i) => 
          `**${i+1}.** \`${tx.tx_hash.substring(0, 20)}...\` ${tx.value / 100000000} LTC`
        ).join('\n');
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('👤 Your LTC Balance')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '• Your Address', value: `\`\`\`${address}\`\`\``, inline: false },
          { name: '• Balance', value: `**${balance.toFixed(8)} LTC**\n*$${usdValue} USD*`, inline: true },
          { name: '• Unconfirmed', value: `**${unconfirmed.toFixed(8)} LTC**`, inline: true },
          { name: '• Total Received', value: `**${totalReceived.toFixed(8)} LTC**\n*$${receivedUsd} USD*`, inline: true },
          { name: '• Total Sent', value: `**${totalSent.toFixed(8)} LTC**\n*$${sentUsd} USD*`, inline: true },
          { name: '• Your Gain/Loss', value: `**${changeSymbol}${netChange.toFixed(8)} LTC**\n**${changeSymbol}$${netChangeUsd}**`, inline: false }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();

      if (sendersList !== 'No recent transactions') {
        embed.addFields({ name: '• Your Recent Activity', value: sendersList, inline: false });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ 
        content: `❌ Error fetching balance: ${error.message}` 
      });
    }
  }
};
