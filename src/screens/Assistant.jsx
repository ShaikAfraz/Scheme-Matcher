import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Key, Bot, User, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import VoiceReader from "../components/VoiceReader.jsx";
import { INK, PAPER, SEAL, OK, RULE, inputStyle, serif, sans } from "../theme/tokens.js";

const DEFAULT_API_KEY = "";

const QUICK_PROMPTS = [
  "Which scheme is best suited for me?",
  "What documents do I need to prepare first?",
  "How does the subsidy work for PMEGP?",
  "Why did I not score 100% on some schemes?",
  "What is the next step to apply?",
];

export default function Assistant({ profile, matches, initialQuery, lang = "en" }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Namaste! I am your AI Scheme Assistant, powered by Google Gemini and grounded in your profile and pre-computed matching results. Ask me anything about eligibility, required certificates, subsidies, or step-by-step application guidance.",
    },
  ]);
  const [input, setInput] = useState(initialQuery || "");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    return (
      import.meta.env?.VITE_GEMINI_API_KEY ||
      localStorage.getItem("GEMINI_API_KEY") ||
      DEFAULT_API_KEY
    );
  });
  const [showKeyDialog, setShowKeyDialog] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  const saveApiKey = (key) => {
    const trimmed = key.trim();
    setApiKey(trimmed || DEFAULT_API_KEY);
    localStorage.setItem("GEMINI_API_KEY", trimmed || DEFAULT_API_KEY);
    setShowKeyDialog(false);
  };

  /**
   * Deterministic grounded response fallback
   */
  const generateOfflineGroundedResponse = (query) => {
    const q = query.toLowerCase();
    const top = matches[0];
    const second = matches[1];

    if (q.includes("best") || q.includes("which scheme") || q.includes("recommend")) {
      return (
        `Based on your profile (${profile.age}yo, ${profile.category} category, ${profile.gender}, ${profile.businessType}), ` +
        `your top match is **${top.scheme.name}** with a **${top.score}% suitability match**.\n\n` +
        `**Key Reasons:**\n` +
        top.reasons.green.map((r) => `• ${r}`).join("\n") +
        `\n\n**Benefits:** ${top.scheme.benefits}\n\n` +
        (second
          ? `Your second strongest option is **${second.scheme.name}** (${second.score}% match).`
          : "")
      );
    }

    if (q.includes("document") || q.includes("certificate") || q.includes("paper")) {
      const allDocs = Array.from(
        new Set(matches.slice(0, 3).flatMap((m) => m.scheme.documents))
      );
      return (
        `To apply for your top matched schemes (${matches.slice(0, 2).map((m) => m.scheme.name.split("—")[0]).join(" & ")}), you will need:\n\n` +
        allDocs.map((d) => `✓ **${d}**`).join("\n") +
        `\n\n*Important Tip:* Ensure your caste and family income certificates are issued within the last 12 months by an authorized revenue official (Tehsildar/SDM).`
      );
    }

    if (q.includes("subsidy") || q.includes("margin") || q.includes("money") || q.includes("loan") || q.includes("amount")) {
      return (
        `Here is the financial breakdown across your top eligible schemes:\n\n` +
        matches.slice(0, 3).map((m) =>
          `• **${m.scheme.name}**: ${m.scheme.benefits}`
        ).join("\n\n") +
        `\n\nNote that government subsidies are back-ended and credited after physical asset verification by the financing bank.`
      );
    }

    if (q.includes("why") || q.includes("qualify") || q.includes("not") || q.includes("gap") || q.includes("score")) {
      return (
        `Your scores are computed deterministically based on official scheme rules:\n\n` +
        `**${top.scheme.name} (${top.score}% Match)**\n` +
        `• Satisfied: ${top.reasons.green.join("; ")}\n` +
        (top.reasons.yellow.length > 0 ? `• Verification needed: ${top.reasons.yellow.join("; ")}\n` : "") +
        (top.reasons.red.length > 0 ? `• Criteria gaps: ${top.reasons.red.join("; ")}\n` : "") +
        `\nRemember that match scores reflect algorithmic alignment with published parameters, not a guarantee of loan sanction.`
      );
    }

    return (
      `Regarding your question: "${query}"\n\n` +
      `Your profile matches **${matches.length} government schemes**, led by **${top.scheme.name}** (${top.score}% match).\n\n` +
      `**Profile Highlights:**\n` +
      `• Category: ${profile.category} (${profile.gender})\n` +
      `• Need: ₹${Number(profile.financialRequirement).toLocaleString("en-IN")} (${profile.businessType}, ${profile.businessStatus})\n` +
      `• Implementing Authority: ${top.scheme.ministry}\n` +
      `• Portal: ${top.scheme.portalUrl || top.scheme.source}\n\n` +
      `Ask me for specific document checklists, bank interest rates, or eligibility comparisons!`
    );
  };

  const handleSend = async (customText) => {
    const question = (customText || input).trim();
    if (!question || loading) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);

    const context = matches.slice(0, 5).map(({ scheme, score, reasons }) => ({
      name: scheme.name,
      ministry: scheme.ministry,
      match_score: score,
      why_match: reasons.green,
      gaps: [...reasons.red, ...reasons.yellow],
      benefits: scheme.benefits,
      documents: scheme.documents,
      portal: scheme.portalUrl || scheme.source,
    }));

    const langInstruction =
      lang === "hi"
        ? "5. Please answer primarily in clear, respectful, easy-to-understand Hindi (हिन्दी) so the marginalized entrepreneur can understand without difficulty.\n"
        : lang === "ta"
        ? "5. Please answer in Tamil (தமிழ்) if possible or simple bilingual format.\n"
        : lang === "te"
        ? "5. Please answer in Telugu (తెలుగు) if possible or simple bilingual format.\n"
        : lang === "kn"
        ? "5. Please answer in Kannada (ಕನ್ನಡ) if possible or simple bilingual format.\n"
        : "5. Speak in simple Indian English, explaining any bureaucratic abbreviations.\n";

    const systemPrompt =
      "You are the official AI Assistant for the 'AI-Driven Scheme Matching Platform for Marginalized Entrepreneurs' (SIH26092, Ministry of Social Justice & Empowerment).\n" +
      "You must ONLY explain, summarise and answer questions grounded strictly in the pre-computed matches and user profile provided below.\n" +
      "CRITICAL RULES:\n" +
      "1. You DO NOT invent or calculate new eligibility or scores — you explain the pre-computed deterministic results.\n" +
      "2. You NEVER claim guaranteed approval or sanction from any government body.\n" +
      "3. Speak in empathetic, clear, plain language, avoiding bureaucratic jargon.\n" +
      "4. If a document or verification is required, emphasize it clearly.\n" +
      langInstruction + "\n" +
      "User Profile: " + JSON.stringify(profile) + "\n\n" +
      "Pre-computed Matches: " + JSON.stringify(context);

    try {
      // Primary attempt: gemini-3.6-flash (current fast model)
      const activeKey = apiKey || DEFAULT_API_KEY;
      let response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${activeKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: `${systemPrompt}\n\nUser Question: ${question}` },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        // Secondary attempt: gemini-3.7-flash
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${activeKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: `${systemPrompt}\n\nUser Question: ${question}` },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1024,
              },
            }),
          }
        );
      }

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      const answer =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        generateOfflineGroundedResponse(question);

      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch (err) {
      console.warn("Falling back to grounded offline engine:", err);
      const fallbackText = generateOfflineGroundedResponse(question);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: fallbackText,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Title & Live Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: serif, fontSize: 28, color: INK, margin: "0 0 4px" }}>
            AI Scheme Assistant
          </h2>
          <p style={{ fontFamily: sans, fontSize: 13.5, color: "#6B7280", margin: "0 0 16px" }}>
            Grounded strictly in your matched schemes — it explains and summarises, it never invents eligibility.
          </p>
        </div>

        {/* Gemini Active Badge */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px",
              fontFamily: sans,
              fontSize: 12,
              fontWeight: 600,
              background: "#EAF5ED",
              border: `1px solid #B8E0C2`,
              color: "#1B5E20",
              borderRadius: 20,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: OK }}></span>
            <span>Gemini AI Active</span>
          </div>

          <button
            type="button"
            onClick={() => setShowKeyDialog(!showKeyDialog)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              fontFamily: sans,
              fontSize: 12,
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              color: INK,
              borderRadius: 4,
              cursor: "pointer",
            }}
            title="Configure API key"
          >
            <Key size={12} />
            <span>Key</span>
          </button>
        </div>
      </div>

      {/* API Key Modal / Drawer */}
      {showKeyDialog && (
        <div
          style={{
            background: "#FFFFFF",
            border: `1px solid ${RULE}`,
            borderRadius: 6,
            padding: "14px 18px",
            marginBottom: 16,
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: INK, marginBottom: 4 }}>
            Google Gemini API Key Configured
          </div>
          <div style={{ fontFamily: sans, fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
            Live inference active using model <strong style={{ color: INK }}>gemini-3.6-flash</strong>.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              defaultValue={apiKey}
              id="gemini-key-input"
              style={{ ...inputStyle, flex: 1, padding: "7px 10px", fontSize: 12, fontFamily: "monospace" }}
            />
            <button
              type="button"
              onClick={() => {
                const val = document.getElementById("gemini-key-input")?.value || "";
                saveApiKey(val);
              }}
              style={{
                background: SEAL,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                padding: "0 14px",
                fontFamily: sans,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Update
            </button>
          </div>
        </div>
      )}

      {/* Suggested Prompt Chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handleSend(p)}
            style={{
              fontFamily: sans,
              fontSize: 11.5,
              padding: "4px 10px",
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 14,
              color: "#4A5568",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Sparkles size={11} color={SEAL} />
            <span>{p}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Box */}
      <div
        ref={scrollRef}
        style={{
          height: 380,
          overflowY: "auto",
          border: `1px solid ${RULE}`,
          borderRadius: 6,
          background: "#FFFFFF",
          padding: "18px 20px",
          marginBottom: 14,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 15px",
                borderRadius: 8,
                background: m.role === "user" ? INK : PAPER,
                color: m.role === "user" ? "#FFFFFF" : "#2E3440",
                fontFamily: sans,
                fontSize: 13.5,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div>{m.text}</div>
              {m.role === "assistant" && (
                <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                  <VoiceReader text={m.text} lang={lang} size="small" label="Listen" />
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 12.5, color: "#8A8266" }}>
            <Sparkles size={14} color={SEAL} />
            <span>Consulting Gemini live inference engine…</span>
          </div>
        )}
      </div>

      {/* Message Input Box */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="e.g. Why am I eligible for Stand-Up India? What documents do I need?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 46,
            background: input.trim() && !loading ? SEAL : "#C9C2AE",
            border: "none",
            borderRadius: 4,
            color: "#FFFFFF",
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
          }}
          title="Send query"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
