import { Database } from "./db/db";
import { scrape } from "./scrape";
import { submit } from "./submit";
import { loadEnv } from "./utils/loadEnv";

export const db = new Database();

// load the environment variables
loadEnv();

async function main() {
  scrape();
  submit();
}

main();
