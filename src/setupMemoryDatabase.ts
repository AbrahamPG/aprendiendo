
import { AppDataSource } from "./data-source.js";

async function main(): Promise<void> {
  await AppDataSource.initialize();

  try {
    // 1. Verificar que pgvector esté habilitado en esta base de datos.
    await AppDataSource.query(
      "CREATE EXTENSION IF NOT EXISTS vector",
    );

    // 2. Crear la tabla de recuerdos.
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS memories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id varchar(100) NOT NULL,
        type varchar(30) NOT NULL,
        content text NOT NULL,
        embedding vector(1536),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // 3. Acelerar el filtrado por propietario.
    await AppDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_owner_id
      ON memories (owner_id)
    `);

    // 4. Índice para búsquedas por similitud coseno.
    await AppDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_embedding
      ON memories USING hnsw (embedding vector_cosine_ops)
    `);

    console.log("✅ Tabla memories preparada");
    console.log("✅ Índices creados o ya existentes");
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error("❌ Error preparando la base de datos:", error);
  process.exitCode = 1;
});
