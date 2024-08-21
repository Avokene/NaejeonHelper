const fs = require('fs');
const path = require('path');
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('전적')
        .setDescription('플레이어의 전적을 확인합니다.')
        .addUserOption(option => 
            option.setName('유저')
                .setDescription('전적을 확인할 유저를 선택하세요')
                .setRequired(false)),

    async execute(interaction) {
        const playerStatsPath = path.join(__dirname, '../data/playerStats.json');
        if (!fs.existsSync(playerStatsPath)) {
            return interaction.reply({ content: '전적 데이터가 없습니다.', ephemeral: true });
        }

        const playerStats = JSON.parse(fs.readFileSync(playerStatsPath, 'utf-8'));

        const user = interaction.options.getUser('유저') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id);
        const userId = member.id;

        const stats = playerStats[userId];
        if (!stats) {
            return interaction.reply({ content: '이 플레이어의 전적이 없습니다.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${member.displayName}님의 전적`)
            .addFields(
                { name: '승리', value: stats.wins.toString(), inline: true },
                { name: '패배', value: stats.losses.toString(), inline: true },
                { name: '연승/연패', value: `${stats.streak > 0 ? `${stats.streak}연승` : `${-stats.streak}연패`}`, inline: true }
            )
            .setColor('Blue');

        await interaction.reply({ embeds: [embed] });
    }
};
