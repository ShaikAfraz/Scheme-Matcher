import React from "react";
import { Landmark, User, FileCheck2, MessageCircle, FolderUp, UserCheck, KeyRound } from "lucide-react";
import { INK, CARD, SEAL, sans } from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";

export default function TabBar({
  screen,
  setScreen,
  hasResults,
  docCount = 0,
  currentUser = null,
  lang = "en",
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const tabs = [
    { id: "home", label: t.navHome || "Home", icon: Landmark, enabled: true },
    {
      id: "login",
      label: currentUser ? `${currentUser.name.split(" ")[0]} (Profile)` : "Login / Demo",
      icon: currentUser ? UserCheck : KeyRound,
      enabled: true,
      highlight: !currentUser,
    },
    { id: "profile", label: t.navProfile || "Scheme Form", icon: User, enabled: true },
    { id: "results", label: t.navResults || "Results", icon: FileCheck2, enabled: hasResults },
    { id: "documents", label: t.navDocuments || "Documents", icon: FolderUp, enabled: true },
    { id: "assistant", label: t.navAssistant || "AI Assistant", icon: MessageCircle, enabled: hasResults },
  ];

  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 2,
        borderBottom: `2px solid ${INK}`,
        marginBottom: 20,
        overflowX: "auto",
      }}
    >
      {tabs.map((tab) => {
        const active =
          screen === tab.id || (tab.id === "results" && screen === "details");
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            disabled={!tab.enabled}
            onClick={() => tab.enabled && setScreen(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              fontFamily: sans,
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              letterSpacing: 0.2,
              border: "none",
              borderTop: `1px solid ${active ? INK : "transparent"}`,
              borderLeft: `1px solid ${active ? INK : "transparent"}`,
              borderRight: `1px solid ${active ? INK : "transparent"}`,
              borderBottom: active ? `2px solid ${CARD}` : "2px solid transparent",
              marginBottom: -2,
              background: active ? CARD : "transparent",
              color: active ? INK : tab.enabled ? "#4A5568" : "#B7B0A0",
              cursor: tab.enabled ? "pointer" : "not-allowed",
              borderRadius: "6px 6px 0 0",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            <tab.icon
              size={15}
              color={
                active
                  ? INK
                  : tab.id === "login" && !currentUser
                  ? SEAL
                  : tab.enabled
                  ? "#5C6B84"
                  : "#B7B0A0"
              }
            />
            <span>{tab.label}</span>

            {tab.id === "login" && currentUser && (
              <span
                style={{
                  fontSize: 10,
                  background: "#2F5D50",
                  color: "#FFFFFF",
                  padding: "1px 5px",
                  borderRadius: 8,
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
            )}

            {tab.id === "results" && hasResults && (
              <span
                style={{
                  fontSize: 10.5,
                  background: active ? INK : "#DCD5C0",
                  color: active ? "#FFFFFF" : INK,
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
            )}
            {tab.id === "documents" && docCount > 0 && (
              <span
                style={{
                  fontSize: 10.5,
                  background: active ? INK : "#DCD5C0",
                  color: active ? "#FFFFFF" : INK,
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {docCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
