

async function askNemotron(systemPrompt, userPrompt, jsonMode = true, temperature = 0.2, options = {}) {
  const isMock = process.env.MOCK_MODE === 'true';
  
  if (isMock) {
    throw new Error('askNemotron called in MOCK_MODE. Mocking should be handled at a higher level.');
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  const baseUrl = process.env.NEMOTRON_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const model = process.env.NEMOTRON_MODEL || 'nvidia/nemotron-4-340b-instruct';

  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is missing');
  }

  const maxRetries = 4;
  const MAX_TOTAL_RETRY_MS = 60000; // 60s cap on total retry time
  const maxTokens = options.maxTokens || 2048;
  const remainingBudgetMs = options.remainingBudgetMs;
  let lastError = null;
  const retryStart = Date.now();
  let currentPrompt = userPrompt; // Allows appending correction

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Budget-awareness: fail fast if we can't afford another attempt
    if (remainingBudgetMs !== undefined && remainingBudgetMs < 15000) {
      throw lastError || new Error('Task budget nearly exhausted, skipping Nemotron call.');
    }

    // Bounded total retry time
    const elapsed = Date.now() - retryStart;
    if (attempt > 1 && elapsed >= MAX_TOTAL_RETRY_MS) {
      throw lastError || new Error('Nemotron retry time budget exhausted.');
    }

    const currentTemperature = attempt > 1 ? temperature + 0.2 : temperature;
    
    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: currentPrompt }
      ],
      temperature: Math.min(currentTemperature, 1.0),
      max_tokens: maxTokens,
    };

    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const callStart = Date.now();
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
    const callDuration = Date.now() - callStart;

    if (!response.ok) {
      const text = await response.text();
      const err = new Error(`NVIDIA API Error: ${response.status} - ${text}`);
      
      // Only retry on 5xx/rate-limit errors
      if (response.status >= 500 && attempt < maxRetries) {
        lastError = err;
        // Bounded delay: 1s, 2s, 4s, 8s — capped so total doesn't exceed 30s
        const delayMs = Math.min(Math.pow(2, attempt - 1) * 1000, 8000);
        const totalElapsed = Date.now() - retryStart;
        if (totalElapsed + delayMs > MAX_TOTAL_RETRY_MS) {
          throw err; // Would exceed retry budget
        }
        console.warn(`[Nemotron] API error ${response.status}. Retrying in ${delayMs}ms... (${callDuration}ms elapsed)`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    if (jsonMode) {
      let parsedObj = null;
      let parseError = null;

      // Debug log for finish reason if available
      if (data.choices && data.choices[0] && data.choices[0].finish_reason) {
        console.log(`[Nemotron] Finish reason: ${data.choices[0].finish_reason}, Content length: ${content.length}`);
      }

      try {
        let cleaned = content.replace(/^```json/mi, '').replace(/```$/m, '').trim();
        
        // Sometimes the API or model double-emits the opening brace
        cleaned = cleaned.replace(/^\{\s*\{/, '{');
        cleaned = cleaned.replace(/\}\s*\}$/, '}');

        // Fallback: if there's prose before the json, try to extract it
        if (!cleaned.startsWith('{')) {
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (match) {
              cleaned = match[0];
              cleaned = cleaned.replace(/^\{\s*\{/, '{');
              cleaned = cleaned.replace(/\}\s*\}$/, '}');
          }
        }
        
        parsedObj = JSON.parse(cleaned);
      } catch (e) {
        parseError = `Parse Error: ${e.message}`;
        // Attempt a more aggressive extraction if parsing still failed
        try {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                let aggressiveCleaned = match[0].replace(/^\{\s*\{/, '{');
                parsedObj = JSON.parse(aggressiveCleaned);
                parseError = null; // Successfully parsed!
            }
        } catch (e2) {
            // keep original parse error
        }
      }

      if (parseError) {
        lastError = new Error(`Failed to parse LLM JSON: ${parseError}\nRaw: ${content.substring(0, 300)}`);
        console.warn(`[Nemotron] Attempt ${attempt} failed JSON parsing.`);
        currentPrompt = userPrompt + `\n\nERROR: Your previous response was invalid JSON (${parseError}). You MUST return ONLY a valid JSON object starting with '{'. Do not include conversational text. CRITICAL: If you are including code or multiline text, you MUST properly escape all newlines as \\n and double quotes as \\" within the JSON string.`;
        continue;
      }

      if (options.schemaValidator) {
        try {
          const validated = options.schemaValidator(parsedObj);
          return validated;
        } catch (e) {
          lastError = new Error(`JSON schema validation failed: ${e.message}\nRaw JSON: ${JSON.stringify(parsedObj).substring(0, 300)}`);
          console.warn(`[Nemotron] Attempt ${attempt} failed schema validation: ${e.message}`);
          currentPrompt = userPrompt + `\n\nERROR: Your previous JSON response was invalid according to the required schema: ${e.message}. Fix the errors and return a valid JSON object.`;
          continue;
        }
      }

      return parsedObj;
    }

    return content;
  }

  throw lastError;
}

module.exports = { askNemotron };
