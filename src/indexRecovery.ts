import OpenAI from 'openai';
import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';
import type { ResponseInputItem } from 'openai/resources/responses/responses';
import { searchStudentBackup, searchStudentPrimary } from './toolRecovery.js';


const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

type ToolHandler = (
  argumentsJson: string,
) => unknown | Promise<unknown>;

const toolRegistry: Record<string, ToolHandler> = {
  search_student_primary: (argumentsJson) => {
    const args = JSON.parse(argumentsJson) as {
      name: string;
    };

    return searchStudentPrimary(args.name);
  },

  search_student_backup: (argumentsJson) => {
    const args = JSON.parse(argumentsJson) as {
      name: string;
    };

    return searchStudentBackup(args.name);
  },
};

const tools = [
  {
    type: 'function' as const,
    name: 'search_student_primary',
    description:
      'Searches for a student using the primary student database.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The student name.',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: 'function' as const,
    name: 'search_student_backup',
    description:
      'Searches for a student using a backup data source. Use this if the primary search fails.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The student name.',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
    strict: true,
  },
];

async function main() {
  const state: ResponseInputItem[] = [
    {
      role: 'user',
      content:
        'Find Cody and tell me his email. If the primary search fails, use another available strategy.',
    },
  ];

  const maxSteps = 5;

  for (let step = 1; step <= maxSteps; step++) {
    console.log(`\n--- Agent step ${step} ---`);

    const response = await client.responses.create({
      model: 'openrouter/free',

      tools,

      tool_choice:
        step === 1
          ? {
              type: 'function',
              name: 'search_student_primary',
            }
          : 'auto',

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

    for (const toolCall of toolCalls) {
      console.log(`Tool requested: ${toolCall.name}`);
      console.log(`Arguments: ${toolCall.arguments}`);

      const tool = toolRegistry[toolCall.name];

      if (!tool) {
        state.push({
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify({
            error: `Unknown tool: ${toolCall.name}`,
          }),
        });

        continue;
      }

      try {
        const result = await tool(toolCall.arguments);

        state.push({
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(result),
        });

        console.log('Tool result:', result);
      } catch (error) {
        const errorResult = {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        };

        console.log('Tool failed:', errorResult);

        state.push({
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(errorResult),
        });
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});