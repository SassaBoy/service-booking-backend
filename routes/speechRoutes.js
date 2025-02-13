const express = require('express');
const axios = require('axios');
const router = express.Router();
const Service = require('../models/serviceModel');

// Replace with your actual OpenAI API key
const OPENAI_API_KEY = 'your_openai_api_key';

router.post('/ask-question', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ answer: "I didn't hear your question. Please try again!" });
  }

  try {
    // First, check if the query is about service prices
    if (query.toLowerCase().includes('price')) {
      const serviceName = query.split('price for')[1]?.trim();
      const service = await Service.findOne({ name: new RegExp(serviceName, 'i') });

      if (service) {
        const response = `The price for ${service.name} is ${service.price} NAD per ${service.priceType}.`;
        return res.status(200).json({ answer: response });
      }
    }

    // If not a direct price query, use ChatGPT for advanced response
    const chatGPTResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system", 
            content: "You are a helpful assistant providing concise, informative responses about services and prices."
          },
          {
            role: "user", 
            content: query
          }
        ],
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiAnswer = chatGPTResponse.data.choices[0].message.content.trim();
    
    return res.status(200).json({ answer: aiAnswer });

  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ answer: "Something went wrong. Try again later." });
  }
});

module.exports = router;