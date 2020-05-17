import log from 'electron-log';
import { Builder, By } from 'selenium-webdriver';
// tslint:disable-next-line: no-submodule-imports
import firefox from 'selenium-webdriver/firefox';
import { SUBMIT_LINK } from './constants/constants';
import { Database, LinkObj } from './db/db';
import { loadEnv } from './utils/loadEnv';

// load the environment variables
loadEnv();

// initialize the db
export const db = new Database();

// start the main loop
main();

// main entry point
async function main() {
  await submit();
}

async function submit() {
  const links: LinkObj[] = await db.getUnsubmittedLinks();

  const linkStrs = [];
  for (const link of links) {
    let linkStr = '';
    if (link.title) {
      linkStr += link.title.trim() + '\n';
    }
    if (link.description) {
      linkStr += link.description.trim() + '\n';
    }
    linkStr += link.url.replace('<', '').replace('>', '') + '\n';

    linkStr += `Submitted by ${link.author} on ${new Date(
      link.timestamp
    ).toUTCString()}\n\n`;

    linkStrs.push(linkStr.trim());
  }

  const driver = await getDriver();
  for (const str of linkStrs) {
    await driver.get(SUBMIT_LINK);
    const submitAreas = await driver.findElements(By.tagName('textarea'));
    await submitAreas[0].sendKeys(str);
    await (
      await driver.findElement(
        By.className('appsMaterialWizButtonPaperbuttonLabel')
      )
    ).click();
  }
  await driver.quit();
  await db.setAllSubmitted();
  process.exit(0);
}

async function getDriver(headless: boolean = true) {
  log.debug('Initializing headless browser...');
  const options = new firefox.Options();
  // if (headless) {
  //   options.addArguments('-headless');
  // }
  const driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();
  log.debug('Browser started.');
  return driver;
}
