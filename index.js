// BACKEND - Provador Inteligente sem LangChain (usando cheerio)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

dotenv.config();
const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// Utilitário para fazer scraping com cheerio direto
async function carregarHTMLDaPagina(url) {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  return $.text();
}

app.post("/chat", async (req, res) => {
  try {
    const { busto, cintura, quadril, url, message } = req.body;

    const conteudoProduto = await carregarHTMLDaPagina(url);
    const nomeVestido = url.split("/").pop()?.replace(/-/g, " ").toUpperCase();

    if (!message) {
      const prompt1 = `
Você é um especialista em moda da loja Exclusive Dress. Com base nas medidas abaixo e nas informações do produto, informe apenas o número do tamanho ideal entre 36 e 58. Responda apenas com o número puro.

MEDIDAS:
Busto: ${busto} cm
Cintura: ${cintura} cm
Quadril: ${quadril} cm

DADOS DO PRODUTO:
${conteudoProduto}
`;

      const resposta = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt1 }],
        temperature: 0.4,
      });

      const tamanho = resposta.choices[0].message.content.trim();
      return res.json({ resposta: tamanho });
    }

    const prompt2 = `
🧠 INSTRUÇÕES PARA A I.A - ASSISTENTE VIRTUAL EXCLUSIVE DRESS

Você é um especialista em moda da loja Exclusive Dress. Seu papel é ajudar o cliente a encontrar o tamanho ideal de vestido com base nas medidas fornecidas (busto, cintura, quadril) e nas informações da página atual do produto.

🎯 ORIENTAÇÕES GERAIS
- Sempre responda com simpatia, clareza e objetividade.
- Use linguagem amigável e direta.
- Evite respostas longas ou incrementadas — seja breve e eficiente.

💬 MENSAGEM COMPLEMENTAR:
A cliente já recebeu o número do tamanho ideal.
Agora envie uma mensagem simpática com:
- Nome do vestido em negrito (ex: **VESTIDO CLÁSSICO BRILHO**)
- Uma saudação final breve, se colocando à disposição.

Exemplo:
"Fico feliz que pude ajudar você a encontrar o tamanho ideal do vestido **MAGNOLIA**! Se precisar esclarecer dúvidas sobre tecido ou características, pode me mandar aqui."

HTML DO PRODUTO:
${conteudoProduto}
`;

    const resposta2 = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt2 }],
      temperature: 0.5,
    });

    const textoFinal = resposta2.choices[0].message.content.trim();
    return res.json({ choices: [{ message: { content: textoFinal } }] });
  } catch (error) {
    console.error("Erro na rota /chat:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
