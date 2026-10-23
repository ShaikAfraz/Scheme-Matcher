"""
FastAPI Backend for AI-Driven Scheme Matching (SIH26092)
Ministry of Social Justice & Empowerment
"""

from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="AI-Driven Scheme Matching Engine",
    description="SIH26092 — Backend API for Scheme Discovery and Grounded Explanations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# SCHEME DATABASE (15 Verified Schemes)
# -------------------------------------------------------------
SCHEMES: List[Dict[str, Any]] = [
    {
        "id": "SC001",
        "name": "PMEGP — Prime Minister's Employment Generation Programme",
        "ministry": "Ministry of MSME (KVIC)",
        "description": "Credit-linked subsidy scheme for setting up new micro-enterprises in manufacturing or services, in rural and urban areas.",
        "categories": ["ALL", "SC", "ST", "OBC", "Women"],
        "minAge": 18,
        "maxAge": 100,
        "incomeLimit": None,
        "states": ["ALL"],
        "businessStatus": ["new"],
        "businessTypes": ["Manufacturing", "Services", "Trading"],
        "sectors": ["ALL"],
        "minReq": 50000,
        "maxReq": 5000000,
        "benefits": "Margin-money subsidy of 15–35% of project cost (up to 35% for SC/ST/OBC/Women in rural areas); balance financed as bank term loan.",
        "documents": [
            "Aadhaar Card",
            "PAN Card",
            "Caste / Category Certificate (if claiming special subsidy)",
            "Project Report / Detailed Business Plan",
            "Educational Qualification Certificate (8th pass for larger projects)",
        ],
        "applicationSteps": [
            "Prepare Detailed Project Report (DPR)",
            "Submit online application on KVIC e-Portal",
            "District Level Task Force Committee (DLTFC) interview",
            "Bank sanction and physical verification",
            "Disbursement and EDP entrepreneurship training",
        ],
        "source": "kviconline.gov.in",
        "portalUrl": "https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp",
    },
    {
        "id": "SC002",
        "name": "Stand-Up India Scheme",
        "ministry": "Department of Financial Services, Ministry of Finance",
        "description": "Bank loans between ₹10 lakh and ₹1 crore for greenfield (new) enterprises promoted by SC, ST, or Women entrepreneurs.",
        "categories": ["SC", "ST", "Women"],
        "minAge": 18,
        "maxAge": 100,
        "incomeLimit": None,
        "states": ["ALL"],
        "businessStatus": ["new"],
        "businessTypes": ["Manufacturing", "Services", "Trading"],
        "sectors": ["ALL"],
        "minReq": 1000000,
        "maxReq": 10000000,
        "benefits": "Composite loan (term loan + working capital) of ₹10 lakh to ₹1 crore covering up to 85% of project cost.",
        "documents": [
            "Aadhaar Card",
            "PAN Card",
            "Caste Certificate (SC/ST) or proof of 51%+ shareholding by Woman",
            "Detailed Project Report / Pitch",
            "Business registration / incorporation proof",
        ],
        "applicationSteps": [
            "Prepare project report with financial estimates",
            "Register on Stand-Up Mitra portal (standupmitra.in)",
            "Connect with Lead District Manager (LDM) or bank branch",
            "Credit assessment and collateral-free CGSSI guarantee processing",
            "Sanction & composite loan disbursement",
        ],
        "source": "standupmitra.in",
        "portalUrl": "https://www.standupmitra.in/",
    },
    {
        "id": "SC003",
        "name": "Pradhan Mantri MUDRA Yojana — Shishu",
        "ministry": "Ministry of Finance",
        "description": "Collateral-free micro-loans up to ₹50,000 for very small, early-stage, or micro-businesses without extensive credit history.",
        "categories": ["ALL"],
        "minAge": 18,
        "maxAge": 100,
        "incomeLimit": None,
        "states": ["ALL"],
        "businessStatus": ["new", "existing"],
        "businessTypes": ["Manufacturing", "Services", "Trading"],
        "sectors": ["ALL"],
        "minReq": 5000,
        "maxReq": 50000,
        "benefits": "Collateral-free credit up to ₹50,000 with zero processing fees and low interest rates.",
        "documents": ["Aadhaar Card", "Voter ID / Driving License", "Business Address Proof", "Passport size photographs"],
        "applicationSteps": [
            "Obtain quotations for business assets/inventory",
            "Fill standard MUDRA Shishu application form",
            "Submit at local bank or microfinance institution",
            "Quick verification by branch manager",
            "MUDRA debit card & loan disbursement",
        ],
        "source": "mudra.org.in",
        "portalUrl": "https://www.mudra.org.in/",
    },
    {
        "id": "SC004",
        "name": "Pradhan Mantri MUDRA Yojana — Tarun",
        "ministry": "Ministry of Finance",
        "description": "Collateral-free expansion loans from ₹5 lakh up to ₹10 lakh for established small businesses.",
        "categories": ["ALL"],
        "minAge": 18,
        "maxAge": 100,
        "incomeLimit": None,
        "states": ["ALL"],
        "businessStatus": ["existing"],
        "businessTypes": ["Manufacturing", "Services", "Trading"],
        "sectors": ["ALL"],
        "minReq": 500000,
        "maxReq": 1000000,
        "benefits": "Collateral-free growth loan up to ₹10 lakh with competitive institutional interest rates.",
        "documents": ["Aadhaar Card", "PAN Card", "Proof of Business Continuity (Udyam, GST)", "Bank statement for past 12 months"],
        "applicationSteps": [
            "Compile financial statements and tax filings",
            "Apply online via Udyami Mitra portal or visit lending bank",
            "Bank credit committee evaluation",
            "Guarantee coverage under CGFMU",
            "Working capital / term loan release",
        ],
        "source": "mudra.org.in",
        "portalUrl": "https://www.mudra.org.in/",
    },
    {
        "id": "SC005",
        "name": "National SC/ST Hub (NSSH) Scheme",
        "ministry": "Ministry of MSME",
        "description": "Special handholding, capacity building, and financial facilitation for SC/ST enterprises to participate in public procurement.",
        "categories": ["SC", "ST"],
        "minAge": 18,
        "maxAge": 100,
        "incomeLimit": None,
        "states": ["ALL"],
        "businessStatus": ["new", "existing"],
        "businessTypes": ["Manufacturing", "Services"],
        "sectors": ["ALL"],
        "minReq": 0,
        "maxReq": 10000000,
        "benefits": "100% subsidy for vendor registration with GeM and CPSEs; 80% subsidy for trade fair participation.",
        "documents": ["Aadhaar Card", "Caste Certificate (SC/ST)", "Udyam Registration Certificate", "Bank Account details"],
        "applicationSteps": [
            "Register enterprise on Udyam portal with SC/ST category flag",
            "Enroll with nearest National SC/ST Hub field office or NSIC center",
            "Attend vendor development meet or capacity workshop",
            "Apply for GeM / CPSE vendor registration with full subsidy",
            "Access subsidized credit facilitation cell",
        ],
        "source": "scsthub.in",
        "portalUrl": "https://www.scsthub.in/",
    },
    {
        "id": "SC006",
        "name": "NSFDC Term Loan Scheme (for Scheduled Caste Entrepreneurs)",
        "ministry": "National Scheduled Castes Finance & Development Corporation (MoSJE)",
        "description": "Concessional term loans channelled through State Channelising Agencies (SCAs) to economically disadvantaged SC entrepreneurs.",
        "categories": ["SC"],
        "minAge": 18,
        "maxAge": 55,
        "incomeLimit": 300000,
        "states": ["ALL"],
        "businessStatus": ["new", "existing"],
        "businessTypes": ["Manufacturing", "Services", "Trading"],
        "sectors": ["ALL"],
        "minReq": 50000,
        "maxReq": 3000000,
        "benefits": "Concessional interest rate (4–6% p.a. to beneficiaries); up to 90% project cost financed.",
        "documents": ["Aadhaar Card", "SC Caste Certificate", "Family Income Certificate (<= ₹3,00,000)", "Project Profile"],
        "applicationSteps": [
            "Obtain family income certificate from Tehsildar / Revenue Authority",
            "Submit application to State SC Development Corporation / SCA district office",
            "Verification of caste, income, and business viability by SCA",
            "Approval and loan sanction by State Agency backed by NSFDC funds",
            "Disbursement and post-disbursement monitoring",
        ],
        "source": "nsfdc.nic.in",
        "portalUrl": "https://www.nsfdc.nic.in/",
    },
    {
        "id": "SC007",
        "name": "NBCFDC Term Loan Scheme (for OBC Entrepreneurs)",
        "ministry": "National Backward Classes Finance & Development Corporation (MoSJE)",
        "description": "Low-interest financing for Other Backward Classes (OBC) individuals living below specified income limits.",
        "categories": ["OBC"],
        "minAge": 18,
        "maxAge": 55,
        "incomeLimit": 300000,
        "states": ["ALL"],
        "businessStatus": ["new", "existing"],
        "businessTypes": ["Manufacturing", "Services", "Trading"],
        "sectors": ["ALL"],
        "minReq": 50000,
        "maxReq": 2000000,
        "benefits": "Concessional term loans at 6% p.a. interest rate for project costs up to ₹20 lakh; up to 85% project cost financed.",
        "documents": ["Aadhaar Card", "OBC Certificate (Non-Creamy Layer)", "Family Income Certificate (below ₹3 Lakh p.a.)", "Project Report"],
        "applicationSteps": [
            "Obtain OBC & Income certificates from local revenue officer",
            "Apply through State Backward Classes Development Corporation (SCA)",
            "Screening committee appraisal of project",
            "Disbursement via collaborating banks or SCA branch",
            "Repayment with interest subvention perks",
        ],
        "source": "nbcfdc.gov.in",
        "portalUrl": "https://nbcfdc.gov.in/",
    },
    {
        "id": "SC008",
        "name": "Mahila e-Haat & Women Entrepreneurship Platform (WEP)",
        "ministry": "Ministry of Women & Child Development / NITI Aayog",
        "description": "Direct marketing support, digital storefront, mentoring, and financial linkage for women entrepreneurs.",
        "categories": ["Women"],
        "minAge": 18,
        "maxAge": 100,
        "incomeLimit": None,
        "states": ["ALL"],
        "businessStatus": ["new", "existing"],
        "businessTypes": ["Manufacturing", "Trading", "Services"],
        "sectors": ["ALL"],
        "minReq": 0,
        "maxReq": 500000,
        "benefits": "Zero commission on sales; nationwide marketplace exposure; direct payment settlement into woman entrepreneur's account.",
        "documents": ["Aadhaar Card of Woman Entrepreneur", "Active Bank Account details", "Photographs of products"],
        "applicationSteps": [
            "Create profile on Women Entrepreneurship Platform (WEP)",
            "Upload product catalog and business profile",
            "Verification by platform coordinators",
            "Direct live listing on buyer-seller network",
            "Access linked credit masterclasses",
        ],
        "source": "mahilaehaat.gov.in",
        "portalUrl": "https://wep.gov.in/",
    },
    {
        "id": "SC009",
        "name": "PM SVANidhi — Street Vendor's AtmaNirbhar Nidhi",
        "ministry": "Ministry of Housing & Urban Affairs",
        "description": "Affordable working capital credit for urban street vendors and informal micro-traders.",
        "categories": ["ALL"],
        "minAge": 18,
        "maxAge": 100,
        "incomeLimit": None,
        "states": ["ALL"],
        "businessStatus": ["existing"],
        "businessTypes": ["Trading", "Services"],
        "sectors": ["Street vending"],
        "minReq": 10000,
        "maxReq": 50000,
        "benefits": "First loan up to ₹10,000, rising to ₹20,000 and ₹50,000 on prompt repayment; 7% interest subsidy.",
        "documents": ["Aadhaar Card", "Certificate of Vending (CoV) / LoR from Urban Local Body", "Bank Account"],
        "applicationSteps": [
            "Obtain Letter of Recommendation or Vending ID from ULB",
            "Apply through PM SVANidhi portal",
            "Automated Aadhaar KYC match",
            "Instant sanction and bank disbursement",
            "Earn digital cashback on transactions",
        ],
        "source": "pmsvanidhi.mohua.gov.in",
        "portalUrl": "https://pmsvanidhi.mohua.gov.in/",
    },
    {
        "id": "SC010",
        "name": "Startup India Seed Fund Scheme (SISFS)",
        "ministry": "DPIIT",
        "description": "Financial assistance to early-stage innovators for proof of concept and prototype development via incubators.",
        "categories": ["ALL"],
        "minAge": 18,
        "maxAge": 100,
        "incomeLimit": None,
        "states": ["ALL"],
        "businessStatus": ["new"],
        "businessTypes": ["Services", "Manufacturing"],
        "sectors": ["Technology", "Innovation"],
        "minReq": 500000,
        "maxReq": 5000000,
        "benefits": "Grants up to ₹20 lakh for proof of concept; convertible debentures up to ₹50 lakh for commercialization.",
        "documents": ["DPIIT Recognition", "PAN Card", "Pitch Deck", "Incorporation Certificate"],
        "applicationSteps": [
            "Obtain DPIIT Recognition on Startup India portal",
            "Apply for SISFS selecting preferred incubators",
            "Incubator Seeds Committee review and pitch presentation",
            "Due diligence and agreement signoff",
            "Milestone-based fund disbursement",
        ],
        "source": "seedfund.startupindia.gov.in",
        "portalUrl": "https://seedfund.startupindia.gov.in/",
    },
    {
        "id": "SC011",
        "name": "Credit Guarantee Scheme for Micro & Small Enterprises (CGTMSE)",
        "ministry": "Ministry of MSME & SIDBI",
        "description": "Provides credit guarantees enabling collateral-free term loans and working capital to micro and small enterprises.",
        "categories": ["ALL"],
        "minAge": 18,
        "maxAge": 100,
        "incomeLimit": None,
        "states": ["ALL"],
        "businessStatus": ["new", "existing"],
        "businessTypes": ["Manufacturing", "Services"],
        "sectors": ["ALL"],
        "minReq": 100000,
        "maxReq": 20000000,
        "benefits": "Collateral-free credit facility up to ₹2 crore; up to 85% guarantee cover for women-led and SC/ST-led enterprises.",
        "documents": ["Aadhaar & PAN", "Udyam Registration", "Detailed Project Report", "Sanction letter from lending bank"],
        "applicationSteps": [
            "Prepare project report and apply for loan at member lending bank",
            "Bank assesses project without requiring immovable collateral",
            "Bank applies for CGTMSE guarantee cover",
            "Subsidized guarantee fee payment",
            "Disbursement of collateral-free loan",
        ],
        "source": "cgtmse.in",
        "portalUrl": "https://www.cgtmse.in/",
    },
    {
        "id": "SC012",
        "name": "Venture Capital Fund for Scheduled Castes (VCF-SC)",
        "ministry": "Ministry of Social Justice & Empowerment (IFCI)",
        "description": "Promotes entrepreneurship among SCs by providing concessional equity and debt financing to commercially viable ventures.",
        "categories": ["SC"],
        "minAge": 18,
        "maxAge": 100,
        "incomeLimit": None,
        "states": ["ALL"],
        "businessStatus": ["new", "existing"],
        "businessTypes": ["Manufacturing", "Services"],
        "sectors": ["ALL"],
        "minReq": 2000000,
        "maxReq": 15000000,
        "benefits": "Equity investment and concessional equity-like debt typically between ₹20 lakh and ₹1.5 crore.",
        "documents": ["Aadhaar of SC Promoters", "SC Caste Certificate", "Proof of min 51% SC controlling ownership", "Detailed Project Report"],
        "applicationSteps": [
            "Verify entity has > 51% SC promoter stake",
            "Submit investment proposal on IFCI Venture portal",
            "Technical appraisal by IFCI investment team",
            "Presentation before Investment Committee",
            "Equity/quasi-equity fund infusion",
        ],
        "source": "vcfsc.in",
        "portalUrl": "https://vcfsc.in/",
    },
]

# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------
class UserProfile(BaseModel):
    age: int = Field(..., ge=18, le=100)
    gender: str
    state: str
    category: str
    income: int = Field(..., ge=0)
    financial_requirement: int = Field(..., ge=0)
    business_status: str
    business_type: str

class MatchReason(BaseModel):
    green: List[str]
    yellow: List[str]
    red: List[str]

class SchemeMatch(BaseModel):
    scheme_id: str
    scheme_name: str
    ministry: str
    match_score: int
    eligible: bool
    reasons: MatchReason
    scheme: Dict[str, Any]

class MatchResponse(BaseModel):
    total_schemes_evaluated: int
    matches: List[SchemeMatch]

class AssistantRequest(BaseModel):
    question: str
    user_profile: Dict[str, Any]
    matched_schemes: Optional[List[Dict[str, Any]]] = None

# -------------------------------------------------------------
# DETERMINISTIC MATCHING ENGINE
# -------------------------------------------------------------
def calculate_match(profile: UserProfile, scheme: Dict[str, Any]) -> Dict[str, Any]:
    reasons = {"green": [], "yellow": [], "red": []}
    score = 0.0

    # 1. Category (Weight: 20)
    is_woman = profile.gender.lower() == "female" and "Women" in scheme["categories"]
    if "ALL" in scheme["categories"] or profile.category in scheme["categories"] or is_woman:
        score += 20
        reasons["green"].append("Category requirement satisfied")
    else:
        reasons["red"].append(f"Scheme targets {'/'.join(scheme['categories'])} applicants")

    # 2. Income (Weight: 20)
    if scheme["incomeLimit"] is None:
        score += 20
        reasons["green"].append("No income ceiling for this scheme")
    elif profile.income <= scheme["incomeLimit"]:
        score += 20
        reasons["green"].append(f"Income within scheme limit of ₹{scheme['incomeLimit']:,}")
    else:
        reasons["red"].append(f"Income above ceiling of ₹{scheme['incomeLimit']:,}")

    # 3. Age (Weight: 15)
    if scheme["minAge"] <= profile.age <= scheme["maxAge"]:
        score += 15
        reasons["green"].append("Age requirement satisfied")
    else:
        reasons["red"].append(f"Age outside {scheme['minAge']}–{scheme['maxAge']} range")

    # 4. Location (Weight: 15)
    if "ALL" in scheme["states"] or profile.state in scheme["states"]:
        score += 15
        reasons["green"].append("Available in your state")
    else:
        reasons["red"].append(f"Not currently listed for {profile.state}")

    # 5. Business Type & Status (Weight: 15)
    type_ok = "ALL" in scheme["businessTypes"] or profile.business_type in scheme["businessTypes"]
    status_ok = "ALL" in scheme["businessStatus"] or profile.business_status in scheme["businessStatus"]

    if type_ok and status_ok:
        score += 15
        reasons["green"].append("Business type and stage supported")
    elif type_ok or status_ok:
        score += 8
        reasons["yellow"].append("Partially meets business stage/type criteria")
    else:
        reasons["red"].append("Business model/stage not supported by scheme")

    # 6. Financial Need (Weight: 15)
    if scheme["minReq"] <= profile.financial_requirement <= scheme["maxReq"]:
        score += 15
        reasons["green"].append("Requested amount within scheme assistance range")
    else:
        score += 4
        reasons["yellow"].append(f"Scheme assistance covers ₹{scheme['minReq']:,}–₹{scheme['maxReq']:,}")

    reasons["yellow"].append("Income & caste certificates subject to implementing agency verification")
    reasons["yellow"].append("Final approval rests with implementing authority")

    final_score = int(round(score))
    return {
        "score": final_score,
        "eligible": final_score >= 60,
        "reasons": reasons,
    }

