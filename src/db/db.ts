// tslint:disable: variable-name
import chalk from 'chalk';
import log from 'electron-log';
import { EventEmitter } from 'events';
import knex, { Transaction } from 'knex';

// tslint:disable-next-line: interface-over-type-literal
export type LinkObj = {
  url: string;
  author: string;
  timestamp: number;
  discord_id: string;
  title: string | null;
  description: string | null;
  original_message: string | null;
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

  public async getUnsubmittedLinks(): Promise<any> {
    const query = await this.sql('links')
      .select()
      .where({ submitted: 0 })
      .orderBy('timestamp', 'asc');

    return query;
  }

  public async getTopMessage(): Promise<any> {
    const query = await this.sql('internal').select('topMessage');
    return query[0].topMessage;
  }

  public async setTopMessage(discordID: string) {
    await this.sql('internal').update({ topMessage: discordID });
  }

  public async setAllSubmitted() {
    await this.sql('links').update({ submitted: 1 });
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
          "submitted" BOOLEAN DEFAULT false,
          "description" TEXT,
          "title" TEXT,
          "original_message" TEXT
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
