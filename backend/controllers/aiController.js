const User = require("../models/User");
const { encrypt, decrypt } = require("../utils/cryptoHelper");

/**
 * Helper to call Gemini API directly via fetch
 */
const callGemini = async (prompt, apiKey) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API responded with status ${response.status}`);
  }

  const data = await response.json();
  const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!outputText) {
    throw new Error("Empty response received from Gemini API");
  }
  return outputText;
};

/**
 * POST /api/ai/summarize
 * Summarizes the provided text
 */
const summarize = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Text content is required for summarization" });
    }

    const user = await User.findById(req.user._id);
    let apiKey = "";
    let usingCustomKey = false;

    // Check if custom key is available
    if (user.customGeminiKey) {
      apiKey = decrypt(user.customGeminiKey);
      usingCustomKey = true;
    }

    // Fallback to system key
    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
      usingCustomKey = false;
    }

    if (!apiKey) {
      return res.status(400).json({ 
        message: "No API Key configured. Please enter your custom Gemini API key in Settings." 
      });
    }

    // Enforce credits check for system key usage
    if (!usingCustomKey) {
      if (user.aiCredits <= 0) {
        return res.status(403).json({
          code: "CREDITS_EXHAUSTED",
          message: "You have used your 5 free daily AI actions. Please enter your custom Gemini API key in Settings for unlimited access!"
        });
      }
    }

    const prompt = `Summarize this text in 2-3 brief, actionable sentences. Focus only on key themes:\n\n${text}`;
    const summary = await callGemini(prompt, apiKey);

    // Deduct credit if system key was used
    if (!usingCustomKey) {
      user.aiCredits = Math.max(0, user.aiCredits - 1);
      await user.save();
    }

    res.json({
      summary: summary.trim(),
      creditsLeft: usingCustomKey ? "Unlimited" : user.aiCredits,
      usingCustomKey
    });

  } catch (err) {
    console.error("AI Summarize error:", err.message);
    res.status(500).json({ message: err.message || "Failed to generate summary" });
  }
};

/**
 * POST /api/ai/complete
 * Continues writing text from the current position
 */
const completeText = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Context text is required for completion" });
    }

    const user = await User.findById(req.user._id);
    let apiKey = "";
    let usingCustomKey = false;

    if (user.customGeminiKey) {
      apiKey = decrypt(user.customGeminiKey);
      usingCustomKey = true;
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
      usingCustomKey = false;
    }

    if (!apiKey) {
      return res.status(400).json({ 
        message: "No API Key configured. Please enter your custom Gemini API key in Settings." 
      });
    }

    if (!usingCustomKey) {
      if (user.aiCredits <= 0) {
        return res.status(403).json({
          code: "CREDITS_EXHAUSTED",
          message: "You have used your 5 free daily AI actions. Please enter your custom Gemini API key in Settings for unlimited access!"
        });
      }
    }

    const prompt = `You are a writing assistant. Continue writing the following note or notebook text naturally from the exact point it leaves off. Return ONLY the continuation text, do not include any greetings, conversational lead-in, or meta-explanations. Just output the actual text that should follow:\n\n${text}`;
    const completion = await callGemini(prompt, apiKey);

    if (!usingCustomKey) {
      user.aiCredits = Math.max(0, user.aiCredits - 1);
      await user.save();
    }

    res.json({
      completion: completion,
      creditsLeft: usingCustomKey ? "Unlimited" : user.aiCredits,
      usingCustomKey
    });

  } catch (err) {
    console.error("AI Completion error:", err.message);
    res.status(500).json({ message: err.message || "Failed to generate completion" });
  }
};

/**
 * PUT /api/ai/settings
 * Saves or clears the user's custom API key
 */
const updateSettings = async (req, res, next) => {
  try {
    const { customGeminiKey } = req.body;
    const user = await User.findById(req.user._id);

    if (!customGeminiKey || !customGeminiKey.trim()) {
      user.customGeminiKey = "";
    } else {
      // Validate key by running a test call
      try {
        await callGemini("Hello", customGeminiKey.trim());
      } catch (err) {
        return res.status(400).json({ 
          message: "Failed to validate API key. Please check that the key is correct and active." 
        });
      }
      user.customGeminiKey = encrypt(customGeminiKey.trim());
    }

    await user.save();
    res.json({ 
      message: "AI settings updated successfully",
      hasCustomKey: !!user.customGeminiKey,
      aiCredits: user.aiCredits
    });

  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai/credits
 * Fetches user's credit profile
 */
const getCredits = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      aiCredits: user.aiCredits,
      hasCustomKey: !!user.customGeminiKey
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ai/generate
 * Generates text based on user prompt/description and optional context
 */
const generateText = async (req, res, next) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: "Prompt description is required" });
    }

    const user = await User.findById(req.user._id);
    let apiKey = "";
    let usingCustomKey = false;

    if (user.customGeminiKey) {
      apiKey = decrypt(user.customGeminiKey);
      usingCustomKey = true;
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
      usingCustomKey = false;
    }

    if (!apiKey) {
      return res.status(400).json({ 
        message: "No API Key configured. Please enter your custom Gemini API key in Settings." 
      });
    }

    if (!usingCustomKey) {
      if (user.aiCredits <= 0) {
        return res.status(403).json({
          code: "CREDITS_EXHAUSTED",
          message: "You have used your 5 free daily AI actions. Please enter your custom Gemini API key in Settings for unlimited access!"
        });
      }
    }

    let fullPrompt = `You are a helpful writing assistant inside a note-taking application.
