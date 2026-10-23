import React, { useState } from "react";
import {
  User,
  IndianRupee,
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  UploadCloud,
  HeartHandshake,
  ShieldCheck,
  Info,
} from "lucide-react";
import Field from "../components/Field.jsx";
import VoiceReader from "../components/VoiceReader.jsx";
import {
  INK,
  INK_MUTED,
  INK_LIGHT,
  PAPER,
  CARD,
  SURFACE_MUTED,
  SEAL,
  SEAL_HOVER,
  OK,
  RULE,
  RULE_LIGHT,
  inputStyle,
  serif,
  sans,
} from "../theme/tokens.js";
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
  isSaving = false,
}) {
  const [currentStep, setCurrentStep] = useState(1); // 1: Demographics, 2: Category & Groups, 3: Economic & Enterprise
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

  const isStep1Valid = profile.age !== "" && profile.gender && profile.state;
  const isStep2Valid = Boolean(profile.category);
  const isStep3Valid =
    profile.income !== "" &&
    profile.businessStatus &&
    profile.businessType &&
    profile.financialRequirement !== "";

  const canSubmit = isStep1Valid && isStep2Valid && isStep3Valid;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* Back button */}
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
            color: INK_MUTED,
            cursor: "pointer",
            fontFamily: sans,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
            padding: 0,
          }}
        >
          <ArrowLeft size={14} /> Back to Overview
        </button>
      )}

      {/* Header and Voice Reader */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: serif,
              fontSize: 26,
              color: INK,
              margin: "0 0 4px 0",
              fontWeight: 700,
            }}
          >
            Scheme Eligibility Questionnaire
          </h1>
          <p style={{ fontFamily: sans, fontSize: 13.5, color: INK_MUTED, margin: 0 }}>
            Enter your details to identify all matching central and state welfare initiatives.
          </p>
        </div>

        <VoiceReader
          text={
            lang === "hi"
              ? "कृपया अपनी आयु, सामाजिक वर्ग, वार्षिक आय और उद्यम आवश्यकता भरें। नियम इंजन आपके लिए उपयुक्त योजनाएं जांचेगा।"
              : "Please enter your demographic, social group, and financial parameters to calculate eligibility."
          }
          lang={lang}
          label={t.listen}
        />
      </div>

      {/* Step Progress Bar */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${RULE}`,
          borderRadius: 4,
          padding: "12px 18px",
          marginTop: 18,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
          {[
            { step: 1, label: "1. Demographics" },
            { step: 2, label: "2. Social Category" },
            { step: 3, label: "3. Enterprise & Income" },
          ].map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              style={{
                background: "none",
                border: "none",
                padding: "2px 6px",
                cursor: "pointer",
                fontFamily: sans,
                fontSize: 12.5,
                fontWeight: currentStep === s.step ? 700 : 500,
                color: currentStep === s.step ? SEAL : currentStep > s.step ? OK : INK_MUTED,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {currentStep > s.step && <CheckCircle2 size={13} color={OK} />}
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Progress track */}
        <div style={{ height: 4, background: SURFACE_MUTED, borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: currentStep === 1 ? "33.3%" : currentStep === 2 ? "66.6%" : "100%",
              background: SEAL,
              transition: "width 0.25s ease",
            }}
          />
        </div>
      </div>

      {/* Questionnaire Form Container */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${RULE}`,
          borderRadius: 4,
          padding: "24px 24px",
          marginBottom: 24,
          boxShadow: "0 1px 3px rgba(22, 32, 50, 0.04)",
        }}
      >
        {/* ========================================================= */}
        {/* STEP 1: DEMOGRAPHICS & LOCATION                           */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <div>
            <div style={{ borderBottom: `1px solid ${RULE_LIGHT}`, paddingBottom: 10, marginBottom: 18 }}>
              <h2 style={{ fontFamily: sans, fontSize: 16, fontWeight: 700, color: INK, margin: "0 0 4px" }}>
                Step 1: Personal Demographics &amp; Domicile
              </h2>
              <p style={{ fontFamily: sans, fontSize: 12.5, color: INK_MUTED, margin: 0 }}>
                Age and state of residence determine whether central sector or state-specific schemes apply.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 18 }}>
              <Field
                label="Age (Years) *"
                hint="Ministry guidelines establish strict minimum (18) and maximum (55–100) bounds."
              >
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={profile.age}
                  onChange={setNum("age")}
                  placeholder="e.g. 28"
                  style={inputStyle}
                  required
                />
              </Field>

              <Field
                label="Gender *"
                hint="Enables special concessional provisions for Women Entrepreneurs (e.g. WEP, Stand-Up)."
              >
                <select value={profile.gender} onChange={set("gender")} style={inputStyle} required>
                  <option value="">Select Gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Transgender">Transgender (Eligible for SMILE Scheme)</option>
                  <option value="Other">Other</option>
                </select>
              </Field>

              <Field
                label="State of Domicile *"
                hint="Used to filter state-specific subsidies and channelizing agencies (SCAs)."
              >
                <select value={profile.state} onChange={set("state")} style={inputStyle} required>
                  <option value="">Select State / UT</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Educational Qualification"
                hint="Used to verify scholarship, fellowship, and technical degree prerequisites."
              >
                <select value={profile.education || ""} onChange={set("education")} style={inputStyle}>
                  <option value="">Select Qualification (Optional)</option>
                  <option value="Below 10th">Below 10th Standard</option>
                  <option value="10th Pass">10th Pass (Matriculation)</option>
                  <option value="12th Pass">12th Pass (Higher Secondary)</option>
                  <option value="ITI / Diploma">ITI / Polytechnic Diploma</option>
                  <option value="Graduate">Graduate (B.A., B.Sc., B.Com, B.Tech)</option>
                  <option value="Post Graduate">Post Graduate (M.A., M.Sc., M.Tech, etc.)</option>
                  <option value="Doctorate">Doctorate / Ph.D. / Professional Degree</option>
                </select>
              </Field>

              <Field
                label="Primary Occupation / Status"
                hint="Matches designated livelihood initiatives (e.g. Kisan credit, scholarships, vendor loans)."
              >
                <select value={profile.occupation || ""} onChange={set("occupation")} style={inputStyle}>
                  <option value="">Select Occupation (Optional)</option>
                  <option value="Student">Student (Scholarships / Fellowships)</option>
                  <option value="Farmer">Farmer / Cultivator / Dairy Producer</option>
                  <option value="Artisan">Traditional Artisan / Handloom Weaver</option>
                  <option value="Sanitation Worker">Sanitation Worker / Safai Karamchari</option>
                  <option value="Street Vendor">Street Vendor / Urban Micro-hawker</option>
                  <option value="Self-Employed">Self-Employed / Shop Owner</option>
                  <option value="Unemployed">Unemployed / Job Seeker</option>
                  <option value="Salaried">Salaried Employee (Public/Private)</option>
                  <option value="Other">Other Livelihood</option>
                </select>
              </Field>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!isStep1Valid}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 22px",
                  background: isStep1Valid ? SEAL : "#CBD5E1",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: isStep1Valid ? "pointer" : "not-allowed",
                }}
              >
                <span>Next: Social Category &amp; Target Groups</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: SOCIAL CATEGORY & AFFIRMATIVE GROUPS              */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <div>
            <div style={{ borderBottom: `1px solid ${RULE_LIGHT}`, paddingBottom: 10, marginBottom: 18 }}>
              <h2 style={{ fontFamily: sans, fontSize: 16, fontWeight: 700, color: INK, margin: "0 0 4px" }}>
                Step 2: Social Category &amp; Affirmative Action Groups
              </h2>
              <p style={{ fontFamily: sans, fontSize: 12.5, color: INK_MUTED, margin: 0 }}>
                Ministry of Social Justice &amp; Empowerment mandates dedicated concessions for marginalized groups.
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <Field
                label="Primary Social Category *"
                hint="Select the category listed on your government caste/community certificate."
              >
                <select value={profile.category} onChange={set("category")} style={inputStyle} required>
                  <option value="">Select Social Category</option>
                  <option value="SC">Scheduled Caste (SC) — NSFDC Eligible</option>
                  <option value="ST">Scheduled Tribe (ST) — NSTFDC Eligible</option>
                  <option value="OBC">Other Backward Classes (OBC) — NBCFDC Eligible</option>
                  <option value="General">General / Open Category</option>
                  <option value="EWS">Economically Weaker Section (EWS)</option>
                </select>
              </Field>
            </div>

            {/* Special MoSJE Affirmative Group Checkboxes */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 8 }}>
                Specific Ministry Beneficiary Designations (Select all that apply):
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {[
                  {
                    key: "isArtisan",
                    label: "Traditional Artisan / Craftsperson",
                    desc: "Practicing one of 18 trades (carpenters, potters, cobblers, tailors, etc.) for PM Vishwakarma.",
                  },
                  {
                    key: "isSafaiKaramchari",
                    label: "Safai Karamchari / Sanitation Worker",
                    desc: "Sanitation workers, manual scavengers, and their dependents (NSKFDC schemes).",
                  },
                  {
                    key: "isDivyangjan",
                    label: "Person with Disability (Divyangjan)",
                    desc: "Persons with disability holding a valid UDID card (NHFDC concessional loans).",
                  },
                  {
                    key: "isTransgender",
                    label: "Transgender Community Member",
                    desc: "Transgender individuals eligible for comprehensive livelihood support under SMILE.",
                  },
                  {
                    key: "isDnt",
                    label: "De-Notified / Nomadic / Semi-Nomadic Tribe",
                    desc: "Members of DNT/NT/SNT communities eligible for the national SEED scheme.",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 12px",
                      background: profile[item.key] ? "#FDF8F3" : "#FFFFFF",
                      border: `1px solid ${profile[item.key] ? SEAL : RULE}`,
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(profile[item.key])}
                      onChange={toggleCheck(item.key)}
                      style={{ marginTop: 3, accentColor: SEAL }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{item.label}</div>
                      <div style={{ fontSize: 11.5, color: INK_MUTED, marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 18px",
                  background: CARD,
                  border: `1px solid ${RULE}`,
                  color: INK,
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} />
                <span>Previous Step</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={!isStep2Valid}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 22px",
                  background: isStep2Valid ? SEAL : "#CBD5E1",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: isStep2Valid ? "pointer" : "not-allowed",
                }}
              >
                <span>Next: Income &amp; Enterprise</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: ECONOMIC & ENTERPRISE PROFILE                     */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <div>
            <div style={{ borderBottom: `1px solid ${RULE_LIGHT}`, paddingBottom: 10, marginBottom: 18 }}>
              <h2 style={{ fontFamily: sans, fontSize: 16, fontWeight: 700, color: INK, margin: "0 0 4px" }}>
                Step 3: Economic Profile &amp; Project Funding
              </h2>
              <p style={{ fontFamily: sans, fontSize: 12.5, color: INK_MUTED, margin: 0 }}>
                Income limits and financial requirements match you to appropriate term loans, capital subsidies, or micro-credit.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 18 }}>
              <Field
                label="Annual Family Income (₹) *"
                hint="Total income of family as shown on Revenue authority income certificate."
              >
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={profile.income}
                  onChange={setNum("income")}
                  placeholder="e.g. 150000"
                  style={inputStyle}
                  required
                />
              </Field>

              <Field
                label="Funding / Loan Requirement (₹) *"
                hint="Capital needed for tools, working capital, or workshop machinery."
              >
                <input
                  type="number"
                  min="1000"
                  step="10000"
                  value={profile.financialRequirement}
                  onChange={setNum("financialRequirement")}
                  placeholder="e.g. 200000"
                  style={inputStyle}
                  required
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
              <Field
                label="Enterprise Status *"
                hint="Some programs (like PMEGP) fund new units; others modernize existing trades."
              >
                <select value={profile.businessStatus} onChange={set("businessStatus")} style={inputStyle} required>
                  <option value="">Select Enterprise Status</option>
                  <option value="new">New Enterprise (Starting Fresh)</option>
                  <option value="existing">Existing Enterprise (Expansion / Modernization)</option>
                </select>
              </Field>

              <Field
                label="Sector / Business Type *"
                hint="Manufacturing qualifies for higher maximum subsidies under PMEGP and NSFDC."
              >
                <select value={profile.businessType} onChange={set("businessType")} style={inputStyle} required>
                  <option value="">Select Sector</option>
                  <option value="Manufacturing">Manufacturing / Fabrication / Production</option>
                  <option value="Services">Services (Repairs, Beauty, IT, Logistics)</option>
                  <option value="Trading">Trading / Retail / Micro-vending</option>
                </select>
              </Field>
            </div>

            {/* Statutory Exclusions & Welfare Ration Card Checks */}
            <div style={{ marginTop: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 8 }}>
                Statutory Exclusions &amp; Ration Cards:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    background: profile.hasBplCard ? "#FDF8F3" : "#FFFFFF",
                    border: `1px solid ${profile.hasBplCard ? SEAL : RULE}`,
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(profile.hasBplCard)}
                    onChange={toggleCheck("hasBplCard")}
                    style={{ marginTop: 3, accentColor: SEAL }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>
                      Hold valid BPL / Antyodaya Ration Card
                    </div>
                    <div style={{ fontSize: 11.5, color: INK_MUTED, marginTop: 2 }}>
                      Mandatory for destitute pensions, NSAP, and free welfare allotments.
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    background: profile.isTaxPayer ? "#FEF2F2" : "#FFFFFF",
                    border: `1px solid ${profile.isTaxPayer ? "#DC2626" : RULE}`,
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(profile.isTaxPayer)}
                    onChange={toggleCheck("isTaxPayer")}
                    style={{ marginTop: 3, accentColor: "#DC2626" }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>
                      Income Tax Payee (Filed ITR in past 3 years)
                    </div>
                    <div style={{ fontSize: 11.5, color: INK_MUTED, marginTop: 2 }}>
                      Statutory scheme guidelines for APY and social pensions disqualify income-tax payers.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 18px",
                  background: CARD,
                  border: `1px solid ${RULE}`,
                  color: INK,
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} />
                <span>Previous Step</span>
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit || isSaving}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 28px",
                  background: canSubmit && !isSaving ? SEAL : "#CBD5E1",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: canSubmit && !isSaving ? "pointer" : "not-allowed",
                  boxShadow: canSubmit && !isSaving ? "0 1px 3px rgba(163, 86, 25, 0.25)" : "none",
                }}
              >
                <span>{isSaving ? "Persisting Profile to Database..." : "Calculate Eligible Schemes"}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Optional Document Upload Helper Banner */}
      {onGoToDocuments && (
        <div
          style={{
            background: SURFACE_MUTED,
            border: `1px solid ${RULE}`,
            borderRadius: 4,
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UploadCloud size={16} color={SEAL} />
            <span style={{ fontSize: 13, color: INK }}>
              Already have your Aadhaar or Caste Certificate PDFs ready?
            </span>
          </div>
          <button
            type="button"
            onClick={onGoToDocuments}
            style={{
              background: "none",
              border: "none",
              color: SEAL,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Open Document Vault →
          </button>
        </div>
      )}
    </div>
  );
}
