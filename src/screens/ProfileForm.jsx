import React from "react";
import { User, IndianRupee, Building2, ArrowRight, Sparkles, UploadCloud, HeartHandshake, ShieldCheck } from "lucide-react";
import Field from "../components/Field.jsx";
import VoiceReader from "../components/VoiceReader.jsx";
import { INK, SEAL, OK, RULE, inputStyle, serif, sans } from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";

const STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
  "Other",
];

export default function ProfileForm({
  profile,
  setProfile,
  onSubmit,
  onGoToDocuments,
  onBack,
  lang = "en",
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const set = (k) => (e) => {
    const v = e.target.value;
    setProfile((p) => ({ ...p, [k]: v }));
  };

  const setNum = (k) => (e) => {
    const v = e.target.value === "" ? "" : Number(e.target.value);
    setProfile((p) => ({ ...p, [k]: v }));
  };

  const toggleCheck = (k) => () => {
    setProfile((p) => ({ ...p, [k]: !p[k] }));
  };

  const canSubmit =
    profile.age !== "" &&
    profile.gender &&
    profile.state &&
    profile.category &&
    profile.income !== "" &&
    profile.businessStatus &&
    profile.businessType &&
    profile.financialRequirement !== "";

  return (
    <div style={{ maxWidth: 680 }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "#5C6B84",
            cursor: "pointer",
            fontFamily: sans,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 14,
            padding: 0,
          }}
        >
          ← Back
        </button>
      )}

      {/* Title & Voice Reader */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
        <h2 style={{ fontFamily: serif, fontSize: 28, color: INK, margin: 0 }}>
          {t.profileTitle}
        </h2>
        <VoiceReader
          text={
            lang === "hi"
              ? "कृपया अपनी आयु, सामाजिक वर्ग, आय और व्यवसाय का प्रकार चुनें। इसके आधार पर आपके लिए उपयुक्त सरकारी योजनाएं जांची जाएंगी।"
              : "Please enter your age, social category, annual income, and funding requirement to discover all government schemes tailored for you."
          }
          lang={lang}
          label={t.listen}
        />
      </div>

      <p style={{ fontFamily: sans, fontSize: 13.5, color: "#6B7280", marginBottom: 18 }}>
        {t.profileSubtitle}
      </p>

      {/* Document Upload Shortcut Banner */}
      {onGoToDocuments && (
        <div
          style={{
            background: "#F2F6FA",
            border: `1px solid #C8D8E8`,
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UploadCloud size={16} color={SEAL} />
            <span style={{ fontFamily: sans, fontSize: 12.5, color: INK }}>
              {t.docUploadShortcut}
            </span>
          </div>
          <button
            type="button"
            onClick={onGoToDocuments}
            style={{
              background: "none",
              border: "none",
              color: SEAL,
              fontFamily: sans,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Upload Documents →
          </button>
        </div>
      )}

      {/* SPECIAL MARGINALIZED STATUS HIGHLIGHT (MoSJE Priority) */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1.5px solid ${SEAL}`,
          borderRadius: 6,
          padding: "14px 16px",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <HeartHandshake size={17} color={SEAL} />
          <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: INK }}>
            {t.specialGroupLabel}
          </span>
        </div>
        <p style={{ fontFamily: sans, fontSize: 12, color: "#6B7280", margin: "0 0 10px" }}>
          Special focus areas under the Ministry of Social Justice &amp; Empowerment with 100% credit guarantee &amp; capital subsidy.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 13, color: INK }}>
            <input
              type="checkbox"
              checked={!!profile.isSafaiKaramchari}
              onChange={toggleCheck("isSafaiKaramchari")}
              style={{ accentColor: SEAL, width: 16, height: 16 }}
            />
            <span>{t.isSafaiKaramchari}</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 13, color: INK }}>
            <input
              type="checkbox"
              checked={!!profile.isDivyangjan}
              onChange={toggleCheck("isDivyangjan")}
              style={{ accentColor: SEAL, width: 16, height: 16 }}
            />
            <span>{t.isDivyangjan}</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 13, color: INK }}>
            <input
              type="checkbox"
              checked={!!profile.isArtisan}
              onChange={toggleCheck("isArtisan")}
              style={{ accentColor: SEAL, width: 16, height: 16 }}
            />
            <span>{t.isArtisan}</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 13, color: INK }}>
            <input
              type="checkbox"
              checked={!!profile.isTransgender}
              onChange={toggleCheck("isTransgender")}
              style={{ accentColor: SEAL, width: 16, height: 16 }}
            />
            <span>{t.isTransgender}</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 13, color: INK }}>
            <input
              type="checkbox"
              checked={!!profile.isDnt}
              onChange={toggleCheck("isDnt")}
              style={{ accentColor: SEAL, width: 16, height: 16 }}
            />
            <span>{t.isDnt}</span>
          </label>
        </div>
      </div>

      {/* SECTION 1: PERSONAL */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <User size={15} color={SEAL} />
        <span style={{ fontFamily: sans, fontSize: 12, letterSpacing: 0.6, fontWeight: 700, color: SEAL }}>
          PERSONAL INFORMATION
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <Field label={t.ageLabel}>
          <input
            style={inputStyle}
            type="number"
            min="18"
            max="100"
            value={profile.age}
            onChange={setNum("age")}
            placeholder="e.g. 28"
          />
        </Field>

        <Field label={t.genderLabel}>
          <select style={inputStyle} value={profile.gender} onChange={set("gender")}>
            <option value="">Select gender</option>
            <option value="Female">Female (महिला)</option>
            <option value="Male">Male (पुरुष)</option>
            <option value="Other">Other / Transgender (किन्नर / तृतीय लिंग)</option>
          </select>
        </Field>

        <Field label={t.stateLabel}>
          <select style={inputStyle} value={profile.state} onChange={set("state")}>
            <option value="">Select state</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label={t.categoryLabel}>
          <select style={inputStyle} value={profile.category} onChange={set("category")}>
            <option value="">Select category</option>
            <option value="SC">Scheduled Caste / अनुसूचित जाति (SC)</option>
            <option value="ST">Scheduled Tribe / अनुसूचित जनजाति (ST)</option>
            <option value="OBC">Other Backward Class / अन्य पिछड़ा वर्ग (OBC)</option>
            <option value="DNT">De-Notified / Nomadic Tribe / विमुक्त घुमंतू (DNT)</option>
            <option value="General">General / EWS (सामान्य / आर्थिक रूप से कमजोर)</option>
          </select>
        </Field>
      </div>

      {/* SECTION 2: FINANCIAL */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "24px 0 14px" }}>
        <IndianRupee size={15} color={SEAL} />
        <span style={{ fontFamily: sans, fontSize: 12, letterSpacing: 0.6, fontWeight: 700, color: SEAL }}>
          FINANCIAL REQUIREMENTS
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <Field label={t.incomeLabel} hint="Used for income-capped concessional schemes">
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="10000"
            value={profile.income}
            onChange={setNum("income")}
            placeholder="e.g. 180000"
          />
        </Field>

        <Field label={t.fundingLabel} hint="Loan, machinery, or micro-capital needed">
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="10000"
            value={profile.financialRequirement}
            onChange={setNum("financialRequirement")}
            placeholder="e.g. 200000"
          />
        </Field>
      </div>

      {/* SECTION 3: BUSINESS */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "24px 0 14px" }}>
        <Building2 size={15} color={SEAL} />
        <span style={{ fontFamily: sans, fontSize: 12, letterSpacing: 0.6, fontWeight: 700, color: SEAL }}>
          BUSINESS DETAILS
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <Field label={t.statusLabel}>
          <select style={inputStyle} value={profile.businessStatus} onChange={set("businessStatus")}>
            <option value="">Select stage</option>
            <option value="new">New enterprise / Greenfield (नया व्यवसाय शुरू करना है)</option>
            <option value="existing">Existing business (पहले से चल रहा काम बढ़ाना है)</option>
          </select>
        </Field>

        <Field label={t.typeLabel}>
          <select style={inputStyle} value={profile.businessType} onChange={set("businessType")}>
            <option value="">Select type</option>
            <option value="Manufacturing">Manufacturing / Production (उत्पादन / निर्माण)</option>
            <option value="Services">Services / Repairs / Salon / Transport (सेवाएं)</option>
            <option value="Trading">Trading / Retail / Street Vending (दुकानदारी / व्यापार)</option>
          </select>
        </Field>
      </div>

      {/* Submit CTA */}
      <div style={{ marginTop: 28 }}>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 26px",
            background: canSubmit ? INK : "#C8BFAD",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 4,
            fontFamily: sans,
            fontSize: 14.5,
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
            letterSpacing: 0.3,
            transition: "all 0.15s ease",
          }}
        >
          <span>{t.matchBtn}</span>
          <ArrowRight size={17} />
        </button>

        {!canSubmit && (
          <p style={{ fontFamily: sans, fontSize: 12, color: "#8A8266", marginTop: 8 }}>
            Please fill in all 8 profile fields above (or click a quick profile preset) to calculate eligibility.
          </p>
        )}
      </div>
    </div>
  );
}