Generate clean, well-formatted content based on the user's instructions: "${prompt}".`;
    if (context && context.trim()) {
      fullPrompt += `\n\nFor context, here is the existing document text:\n--- START CONTEXT ---\n${context}\n--- END CONTEXT ---`;
    }
    fullPrompt += `\n\nReturn ONLY the newly generated text that matches the instruction. Do not include any greeting, introduction, conversational lead-in, markdown headers naming the tool, or explanations. Just start directly with the requested output text:`;

    const generatedText = await callGemini(fullPrompt, apiKey);

    if (!usingCustomKey) {
      user.aiCredits = Math.max(0, user.aiCredits - 1);
      await user.save();
    }

    res.json({
      text: generatedText.trim(),
      creditsLeft: usingCustomKey ? "Unlimited" : user.aiCredits,
      usingCustomKey
    });

  } catch (err) {
    console.error("AI Generation error:", err.message);
    res.status(500).json({ message: err.message || "Failed to generate text" });
  }
};

/* ── POST /api/ai/ocr ─────────────────────────── */
const ocrImage = async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ message: "Image Base64 content and mimeType are required" });
    }

    const user = await User.findById(req.user._id);
    let apiKey = "";
    let usingCustomKey = false;

    if (user.customGeminiKey) {
      apiKey = decrypt(user.customGeminiKey);
      usingCustomKey = true;
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
      usingCustomKey = false;
    }

    if (!apiKey) {
      return res.status(400).json({ 
        message: "No API Key configured. Please configure your custom Gemini API key in Settings." 
      });
    }

    if (!usingCustomKey) {
      if (user.aiCredits <= 0) {
        return res.status(403).json({
          code: "CREDITS_EXHAUSTED",
          message: "You have used your 5 free daily AI actions. Please enter your custom Gemini API key in Settings for unlimited access!"
        });
      }
    }

    // Call Gemini with multimodal data
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Act as a highly accurate OCR scanner. Extract all readable text from this image. Preserve formatting, paragraphs, and list structures as clean Markdown text. Do NOT add any extra conversational commentary, intro, or outro text. Just return the raw extracted content." },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBase64
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Gemini API responded with status ${response.status}`);
    }

    const data = await response.json();
    const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!outputText) {
      throw new Error("Empty response received from Gemini API");
    }

    if (!usingCustomKey) {
      user.aiCredits = Math.max(0, user.aiCredits - 1);
      await user.save();
    }

    res.json({
      text: outputText.trim(),
      creditsLeft: usingCustomKey ? "Unlimited" : user.aiCredits,
      usingCustomKey
    });

  } catch (err) {
    console.error("AI OCR error:", err.message);
    res.status(500).json({ message: err.message || "Failed to extract text from image" });
  }
};

module.exports = { summarize, completeText, updateSettings, getCredits, generateText, ocrImage };
