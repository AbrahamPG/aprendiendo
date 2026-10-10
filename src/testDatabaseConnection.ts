
import { AppDataSource } from "./data-source.js";

async function main(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("✅ TypeORM conectado a PostgreSQL");

    const result: unknown = await AppDataSource.query(
      "SELECT current_database() AS database, current_user AS username, version() AS version",
    );

    console.log(result);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main().catch((error: unknown) => {
  console.error("❌ Error de conexión:", error);
  process.exitCode = 1;
});
