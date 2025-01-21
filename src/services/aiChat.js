import OpenAI from "openai";
import nodeTypes from "@/nodeData/nodeTypes.json";

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
  return {
    role: "system",
    content: `You are an AI code reviewer. ${snippet.agentPrompt}
              Format your response as JSON with the following structure:
              {
                "message": "Your main review comments (supports markdown formatting)",
                "type": "info|warning|error|success",
                "details": ["Specific suggestions or improvements (supports markdown formatting)"],
                "code": "HTML code which represents the code snippet. show form inputs for items the user can override like input fields, varibles, etc."
              }`,
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
    content: `Code:
${snippet.code}`,
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
    if (!snippet?.code) {
      throw new Error("No code provided for review");
    }

    console.log("[SERVICE] Building system message for code review");
    // Get unique config from nodeTypes.json
    const nodeConfig = nodeTypes.find((node) => node.id === snippet?.id)?.agentConfig;
    const config = nodeConfig || agentConfig;

    console.log("[SERVICE] Using configuration:", config);

    const messages = [buildSystemMessage(config, snippet), buildUserMessage(snippet)];
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      response_format: { type: "json_object" }
    });

    console.log("[SERVICE] Received OpenAI response", {
      usage: completion.usage,
      responseLength: completion.choices[0].message.content.length,
    });

    const choice = completion.choices?.[0];
    return {
      response: choice?.message?.content,
      usage: completion.usage,
      agentId: config.id,
    };
  } catch (error) {
    console.error("[SERVICE] Error in reviewCodeSnippet:", error);
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
      model: agentConfig.model || "gpt-4o-mini",
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
    console.log("[SERVICE] Building system message for chat");
    const systemMessage = {
      role: "system",
      content: `You are ${agentConfig.name}, an AI assistant focused on helping users with their code and technical questions. 
                Format your responses as JSON with the following structure:
                {
                  "message": "Your main response message (supports markdown formatting)",
                  "type": "info|warning|error|success",
                  "details": ["Additional details or suggestions (support markdown formatting)"]
                }
                Use markdown formatting for code blocks, links, and emphasis where appropriate.`,
    };

    console.log("[SERVICE] Sending chat message to OpenAI", {
      model: agentConfig.model,
      temperature: agentConfig.temperature,
      maxTokens: agentConfig.maxTokens,
      promptLength: userPrompt.length,
    });

    const userMessage = {
      role: "user",
      content: userPrompt,
    };

    const messages = [systemMessage, userMessage];
    const response = await openai.chat.completions.create({
      model: agentConfig.model || "gpt-4o-mini",
      messages: messages,
      temperature: agentConfig.temperature,
      max_tokens: agentConfig.maxTokens,
      top_p: agentConfig.topP,
      response_format: { type: "json_object" }
    });

    console.log("[SERVICE] Received OpenAI chat response", {
      usage: response.usage,
      responseLength: response.choices[0].message.content.length,
    });

    const jsonResponse = JSON.parse(response.choices[0].message.content);

    return {
      response: jsonResponse,
      usage: response.usage,
      agentId: agentConfig.id,
    };
  } catch (error) {
    console.error("[SERVICE] Error in AI service:", error);
    throw error;
  }
};
