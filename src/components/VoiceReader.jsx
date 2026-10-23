import React, { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { INK, SEAL, sans } from "../theme/tokens.js";

export default function VoiceReader({
  text,
  lang = "en",
  label = "Listen",
  size = "small",
  color = INK,
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);
    }
  }, []);

  const handleSpeak = (e) => {
    e.stopPropagation();
    if (!isSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any pending utterances
    const utterance = new SpeechSynthesisUtterance(text);

    // Pick voice if available
    const voices = window.speechSynthesis.getVoices();
    if (lang === "hi") {
      utterance.lang = "hi-IN";
      const hindiVoice = voices.find((v) => v.lang.includes("hi"));
      if (hindiVoice) utterance.voice = hindiVoice;
    } else if (lang === "ta") {
      utterance.lang = "ta-IN";
    } else if (lang === "te") {
      utterance.lang = "te-IN";
    } else if (lang === "kn") {
      utterance.lang = "kn-IN";
    } else {
      utterance.lang = "en-IN";
      const indianVoice = voices.find((v) => v.lang.includes("en-IN") || v.name.includes("India"));
      if (indianVoice) utterance.voice = indianVoice;
    }

    utterance.rate = 0.95; // slightly slower for maximum clarity
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={handleSpeak}
      title={isSpeaking ? "Stop speech" : "Read text aloud in audio"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: size === "small" ? "4px 8px" : "6px 12px",
        background: isSpeaking ? "#FDE8E4" : "#F6F1E5",
        border: `1px solid ${isSpeaking ? "#C95D51" : SEAL}`,
        borderRadius: 4,
        color: isSpeaking ? "#8B2319" : color,
        fontFamily: sans,
        fontSize: size === "small" ? 11.5 : 12.5,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {isSpeaking ? (
        <>
          <VolumeX size={size === "small" ? 13 : 15} color="#8B2319" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <Volume2 size={size === "small" ? 13 : 15} color={SEAL} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
