
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RunnableSequence } from "langchain/schema/runnable";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const modelo = new ChatOpenAI({
  temperature: 0,
  modelName: "gpt-4",
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const promptTamanho = `
Você é um assistente de moda. Avalie o HTML da página de produto e as medidas da cliente.

Sempre responda apenas com o número do tamanho ideal entre 36 e 58 (sem texto extra).

Regras:
- Priorize o busto (85%), depois cintura (10%) e quadril (5%)
- Use a tabela da página
- Se as medidas não couberem em nenhum tamanho, retorne: "N/A"

Medidas da cliente:
Busto: {busto} cm
Cintura: {cintura} cm
Quadril: {quadril} cm

HTML:
{html}
`;

const promptMensagem = `
Você é um vendedor de vestidos de festa de alta qualidade.

Com base na tabela da página do produto e no tamanho recomendado anteriormente ({tamanho}), envie uma mensagem simpática e objetiva para a cliente, informando:

- O tamanho ideal foi o {tamanho}
- O nome completo do vestido em negrito
- Fale sobre tecido, caimento e qualidade da peça
- Se for vestido sereia, considere o quadril
- Seja direta, evite exageros e emojis
- Finalize oferecendo ajuda

HTML da página:
{html}
`;

app.post("/chat", async (req, res) => {
  const { busto, cintura, quadril, url, message } = req.body;

  if (!url) return res.status(400).json({ error: "URL obrigatória" });

  try {
    const loader = new CheerioWebBaseLoader(url);
    const page = await loader.load();
    const html = page[0].pageContent;

    // 1. Se NÃO houver "message", responder apenas com o tamanho
    if (!message) {
      const chain = RunnableSequence.from([
        (input) => promptTamanho.replace("{busto}", input.busto)
                                .replace("{cintura}", input.cintura)
                                .replace("{quadril}", input.quadril)
                                .replace("{html}", input.html),
        modelo,
        (resposta) => ({ resposta: resposta.content.trim().replace(/[^0-9]/g, "") || "N/A" })
      ]);

      const resposta = await chain.invoke({ busto, cintura, quadril, html });
      return res.json(resposta);
    }

    // 2. Se houver "message", gerar a resposta complementar (formato OpenAI)
    const tamanhoAnterior = "TAMANHO RECOMENDADO"; // placeholder para segurança
    const tamanhoNaTarja = req.body.tamanho || "N/A";

    const promptFinal = promptMensagem
      .replace(/{tamanho}/g, tamanhoNaTarja)
      .replace("{html}", html);

    const respostaIA = await modelo.call([{ role: "user", content: promptFinal }]);
    return res.json({
      choices: [
        {
          message: {
            content: respostaIA.content.trim()
          }
        }
      ]
    });

  } catch (err) {
    console.error("Erro:", err.message);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
