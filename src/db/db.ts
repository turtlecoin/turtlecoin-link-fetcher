// tslint:disable: variable-name
import chalk from 'chalk';
import log from 'electron-log';
import { EventEmitter } from 'events';
import knex, { Transaction } from 'knex';

// tslint:disable-next-line: interface-over-type-literal
type LinkObj = {
  url: string;
  author: string;
  timestamp: number;
  discord_id: string;
};

export class Database extends EventEmitter {
  public ready: boolean;
  public sql: knex<any, unknown> = knex({
    client: 'sqlite3',
    connection: {
      filename: './db.sqlite',
    },
    useNullAsDefault: true,
  });

  constructor() {
    super();
    this.ready = false;
    this.init();
  }

  public async storeLink(linkObj: LinkObj): Promise<void> {
    try {
      await this.sql('links').insert(linkObj);
    } catch (err) {
      if (err.errno !== 19) {
        throw err;
      }
    }
  }

  public async getTopMessage(): Promise<any> {
    const query = await this.sql('internal').select('topMessage');
    return query[0].topMessage;
  }

  public async setTopMessage(discordID: string) {
    await this.sql('internal').update({ topMessage: discordID });
  }

  private async init(): Promise<void> {
    const tables = await this.sql.raw(
      `SELECT name FROM sqlite_master
       WHERE type='table'
       ORDER BY name;`
    );
    const tableNames = tables.map((table: any) => table.name);

    if (!tableNames.includes('links')) {
      await this.sql.raw(
        `CREATE TABLE "links" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "url" TEXT,
          "author" TEXT,
          "timestamp" INTEGER,
          "discord_id" TEXT UNIQUE,
          "submitted" BOOLEAN DEFAULT false
        );`
      );
    }

    if (!tableNames.includes('internal')) {
      await this.sql.raw(
        `CREATE TABLE "internal" (
          "topMessage" TEXT
        );`
      );

      await this.sql('internal').insert({});
    }

    this.ready = true;
    log.info('Database opened successfully');
  }
}
