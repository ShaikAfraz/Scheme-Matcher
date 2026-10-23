import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import VoiceReader from "../components/VoiceReader.jsx";
import { INK, PAPER, SEAL, OK, RULE, inputStyle, serif, sans } from "../theme/tokens.js";

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
      text: "Namaste! I am your AI Scheme Assistant, grounded in your demographic profile and pre-computed matching results. Ask me anything about eligibility criteria, required certificates, subsidies, or step-by-step application guidance.",
    },
  ]);
  const [input, setInput] = useState(initialQuery || "");
  const [loading, setLoading] = useState(false);

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

  /**
   * Client-side deterministic grounded response fallback
   */
  const generateOfflineGroundedResponse = (query) => {
    const q = query.toLowerCase();
    const top = matches[0];
    const second = matches[1];

    if (!top) {
      return "Please complete your entrepreneur profile to receive tailored guidance on government schemes.";
    }

    if (q.includes("best") || q.includes("which scheme") || q.includes("recommend")) {
      return (
        `Based on your profile (${profile.age || 28}yo, ${profile.category || "General"} category, ${profile.gender || "Citizen"}, ${profile.businessType || "Manufacturing"}), ` +
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
      `• Category: ${profile.category || "General"} (${profile.gender || "Citizen"})\n` +
      `• Need: ₹${Number(profile.financialRequirement || 150000).toLocaleString("en-IN")} (${profile.businessType || "Manufacturing"}, ${profile.businessStatus || "new"})\n` +
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

    try {
      // Secure server-side AI proxy (Never exposes API keys to client browser)
      const token = localStorage.getItem("scheme_matcher_auth_token");
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers,
        body: JSON.stringify({
          question,
          user_profile: profile,
          matched_schemes: matches,
          lang,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const answer = data.answer || generateOfflineGroundedResponse(question);
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch (err) {
      console.warn("Server AI proxy unreachable, using local deterministic engine:", err.message);
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

        {/* Secure Server Proxy Badge */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              fontFamily: sans,
              fontSize: 11.5,
              fontWeight: 600,
              background: "#F0FDF4",
              border: `1px solid #BBF7D0`,
              color: "#166534",
              borderRadius: 4,
            }}
          >
            <ShieldCheck size={13} color={OK} />
            <span>Server-Side AI Proxy Active</span>
          </div>
        </div>
      </div>

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
              borderRadius: 4,
              color: "#475569",
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
          borderRadius: 4,
          background: "#FFFFFF",
          padding: "16px 18px",
          marginBottom: 14,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: 4,
                background: m.role === "user" ? "#162032" : "#F8F6F0",
                color: m.role === "user" ? "#FFFFFF" : INK,
                fontFamily: sans,
                fontSize: 13,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                border: m.role === "user" ? "none" : `1px solid ${RULE}`,
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
            <span>Consulting AI inference engine securely…</span>
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
