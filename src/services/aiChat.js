import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

/**
 * Builds the system message for a code snippet review
 * @param {Object} agentConfig - Agent configuration
 * @param {Object} snippet - Code snippet data
 * @returns {Object} System message object
 */
const buildSystemMessage = (agentConfig, snippet) => {
  const baseContent = `You are an AI code reviewer specialized in ${
    snippet.type || "general programming"
  }. 
Your task is to analyze code snippets and provide helpful insights.

Key focus areas:
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Security implications
- Suggestions for improvement

${agentConfig.additionalInstructions || ""}`;

  return {
    role: "system",
    content: baseContent,
  };
};

/**
 * Builds the user message containing the code snippet and prompt
 * @param {Object} snippet - Code snippet data
 * @returns {Object} User message object
 */
const buildUserMessage = (snippet) => {
  return {
    role: "user",
    content: `Code Type: ${snippet.type}
Label: ${snippet.label}
Description: ${snippet.description}

Code:
${snippet.code}

Review Request:
${snippet.agentPrompt}`,
  };
};

/**
 * Sends a code snippet for review to the AI agent
 * @param {Object} agentConfig - Agent configuration object
 * @param {Object} snippet - Code snippet data
 * @returns {Object} The AI's response and usage metrics
 */
export const reviewCodeSnippet = async (agentConfig, snippet) => {
  try {
    const systemMessage = buildSystemMessage(agentConfig, snippet);
    const userMessage = buildUserMessage(snippet);

    const messages = [systemMessage, userMessage];

    const completion = await openai.chat.completions.create({
      model: agentConfig.model || "gpt-3.5-turbo",
      messages,
      temperature: agentConfig.temperature ?? 0.7,
      max_tokens: agentConfig.maxTokens ?? 2000,
      top_p: agentConfig.topP ?? 1.0,
    });

    const choice = completion.choices?.[0];
    return {
      message: choice?.message,
      usage: completion.usage,
      agentId: agentConfig.id,
    };
  } catch (error) {
    console.error("Error in reviewCodeSnippet:", error);
    throw error;
  }
};

/**
 * Sends a follow-up message in an existing review conversation
 * @param {Object} agentConfig - Agent configuration
 * @param {Array} previousMessages - Previous messages in the conversation
 * @param {string} followUpPrompt - The follow-up question or request
 * @returns {Object} The AI's response and usage metrics
 */
export const sendFollowUpMessage = async (
  agentConfig,
  previousMessages,
  followUpPrompt
) => {
  try {
    const messages = [
      ...previousMessages,
      { role: "user", content: followUpPrompt },
    ];

    const completion = await openai.chat.completions.create({
      model: agentConfig.model || "gpt-3.5-turbo",
      messages,
      temperature: agentConfig.temperature ?? 0.7,
      max_tokens: agentConfig.maxTokens ?? 1000,
      top_p: agentConfig.topP ?? 1.0,
    });

    const choice = completion.choices?.[0];
    return {
      message: choice?.message,
      usage: completion.usage,
      agentId: agentConfig.id,
    };
  } catch (error) {
    console.error("Error in sendFollowUpMessage:", error);
    throw error;
  }
};

/**
 * Sends a chat-based message to the AI agent with system + user messages.
 *
 * @param {Object} agentConfig - Configuration object:
 *   {
 *     id: string,
 *     name: string,
 *     model: string,
 *     temperature: number,
 *     maxTokens: number,
 *     topP: number
 *   }
 * @param {string} userPrompt - The user's prompt or question (single string).
 * @returns {Object} The AI's response, plus usage metrics and the agent ID.
 */
export const sendAgentMessage = async (agentConfig, userPrompt) => {
  try {
    // Define system message that sets the "persona" or context for the agent
    const systemMessage = {
      role: "system",
      content: `You are ${agentConfig.name}, an AI assistant focused on helping users with their code and technical questions.`,
    };

    // The user's prompt as a single message
    const userMessage = {
      role: "user",
      content: userPrompt,
    };

    // Combine messages for the conversation
    const messages = [systemMessage, userMessage];

    // Call OpenAI Chat Completion endpoint
    const response = await openai.chat.completions.create({
      model: agentConfig.model,
      messages: messages,
      temperature: agentConfig.temperature,
      max_tokens: agentConfig.maxTokens,
      top_p: agentConfig.topP,
    });

    // Return AI response and usage info
    return {
      response: response.choices[0].message.content,
      usage: response.usage,
      agentId: agentConfig.id,
    };
  } catch (error) {
    console.error("Error in AI service:", error);
    throw error;
  }
};
