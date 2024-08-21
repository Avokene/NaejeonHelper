const config = require('../config.json');

module.exports = async (client, message) => {
    if (!message.content.startsWith(config.prefix) || message.author.bot) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (command) {
        try {
            await command.execute(client, message, args);
        } catch (error) {
            console.error(error);
            message.reply('명령을 실행하는 도중 오류가 발생했습니다.');
        }
    }
};
