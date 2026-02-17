const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('iplog')
    .setDescription('Fake IP logger (for trolling)')
    .setDMPermission(true)
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to "log"')
        .setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    
    const fakeIP = `192.168.${(user.id % 255)}.${(user.id % 100 + 50)}`;
    const fakeLocation = ['New York, USA', 'London, UK', 'Tokyo, Japan', 'Berlin, Germany', 'Sydney, Australia'][user.id % 5];
    const fakeISP = ['Comcast', 'Verizon', 'AT&T', 'Spectrum', 'BT Group'][user.id % 5];
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🚨 IP Logger Result')
      .setDescription(`**Target:** ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '• IP Address', value: `\`\`\`${fakeIP}\`\`\``, inline: true },
        { name: '• Location', value: `**${fakeLocation}**`, inline: true },
        { name: '• ISP', value: `**${fakeISP}**`, inline: true },
        { name: '• Device', value: `**Windows 11 / Chrome**`, inline: true },
        { name: '" Logged At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setFooter({ text: '⚠️ This is REAL - For entertainment purposes only' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
