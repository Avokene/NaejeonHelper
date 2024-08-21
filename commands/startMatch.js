const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('내전개설')
        .setDescription('내전을 개설하고 팀장을 지정합니다.')
        .addStringOption(option =>
            option.setName('내전이름')
                .setDescription('내전의 이름을 설정합니다.')
                .setRequired(true))
        .addUserOption(option => 
            option.setName('팀장1')
                .setDescription('첫 번째 팀장')
                .setRequired(true))
        .addUserOption(option => 
            option.setName('팀장2')
                .setDescription('두 번째 팀장')
                .setRequired(true)),

    async execute(interaction) {
        const matchName = interaction.options.getString('내전이름');
        const teamLeader1 = interaction.options.getUser('팀장1');
        const teamLeader2 = interaction.options.getUser('팀장2');

        const member1 = await interaction.guild.members.fetch(teamLeader1.id);
        const member2 = await interaction.guild.members.fetch(teamLeader2.id);

        const displayName1 = member1.displayName;
        const displayName2 = member2.displayName;

        const matchId = Date.now();

        const matchData = {
            matchId: matchId,
            matchName: matchName,
            team1: [teamLeader1.id], // 팀장 ID를 포함
            team2: [teamLeader2.id], // 팀장 ID를 포함
            teamLeader1: displayName1,
            teamLeader2: displayName2,
            status: 'in progress'
        };

        const filePath = path.join(__dirname, '../data/currentMatch.json');
        fs.writeFileSync(filePath, JSON.stringify(matchData, null, 2), 'utf-8');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('join_team1')
                    .setLabel(`${displayName1}팀 참가`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('join_team2')
                    .setLabel(`${displayName2}팀 참가`)
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            content: `내전 '${matchName}'이 시작되었습니다! 아래 버튼을 눌러 팀에 참가하세요.\n\n팀장 1: **${displayName1}**\n팀장 2: **${displayName2}**`,
            components: [row]
        });

        // Collector 설정
        const filter = i => i.customId === 'join_team1' || i.customId === 'join_team2';
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 }); // 60초 동안 수집

        collector.on('collect', async i => {
            let matchData;
            try {
                matchData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch (err) {
                console.error('Error reading match data:', err);
                return i.reply({ content: '내전 데이터를 불러오는 중 오류가 발생했습니다.', ephemeral: true });
            }

            try {
                if (i.customId === 'join_team1') {
                    if (matchData.team1.includes(i.user.id)) {
                        return i.reply({ content: '이미 이 팀에 참가했습니다.', ephemeral: true });
                    }
                    if (matchData.team2.includes(i.user.id)) {
                        return i.reply({ content: '이미 다른 팀에 참가했습니다.', ephemeral: true });
                    }
                    matchData.team1.push(i.user.id);
                } else if (i.customId === 'join_team2') {
                    if (matchData.team2.includes(i.user.id)) {
                        return i.reply({ content: '이미 이 팀에 참가했습니다.', ephemeral: true });
                    }
                    if (matchData.team1.includes(i.user.id)) {
                        return i.reply({ content: '이미 다른 팀에 참가했습니다.', ephemeral: true });
                    }
                    matchData.team2.push(i.user.id);
                }

                // 업데이트된 데이터를 파일에 저장
                fs.writeFileSync(filePath, JSON.stringify(matchData, null, 2), 'utf-8');

                await i.reply({ content: `팀에 참가했습니다!`, ephemeral: true });

                // 팀이 5명에 도달했을 때 알림
                if (matchData.team1.length === 5) {
                    await interaction.followUp({ content: '팀 1이 5명으로 가득 찼습니다!' });
                } else if (matchData.team2.length === 5) {
                    await interaction.followUp({ content: '팀 2가 5명으로 가득 찼습니다!' });
                }
                
            } catch (err) {
                console.error('Error updating match data:', err);
                return i.reply({ content: '팀에 참가하는 중 오류가 발생했습니다.', ephemeral: true });
            }
        });

        collector.on('end', collected => {
            console.log(`Collected ${collected.size} interactions.`);
        });
    }
};
