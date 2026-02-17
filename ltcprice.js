const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const CryptoAPI = require('./api.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ltcprice')
    .setDescription('Check current LTC price')
    .setDMPermission(true),

  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const priceData = await CryptoAPI.getLTCPrice();
      const price = priceData.price_usd || priceData.market_price_usd || 70;
      const change = priceData.change_24h || priceData.price_change_24h || 0;
      
      const changeEmoji = change >= 0 ? '📈' : '📉';
      const changeColor = change >= 0 ? '#00FF00' : '#FF0000';
      const changeSign = change >= 0 ? '+' : '';

      const embed = new EmbedBuilder()
        .setColor(changeColor)
        .setTitle('• Litecoin Price')
        .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
        .addFields(
          { name: '• Current Price', value: `**$${price.toFixed(2)} USD**`, inline: true },
          { name: `${changeEmoji} 24h Change`, value: `**${changeSign}${change.toFixed(2)}%**`, inline: true },
          { name: '• Market Cap', value: `**$${(price * 84000000 / 1000000000).toFixed(2)}B**`, inline: true }
        )
        .setFooter({ text: 'Data from BlockCypher/CoinGecko' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ 
        content: `❌ Error fetching price: ${error.message}` 
      });
    }
  }
};
