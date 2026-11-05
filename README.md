# AI-Driven Scheme Matching for Marginalized Entrepreneurs 

**Ministry:** Ministry of Social Justice & Empowerment  
**Problem Statement ID:** SIH26092  
**Platform Type:** AI-Powered Government Scheme Matching & Discovery Platform  
**Design Aesthetic:** Sandstone/Ledger Paper (`#F1ECDF`), Elevated Card (`#FBF9F3`), Navy Ink (`#23324A`), Terracotta Seal (`#B5651D`).

---

## 🏛️ Product Overview

Marginalized entrepreneurs (SC, ST, OBC, Women, and micro-business owners) face substantial friction discovering relevant government schemes due to dispersed information, complex eligibility language, and uncertainty about required documents.

This platform provides:
1. **Personalized & Deterministic Matching**: An algorithmic rule-based engine evaluates candidate profiles against 15 central schemes with 100% transparent scoring.
2. **Explainable Recommendations**: Breaks down each match into **Why You Match** (satisfied criteria), **Verification Needed** (income/caste certificates), and **Gaps** (unsupported factors).
3. **Application Roadmap & Benefits**: Summarizes margin money subsidies, collateral-free credit limits, and step-by-step application flows.
4. **Grounded AI Assistant**: Powered by Google Gemini, the conversational assistant is strictly grounded on the user's pre-computed matches — it never invents eligibility or claims guaranteed government sanction.

---

## ⚖️ Deterministic Matching Engine

The scoring algorithm calculates an objective suitability score (0–100%) across 6 weighted parameters:

| Factor | Weight | Evaluation Logic |
| :--- | :--- | :--- |
| **Category** | 20% | SC, ST, OBC, Women (special concessions), or Open to All |
| **Income** | 20% | Validates against scheme ceiling (e.g. ₹3,00,000 for NSFDC/NBCFDC) |
| **Age** | 15% | Ensures user is within minimum and maximum age thresholds |
| **Location** | 15% | Checks state-level or nationwide availability |
| **Business Type & Stage** | 15% | Supports Greenfield (New) vs Brownfield (Existing) & Manufacturing/Services/Trading |
| **Financial Assistance** | 15% | Checks alignment with scheme's minimum & maximum project limits |

---

## 📚 15 Verified Central Government Schemes

1. **PMEGP** — Prime Minister's Employment Generation Programme (KVIC / MSME)
2. **Stand-Up India Scheme** (Dept of Financial Services / MoF)
3. **Pradhan Mantri MUDRA Yojana — Shishu** (MoF)
4. **Pradhan Mantri MUDRA Yojana — Tarun** (MoF)
5. **National SC/ST Hub (NSSH) Scheme** (Ministry of MSME)
6. **NSFDC Term Loan Scheme for SC** (MoSJE)
7. **NBCFDC Term Loan Scheme for OBC** (MoSJE)
8. **Mahila e-Haat & WEP** (MWCD / NITI Aayog)
9. **PM SVANidhi** (MoHUA)
10. **Startup India Seed Fund Scheme (SISFS)** (DPIIT)
11. **Credit Guarantee Scheme for Micro & Small Enterprises (CGTMSE)** (MSME / SIDBI)
12. **VCF-SC — Venture Capital Fund for Scheduled Castes** (MoSJE / IFCI)
13. **NSKFDC General Term Loan for Safai Karamcharis** (MoSJE)
14. **PM-DAKSH Entrepreneurship Development Scheme** (MoSJE)
15. **Credit Enhancement Guarantee Scheme for SC (CEGSSC)** (MoSJE / IFCI)

---

## 🖥️ Project Structure

```
scheme-matcher/
├── index.html                  # HTML entry point with typography
├── package.json                # Dependencies: React 18, Vite, Lucide-react
├── vite.config.js              # Vite server & build configuration
├── src/
│   ├── main.jsx                # React root mount
│   ├── index.css               # Global theme styles and CSS variables
│   ├── App.jsx                 # Application shell & screen state manager
│   ├── theme/
│   │   └── tokens.js           # Exact color tokens, fonts & shared input styles
│   ├── data/
│   │   └── schemes.js          # Database of 15 verified schemes with documents & portals
│   ├── engine/
│   │   └── matcher.js          # Deterministic eligibility engine & scoring function
│   ├── components/
│   │   ├── TabBar.jsx          # Tab navigation (Home, Profile, Results, Assistant)
│   │   ├── Field.jsx           # Clean input form wrapper with hints
│   │   └── ScoreBadge.jsx      # Color-coded circular/pill score indicator
│   └── screens/
│       ├── Home.jsx            # Landing hero, problem statement & architecture pillars
│       ├── ProfileForm.jsx     # Profile collection form with 3 quick demo presets
│       ├── Results.jsx         # Ranked scheme cards, reason tags & score filters
│       ├── Details.jsx         # 2-column why you match, documents, benefits & workflow
│       └── Assistant.jsx       # Grounded AI assistant with prompt chips & Gemini API
├── backend/
│   ├── main.py                 # FastAPI backend implementing /match-schemes, /schemes, /assistant
│   └── requirements.txt        # FastAPI, Uvicorn, Pydantic, Google-GenAI
└── standalone/
    └── index.html              # Zero-dependency self-contained distribution for instant preview
```

---

## 🚀 Running the Application

### 1. React + Vite Frontend (Active Dev Server)
The frontend dev server is running at:
```bash
http://localhost:3000/
```
To run manually at any time:
```bash
npm install
npm run dev
```

### 2. Standalone Zero-Dependency Preview
Double click or open `standalone/index.html` directly in any web browser without needing Node or npm.

### 3. FastAPI Companion Backend (Optional)
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API Documentation: `http://localhost:8000/docs`
