
import { AppDataSource } from "./data-source.js";
import { MemoryStore } from "./MemoryStoree.js";

async function main(): Promise<void> {
  await AppDataSource.initialize();

  try {
    const store = new MemoryStore();

    const ownerId = "restaurant_A";

    const saved = await store.save(
      ownerId,
      "semantic",
      "El propietario prefiere reportes breves de ventas.",
    );

    console.log("\n✅ Recuerdo guardado:");
    console.log(saved);

    const results = await store.searchSimilar(
      ownerId,
      "Hazme un resumen conciso de las ventas.",
      5,
    );

    console.log("\n🧠 Recuerdos recuperados:");

    for (const memory of results) {
      console.log({
        id: memory.id,
        ownerId: memory.ownerId,
        content: memory.content,
        similarity: Number(memory.similarity.toFixed(4)),
      });
    }

    const otherOwnerResults = await store.searchSimilar(
      "restaurant_B",
      "Hazme un resumen conciso de las ventas.",
      5,
    );

    console.log(
      "\n🔐 Resultados para restaurant_B:",
      otherOwnerResults.length,
    );
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main().catch((error: unknown) => {
  console.error("❌ Error en la prueba:", error);
  process.exitCode = 1;
});
