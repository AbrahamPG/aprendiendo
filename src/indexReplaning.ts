import OpenAI from 'openai';

import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';
import type { ResponseInputItem } from 'openai/resources/responses/responses';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

type ToolHandler = (
  argumentsJson: string,
) => unknown | Promise<unknown>;

function searchStudent(name: string) {
  return {
    found: true,
    id: 456,
    name,
    currentCourses: [
      'Backend Development',
      'Artificial Intelligence',
    ],
  };
}

function getCourseRequirements(course: string) {
  return {
    course,
    requirements: [
      'Basic programming',
      'Database fundamentals',
    ],
  };
}

function checkEnrollment(
  studentId: number,
  course: string,
) {
  return {
    studentId,
    course,
    eligible: true,
  };
}

const toolRegistry: Record<string, ToolHandler> = {
  search_student: (argumentsJson) => {
    const args = JSON.parse(argumentsJson) as {
      name: string;
    };

    return searchStudent(args.name);
  },

  get_course_requirements: (argumentsJson) => {
    const args = JSON.parse(argumentsJson) as {
      course: string;
    };

    return getCourseRequirements(args.course);
  },

  check_enrollment: (argumentsJson) => {
    const args = JSON.parse(argumentsJson) as {
      studentId: number;
      course: string;
    };

    return checkEnrollment(args.studentId, args.course);
  },
};

const tools = [
  {
    type: 'function' as const,
    name: 'search_student',
    description:
      'Searches for a student and returns their id and current courses.',
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
    name: 'get_course_requirements',
    description:
      'Returns the requirements for a course.',
    parameters: {
      type: 'object',
      properties: {
        course: {
          type: 'string',
          description: 'The course name.',
        },
      },
      required: ['course'],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: 'function' as const,
    name: 'check_enrollment',
    description:
      'Checks whether a student is eligible to enroll in a course.',
    parameters: {
      type: 'object',
      properties: {
        studentId: {
          type: 'number',
          description: 'The student id.',
        },
        course: {
          type: 'string',
          description: 'The course name.',
        },
      },
      required: ['studentId', 'course'],
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
I want to know if Cody can enroll in Artificial Intelligence.

Initial plan:
1. Search for Cody.
2. Get the requirements for Artificial Intelligence.
3. Check whether Cody can enroll.
4. Report the result.

Important:
The plan is only a proposal.
After every tool result, reevaluate the goal.
If a result shows that a later step is unnecessary, change the plan and do not execute unnecessary steps.
`,
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
              name: 'search_student',
            }
          : 'auto',

      input: state,
    });

    // Conservamos TODOS los output items del modelo
    // para la siguiente iteración.
    state.push(...toResponseInputItems(response.output));

    const toolCalls = response.output.filter(
      (item) => item.type === 'function_call',
    );

    // No más tools → el Agent considera terminado el objetivo.
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
        const errorResult = {
          error: `Unknown tool: ${toolCall.name}`,
        };

        state.push({
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(errorResult),
        });

        continue;
      }

      try {
        const result = await tool(toolCall.arguments);

        console.log('Tool result:', result);

        state.push({
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(result),
        });
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