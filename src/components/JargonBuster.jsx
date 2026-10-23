import React from "react";
import { X, BookOpen, Check, Sparkles } from "lucide-react";
import { INK, CARD, SEAL, RULE, serif, sans } from "../theme/tokens.js";

export const GLOSSARY = [
  {
    term: "Margin Money Subsidy",
    hindi: "मार्जिन मनी सब्सिडी (मुफ्त सरकारी अनुदान)",
    simple:
      "This is a 15%–35% direct grant from the government towards your project cost. YOU NEVER HAVE TO REPAY THIS MONEY back to the bank or government.",
    simpleHi:
      "यह सरकार द्वारा आपके कुल काम की लागत का 15% से 35% मुफ्त अनुदान है। यह पैसा आपको कभी भी बैंक या सरकार को वापस नहीं लौटाना है।",
  },
  {
    term: "Collateral-Free Loan",
    hindi: "कोलेटरल-फ्री लोन (बिना किसी गिरवी के ऋण)",
    simple:
      "You DO NOT need to pledge land, house papers, or gold. The Government of India (via CGTMSE / CGFMU) gives a 100% security guarantee to the bank on your behalf.",
    simpleHi:
      "आपको लोन लेने के लिए अपनी ज़मीन, मकान के कागजात या सोना गिरवी रखने की बिल्कुल ज़रूरत नहीं है। आपकी गारंटी खुद भारत सरकार बैंक को देती है।",
  },
  {
    term: "Moratorium Period",
    hindi: "मोरेटोरियम अवधि (किस्त शुरू होने से पहले की छूट)",
    simple:
      "A holiday or grace period (usually 6 to 12 months) before your monthly loan repayments (EMIs) begin. This gives you time to set up machines and start earning.",
    simpleHi:
      "लोन मिलने के बाद पहले 6 से 12 महीने तक आपको कोई मासिक किस्त (EMI) नहीं देनी होती, ताकि आप काम शुरू कर सकें और कमाई होने लगे।",
  },
  {
    term: "DPR (Detailed Project Report)",
    hindi: "डीपीआर (विस्तृत परियोजना रिपोर्ट)",
    simple:
      "A simple 2-to-3 page document showing what machinery you will buy, raw material costs, monthly revenue estimate, and how many people you will employ.",
    simpleHi:
      "यह सिर्फ 2 पन्नों का हिसाब-किताब है कि आप कौन सी मशीन खरीदेंगे, माल कहाँ से लाएंगे और हर महीने कितना मुनाफा कमाएंगे।",
  },
  {
    term: "Working Capital vs Term Loan",
    hindi: "वर्किंग कैपिटल और टर्म लोन में अंतर",
    simple:
      "Term Loan is for buying fixed assets (machinery, shed, tools). Working Capital is revolving cash for day-to-day purchases (raw materials, stock, rent, wages).",
    simpleHi:
      "टर्म लोन मशीनरी, दुकान या औजार खरीदने के लिए मिलता है। वर्किंग कैपिटल रोज़ाना कच्चा माल, माल का स्टॉक और दुकान का खर्च चलाने के लिए होता है।",
  },
  {
    term: "Interest Subvention / Rebate",
    hindi: "ब्याज छूट (सबवेंशन)",
    simple:
      "The government pays a part of your bank interest (e.g. 2% to 7%). If you pay your installments on time, your effective interest rate becomes as low as 4% to 6%.",
    simpleHi:
      "सरकार आपके बैंक ब्याज का एक हिस्सा खुद चुकाती है। समय पर किस्त भरने पर आपको 2% से 7% तक ब्याज की सीधी छूट मिलती है।",
  },
  {
    term: "Greenfield Enterprise",
    hindi: "ग्रीनफील्ड इकाई (नया व्यवसाय)",
    simple:
      "A brand-new business that is starting operations for the first time, not an expansion of an existing factory.",
    simpleHi:
      "बिल्कुल नई दुकान, कारखाना या सेवा केंद्र जो पहली बार शुरू हो रहा हो।",
  },
  {
    term: "Udyam Registration",
    hindi: "उद्यम पंजीकरण (मुफ्त सरकारी एमएसएमई पहचान)",
    simple:
      "A completely free, 5-minute online government ID for small businesses based on your Aadhaar card. No physical paper or fee is required.",
    simpleHi:
      "आधार कार्ड से 5 मिनट में बनने वाला बिल्कुल मुफ्त सरकारी पहचान पत्र। इसके लिए किसी को कोई रिश्वत या फीस नहीं देनी होती।",
  },
];

