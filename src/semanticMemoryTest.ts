
import { createEmbeddings } from "./embeddingService.js";
import { rankMemories } from "./rankMemories.js";

async function main() {
  const memories = [
    {
      id: "mem_001",
      ownerId: "restaurant_A",
      content: "El propietario prefiere reportes breves.",
    },
    {
      id: "mem_002",
      ownerId: "restaurant_A",
      content: "El sistema tuvo un error al enviar una factura.",
    },
    {
      id: "mem_003",
      ownerId: "restaurant_B",
      content: "El propietario prefiere reportes detallados.",
    },
  ];

  const query = "Hazme un resumen conciso de las ventas.";
  const ownerId = "restaurant_A";

  // 1. Solo consideramos recuerdos del propietario autorizado.
  const authorizedMemories = memories.filter(
    (memory) => memory.ownerId === ownerId,
  );

  // 2. Generamos embeddings para los recuerdos y la consulta.
  const texts = [
    ...authorizedMemories.map((memory) => memory.content),
    query,
  ];

  const embeddings = await createEmbeddings(texts);

  // 3. Separamos los vectores de los recuerdos y de la consulta.
  const queryEmbedding = embeddings[embeddings.length - 1];

  if (!queryEmbedding) {
    throw new Error("No se generó el embedding de la consulta");
  }

  const memoriesWithEmbeddings = authorizedMemories.map(
    (memory, index) => {
      const embedding = embeddings[index];

      if (!embedding) {
        throw new Error(`Falta el embedding de ${memory.id}`);
      }

      return {
        id: memory.id,
        content: memory.content,
        embedding,
      };
    },
  );

  // 4. Ordenamos los recuerdos por similitud semántica.
  const results = rankMemories(
    queryEmbedding,
    memoriesWithEmbeddings,
    3,
  );

  console.log("\nConsulta:", query);
  console.log("\nRecuerdos recuperados:");

  for (const result of results) {
    console.log({
      id: result.id,
      content: result.content,
      similarity: result.similarity.toFixed(4),
    });
  }
}

main().catch(console.error);
