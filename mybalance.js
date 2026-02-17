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
      const priceChange = priceData.change_24h || 0;
      
      const balanceLTC = data.balance / 100000000;
      const unconfirmedLTC = data.unconfirmed_balance / 100000000;
      const totalReceivedLTC = data.total_received / 100000000;
      
      const balanceUSD = (balanceLTC * ltcPrice).toFixed(2);
      const unconfirmedUSD = (unconfirmedLTC * ltcPrice).toFixed(2);
      const receivedUSD = (totalReceivedLTC * ltcPrice).toFixed(2);
      const change24h = (balanceLTC * ltcPrice * (priceChange / 100)).toFixed(2);
      const changeSymbol = priceChange >= 0 ? '+' : '';
      
      // Build transactions list
      let txList = '';
      if (data.txrefs && data.txrefs.length > 0) {
        const recentTxs = data.txrefs.slice(0, 5);
        for (const tx of recentTxs) {
          const isReceived = tx.tx_output_n >= 0;
          const arrow = isReceived ? '🟢 from' : '🔴 to';
          const otherAddr = isReceived ? (tx.inputs?.[0]?.addresses?.[0] || 'Unknown') : (tx.outputs?.[0]?.addresses?.[0] || 'Unknown');
          const amountUSD = ((tx.value / 100000000) * ltcPrice).toFixed(2);
          const shortAddr = otherAddr.substring(0, 20) + '...';
          txList += `${arrow}\n${shortAddr}: $${amountUSD}\n`;
        }
      } else {
        txList = 'No transactions found';
      }

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('`L`')
        .setDescription(`**${address}**`)
        .addFields(
          { name: '💵 Balance', value: `$${balanceUSD}`, inline: false },
          { name: 'Unconfirmed', value: `$${unconfirmedUSD}`, inline: false },
          { name: 'Total Received', value: `$${receivedUSD}`, inline: false },
          { name: '📈 24h Change', value: `${changeSymbol}$${change24h}`, inline: false },
          { name: '`L` Price', value: `$${ltcPrice.toFixed(2)}`, inline: false },
          { name: 'Last 5 Transactions', value: txList || 'None', inline: false }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ 
        content: `❌ Error fetching balance: ${error.message}` 
      });
    }
  }
};
