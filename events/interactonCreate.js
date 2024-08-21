const fs = require('fs');
const path = require('path');

module.exports = async (client, interaction) => {
    if (!interaction.isButton()) return;

    await interaction.deferReply({ ephemeral: true });

    const filePath = path.join(__dirname, '../data/currentMatch.json');

    // 파일이 존재하지 않으면 오류 메시지 전송
    if (!fs.existsSync(filePath)) {
        return interaction.editReply({ content: '진행 중인 내전이 없습니다.' });
    }

    let matchData;
    try {
        matchData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
        console.error('Error reading match data:', err);
        return interaction.editReply({ content: '내전 데이터를 불러오는 중 오류가 발생했습니다.' });
    }

    try {
        if (interaction.customId === 'join_team1') {
            if (matchData.team1.includes(interaction.user.id)) {
                return interaction.editReply({ content: '이미 이 팀에 참가했습니다.' });
            }
            if (matchData.team2.includes(interaction.user.id)) {
                return interaction.editReply({ content: '이미 다른 팀에 참가했습니다.' });
            }
            matchData.team1.push(interaction.user.id);
        } else if (interaction.customId === 'join_team2') {
            if (matchData.team2.includes(interaction.user.id)) {
                return interaction.editReply({ content: '이미 이 팀에 참가했습니다.' });
            }
            if (matchData.team1.includes(interaction.user.id)) {
                return interaction.editReply({ content: '이미 다른 팀에 참가했습니다.' });
            }
            matchData.team2.push(interaction.user.id);
        } else {
            return interaction.editReply({ content: '알 수 없는 상호작용입니다.' });
        }

        // 업데이트된 데이터를 파일에 저장
        fs.writeFileSync(filePath, JSON.stringify(matchData, null, 2), 'utf-8');

        return interaction.editReply({ content: `팀에 참가했습니다!` });
    } catch (err) {
        console.error('Error updating match data:', err);
        return interaction.editReply({ content: '팀에 참가하는 중 오류가 발생했습니다.' });
    }
};
