import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function backendAgent(task: string) {
  const response = await client.responses.create({
    model: 'openrouter/free',

    input: `
You are a backend specialist.

Solve the following task:
${task}

Focus on APIs, NestJS, TypeScript and backend architecture.
`,
  });

  return response.output_text;
}

export async function databaseAgent(task: string) {
  const response = await client.responses.create({
    model: 'openrouter/free',

    input: `
You are a database specialist.

Solve the following task:
${task}

Focus on PostgreSQL, SQL, indexes and data modeling.
`,
  });

  return response.output_text;
}