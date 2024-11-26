const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

// Hardcoded credentials
const TELEGRAM_BOT_TOKEN = '8046464181:AAEhWZa1_xbXFMPSmRGfrkJ4x7PZsGIwpRA'; // Replace with your actual Telegram Bot Token
const HF_API_KEY = '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'; // Replace with your actual Hugging Face API Key
const HF_API_URL = 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1/chat/completions';

// Initialize Telegram bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

// Initialize Express server
const app = express();
app.use(bodyParser.json());

// Use environment variable for the Vercel URL
const WEBHOOK_URL = process.env.VERCEL_URL || 'https://default-url.com';  // Default URL in case it's not set

// Set the webhook to your Vercel endpoint
bot.setWebHook(`${WEBHOOK_URL}/api/bot`);

// Function to fetch a response from Hugging Face API
async function getChatResponse(message, isGreeting) {
  try {
    const systemMessage = isGreeting
      ? "If the user types 'hi' or 'hello,' reply with an enthusiastic introduction as SlimShadow, created by Sameer Banchhor, and include a fun, engaging invitation to chat."
      : "Reply normally to the user's message without special greetings.";

    const response = await axios.post(
      HF_API_URL,
      {
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: [
          { role: "system", content: systemMessage },
          { role: 'user', content: message }
        ],
        temperature: 0.5,
        max_tokens: 2048,
        top_p: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response from Hugging Face API:', error.message);
    return "Sorry, I couldn't process your request. Please try again later.";
  }
}

// Define the webhook route for Telegram to send messages
app.post('/api/bot', async (req, res) => {
  const { message } = req.body;

  if (!message || !message.text) {
    return res.status(400).send('Invalid request');
  }

  const userMessage = message.text;
  const chatId = message.chat.id;

  // Check if the user message is a greeting (contains 'hi' or 'hello')
  const isGreeting = /hi|hello/i.test(userMessage);

  // Send "loading" message
  await bot.sendMessage(chatId, "Please wait, I'm working on your response... ⏳");

  // Get the bot's response
  const botResponse = await getChatResponse(userMessage, isGreeting);

  // Send the response to the user
  await bot.sendMessage(chatId, botResponse);

  // Respond to Telegram to acknowledge receipt
  res.status(200).send('OK');
});

// Start the express server (Vercel will automatically detect the right server handler)
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
