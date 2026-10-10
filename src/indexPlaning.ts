import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function main() {
  const goal = `
Quiero saber si Cody puede inscribirse en el curso de Artificial Intelligence.

Capacidades disponibles:

1. search_student(name)
   - Busca al estudiante.
   - Devuelve su id y sus cursos actuales.

2. get_course_requirements(course)
   - Devuelve los requisitos del curso.

3. check_enrollment(studentId, course)
   - Comprueba si el estudiante cumple los requisitos.

Crea un plan de pasos para resolver el objetivo.
No ejecutes ninguna herramienta.
Devuelve solamente una lista numerada de pasos.
`;

  const response = await client.responses.create({
    model: 'openrouter/free',
    input: goal,
  });

  console.log(response.output_text);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});