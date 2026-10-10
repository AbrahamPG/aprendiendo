import OpenAI from 'openai';
import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';

import {
  getStudentInfo,
  getStudentCourses,
} from './tools.js';
import type { ResponseInputItem } from 'openai/resources/responses/responses.js';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

type AgentState = {
    input: ResponseInputItem[],
    step: number,
    maxSteps: number,
}


type ToolHandler = (argumentsJson: string)=> unknown | Promise<unknown>


const toolRegistry : Record<string, ToolHandler> = {

    get_student_info:()=>{
        return getStudentInfo()
    },

    get_student_courses:(argumentsJson)=>{
        const args = JSON.parse(argumentsJson) as {
            studentId: number
        }

        return getStudentCourses(args.studentId)
    }
}


const tools = [
  {
    type: 'function' as const,
    name: 'get_student_info',
    description: 'Returns the student id, name, and university.',
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
    name: 'get_student_courses',
    description:
      'Returns the courses for a student. Use the student id obtained from get_student_info.',
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




async function executeToolWithRetry(
  tool: ToolHandler,
  argumentsJson: string,
  maxRetries = 1,
) {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await tool(argumentsJson);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.log(
        `Tool attempt ${attempt} failed: ${message}`,
      );

      if (attempt <= maxRetries) {
        console.log('Retrying tool...');
        continue;
      }

      throw error;
    }
  }

  throw new Error('Unexpected retry state');
}














async function main() {
  const state: AgentState = {
    input: [
      {
        role: 'user',
        content: '¿Cuál es mi universidad y qué cursos estoy llevando?',
      },
    ],
    step: 0,
    maxSteps: 6,
  };

  const callCounts = new Map<string, number>()

  for (state.step = 1; state.step <= state.maxSteps; state.step++) {
    console.log(`\n--- Agent step ${state.step} ---`);

    const response = await client.responses.create({
      model: 'openrouter/free',
      tools,
      input: state.input,
    });

    state.input.push(...toResponseInputItems(response.output));

    const toolCalls = response.output.filter(
      (item) => item.type === 'function_call',
    );

    // 🟢 STOP 1: el modelo terminó
    if (toolCalls.length === 0) {
      console.log('\nRespuesta final:');
      console.log(response.output_text);
      break;
    }

    // 🟡 STOP 2: no ejecutamos Tools en el último paso
  if (state.step === state.maxSteps) {
    console.log('\n🛑 Máximo de pasos alcanzado.');
    break;
  }

    for (const toolCall of toolCalls) {
    const fingerprint =
      `${toolCall.name}:${toolCall.arguments}`;

    const count = (callCounts.get(fingerprint) ?? 0) + 1;

    callCounts.set(fingerprint, count);

    // 🔴 STOP 3: llamada repetida
    if (count >= 3) {
      console.log(
        `\n☠️ Tool repetida demasiadas veces: ${toolCall.name}`,
      );

      return;
    }

    console.log(`Tool requested: ${toolCall.name}`);
    console.log(`Arguments: ${toolCall.arguments}`);

    const tool = toolRegistry[toolCall.name];

    if (!tool) {
      state.input.push({
        type: 'function_call_output',
        call_id: toolCall.call_id,
        output: JSON.stringify({
          error: `Unknown tool: ${toolCall.name}`,
        }),
      });

      continue;
    }

    try {
      const result = await executeToolWithRetry(
        tool,
        toolCall.arguments,
        );

      state.input.push({
        type: 'function_call_output',
        call_id: toolCall.call_id,
        output: JSON.stringify(result),
      });

      console.log('Tool result:', result);
    } catch (error) {
      state.input.push({
        type: 'function_call_output',
        call_id: toolCall.call_id,
        output: JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : 'Unknown tool error',
        }),
      });
    }
  }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});