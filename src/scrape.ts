import ax from "axios";
import { Channel, Client, Message, TextChannel } from "discord.js";
import log from "electron-log";
import { JSDOM, VirtualConsole } from "jsdom";
import { performance } from "perf_hooks";
// tslint:disable-next-line: no-submodule-imports
import { CHANNEL_ID, GENESIS_MESSAGE_ID } from "./constants/constants";
import { db } from "./main";
import { loadEnv } from "./utils/loadEnv";
import { sleep } from "./utils/sleep";

export const sleepTime = 1000 * 60 * 1;

// load the environment variables
loadEnv();
// scrapes the channel
export async function scrape() {
  const client = new Client();
  client.on("ready", async () => {
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
        // console.log("No messages found, sleeping.");
        await sleep(sleepTime);
        continue;
      }

      await msgList.map(async (msg: Message) => {
        const { content } = msg;

        const urlMatches = content.match(/\bhttps?:\/\/\S+/gi);

        if (urlMatches) {
          urlMatches.map(async (url) => {
            let title: string | null = null;
            let description: string | null = null;

            console.log("Found a new link! Fetching " + url);

            try {
              const res = await ax.get(url);
              const virtualConsole = new VirtualConsole();
              const dom = new JSDOM(res.data, { virtualConsole });

              const titles = dom.window.document.getElementsByTagName("title");
              if (titles.length > 0) {
                title = titles[0].textContent;
              }

              const metas = dom.window.document.getElementsByTagName("meta");
              for (const meta of metas) {
                if (meta.getAttribute("name") === "description") {
                  description = meta.getAttribute("content");
                }
              }

              if (!description) {
                for (const meta of metas) {
                  if (meta.getAttribute("property") === "og:description") {
                    description = meta.getAttribute("content");
                  }
                }
              }

              if (!title) {
                for (const meta of metas) {
                  if (meta.getAttribute("property") === "og:title") {
                    description = meta.getAttribute("content");
                  }
                }
              }
            } catch (err) {
              // console.log(err);
            }

            const linkObj = {
              author: msg.author.username,
              description,
              discord_id: msg.id,
              original_message: content === url ? null : content,
              timestamp: msg.createdTimestamp,
              title,
              url,
            };
            console.log(linkObj);
            await db.storeLink(linkObj);
          });
        }

        if (msgList.indexOf(msg) === msgList.length - 1) {
          topMessage = msg.id;
          await db.setTopMessage(msg.id);
        }
      });
      messagesScraped += msgList.length;
    }
  });

  client.on("disconnect", scrape);

  client.login(process.env.DISCORD_TOKEN);
}
