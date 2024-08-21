const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } = require('discord.js');
const fs = require('fs');
const resultChannelId = require('../config.json').resultChannelId;
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('내전종료')
        .setDescription('내전을 종료하고 결과를 기록합니다.')
        .addStringOption(option =>
            option.setName('내전이름')
                .setDescription('종료할 내전의 이름을 입력하세요.')
                .setRequired(true)),

    async execute(interaction) {
        const matchName = interaction.options.getString('내전이름');
        const filePath = path.join(__dirname, '../data/currentMatch.json');

        if (!fs.existsSync(filePath)) {
            return interaction.reply({ content: '진행 중인 내전이 없습니다.', ephemeral: true });
        }

        let matchData;
        try {
            matchData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (err) {
            console.error('Error reading match data:', err);
            return interaction.reply({ content: '내전 데이터를 불러오는 중 오류가 발생했습니다.', ephemeral: true });
        }

        if (matchData.matchName !== matchName) {
            return interaction.reply({ content: `내전 이름 '${matchName}'에 해당하는 내전이 없습니다.`, ephemeral: true });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('team1_win')
                    .setLabel('팀 1 승리')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('team2_win')
                    .setLabel('팀 2 승리')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            content: `내전 '${matchName}'의 승리 팀을 선택하세요:`,
            components: [row],
            ephemeral: true
        });

        const filter = i => i.customId === 'team1_win' || i.customId === 'team2_win';
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'team1_win') {
                await handleMatchEnd(i, 'team1', matchData, filePath, interaction);
            } else if (i.customId === 'team2_win') {
                await handleMatchEnd(i, 'team2', matchData, filePath, interaction);
            }
            collector.stop();
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.followUp({ content: '시간이 초과되어 승리 팀 선택이 취소되었습니다.', ephemeral: true });
            }
        });
    }
};

async function handleMatchEnd(interaction, winningTeam, matchData, filePath, originalInteraction) {
    const playerStatsPath = path.join(__dirname, '../data/playerStats.json');
    const playerStats = fs.existsSync(playerStatsPath) ? JSON.parse(fs.readFileSync(playerStatsPath, 'utf-8')) : {};

    const updateStats = (team, isWinner) => {
        team.forEach(playerId => {
            if (!playerStats[playerId]) {
                playerStats[playerId] = { wins: 0, losses: 0, streak: 0 };
            }
            if (isWinner) {
                playerStats[playerId].wins += 1;
                playerStats[playerId].streak = playerStats[playerId].streak > 0 ? playerStats[playerId].streak + 1 : 1;
            } else {
                playerStats[playerId].losses += 1;
                playerStats[playerId].streak = playerStats[playerId].streak < 0 ? playerStats[playerId].streak - 1 : -1;
            }
        });
    };

    let winner, loser;

    if (winningTeam === 'team1') {
        updateStats(matchData.team1, true);
        updateStats(matchData.team2, false);
        winner = matchData.team1.map(id => `<@${id}>`).join(', ');
        loser = matchData.team2.map(id => `<@${id}>`).join(', ');
    } else {
        updateStats(matchData.team2, true);
        updateStats(matchData.team1, false);
        winner = matchData.team2.map(id => `<@${id}>`).join(', ');
        loser = matchData.team1.map(id => `<@${id}>`).join(', ');
    }

    fs.writeFileSync(playerStatsPath, JSON.stringify(playerStats, null, 2), 'utf-8');
    fs.unlinkSync(filePath);

    const embed = new EmbedBuilder()
        .setTitle(`내전 결과: ${matchData.matchName}`)
        .setDescription('내전이 종료되었습니다!')
        .addFields(
            { name: '승리 팀', value: winner, inline: true },
            { name: '패배 팀', value: loser, inline: true }
        )
        .setFooter({ text: `종료 날짜: ${new Date().toLocaleString()}` })
        .setColor(Colors.Green);

    const resultChannel = originalInteraction.guild.channels.cache.get(resultChannelId);
    if (resultChannel) {
        await resultChannel.send({ embeds: [embed] });
        await interaction.update({ content: `내전 종료! '${matchData.matchName}'의 결과가 ${resultChannel.name} 채널에 기록되었습니다.`, components: [], ephemeral: false });
    } else {
        await interaction.update({ content: '결과를 기록할 채널을 찾을 수 없습니다. 올바른 채널 ID를 설정했는지 확인하세요.', components: [], ephemeral: true });
    }
}