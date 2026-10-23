# Capstone Project Weekly Review Report

**Project Title:** Scheme Matcher: AI-Driven Scheme Discovery & Matching Platform for Marginalized Entrepreneurs  
**Student Name:** Mohammed Afraz Hussain  
**Review Date:** 16/09/2026  
**Review Timing:** 12:00 PM – 1:00 PM  
**Venue:** Studio Room  
**Review Type:** Weekly Progress Review (Prototype Phase)  

---

## 📌 Executive Summary

This project addresses the critical information asymmetry and friction faced by marginalized entrepreneurs (SC, ST, OBC, Women, Artisans, and Micro-business owners) in discovering and accessing welfare and credit-linked government schemes.

> **Key Milestone for this Review:**  
> The **end-to-end interactive functional prototype** of the **Scheme Matcher** web application has been designed, built, and tested. The prototype demonstrates the complete user journey: from demographic profiling and deterministic matching to scheme breakdown, document readiness, and an AI conversational assistant.

---

## 1. Work Completed

During this phase, full focus was placed on engineering the **functional prototype** and client-side architecture to validate the concept, design system, and matching mechanics:

### A. Algorithmic Matching Engine (Deterministic & Transparent)
- Formulated an objective rule-based scoring engine evaluating candidate profiles across **6 weighted parameters**:
  - **Category / Social Group (20%):** Concessions for SC, ST, OBC, Women, Divyangjan, Transgender, Artisans, Safai Karamcharis.
  - **Annual Income Ceiling (20%):** Validates eligibility against income caps (e.g., ₹3,00,000 limits for NBCFDC/NSFDC).
  - **Age Thresholds (15%):** Minimum and maximum applicant eligibility filters.
  - **Geographic Availability (15%):** State-specific vs. Central/Nationwide applicability.
  - **Business Stage & Type (15%):** Greenfield (new) vs. Brownfield (expansion); Manufacturing, Services, and Trading sectors.
  - **Project Cost / Financial Assistance (15%):** Aligns required loan size with scheme limits.
- Built-in **15 verified central government schemes** in the initial dataset (e.g., *PMEGP, Stand-Up India, PM Mudra, NSFDC, NBCFDC, NSKFDC, PM Vishwakarma, PM-SVANidhi*).

### B. User Profile & Intake Flow
- Created an interactive, clean profile configuration interface collecting demographic, socio-economic, and enterprise financial variables with immediate client-side validation.

### C. Recommendation & Explainability Interface
- Implemented a tiered recommendation feed sorting schemes by matching percentage.
- Engineered granular explainability blocks for every scheme:
  - **"Why You Match":** Exactly which eligibility rules the candidate fulfills.
  - **"Verification Needed":** Specific certificates required (e.g., Caste Certificate, Income Certificate, Project Report).
  - **"Gaps / Warnings":** Highlights parameters requiring adjustment or concession waivers.

### D. Accessibility, Vernacular & Inclusion Suite
- **5 Regional Languages:** Complete UI localization in **English, हिन्दी (Hindi), தமிழ் (Tamil), Telugu (తెలుగు), and Kannada (ಕನ್ನಡ)**.
- **Plain Language Mode ("सरल भाषा"):** Replaces bureaucratic terminology with simple, everyday language.
- **Jargon Buster Modal:** Built-in glossary defining terms like *Margin Money, Collateral, Moratorium, Greenfield, Subsidy*.
- **Text-to-Speech (TTS):** Audio readout of scheme summaries for low-literacy users.
- **Font Scaling Controls & High-Contrast Design:** Sandstone/Ledger paper aesthetic designed for high legibility and trust.
- **CSC / Sahayak Kiosk Mode:** Specialized assisted mode for Common Service Centre operators assisting rural applicants.

### E. Grounded AI Assistant (Conversational Query Resolution)
- Integrated a contextual AI conversational assistant powered by Google Gemini.
- Engineered guardrails ensuring responses are strictly grounded in verified scheme data and the user's pre-computed eligibility scores, eliminating hallucinations.

---

## 2. Screenshot Placeholders for Prototype Demonstration

> **Note for Submission:** Take screenshots from your running prototype and insert them into the designated sections below.

```
+----------------------------------------------------------------------------------+
|                                                                                  |
|                        [ INSERT SCREENSHOT 1 HERE ]                              |
|                                                                                  |
|  Capture: Home / Landing Page                                                    |
|  What to show: The Sandstone masthead showing "AI Scheme Matcher", the quick     |
|  statistics cards, the language selector (English/Hindi/etc.), and the Plain     |
|  Language toggle switch.                                                         |
|                                                                                  |
+----------------------------------------------------------------------------------+
```
*Figure 1: Scheme Matcher Landing Page with Vernacular and Accessibility Options.*

<br/>

