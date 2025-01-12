import OpenAI from 'openai';
// import { buildOntologySystemPrompt, buildUserTranscriptMessage } from '../prompts/relationships.js';

async function configureOpenAIClient(apiKey) {
    return new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.openai.com/v1',
        fetch: window.fetch, // Use window.fetch explicitly
        defaultHeaders: {
            'Content-Type': 'application/json'
        }
    });
}

// Function to decrypt OpenAI API key from localStorage
async function decryptApiKey(encryptedKey) {
    return await window.electronAPI.decryptData(encryptedKey);
}

// Function to handle OpenAI errors
function handleOpenAIError(error) {
    if (error.response) {
        console.error('OpenAI API Error:', error.response.status, error.response.data);
        throw new Error(`OpenAI API error: ${error.response.status} - ${error.response.data.error?.message || 'Unknown error'}`);
    } else if (error.request) {
        console.error('OpenAI Network Error:', error.message);
        throw new Error('Network error when calling OpenAI API');
    } else {
        console.error('OpenAI Setup Error:', error.message);
        throw error;
    }
}

// Function to call OpenAI API using the relationship prompt
async function callOpenAIWithRelationshipsPrompt(transcript, localStorage) {
    try {
        const encryptedApiKey = localStorage.getItem('openai_key');
        if (!encryptedApiKey) {
            throw new Error('OpenAI API key not found in localStorage.');
        }

        const transcriptHash = await window.electronAPI.generateHash(transcript);
        const systemMessage = buildOntologySystemPrompt("Ensure the JSON adheres to the specified schema.");
        const userMessage = buildUserTranscriptMessage(transcript);
        
        const messages = {
            apiKey: encryptedApiKey,
            content: [systemMessage, userMessage]
        };

        return await window.electronAPI.callOpenAI({
            messages,
            model: "gpt-4"
        });
    } catch (error) {
        console.error('OpenAI API call failed:', error);
        throw error;
    }
}

// Function to call OpenAI API with a simple prompt
async function callOpenAIWithSimplePrompt(prompt, localStorage) {
    try {
        const encryptedApiKey = localStorage.getItem('openai_key');
        if (!encryptedApiKey) {
            throw new Error('OpenAI API key not found in localStorage.');
        }

        const messages = {
            apiKey: encryptedApiKey,
            content: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt }
            ]
        };

        return await window.electronAPI.callOpenAI({
            messages,
            model: "gpt-4"
        });
    } catch (error) {
        console.error('OpenAI API call failed:', error);
        throw error;
    }
}

export { callOpenAIWithRelationshipsPrompt, callOpenAIWithSimplePrompt };