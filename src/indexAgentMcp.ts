import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import OpenAI from "openai";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems.mjs";
import type { ResponseInputItem } from "openai/resources/responses/responses.mjs";



const llm = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
})


async function main(){

    //1. CONECTAMOS CON NUESTRO MCP SERVER
    const mcpClient = new Client({
        name: 'agent-mcp-client',
        version: '1.0.0'
    })

    const transport = new StreamableHTTPClientTransport(
        new URL('http://127.0.0.1:3000/mcp')
    )
    await mcpClient.connect(transport)
    console.log('✅ Connected to MCP server')

    //2. DESCUBRIMOS LAS TOOLS
    const {tools: mcpTools} = await mcpClient.listTools()
    console.log('\nMCP Tools Discovered: ')

    for(const tool of mcpTools){
        console.log(`- ${tool.name}`)
    }

    //3. CONVERTIR MCP Tools al formato de function tools
    //  para que entienda nuestro LLM
    
    const tools = mcpTools.map((tool)=>({
        type: 'function' as const,
        name: tool.name,
        description: tool.description ?? '',
        strict: false,
        parameters: tool.inputSchema,
    }))


    //4. ESTADO DE AGENTE
    const state: ResponseInputItem[] = [
        {
            role: 'user',
            content: ' List all users in the system and tell me how many users there are.'
        }
    ]
    const maxSteps = 5;

    //5. AGENT LOOP 

    for(let step=1; step<= maxSteps; step++){
        console.log(`\n---Agent step ${step} ---`)

        const response = await llm.responses.create({
            model:'openrouter/free',
            tools,
            input: state
        })

        // Guardamos lo que produce el modelo
        state.push(...toResponseInputItems(response.output))
        const toolCalls = response.output.filter(
            (item) => item.type === 'function_call'
        )

        //No pidio Tools -> Termina
        if(toolCalls.length === 0){
            console.log('\nRespuesta final:');
            console.log(response.output_text);

        break
        }

        //6. EJECUTAMOS LAS TOOLS MEDIANTE MCP
        for(const toolCall of toolCalls){
            console.log(`\nTool requested: ${toolCall.name}`);
            console.log(`Arguments: ${toolCall.arguments}`);

            const args = JSON.parse(toolCall.arguments);

            const result = await mcpClient.callTool({
                name: toolCall.name,
                arguments: args
            })

            console.log('\nMCP result:');
            console.dir(result, { depth: null });

            //7. DEVOLVEMOS EL RESULTADO AL LLM
            state.push({
                type: 'function_call_output',
                call_id: toolCall.call_id,
                output: JSON.stringify(result)
            })
        }
    }

    await mcpClient.close()
}


main().catch((error)=>{
    console.log(error),
    process.exitCode = 1
})