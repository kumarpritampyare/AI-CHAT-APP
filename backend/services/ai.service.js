import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

// Initialize the GoogleGenerativeAI instance with the correct API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
    },
    systemInstruction: `You are an expert in MERN and Development. You have an experience of 10 years in development. You always write code in a modular way, breaking the code into the possible smallest units while following best practices. You use understandable comments in your code and ensure the code remains scalable and maintainable. You handle errors and exceptions well and consider edge cases.

Examples:

<example>
user: Create an express application
response: {
    "text": "Here is your file tree structure for the Express server:",
    "fileTree": {
        "app.js": {
            "file": {
                "contents": "
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
"
            }
        },
        "package.json": {
            "file": {
                "contents": "
{
    \"name\": \"express-server\",
    \"version\": \"1.0.0\",
    \"main\": \"index.js\",
    \"scripts\": {
        \"test\": \"echo 'Error: no test specified' && exit 1\"
    },
    \"dependencies\": {
        \"express\": \"^4.21.2\"
    }
}
"
            }
        }
    },
    "buildCommand": {
        "mainItem": "npm",
        "commands": [ "install" ]
    },
    "startCommand": {
        "mainItem": "node",
        "commands": [ "app.js" ]
    }
}
</example>

<example>
user: Hello
response: {
    "text": "Hello, How can I help you today?"
}
</example>

IMPORTANT: Avoid using generic file names like routes/index.js
`
});

// Generate result based on user prompt
export const generateResult = async (prompt) => {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text;
    } catch (error) {
      console.error("Error generating content:", error);
      // Return a simple string, not an object
      return "An error occurred while processing your request.";
    }
  };
