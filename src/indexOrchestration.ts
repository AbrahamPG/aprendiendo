import OpenAI from 'openai';

import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';
import type { ResponseInputItem } from 'openai/resources/responses/responses';

import {
  backendAgent,
  databaseAgent,
} from './agents.js';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

type ToolHandler = (
  argumentsJson: string,
) => unknown | Promise<unknown>;

const toolRegistry: Record<string, ToolHandler> = {
  ask_backend_agent: async (argumentsJson) => {
    const args = JSON.parse(argumentsJson) as {
      task: string;
    };

    return backendAgent(args.task);
  },

  ask_database_agent: async (argumentsJson) => {
    const args = JSON.parse(argumentsJson) as {
      task: string;
    };

    return databaseAgent(args.task);
  },
};

const tools = [
  {
    type: 'function' as const,
    name: 'ask_backend_agent',
    description:
      'Delegates a task to a backend specialist.',
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description:
            'The task that the backend specialist must solve.',
        },
      },
      required: ['task'],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: 'function' as const,
    name: 'ask_database_agent',
    description:
      'Delegates a task to a database specialist.',
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description:
            'The task that the database specialist must solve.',
        },
      },
      required: ['task'],
      additionalProperties: false,
    },
    strict: true,
  },
];

async function main() {
  const state: ResponseInputItem[] = [
    {
      role: 'user',
      content: `
You are the manager agent.

The user wants help with this task:

"Should we use PostgreSQL transactions when creating an order that contains multiple order items?"

Choose the appropriate specialists.
If the question needs both backend and database expertise,
consult both specialists and combine their answers into one final response.
`,
    },
  ];

  const maxSteps = 5;

  for (let step = 1; step <= maxSteps; step++) {
    console.log(`\n--- Manager step ${step} ---`);

    const response = await client.responses.create({
      model: 'openrouter/free',
      tools,
      input: state,
    });

    state.push(...toResponseInputItems(response.output));

    const toolCalls = response.output.filter(
      (item) => item.type === 'function_call',
    );

    if (toolCalls.length === 0) {
      console.log('\nRespuesta final:');
      console.log(response.output_text);
      break;
    }

    const results = await Promise.all(
  toolCalls.map(async (toolCall) => {
    console.log(`\nDelegating: ${toolCall.name}`);
    console.log(`Arguments: ${toolCall.arguments}`);

    const tool = toolRegistry[toolCall.name];

    if (!tool) {
      return {
        callId: toolCall.call_id,
        result: {
          error: `Unknown tool: ${toolCall.name}`,
        },
      };
    }

    try {
      const result = await tool(toolCall.arguments);

      console.log(`\n${toolCall.name} result:`);
      console.log(result);

      return {
        callId: toolCall.call_id,
        result,
      };
    } catch (error) {
      return {
        callId: toolCall.call_id,
        result: {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      };
    }
  }),
);

for (const item of results) {
  state.push({
    type: 'function_call_output',
    call_id: item.callId,
    output: JSON.stringify(item.result),
  });
}
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});