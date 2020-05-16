import log from 'electron-log';
import { loadEnv } from './utils/loadEnv';
import { Client } from 'discord.js';

// load the environment variables
loadEnv();
main();

function main() {
  const client = new Client();
  client.on('ready', () => {
    log.info(`Logged in as ${client.user!.tag}!`)
  })
  
  client.login(process.env.DISCORD_TOKEN);
}