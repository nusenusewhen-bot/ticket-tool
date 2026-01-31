require('dotenv').config();
const { Client, GatewayIntentBits, Partials, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, ChannelType } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel] 
});

// CONFIG
const SPECIAL_USER_ID = '1467183698792284255'; // main middleman
const LOG_CHANNEL_ID = '1467183089850515508'; // ticket close log channel
const TICKET_CATEGORY_ID = null; // optional category for tickets

// In-memory tickets storage
const tickets = new Map();

// Ready
client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));

// ----------------- Slash Command: /ticketpanel -----------------
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'ticketpanel') {
        await interaction.reply({
            content: "**Welcome to MM Service!**\nIf you are in need of an MM, please read our Middleman too first and then tap the “Request middleman” button and fill out the form below.\n• You will be required to vouch your middleman after the trade in the vouches channel. Failing to do so within 24 hours will result in a Blacklist from our MM Service.\n• Creating any form of troll tickets will also result in a middleman ban.\n❖ : We are NOT responsible for anything that happens after the trade is done. As well as any duped items. By opening a ticket or requesting a middleman you have agreed to our middleman too.",
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('request_mm')
                        .setLabel('Request Middleman')
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        });
    }
});

// ----------------- Ticket Modal -----------------
client.on('interactionCreate', async interaction => {
    // Request middleman button
    if (interaction.isButton() && interaction.customId === 'request_mm') {
        const modal = new ModalBuilder()
            .setCustomId('ticketForm')
            .setTitle('Request Middleman');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('otherUser')
                    .setLabel("What's the other person’s ID/User?")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('tradeAbout')
                    .setLabel("What's the trade about?")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('canJoinServers')
                    .setLabel("Can both join private servers?")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            )
        );

        await interaction.showModal(modal);
    }

    // Modal submit
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'ticketForm') {
        const otherUser = interaction.fields.getTextInputValue('otherUser');
        const tradeAbout = interaction.fields.getTextInputValue('tradeAbout');
        const canJoinServers = interaction.fields.getTextInputValue('canJoinServers');

        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID || undefined,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: SPECIAL_USER_ID, allow: [PermissionsBitField.Flags.ViewChannel] } // can see but can't type
            ]
        });

        tickets.set(ticketChannel.id, {
            creator: interaction.user.id,
            claimedBy: null,
            allowedUsers: [interaction.user.id],
        });

        await ticketChannel.send({
            content: `**Ticket Opened!**\nOther user: ${otherUser}\nTrade about: ${tradeAbout}\nCan both join private servers: ${canJoinServers}\n\nWelcome to MM Service!\nIf you are in need of an MM, please read our Middleman too first and then tap the “Request middleman” button and fill out the form below.\n• You will be required to vouch your middleman after the trade in the vouches channel. Failing to do so within 24 hours will result in a Blacklist from our MM Service.\n• Creating any form of troll tickets will also result in a middleman ban.\n❖ : We are NOT responsible for anything that happens after the trade is done. As well as any duped items. By opening a ticket or requesting a middleman you have agreed to our middleman too.`,
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claim').setLabel('Claim').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('unclaim').setLabel('Unclaim').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
                )
            ]
        });

        await interaction.reply({ content: `Ticket created: ${ticketChannel}`, ephemeral: true });
    }
});

// ----------------- Ticket Buttons -----------------
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    const ticketData = tickets.get(interaction.channel.id);
    if (!ticketData) return;

    // Claim button
    if (interaction.customId === 'claim') {
        if (interaction.user.id !== SPECIAL_USER_ID) return interaction.reply({ content: "Only the main middleman can claim.", ephemeral: true });
        ticketData.claimedBy = interaction.user.id;
        return interaction.reply({ content: `Ticket claimed by <@${interaction.user.id}>`, ephemeral: false });
    }

    // Unclaim button
    if (interaction.customId === 'unclaim') {
        if (interaction.user.id !== ticketData.claimedBy && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) 
            return interaction.reply({ content: "Only the current claimer or admins can unclaim.", ephemeral: true });
        ticketData.claimedBy = null;
        return interaction.reply({ content: "Ticket unclaimed.", ephemeral: false });
    }

    // Close button
    if (interaction.customId === 'close') {
        if (!ticketData.allowedUsers.includes(interaction.user.id) && interaction.user.id !== ticketData.claimedBy) 
            return interaction.reply({ content: "You cannot close this ticket.", ephemeral: true });

        const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
        await logChannel.send(`Ticket closed by <@${interaction.user.id}>. Creator: <@${ticketData.creator}>`);
        await interaction.channel.delete();
        tickets.delete(interaction.channel.id);
    }
});

// ----------------- Ticket Commands ($add, $transfer, $claim, $close) -----------------
client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    const ticketData = tickets.get(message.channel.id);
    if (!ticketData) return;

    const args = message.content.trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // Only allowed users or claimer can type
    if (!ticketData.allowedUsers.includes(message.author.id) && message.author.id !== ticketData.claimedBy) return message.delete().catch(() => {});

    // $add user/id
    if (cmd === '$add') {
        if (message.author.id !== ticketData.creator && message.author.id !== SPECIAL_USER_ID) 
            return message.reply("Only the ticket creator or main middleman can add users.");
        const id = args[0].replace(/[<@!>]/g,'');
        const member = await message.guild.members.fetch(id).catch(() => null);
        if (!member) return message.reply('Invalid user ID.');
        ticketData.allowedUsers.push(member.id);
        await message.channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true });
        return message.reply(`Added <@${member.id}> to the ticket.`);
    }

    // $transfer user/id
    if (cmd === '$transfer') {
        if (message.author.id !== ticketData.claimedBy) return message.reply("Only the current claimer can transfer.");
        const id = args[0].replace(/[<@!>]/g,'');
        ticketData.claimedBy = id;
        return message.reply(`Ticket transferred to <@${id}>.`);
    }

    // $claim
    if (cmd === '$claim') {
        if (message.author.id !== SPECIAL_USER_ID) return message.reply("Only the main middleman can claim.");
        ticketData.claimedBy = message.author.id;
        return message.reply(`Ticket claimed by <@${message.author.id}>.`);
    }

    // $close
    if (cmd === '$close') {
        if (!ticketData.allowedUsers.includes(message.author.id) && message.author.id !== ticketData.claimedBy)
            return message.reply("You cannot close this ticket.");
        const logChannel = await message.guild.channels.fetch(LOG_CHANNEL_ID);
        await logChannel.send(`Ticket closed by <@${message.author.id}>. Creator: <@${ticketData.creator}>`);
        await message.channel.delete();
        tickets.delete(message.channel.id);
    }
});

client.login(process.env.TOKEN);
