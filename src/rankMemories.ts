
import { cosineSimilarity } from "./cosineSimilarity.js";

type MemoryCandidate = {
  id: string;
  content: string;
  embedding: number[];
};

export function rankMemories(
  queryEmbedding: number[],
  memories: MemoryCandidate[],
  limit = 3,
) {
  if (limit <= 0) {
    return [];
  }

  return memories
    .map((memory) => ({
      id: memory.id,
      content: memory.content,
      similarity: cosineSimilarity(
        queryEmbedding,
        memory.embedding,
      ),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.floor(limit));
}
