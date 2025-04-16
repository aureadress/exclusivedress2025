require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'https://www.exclusivedress.com.br' }));
app.use(express.json());

// Usa o novo prompt atualizado (sem a palavra "troca")
const promptBase = fs.readFileSync('prompt.txt', 'utf8');

app.post('/chat', async (req, res) => {
  const { busto, cintura, quadril, url, message } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'A URL é obrigatória.' });
  }

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const descricao = $('#product-description').text().trim();

    const prompt = message
      ? `${promptBase}\n\n${message}\n\nCONTEÚDO DA PÁGINA:\n${descricao}`
      : `${promptBase}\n\nMEDIDAS DA CLIENTE:\nBusto: ${busto}\nCintura: ${cintura}\nQuadril: ${quadril}\n\nCONTEÚDO DA PÁGINA:\n${descricao}`;

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
