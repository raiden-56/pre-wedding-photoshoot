// Starts a real PostgreSQL server locally (no Docker/system install needed) for development.
// Production should point DATABASE_URL at a managed PostgreSQL instance instead.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(".data/postgres");
const port = Number(process.env.LOCAL_PG_PORT ?? 5433);
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "lumiere",
  password: "lumiere_dev",
  port,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
});

const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));
if (fresh) await pg.initialise();
await pg.start();
if (fresh) {
  const client = pg.getPgClient();
  await client.connect();
  await client.query("CREATE DATABASE lumiere ENCODING 'UTF8' TEMPLATE template0");
  await client.end();
}
console.log(`PostgreSQL ready on postgresql://lumiere:lumiere_dev@localhost:${port}/lumiere`);
const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