export function simplifyGovtText(text, isPlainMode, lang = "en") {
  if (!isPlainMode || !text) return text;

  let out = text;
  if (lang === "hi") {
    out = out
      .replace(/Margin-money subsidy/gi, "मुफ्त सरकारी अनुदान (जो वापस नहीं करना)")
      .replace(/subsidy of/gi, "मुफ्त सरकारी छूट")
      .replace(/Collateral-free/gi, "बिना किसी गिरवी (जमीन/मकान) के")
      .replace(/Detailed Project Report/gi, "2 पन्नों का आसान प्रोजेक्ट हिसाब")
      .replace(/Greenfield/gi, "बिल्कुल नया काम")
      .replace(/working capital/gi, "दुकान/माल चलाने का खर्च")
      .replace(/term loan/gi, "मशीनरी खरीदने का लोन");
  } else {
    out = out
      .replace(/Margin-money subsidy of/gi, "Free Govt grant (no repayment needed) of")
      .replace(/margin-money subsidy/gi, "free grant (no repayment required)")
      .replace(/Collateral-free/gi, "No property/gold mortgage needed")
      .replace(/Detailed Project Report \(DPR\)/gi, "Simple 2-page equipment & sales estimate")
      .replace(/Greenfield/gi, "Brand-new start")
      .replace(/working capital/gi, "daily inventory & running expenses");
  }
  return out;
}

export default function JargonBusterModal({ isOpen, onClose, lang = "en" }) {
  if (!isOpen) return null;

  const isHindi = lang === "hi";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(35, 50, 74, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: CARD,
          maxWidth: 720,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: 8,
          border: `1px solid ${RULE}`,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          padding: "24px 28px",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: SEAL, marginBottom: 4 }}>
              <BookOpen size={18} />
              <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {isHindi ? "सरकारी शब्दों का सरल अर्थ कोष" : "Plain Language Jargon Buster"}
              </span>
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 24, color: INK, margin: 0 }}>
              {isHindi ? "बैंकिंग और योजना शब्दों का आसान मतलब" : "Demystifying Banking & Scheme Terminology"}
            </h2>
            <p style={{ fontFamily: sans, fontSize: 13, color: "#6B7280", margin: "4px 0 0" }}>
              {isHindi
                ? "बैंक और सरकारी दफ्तरों में इस्तेमाल होने वाले कठिन शब्दों को अपनी आम भाषा में समझें।"
                : "No confusing bureaucratic speak. Here is what officials and bank managers really mean."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              color: INK,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
          {GLOSSARY.map((g, idx) => (
            <div
              key={idx}
              style={{
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 6,
                padding: "14px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: serif,
                    fontSize: 16,
                    fontWeight: 700,
                    color: INK,
                  }}
                >
                  {isHindi ? g.hindi : g.term}
                </span>
                {!isHindi && (
                  <span style={{ fontFamily: sans, fontSize: 12, color: "#8A8266" }}>
                    ({g.hindi})
                  </span>
                )}
              </div>
              <p
                style={{
                  fontFamily: sans,
                  fontSize: 13.5,
                  color: "#374151",
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {isHindi ? g.simpleHi : g.simple}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22, textAlign: "right" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 20px",
              background: INK,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 4,
              fontFamily: sans,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isHindi ? "समझ गया, बंद करें ✓" : "Got It, Close ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
