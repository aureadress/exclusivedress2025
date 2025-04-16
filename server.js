require('dotenv').config();
const express = require('express');
const cors = require('cors'); // 👉 Adiciona o CORS aqui
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Libera requisição do seu site
app.use(cors({
  origin: 'https://www.exclusivedress.com.br'
}));

app.use(express.json());

const promptBase = fs.readFileSync('prompt.txt', 'utf8');

app.post('/chat', async (req, res) => {
  const { busto, cintura, quadril, url } = req.body;
  if (!busto || !cintura || !url) {
    return res.status(400).json({ error: 'Medidas e URL são obrigatórios.' });
  }

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const descricao = $('#product-description').text().trim();

    const prompt = `${promptBase}

MEDIDAS DA CLIENTE:
Busto: ${busto}
Cintura: ${cintura}
Quadril: ${quadril}

CONTEÚDO DA PÁGINA:
${descricao}`;

    const resposta = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Você é um especialista da loja Exclusive Dress. Responda de forma clara, objetiva e sem emojis.' },
        { role: 'user', content: prompt }
      ]
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = resposta.data.choices?.[0]?.message?.content?.trim();
    return res.json({ resposta: content });

  } catch (error) {
    console.error('Erro ao consultar:', error);
    return res.status(500).json({ error: 'Erro ao processar a requisição.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
