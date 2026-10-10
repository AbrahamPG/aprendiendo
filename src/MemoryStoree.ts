
import { AppDataSource } from "./data-source.js";
import { createEmbeddings } from "./embeddingService.js";
import type { MemoryType } from "./Memory.js";

type SavedMemory = {
  id: string;
  ownerId: string;
  type: MemoryType;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

type SimilarMemory = {
  id: string;
  ownerId: string;
  type: MemoryType;
  content: string;
  similarity: number;
};

export class MemoryStore {
  async save(
    ownerId: string,
    type: MemoryType,
    content: string,
  ): Promise<SavedMemory> {
    if (!ownerId.trim() || !content.trim()) {
      throw new Error("ownerId y content son obligatorios");
    }

    const [embedding] = await createEmbeddings([content]);

    if (
      !embedding ||
      embedding.length !== 1536 ||
      !embedding.every(Number.isFinite)
    ) {
      throw new Error("Embedding inválido");
    }

    const vector = `[${embedding.join(",")}]`;

    const rows: SavedMemory[] = await AppDataSource.query(
      `
        INSERT INTO memories (owner_id, type, content, embedding)
        VALUES ($1, $2, $3, $4::vector)
        RETURNING
          id,
          owner_id AS "ownerId",
          type,
          content,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [ownerId, type, content, vector],
    );

    const saved = rows[0];

    if (!saved) {
      throw new Error("No se pudo guardar el recuerdo");
    }

    return saved;
  }

  async searchSimilar(
    ownerId: string,
    query: string,
    limit = 5,
  ): Promise<SimilarMemory[]> {
    if (!ownerId.trim() || !query.trim()) {
      throw new Error("ownerId y query son obligatorios");
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw new Error("limit debe ser un entero entre 1 y 20");
    }

    const [embedding] = await createEmbeddings([query]);

    if (!embedding || embedding.length !== 1536) {
      throw new Error("Embedding de consulta inválido");
    }

    const vector = `[${embedding.join(",")}]`;

    const rows: SimilarMemory[] = await AppDataSource.query(
      `
        SELECT
          id,
          owner_id AS "ownerId",
          type,
          content,
          1 - (embedding <=> $1::vector) AS similarity
        FROM memories
        WHERE owner_id = $2
          AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector ASC
        LIMIT $3
      `,
      [vector, ownerId, limit],
    );

    return rows;
  }
}
