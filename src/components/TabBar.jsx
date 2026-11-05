import React from "react";
import {
  Landmark,
  SlidersHorizontal,
  FileCheck2,
  Clock,
  FolderUp,
  MessageCircle,
  UserCheck,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { GOVT_NAVY, SAFFRON, RULE, INK, sans } from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";

export default function TabBar({
  screen,
  setScreen,
  hasResults = false,
  docCount = 0,
  appCount = 0,
  currentUser = null,
  lang = "en",
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const tabs = [
    { id: "home", label: t.navHome || "Home", icon: Landmark, enabled: true },
    { id: "profile", label: t.navProfile || "Check Eligibility", icon: SlidersHorizontal, enabled: true },
    { id: "results", label: t.navResults || "Scheme Directory", icon: FileCheck2, enabled: true },
    {
      id: "tracker",
      label: t.navTracker || "Track Application",
      icon: Clock,
      enabled: true,
      badge: appCount > 0 ? appCount : null,
    },
    {
      id: "documents",
      label: t.navDocuments || "Document Vault",
      icon: FolderUp,
      enabled: true,
      badge: docCount > 0 ? docCount : null,
    },
    { id: "assistant", label: t.navAssistant || "AI Sahayak", icon: MessageCircle, enabled: true },
    currentUser?.systemRole === "admin"
      ? {
          id: "admin-dashboard",
          label: t.navAdminConsole || "Admin Portal",
          icon: ShieldCheck,
          enabled: true,
          highlight: true,
        }
      : currentUser
      ? {
          id: "dashboard",
          label: currentUser.name ? currentUser.name.split(" ")[0] : (t.navMyDashboard || "Dashboard"),
          icon: UserCheck,
          enabled: true,
        }
      : {
          id: "login",
          label: t.navCitizenLogin || "Citizen Sign In",
          icon: KeyRound,
          enabled: true,
        },
  ];

  return (
    <nav
      role="tablist"
      aria-label="Portal Navigation"
      style={{
        display: "flex",
        gap: 4,
        borderBottom: `2px solid ${GOVT_NAVY}`,
        marginBottom: 20,
        overflowX: "auto",
        paddingBottom: 0,
      }}
    >
      {tabs.map((tab) => {
        const active =
          screen === tab.id || (tab.id === "results" && screen === "details");
        const TabIcon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            disabled={!tab.enabled}
            onClick={() => tab.enabled && setScreen(tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 16px",
              fontFamily: sans,
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              border: "none",
              borderTop: active ? `2px solid ${SAFFRON}` : "2px solid transparent",
              borderLeft: active ? `1px solid ${RULE}` : "1px solid transparent",
              borderRight: active ? `1px solid ${RULE}` : "1px solid transparent",
              borderBottom: active ? "2px solid #FFFFFF" : "2px solid transparent",
              marginBottom: -2,
              background: active ? "#FFFFFF" : "transparent",
              color: active ? GOVT_NAVY : tab.enabled ? "#475569" : "#94A3B8",
              cursor: tab.enabled ? "pointer" : "not-allowed",
              borderRadius: "6px 6px 0 0",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            <TabIcon
              size={15}
              color={
                active
                  ? SAFFRON
                  : tab.highlight
                  ? "#D97706"
                  : tab.enabled
                  ? "#64748B"
                  : "#CBD5E1"
              }
            />
            <span>{tab.label}</span>

            {tab.badge !== null && tab.badge !== undefined && (
              <span
                style={{
                  fontSize: 10,
                  background: active ? SAFFRON : "#64748B",
                  color: "#FFFFFF",
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
