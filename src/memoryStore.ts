
type MemoryType = "conversation" | "episodic" | "semantic" | "procedural";


type Memory = {
  id: string;
  ownerId: string;
  type: MemoryType;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  category: "preference" | "incident" | "general";
};

class MemoryStore {
  private memories = new Map<string, Memory>();

  save(memory: Memory): void {
    if (this.memories.has(memory.id)) {
      throw new Error("Ese recuerdo ya existe");
    }

    this.memories.set(memory.id, memory);
  }

  getByOwner(ownerId: string): Memory[] {
    return [...this.memories.values()].filter(
      (memory) => memory.ownerId === ownerId,
    );
  }

  

searchByKeyword(
  ownerId: string,
  keyword: string,
  limit = 5,
): Memory[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword || limit <= 0) {
    return [];
  }

  return [...this.memories.values()]
    .filter(
      (memory) =>
        memory.ownerId === ownerId &&
        memory.content.toLowerCase().includes(normalizedKeyword),
    )
    .slice(0, Math.floor(limit));
}


getByOwnerAndType(
  ownerId: string,
  type: MemoryType,
): Memory[] {
  return [...this.memories.values()].filter(
    (memory) =>
      memory.ownerId === ownerId &&
      memory.type === type,
  );
}


getPrioritizedByTask(
  ownerId: string,
  task: MemoryTask,
  limit = 5,
): Memory[] {
  if (limit <= 0) {
    return [];
  }

  const candidates = [...this.memories.values()]
    .filter((memory) => memory.ownerId === ownerId)
    .map((memory) => {
      const content = memory.content.toLowerCase();
      let score = 0;

      if (task === "sales_report") {
        if (
          memory.category === "preference" &&
          /reporte|reportes|ventas/.test(content)
        ) {
          score = 3;
        } else if (memory.category === "preference") {
          score = 1;
        }
      }

      if (task === "billing_investigation") {
        if (
          memory.category === "incident" &&
          /factura|facturación|envío/.test(content)
        ) {
          score = 3;
        } else if (memory.category === "incident") {
          score = 1;
        }
      }

      return { memory, score };
    });

  return candidates
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.floor(limit))
    .map((candidate) => candidate.memory);
}

  update(id: string, newContent: string): Memory {
    const memory = this.memories.get(id);

    if (!memory) {
      throw new Error("Recuerdo no encontrado");
    }

    const updatedMemory: Memory = {
      ...memory,
      content: newContent,
      updatedAt: new Date(),
    };

    this.memories.set(id, updatedMemory);

    return updatedMemory;
  }
}
type MemoryTask =
  | "sales_report"
  | "billing_investigation";

const store = new MemoryStore();

store.save({
  id: "mem_001",
  ownerId: "restaurant_A",
  type: "semantic",
  content: "Prefiere reportes breves",
  createdAt: new Date(),
  updatedAt: new Date(),
  category: "preference"
});

store.save({
  id: "mem_002",
  ownerId: "restaurant_B",
  type: "semantic",
  content: "Prefiere reportes detallados",
  createdAt: new Date(),
  updatedAt: new Date(),
  category: "preference"

});

console.log("Recuerdos del restaurante A:");
console.log(store.getByOwner("restaurant_A"));

store.update("mem_001", "Prefiere reportes detallados");

console.log("Después de actualizar:");
console.log(store.getByOwner("restaurant_A"));


console.log(
  "Búsqueda en restaurante A:",
  store.searchByKeyword("restaurant_A", "reportes"),
);

console.log(
  "Búsqueda en restaurante B:",
  store.searchByKeyword("restaurant_B", "reportes"),
);

console.log(
  "Búsqueda de factura en restaurante A:",
  store.searchByKeyword("restaurant_A", "factura"),
);

console.log(
  "Preferencias del restaurante A:",
  store.getByOwnerAndType("restaurant_A", "semantic"),
);

console.log(
  store.searchByKeyword("restaurant_A", "reportes", 1),
);

console.log(
  "Para reporte de ventas:",
  store.getPrioritizedByTask("restaurant_A", "sales_report", 3),
);

console.log(
  "Para investigar facturación:",
  store.getPrioritizedByTask(
    "restaurant_A",
    "billing_investigation",
    3,
  ),
);