import log from "electron-log";
import { Builder, By } from "selenium-webdriver";
// tslint:disable-next-line: no-submodule-imports
import firefox from "selenium-webdriver/firefox";
import { SUBMIT_LINK } from "./constants/constants";
import { LinkObj } from "./db/db";
import { db } from "./main";
import { sleepTime } from "./scrape";
import { sleep } from "./utils/sleep";

export async function submit() {
  while (true) {
    const links: LinkObj[] = await db.getUnsubmittedLinks();

    if (links.length === 0) {
      console.log("No new links in database, sleeping.");
      await sleep(sleepTime);
      continue;
    }

    const linkStrs = [];
    for (const link of links) {
      let linkStr = "";
      if (link.title) {
        linkStr += link.title.trim() + "\n";
      }
      if (link.description) {
        linkStr += link.description.trim() + "\n";
      }
      linkStr += link.url.replace("<", "").replace(">", "") + "\n";

      linkStr += `Submitted by ${link.author} on ${new Date(
        link.timestamp
      ).toUTCString()}\n\n`;

      linkStrs.push(linkStr.trim());
    }

    const driver = await getDriver();
    for (const str of linkStrs) {
      await driver.get(SUBMIT_LINK);
      const submitAreas = await driver.findElements(By.tagName("textarea"));
      await submitAreas[0].sendKeys(cleanString(str));
      await (
        await driver.findElement(
          By.className("appsMaterialWizButtonPaperbuttonLabel")
        )
      ).click();
      console.log("successfully submitted " + str);
    }
    await driver.quit();
    await db.setAllSubmitted();
  }
}

async function getDriver(headless: boolean = true) {
  log.debug("Initializing headless browser...");
  const options = new firefox.Options();
  if (headless) {
    options.addArguments("-headless");
  }
  const driver = await new Builder()
    .forBrowser("firefox")
    .setFirefoxOptions(options)
    .build();
  log.debug("Browser started.");
  return driver;
}

function cleanString(s: string) {
  let output = "";
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) <= 127) {
      output += s.charAt(i);
    }
  }
  return output;
}
