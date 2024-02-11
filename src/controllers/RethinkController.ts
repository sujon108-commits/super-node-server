import r from "rethinkdb";
import rethink from "../database/rethinkdb";
import { tables } from "../utils/rethink-tables";
export default class RethinkController {
  constructor() {
    this.init();
  }

  async init() {
    const tableList = await r
      .db(process.env.RETHINKDB_DB!)
      .tableList()
      .run(await rethink);

    if (!tableList.includes(tables.matches)) {
      await this.useDb
        .tableCreate(tables.matches)
        .run(await rethink)
        .then((res) => console.log(res))
        .catch((err) => console.error(err));
    }

    if (!tableList.includes(tables.markets)) {
      await this.useDb
        .tableCreate(tables.markets)
        .run(await rethink)
        .then((res) => console.log(res))
        .catch((err) => console.error(err));
    }
    if (!tableList.includes(tables.fancies)) {
      await this.useDb
        .tableCreate(tables.fancies)
        .run(await rethink)
        .then((res) => console.log(res))
        .catch((err) => console.error(err));
    }
  }

  get useDb() {
    return r.db(process.env.RETHINKDB_DB!);
  }
}
