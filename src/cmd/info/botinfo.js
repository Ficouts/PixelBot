const os = require('os');
const getConnection = require('../../functions/database/connectDatabase');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const version = require('../../config/config');
const wsversion = require('../../config/webconfig');
const axios = require('axios');
const github_info = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Retrieve Bot Information'),
    usage: '',
    async execute(interaction, client) {
      const userId = interaction.member.user.id;
      const guildId = interaction.guild?.id;
      
      const connection = await getConnection();
      const [cfgMiscRows] = await connection.query("SELECT * FROM cfg_misc WHERE guild_id = ?", [guildId]);
      const [userColorRow] = await connection.query("SELECT * FROM user_config WHERE user_id = ? AND guild_id = ?", [userId, guildId]);
      const [rows] = await connection.query('SELECT VERSION() AS version');
      const databaseVersion = rows[0].version.replace(/-.*$/, '');
      
      const defaultColor = cfgMiscRows[0].mastercolor;
      const userColor = userColorRow[0].usercolor;
      let embedColor;
        
      if (!userColor) {
        embedColor = defaultColor;
      } else if (userColor) {
        embedColor = userColor;
      }
    
      connection.release();
    try {
      const uptime = formatTime(process.uptime());
      const usedMemory = formatBytes(process.memoryUsage().heapUsed);
      const totalMemory = formatBytes(os.totalmem());
      const freeMemory = formatBytes(os.freemem());
      const cpuUsageMicroSeconds = process.cpuUsage().user;
      const cpuUsageSeconds = cpuUsageMicroSeconds / 1000000; // Convert to seconds
      const cpuUsagePercentage = (cpuUsageSeconds / process.uptime()) * 100;
      const formattedCpuUsage = formatPercentage(cpuUsagePercentage);
      const nodeVersion = process.versions.node;
      const libraryName = 'Discord.JS';
      const libraryVersion = require('discord.js/package.json').version;
      const runtimeVersion = process.version;
      const botversion = version.version.version;
      const websocket_version = wsversion.websocket_version;
      const github_owner = github_info.github.repo_owner;
      const github_repo = github_info.github.repo_name;
      const github_branch = github_info.github.branch_name;
      const buildversion = await getLatestBranchVersion(github_owner, github_repo, github_branch)

      const embed = new EmbedBuilder()
        .setTitle('Bot Information')
        .addFields({name: 'Runtime', value: `Node ${runtimeVersion}`, inline: true})
        .addFields({name: 'Language', value: `Node.js ${nodeVersion}`, inline: true})
        .addFields({name: 'Library', value: `${libraryName} v${libraryVersion}`, inline: true})
        .addFields({name: 'Software Revision', value: `Client Version:\n**v${botversion} *(${buildversion})***\nNetwork Stack Version:\n**v${websocket_version}**`, inline: true})
        .addFields({name: 'Uptime', value: `${uptime}`, inline: true})
        .addFields({name: 'CPU Usage:', value: `${formattedCpuUsage}`, inline: true})
        .addFields({name: 'Memory Usage:', value: `${usedMemory}/${totalMemory}`, inline: true})
        .addFields({name: 'Database Software', value: 'MySQL', inline: true}) // You can change this to the actual database software used
        .addFields({name: 'Database Version', value: `v${databaseVersion}`, inline: true}) // Retrieve the MongoDB version
        .setThumbnail(client.user?.displayAvatarURL())
        .setTimestamp()
        .setColor(embedColor);

      interaction.reply({ embeds: [embed] });
    } catch(error) {
      console.error(error);
    }
  }
};

// Helper functions to format data
function formatTime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsOnly = Math.floor(seconds % 60);
  if ((days, hours, minutes) < 1) {
    return `${secondsOnly} Seconds`;
  } else if ((days, hours) < 1) {
    return `${minutes} Minutes, ${secondsOnly} Seconds`;
  } else if (days < 1) {
    return `${hours} Hours, ${minutes} Minutes, ${secondsOnly} Seconds`;
  } else {
    return `${days} Days, ${hours} Hours, ${minutes} Minutes, ${secondsOnly} Seconds`;
  }
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${Math.round(bytes * 10) / 10} ${units[i]}`;
}

function formatPercentage(number) {
  return `${Math.round(number * 100) / 100}%`;
}

async function getLatestBranchVersion(owner, repo, branch) {
  const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`);
  return response.data.commit.sha.substring(0, 7);
}