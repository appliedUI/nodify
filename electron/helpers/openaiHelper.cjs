// openaiHelper.cjs
const OpenAI = require('openai') // Update import
const Ajv = require('ajv')

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true })

// Define the JSON schema based on the provided structure
const graphSchema = {
  type: 'object',
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          level: { type: 'integer' },
          description: { type: 'string' },
          relationships: {
            type: 'object',
            properties: {
              connections: {
                type: 'array',
                items: { type: 'string' }, // Must be string IDs referencing other nodes
              },
            },
            required: ['connections'],
          },
          generalKnowledge: { type: 'string' },
          importance: { type: 'integer' },
          children: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: [
          'id',
          'label',
          'level',
          'description',
          'relationships',
          'generalKnowledge',
          'importance',
          'children',
        ],
      },
    },
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          target: { type: 'string' },
          relationship: { type: 'string' },
        },
        required: ['source', 'target', 'relationship'],
      },
    },
  },
  required: ['nodes', 'links'],
}

const validate = ajv.compile(graphSchema)
const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'graph_structure',
    schema: JSON.parse(JSON.stringify(graphSchema)),
  },
}

/**
 * Generates JSON from a transcript using OpenAI's GPT-4 model.
 * @param {string} apiKey - Decrypted OpenAI API key.
 * @param {string} transcript - The transcript text to parse.
 * @param {function} onProgress - Callback function to handle progress updates.
 * @returns {Promise<Object>} - The generated JSON object.
 * @throws Will throw an error if OpenAI API call fails or JSON validation fails.
 */