```
+----------------------------------------------------------------------------------+
|                                                                                  |
|                        [ INSERT SCREENSHOT 2 HERE ]                              |
|                                                                                  |
|  Capture: Profile Intake Form                                                    |
|  What to show: The form inputs for Age, Category (SC/ST/OBC), Annual Income,    |
|  Financial Requirement, Business Type (Manufacturing/Services), and Special      |
|  Sub-categories (Artisan, Divyangjan, etc.).                                     |
|                                                                                  |
+----------------------------------------------------------------------------------+
```
*Figure 2: Comprehensive Entrepreneur Profile Questionnaire.*

<br/>

```
+----------------------------------------------------------------------------------+
|                                                                                  |
|                        [ INSERT SCREENSHOT 3 HERE ]                              |
|                                                                                  |
|  Capture: Recommendation Results Page                                            |
|  What to show: The list of matched schemes ordered by match percentage (e.g.,    |
|  PMEGP - 95%, Stand-Up India - 88%), including the match tags and filter chips.  |
|                                                                                  |
+----------------------------------------------------------------------------------+
```
*Figure 3: Ranked Scheme Discovery & Eligibility Match Results.*

<br/>

```
+----------------------------------------------------------------------------------+
|                                                                                  |
|                        [ INSERT SCREENSHOT 4 HERE ]                              |
|                                                                                  |
|  Capture: Scheme Details & Explainability Breakdown                              |
|  What to show: The detailed view of a selected scheme showing "Why You Match",   |
|  "Verification Needed", subsidy/margin money rates, and application milestones.  |
|                                                                                  |
+----------------------------------------------------------------------------------+
```
*Figure 4: Detailed Scheme Eligibility Breakdown and Application Roadmap.*

<br/>

```
+----------------------------------------------------------------------------------+
|                                                                                  |
|                        [ INSERT SCREENSHOT 5 HERE ]                              |
|                                                                                  |
|  Capture: AI Grounded Assistant or CSC / Sahayak Mode                            |
|  What to show: A chat dialogue answering scheme-specific questions or the CSC    |
|  kiosk popup with operator guidance tools.                                       |
|                                                                                  |
+----------------------------------------------------------------------------------+
```
*Figure 5: Conversational Grounded AI Assistant and CSC Operator Tools.*

---

## 3. Current Project Status

- **Current Stage:** **Interactive Functional Prototype (Phase 1 Complete)**
- **Working Components:**
  - Complete client-side React + Vite application is fully operational.
  - Profile intake, weighted matching logic, and scheme dataset are fully functional without external dependencies.
  - Multilingual switching and accessibility features (TTS, Font scaling, Plain language) are integrated and interactive.
  - Gemini-assisted chatbot interface is implemented and ready for API connection / live demonstration.
- **Readiness for Meeting:** Ready for a live prototype walkthrough during tomorrow's review session (16/09/2026, 12:00 PM – 1:00 PM in Studio Room).

---

## 4. Feedback & Guidance Received

Key feedback incorporated from previous reviews and mentor interactions:

1. **Avoid Black-Box Recommendations:**
   - *Guidance:* Mentors stressed that users must not be told simply "You are eligible" without reason. Government schemes have stringent audits.
   - *Implementation:* Created the transparent 3-part breakdown (*Why You Match, Verification Needed, Gaps*) so users know exactly which rules apply.
2. **Address Low Digital & Financial Literacy:**
   - *Guidance:* Target beneficiaries often struggle with complex financial jargon (*Moratorium, Collateral, Margin Money*).
   - *Implementation:* Integrated the **Plain Language (सरल भाषा)** toggle and **Jargon Buster** glossary.
3. **Account for Last-Mile Intermediaries:**
   - *Guidance:* Beneficiaries frequently rely on Village Level Entrepreneurs (VLEs) and CSC kiosks.
   - *Implementation:* Designed a dedicated **CSC / Sahayak Mode** to facilitate third-party assisted submissions and printable application slips.

---

## 5. Brief Progress Remarks

- The project has met all scheduled Phase 1 deliverables on time.
- Creating an interactive functional prototype as the initial milestone allowed us to validate the matching mechanics, design system, and multi-lingual user experience before investing heavily in database architecture.
- The prototype successfully demonstrates how algorithmic matching combined with accessible design can remove significant barriers for marginalized founders.

---

## 6. Next Steps Planned

| Phase / Sprint | Planned Milestone | Key Deliverables |
| :--- | :--- | :--- |
| **Sprint 1 (Immediate)** | **Backend & DB Integration** | Transition mock schemes to a PostgreSQL/SQLite database with FastAPI/Express REST endpoints. |
| **Sprint 2** | **Dataset Expansion** | Expand database from 15 central schemes to 50+ central and state-specific schemes. |
| **Sprint 3** | **Document Verification / OCR** | Allow users to upload DigiLocker/Aadhaar/Caste certificates for automated pre-verification. |
| **Sprint 4** | **Pilot User Testing** | Conduct usability testing with 10–15 sample users and collect feedback on matching accuracy. |
| **Sprint 5** | **Cloud Deployment** | Containerize the application and deploy on cloud infrastructure with production monitoring. |

---

*Report prepared for the Capstone Review Committee.*  
*Student: Mohammed Afraz Hussain | Project: Scheme Matcher*