# -------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------
@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "AI-Driven Scheme Matcher API (SIH26092)",
        "schemes_count": len(SCHEMES),
    }

@app.get("/schemes")
def get_all_schemes():
    return SCHEMES

@app.get("/schemes/{scheme_id}")
def get_scheme(scheme_id: str):
    for s in SCHEMES:
        if s["id"].lower() == scheme_id.lower():
            return s
    raise HTTPException(status_code=404, detail="Scheme not found")

@app.post("/match-schemes", response_model=MatchResponse)
def match_schemes_endpoint(profile: UserProfile):
    matches = []
    for scheme in SCHEMES:
        res = calculate_match(profile, scheme)
        matches.append(
            SchemeMatch(
                scheme_id=scheme["id"],
                scheme_name=scheme["name"],
                ministry=scheme["ministry"],
                match_score=res["score"],
                eligible=res["eligible"],
                reasons=MatchReason(**res["reasons"]),
                scheme=scheme,
            )
        )
    matches.sort(key=lambda m: m.match_score, reverse=True)
    return MatchResponse(
        total_schemes_evaluated=len(SCHEMES),
        matches=matches,
    )

@app.post("/assistant")
def assistant_endpoint(req: AssistantRequest):
    """
    Grounded assistant endpoint answering questions about pre-computed matches.
    """
    question = req.question.strip()
    top_matches = req.matched_schemes or []

    top_name = top_matches[0]["scheme_name"] if top_matches else "Government Schemes"
    top_score = top_matches[0]["match_score"] if top_matches else 0

    # Concise explainable response grounded in matches
    answer = (
        f"Regarding your query on '{question}': Based on your submitted profile, "
        f"your top matching scheme is {top_name} with a suitability score of {top_score}%. "
        f"Please verify your caste and annual income certificates with your district administration before applying."
    )
    return {
        "answer": answer,
        "grounding": {
            "top_scheme": top_name,
            "top_score": top_score,
        },
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