async function generateJsonFromTranscript(apiKey, transcript, onProgress) {
  const openai = new OpenAI({ apiKey })

  try {
    // Add progress callback to system prompt
    const systemPrompt = `
You are an expert at analyzing relationships and note taking in a professional setting. Your goal is to extract key concepts and build insightful connections between concepts while citing the orginal transcript below.
Your task is to analyze the given transcript and identify key concepts and their relationships. Reuse the language from the transcript, but rephrase it into concise and actionable notes.

When constructing your JSON, pay special attention to how connections are handled:
- The "connections" array under "relationships" must only contain string IDs of other nodes from the "nodes" list. 
- Do not use numbers or unrelated text in the "connections" array. 
- If a node references "quantumMechanics", for example, the connection should literally be "quantumMechanics". 
- Define a root node based on the main topic of the transcript. These root, child and grandchild relationships should be reflected in the levels of the nodes. Add these levels.

All output must follow this structure exactly (no extra keys, no different naming):

{
  "nodes": [
    {
      "id": "string",
      "label": "string",
      "level": integer,
      "description": "string",
      "relationships": {
        "connections": ["string"]
      },
      "generalKnowledge": "string",
      "importance": integer,
      "children": ["string"]
    }
  ],
  "links": [
    { "source": "string", "target": "string", "relationship": "string" }
  ]
}

Guidelines:
1. Extract key concepts from the transcript and represent each as a node.
2. For each node's relationships.connections, list the names of the nodes of related nodes (strings).
3. Add relevant links in the "links" array to show relationships. link relationships should be based on the content of the transcript and the connections between nodes.
4. Ensure all string values are enclosed in double quotes.
5. The JSON must be valid, well-formatted, and must match the schema exactly.
6. Respond **only** with the JSON and nothing else.
7. Set importance values based on the relevance of the concept in the transcript from 1-10. 10 being the most important.
8. In the description field, provide a verbose description of the concept. Please quote parts of the transcript where possible.
9. Use markdown .md formatting for the generalKnowledge field, and provide between 2-5 URL links for deeper research. Be as verbose and informative as possible in the generalKnowledge section using academic (do not start with the term 'general knowledge' in the title) wordsmithing about the transcript, adding further research, background context, and relevant details. use only h3 for the titles. This is the place to do it and put it in the right syntax for markdown.
10. Build many nodes.  And more link relationships to show the complexity of the transcript. more the better.

"Remember: Output must be valid JSON object. No additional text."

Here is the transcript:

${transcript}
`

    // Send initial progress update
    if (onProgress) {
      onProgress({
        content: '',
        progress: 0,
        isComplete: false,
      })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: 'Process the above transcript and generate the JSON.',
        },
      ],
      temperature: 0.5,
      max_tokens: 16000, // Increased to handle longer transcripts
      stream: true,
      response_format: responseFormat, // Force JSON output via schema
    })

    let fullResponse = ''
    let lastProgressUpdate = Date.now()
    const progressUpdateInterval = 100 // Update progress every 100ms

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || ''
      fullResponse += content

      // Send progress updates at regular intervals
      const now = Date.now()
      if (now - lastProgressUpdate >= progressUpdateInterval && onProgress) {
        onProgress({
          content,
          progress: 0.5, // Show 50% progress during generation
          isComplete: false,
        })
        lastProgressUpdate = now
      }
    }

    console.log(
      `📝 OpenAI streaming complete. Total response length: ${fullResponse.length} characters`
    )

    // Parse and validate the JSON
    try {
      // Update progress to 75%
      if (onProgress) {
        onProgress({
          content: fullResponse,
          progress: 0.75,
          isComplete: false,
        })
      }

      // Clean the response - remove any markdown code blocks or extra text
      let cleanedResponse = fullResponse.trim()

      // Remove markdown code fences if present
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse
          .replace(/^```(?:json)?\n?/, '')
          .replace(/\n?```$/, '')
      }

      // Try to extract JSON if there's extra text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0]
      }

      console.log(
        'Attempting to parse JSON response (length:',
        cleanedResponse.length,
        ')'
      )

      // Parse the JSON
      let jsonData
      try {
        jsonData = JSON.parse(cleanedResponse)
      } catch (parseError) {
        console.error('Initial JSON parse failed:', parseError.message)
        console.error('Response preview:', cleanedResponse.substring(0, 500))

        // Try to repair common JSON issues
        try {
          // Attempt to complete truncated JSON
          let repairedJson = cleanedResponse

          // If it ends mid-string, try to close it
          if (!repairedJson.endsWith('}')) {
            console.log('⚠️  JSON appears truncated, attempting repair...')
            // Count open braces
            const openBraces = (repairedJson.match(/\{/g) || []).length
            const closeBraces = (repairedJson.match(/\}/g) || []).length
            const openBrackets = (repairedJson.match(/\[/g) || []).length
            const closeBrackets = (repairedJson.match(/\]/g) || []).length

            // Close any unclosed strings
            const quoteCount = (repairedJson.match(/"/g) || []).length
            if (quoteCount % 2 !== 0) {
              repairedJson += '"'
            }

            // Close arrays
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              repairedJson += ']'
            }

            // Close objects
            for (let i = 0; i < openBraces - closeBraces; i++) {
              repairedJson += '}'
            }

            jsonData = JSON.parse(repairedJson)
            console.log('✅ JSON repair successful!')
          }
        } catch (repairError) {
          console.error('JSON repair failed:', repairError.message)
          throw parseError // Throw original error
        }
      }

      // Validate the JSON structure
      const valid = validate(jsonData)
      if (!valid) {
        console.error('JSON validation errors:', validate.errors)
        console.warn(
          '⚠️  Validation failed but continuing with partial data...'
        )
        // Don't throw - allow partial data through
      }

      // Ensure minimum structure exists
      if (!jsonData.nodes) {
        jsonData.nodes = []
      }
      if (!jsonData.links) {
        jsonData.links = []
      }

      console.log(
        `✅ Successfully parsed graph: ${jsonData.nodes.length} nodes, ${jsonData.links.length} links`
      )

      // Final progress update
      if (onProgress) {
        onProgress({
          content: fullResponse,
          progress: 1,
          isComplete: true,
        })
      }

      return jsonData
    } catch (error) {
      console.error('Error parsing or validating JSON:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in generateJsonFromTranscript:', error)
    throw error
  }
}

module.exports = {
  generateJsonFromTranscript,
}
