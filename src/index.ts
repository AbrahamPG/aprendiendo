import OpenAI from 'openai'


const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY
})

async function main(){
    const response = await client.responses.create({
        model: 'openrouter/free',
        input: [
            {
                role: 'user',
                content: 'Hola, explicame en una frase que es un Agent'
            }
        ]
    })

    //console.log(response.output_text)
    console.dir(response.output, { depth: null });
}



main().catch((error)=>{
    console.error(error)
    process.exitCode = 1
})