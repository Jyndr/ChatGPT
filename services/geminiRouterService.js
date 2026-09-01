import ai from "../config/gemini.js"

// dummy response of ai
// {
//   id: 'v1_ChdxV3VXYXFxLUhKci00LUVQMWQ2cW1RZxIXcVd1V2FxcS1ISnItNC1FUDFkNnFtUWc',
//   status: 'completed',
//   usage: {
//     total_tokens: 643,
//     total_input_tokens: 314,
//     input_tokens_by_modality: [ [Object] ],
//     total_cached_tokens: 0,
//     total_output_tokens: 57,
//     total_tool_use_tokens: 0,
//     total_thought_tokens: 272,
//     raw_prompt_token: 327
//   },
//   created: '2026-09-01T06:07:37Z',
//   updated: '2026-09-01T06:07:37Z',
//   service_tier: 'standard',
//   steps: [
//     {
//       signature: 'EiYKJGUyNDgzMGE3LTVjZDYtNDJmZS05OThiLWVlNTM5ZTcyYjljMw==',
//       summary: [Array],
//       type: 'thought'
//     },
//     { content: [Array], type: 'model_output' }
//   ],
//   object: 'interaction',
//   model: 'gemma-4-31b-it',
//   sdkHttpResponse: {
//     headers: {
//       'alt-svc': 'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000',
//       'content-encoding': 'gzip',
//       'content-type': 'application/json',
//       date: 'Tue, 01 Sep 2026 06:07:39 GMT',
//       server: 'scaffolding on HTTPServer2',
//       'server-timing': 'gfet4t7; dur=13181',
//       'transfer-encoding': 'chunked',
//       vary: 'Origin, X-Origin, Referer',
//       'x-content-type-options': 'nosniff',
//       'x-frame-options': 'SAMEORIGIN',
//       'x-xss-protection': '0'
//     },
//     responseInternal: Response {
//       status: 200,
//       statusText: 'OK',
//       headers: Headers {
//         'content-type': 'application/json',
//         vary: 'Origin, X-Origin, Referer',
//         'content-encoding': 'gzip',
//         date: 'Tue, 01 Sep 2026 06:07:39 GMT',
//         server: 'scaffolding on HTTPServer2',
//         'x-xss-protection': '0',
//         'x-frame-options': 'SAMEORIGIN',
//         'x-content-type-options': 'nosniff',
//         'server-timing': 'gfet4t7; dur=13181',
//         'alt-svc': 'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000',
//         'transfer-encoding': 'chunked'
//       },
//       body: ReadableStream { locked: true, state: 'closed', supportsBYOB: true },
//       bodyUsed: true,
//       ok: true,
//       redirected: false,
//       type: 'basic',
//       url: 'https://generativelanguage.googleapis.com/v1beta/interactions'
//     },
//     json: [AsyncFunction: json]
//   },
//   output_text: "Haha, I've got a good memory! \n" +
//     '\n' +
//     "Since we've got the introductions out of the way, is there anything technical you want to dive into? Or perhaps something you're currently working on in your backend projects? I'm here if you need help!"
// }

export const genAIresponse = async ({ model, messages }) => {
    try {

        const prompt = messages // ai 
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n");

        const interaction = await ai.interactions.create({
            model: model,
            input: prompt
        });

        const ai_reply = interaction.output_text;

        if (!ai_reply) {
            throw new Error("Ai response is empty");
        }

        // console.log(interaction);

        const prompt_token = interaction.usage?.total_input_tokens || 0;
        const completion_token = (interaction.usage?.total_output_tokens + interaction.usage?.total_thought_tokens) || 0;

        return {
            ai_reply,
            usage: {
                prompt_token,
                completion_token,
                total_tokens: prompt_token + completion_token
            }
        }
    } catch (error) {
        console.log("gemini api error :", error);
        throw error;
    }
}