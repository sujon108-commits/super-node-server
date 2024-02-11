import r from "rethinkdb";

const options = {
  host: process.env.RETHINKDB_HOST || "localhost",
  port: +process.env.RETHINKDB_PORT! || 28015,
  db: process.env.RETHINKDB_DB || "test",
  user: "admin",
  password: "supernode",
};
const rethink = r.connect(options);

rethink.catch(console.log);

export default rethink;
