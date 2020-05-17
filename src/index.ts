import { Channel, Client, Message, TextChannel } from 'discord.js';
import log from 'electron-log';
import { performance } from 'perf_hooks';
import { CHANNEL_ID, GENESIS_MESSAGE_ID } from './constants/constants';
import { Database } from './db/db';
import { loadEnv } from './utils/loadEnv';

// load the environment variables
loadEnv();

// initialize the db
export const db = new Database();

// start the main loop
main();

// main entry point
async function main() {
  await scrape();
}

// scrapes the channel
async function scrape() {
  const client = new Client();
  client.on('ready', async () => {
    const startTime = performance.now();
    log.info(`Logged in as ${client.user!.tag}!`);
    const otChannel: Channel = await client.channels.fetch(CHANNEL_ID);
    const messageManager = (otChannel as TextChannel).messages;
    let topMessage = (await db.getTopMessage()) || GENESIS_MESSAGE_ID;
    let messagesScraped = 0;

    while (true) {
      const messages: any = await messageManager.fetch({
        after: topMessage,
        limit: 50,
      });

      const msgList = [...messages.values()].reverse();

      if (msgList.length === 0) {
        break;
      }

      msgList.map(async (msg: Message) => {
        const { content } = msg;

        const urlMatches = content.match(/\bhttps?:\/\/\S+/gi);

        if (urlMatches) {
          urlMatches.map(async (url) => {
            const linkObj = {
              author: msg.author.username,
              discord_id: msg.id,
              timestamp: msg.createdTimestamp,
              url,
            };
            await db.storeLink(linkObj);
            console.log(linkObj);
          });
        }

        if (msgList.indexOf(msg) === msgList.length - 1) {
          topMessage = msg.id;
          await db.setTopMessage(msg.id);
        }
      });
      messagesScraped += msgList.length;
    }
    const endTime = performance.now();
    log.info(
      'Scraped ' +
        messagesScraped.toString() +
        ' messages in ' +
        ((endTime - startTime) / 1000).toFixed(2) +
        ' seconds'
    );
  });

  client.login(process.env.DISCORD_TOKEN);
}
