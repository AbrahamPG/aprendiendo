import OpenAI from 'openai';

import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';
import type { ResponseInputItem } from 'openai/resources/responses/responses';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const handoffTools = [
  {
    type: 'function' as const,
    name: 'transfer_to_backend_agent',
    description:
      'Transfers the conversation to the backend specialist for NestJS, TypeScript, APIs and backend architecture.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: 'function' as const,
    name: 'transfer_to_database_agent',
    description:
      'Transfers the conversation to the database specialist for PostgreSQL, SQL, transactions and data consistency.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
];

const triageInstructions = `
You are a triage agent.

Decide which specialist should take ownership of the conversation.

- Backend specialist:
  NestJS, TypeScript, APIs and backend architecture.

- Database specialist:
  PostgreSQL, SQL, transactions, indexes and data consistency.

When the request clearly belongs to one specialist, transfer the conversation to that specialist.
Do not answer the user's question yourself.
`;

const backendInstructions = `
You are the backend specialist.

You now own the conversation.
Answer the user's question directly.

Focus on NestJS, TypeScript, APIs and backend architecture.
`;

const databaseInstructions = `
You are the database specialist.

You now own the conversation.
Answer the user's question directly.

Focus on PostgreSQL, SQL, transactions, indexes and data consistency.
`;

async function main() {
  const state: ResponseInputItem[] = [
    {
      role: 'user',
      content:
        '¿Por qué debería usar una transacción de PostgreSQL al crear una orden con varios items?',
    },
  ];

  console.log('\n--- Triage Agent ---');

  const triageResponse = await client.responses.create({
    model: 'openrouter/free',
    instructions: triageInstructions,
    tools: handoffTools,
    input: state,
  });

  console.dir(triageResponse.output, { depth: null });

  state.push(
    ...toResponseInputItems(triageResponse.output),
  );

  const handoff = triageResponse.output.find(
    (item) =>
      item.type === 'function_call' &&
      item.name.startsWith('transfer_to_'),
  );

  if (!handoff || handoff.type !== 'function_call') {
    console.log('\nTriage respondió sin hacer handoff:');
    console.log(triageResponse.output_text);
    return;
  }

  console.log(`\n🔀 Handoff requested: ${handoff.name}`);

  let specialistInstructions: string;

  if (handoff.name === 'transfer_to_backend_agent') {
    specialistInstructions = backendInstructions;
  } else if (
    handoff.name === 'transfer_to_database_agent'
  ) {
    specialistInstructions = databaseInstructions;
  } else {
    throw new Error(
      `Unknown handoff: ${handoff.name}`,
    );
  }

  console.log('\n--- Specialist Agent ---');

  const specialistResponse = await client.responses.create({
    model: 'openrouter/free',
    instructions: specialistInstructions,
    input: state,
  });

  console.log('\nRespuesta final:');
  console.log(specialistResponse.output_text);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});