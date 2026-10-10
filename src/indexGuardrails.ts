import OpenAI from 'openai';
import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';
import type { ResponseInputItem } from 'openai/resources/responses/responses';

import { deleteStudent } from './toolsGuardrails.js';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

type ToolHandler = (
  argumentsJson: string,
) => unknown | Promise<unknown>;

type ToolGuardrail = (
  argumentsJson: string,
) => {
  allowed: boolean;
  reason?: string;
};

const toolRegistry: Record<string, ToolHandler> = {
  delete_student: (argumentsJson) => {
    const args = JSON.parse(argumentsJson) as {
      studentId: number;
    };

    return deleteStudent(args.studentId);
  },
};

const toolGuardrails: Record<string, ToolGuardrail> = {
  delete_student: (argumentsJson) => {
    const args = JSON.parse(argumentsJson) as {
      studentId: number;
    };

    if (args.studentId !== 123) {
      return {
        allowed: false,
        reason: `You are not allowed to delete student ${args.studentId}.`,
      };
    }

    return {
      allowed: true,
    };
  },
};

const tools = [
  {
    type: 'function' as const,
    name: 'delete_student',
    description: 'Deletes a student by id.',
    parameters: {
      type: 'object',
      properties: {
        studentId: {
          type: 'number',
          description: 'The student id.',
        },
      },
      required: ['studentId'],
      additionalProperties: false,
    },
    strict: true,
  },
];

async function main() {
  const state: ResponseInputItem[] = [
    {
      role: 'user',
      content: 'Delete student 123.',
    },
  ];

  const response = await client.responses.create({
    model: 'openrouter/free',
    tools,

    tool_choice: {
      type: 'function',
      name: 'delete_student',
    },

    input: state,
  });

  state.push(...toResponseInputItems(response.output));

  for (const toolCall of response.output) {
    if (toolCall.type !== 'function_call') {
      continue;
    }

    console.log(`Tool requested: ${toolCall.name}`);
    console.log(`Arguments: ${toolCall.arguments}`);

    const guardrail = toolGuardrails[toolCall.name];

    if (guardrail) {
      const guardrailResult = guardrail(toolCall.arguments);

      if (!guardrailResult.allowed) {
        console.log('🛡️ BLOCKED:', guardrailResult.reason);

        state.push({
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify({
            error: guardrailResult.reason,
          }),
        });

        continue;
      }
    }

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

    const result = await tool(toolCall.arguments);

    state.push({
      type: 'function_call_output',
      call_id: toolCall.call_id,
      output: JSON.stringify(result),
    });
  }

  const finalResponse = await client.responses.create({
    model: 'openrouter/free',
    tools,
    input: state,
  });

  console.log('\nRespuesta final:');
  console.log(finalResponse.output_text);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});