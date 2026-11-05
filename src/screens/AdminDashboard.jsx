import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  FileCheck2,
  FolderUp,
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Building2,
  RefreshCw,
  Clock,
  IndianRupee,
  Activity,
  FileText,
  Filter,
  Power,
  ChevronLeft,
  ChevronRight,
  Upload,
  ExternalLink,
  Eye,
  Check,
  Calendar,
  User,
  Lock,
} from "lucide-react";
import { INK, PAPER, CARD, SEAL, OK, VERIFY, NO, RULE, inputStyle, serif, sans } from "../theme/tokens.js";
import { getStoredAuthToken } from "../data/demoProfiles.js";

// Professional Audit Trail Timestamp & Payload Formatters
function formatAuditTimestamp(raw) {
  if (!raw) return { date: "—", time: "—", relative: "" };
  let dateObj = new Date(raw);
  if (isNaN(dateObj.getTime()) && typeof raw === "string") {
    // Handle SQLite format "YYYY-MM-DD HH:MM:SS"
    dateObj = new Date(raw.replace(" ", "T") + "Z");
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date(raw.replace(" ", "T"));
    }
  }
  if (isNaN(dateObj.getTime())) {
    if (typeof raw === "string" && raw.length >= 10) {
      return { date: raw.slice(0, 10), time: raw.slice(11, 19) || "—", relative: "" };
    }
    return { date: "—", time: "—", relative: "" };
  }

  const dateStr = dateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const timeStr = dateObj.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const diffMs = Date.now() - dateObj.getTime();
  let relative = "";
  if (diffMs >= 0 && diffMs < 60000) {
    relative = "Just now";
  } else if (diffMs >= 0 && diffMs < 3600000) {
    relative = `${Math.floor(diffMs / 60000)}m ago`;
  } else if (diffMs >= 0 && diffMs < 86400000) {
    relative = `${Math.floor(diffMs / 3600000)}h ago`;
  } else if (diffMs >= 0 && diffMs < 604800000) {
    relative = `${Math.floor(diffMs / 86400000)}d ago`;
  }

  return { date: dateStr, time: timeStr, relative, iso: dateObj.toISOString() };
}

function parseAuditDetails(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return { note: String(raw) };
  }
}

function getAuditActionStyle(action = "") {
  const act = String(action).toUpperCase();
  if (
    act.includes("DENIED") ||
    act.includes("FAIL") ||
    act.includes("REJECT") ||
    act.includes("DEACTIVATE") ||
    act.includes("DELETE")
  ) {
    return {
      bg: "#FEF2F2",
      border: "#FECACA",
      text: "#991B1B",
      dot: "#DC2626",
    };
  }
  if (
    act.includes("LOGIN") ||
    act.includes("APPROVE") ||
    act.includes("VERIFY") ||
    act.includes("SUCCESS") ||
    act.includes("CREATE")
  ) {
    return {
      bg: "#ECFDF5",
      border: "#A7F3D0",
      text: "#065F46",
      dot: "#059669",
    };
  }
  if (
    act.includes("UPDATE") ||
    act.includes("REVIEW") ||
    act.includes("SYNC") ||
    act.includes("IMPORT") ||
    act.includes("STAGED")
  ) {
    return {
      bg: "#EFF6FF",
      border: "#BFDBFE",
      text: "#1E40AF",
      dot: "#2563EB",
    };
  }
  return {
    bg: "#F8FAFC",
    border: "#E2E8F0",
    text: "#334155",
    dot: "#64748B",
  };
}

export default function AdminDashboard({
  currentUser,
  onLogout,
  setScreen,
}) {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "schemes" | "documents" | "citizens"
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState("all"); // 'all' | 'auth' | 'scheme' | 'document'

  // Schemes Management State
  const [schemes, setSchemes] = useState([]);
  const [totalSchemes, setTotalSchemes] = useState(0);
  const [schemeSearch, setSchemeSearch] = useState("");
  const [schemeLevelFilter, setSchemeLevelFilter] = useState("ALL");
  const [schemeActiveFilter, setSchemeActiveFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [schemeStatusFilter, setSchemeStatusFilter] = useState("all"); // 'all' | 'verified' | 'unverified'
  const [schemePage, setSchemePage] = useState(1);
  const schemePageSize = 10;
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null); // null or scheme obj
  const [isCreatingScheme, setIsCreatingScheme] = useState(false);
  const [schemeFormErrors, setSchemeFormErrors] = useState([]);
  const [schemeForm, setSchemeForm] = useState({
    code: "",
    name: "",
    ministry: "",
    level: "Central",
    category: "SC / ST / OBC / General",
    financialAssistance: "",
    description: "",
    portalUrl: "https://myscheme.gov.in",
    source: "",
    minAge: "",
    maxAge: "",
    incomeLimit: "",
  });

  // Documents Queue State
  const [documentsQueue, setDocumentsQueue] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [docStatusFilter, setDocStatusFilter] = useState("all"); // Default to all uploaded documents
  const [docSearch, setDocSearch] = useState("");
  const [docPage, setDocPage] = useState(1);
  const docPageSize = 10;
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [reviewModalDoc, setReviewModalDoc] = useState(null);
  const [reviewDecision, setReviewDecision] = useState("Verified Against Provided Criteria");
  const [reviewRemark, setReviewRemark] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Citizens Registry State
  const [citizens, setCitizens] = useState([]);
  const [loadingCitizens, setLoadingCitizens] = useState(false);

  // Scheme Data Sync & Ingestion State
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncRuns, setSyncRuns] = useState([]);
  const [syncSources, setSyncSources] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [totalReviewItems, setTotalReviewItems] = useState(0);
  const [reviewQueueFilter, setReviewQueueFilter] = useState("all");
  const [reviewChangeTypeFilter, setReviewChangeTypeFilter] = useState("all");
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewPage, setReviewPage] = useState(1);
  const reviewPageSize = 10;
  const [selectedSourceToSync, setSelectedSourceToSync] = useState("src_myscheme_api");
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFileContent, setUploadFileContent] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileFormat, setUploadFileFormat] = useState("json");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewItemModal, setPreviewItemModal] = useState(null);
  const [activeRunDetailModal, setActiveRunDetailModal] = useState(null);
  const [selectedBatchItemIds, setSelectedBatchItemIds] = useState(new Set());
  const [actionNotes, setActionNotes] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);

  // Administrator Credential Rotation State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassInput, setCurrentPassInput] = useState("");
  const [newPassInput, setNewPassInput] = useState("");
  const [confirmPassInput, setConfirmPassInput] = useState("");
  const [passChangeError, setPassChangeError] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleRotatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassInput || !newPassInput) {
      setPassChangeError("Please provide both your current and new password.");
      return;
    }
    if (newPassInput !== confirmPassInput) {
      setPassChangeError("New password and confirmation do not match.");
      return;
    }
    if (newPassInput.length < 8) {
      setPassChangeError("New password must be at least 8 characters long.");
      return;
    }

    setIsChangingPass(true);
    setPassChangeError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: currentPassInput,
          newPassword: newPassInput,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setPassChangeError(data.error || "Failed to update password.");
      } else {
        showSuccess("Administrative password rotated successfully.");
        setIsPasswordModalOpen(false);
        setCurrentPassInput("");
        setNewPassInput("");
        setConfirmPassInput("");
      }
    } catch (err) {
      setPassChangeError(err.message || "Network error rotating credentials.");
    } finally {
      setIsChangingPass(false);
    }
  };

  // Status/Feedback messages
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const token = getStoredAuthToken();
  const isAdmin = currentUser?.systemRole === "admin";

  // Load Overview Stats
  const loadStats = () => {
    if (!token || !isAdmin) return;
    setLoadingStats(true);
    fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      })
      .catch((err) => console.warn("Failed to load admin stats:", err))
      .finally(() => setLoadingStats(false));
  };

  // Load Schemes with Search, Filter & Pagination
  const loadSchemes = () => {
    if (!token || !isAdmin) return;
    setLoadingSchemes(true);
    const params = new URLSearchParams({
      search: schemeSearch,
      level: schemeLevelFilter === "ALL" ? "all" : schemeLevelFilter,
      active: schemeActiveFilter,
      status: schemeStatusFilter,
      limit: String(schemePageSize),
      offset: String((schemePage - 1) * schemePageSize),
    });
    fetch(`/api/admin/schemes?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.schemes)) {
          setSchemes(data.schemes);
          setTotalSchemes(data.total ?? data.schemes.length);
        }
      })
      .catch((err) => console.warn("Failed to load admin schemes:", err))
      .finally(() => setLoadingSchemes(false));
  };

  // Toggle Scheme Active/Inactive Status
  const handleToggleActive = async (schemeId, currentActive) => {
    try {
      const res = await fetch(`/api/admin/schemes/${encodeURIComponent(schemeId)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(currentActive ? "Scheme deactivated successfully." : "Scheme activated successfully.");
        loadSchemes();
        loadStats();
      } else {
        showError(data.error || "Failed to update scheme status.");
      }
    } catch (err) {
      showError(err.message);
    }
  };

  // Load Documents Queue with Filter & Pagination
  const loadDocuments = () => {
    if (!token || !isAdmin) return;
    setLoadingDocs(true);
    const params = new URLSearchParams({
      status: docStatusFilter,
      search: docSearch,
      limit: String(docPageSize),
      offset: String((docPage - 1) * docPageSize),
    });
    fetch(`/api/admin/documents?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.documents)) {
          setDocumentsQueue(data.documents);
          setTotalDocs(data.total ?? data.documents.length);
        }
      })
      .catch((err) => console.warn("Failed to load documents queue:", err))
      .finally(() => setLoadingDocs(false));
  };

  // Load Citizens Registry
  const loadCitizens = () => {
    if (!token || !isAdmin) return;
    setLoadingCitizens(true);
    fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.users)) {
          setCitizens(data.users);
        }
      })
      .catch((err) => console.warn("Failed to load citizens:", err))
      .finally(() => setLoadingCitizens(false));
  };

  // Scheme Data Sync Loaders & Handlers
  const loadSyncStatus = () => {
    if (!token || !isAdmin) return;
    fetch("/api/admin/sync/status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSyncStatus(res);
      })
      .catch((err) => console.error("Failed to load sync status:", err));
  };

  const loadSyncRuns = () => {
    if (!token || !isAdmin) return;
    fetch("/api/admin/sync/runs?limit=20&offset=0", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSyncRuns(res.runs || []);
      })
      .catch((err) => console.error("Failed to load sync runs:", err));
  };

  const loadSyncSources = () => {
    if (!token || !isAdmin) return;
    fetch("/api/admin/sync/sources", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSyncSources(res.sources || []);
      })
      .catch((err) => console.error("Failed to load sync sources:", err));
  };

  const loadReviewQueue = () => {
    if (!token || !isAdmin) return;
    const params = new URLSearchParams({
      limit: String(reviewPageSize),
      offset: String((reviewPage - 1) * reviewPageSize),
    });
    if (reviewQueueFilter !== "all") params.set("status", reviewQueueFilter);
    if (reviewChangeTypeFilter !== "all") params.set("changeType", reviewChangeTypeFilter);
    if (reviewSearch.trim()) params.set("search", reviewSearch.trim());

    fetch(`/api/admin/sync/review-queue?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setReviewQueue(res.items || []);
          setTotalReviewItems(res.total || 0);
        }
      })
      .catch((err) => console.error("Failed to load review queue:", err));
  };

  const handleTriggerSyncNow = async () => {
    if (!token || !isAdmin) return;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/sync/run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sourceId: selectedSourceToSync }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error || "Sync execution failed.");
      } else {
        showSuccess(`Sync run completed! ${data.run?.summary?.newDetected || 0} new, ${data.run?.summary?.updatedDetected || 0} updated, ${data.run?.summary?.needsReviewCount || 0} in review queue.`);
        loadSyncStatus();
        loadSyncRuns();
        loadReviewQueue();
      }
    } catch (err) {
      showError(err.message || "Failed to trigger sync.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    setUploadFileFormat(isCsv ? "csv" : "json");
    setUploadError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadFileContent(event.target?.result || "");
    };
    reader.onerror = () => {
      setUploadError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const handleExecuteImportUpload = async () => {
    if (!uploadFileContent.trim()) {
      setUploadError("Please choose a file or paste valid dataset content.");
      return;
    }
    setIsUploading(true);
    setUploadError("");
    try {
      const res = await fetch("/api/admin/sync/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceId: "src_file_dataset",
          filename: uploadFileName || "dataset-import",
          format: uploadFileFormat,
          content: uploadFileContent,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setUploadError(data.error || "Dataset import failed.");
      } else {
        showSuccess(`Dataset imported successfully! Retrieved: ${data.run?.summary?.totalRetrieved || 0}, New: ${data.run?.summary?.newDetected || 0}, Review Queue: ${data.run?.summary?.needsReviewCount || 0}`);
        setUploadModalOpen(false);
        setUploadFileContent("");
        setUploadFileName("");
        loadSyncStatus();
        loadSyncRuns();
        loadReviewQueue();
      }
    } catch (err) {
      setUploadError(err.message || "Failed to upload dataset.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReviewAction = async (itemId, decision) => {
    if (!token || !isAdmin) return;
    setIsProcessingAction(true);
    try {
      const res = await fetch("/api/admin/sync/review", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId, decision, reviewNotes: actionNotes }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error || `Failed to ${decision} item.`);
      } else {
        showSuccess(`Scheme ${decision === "approve" ? "approved & upserted into live registry" : "rejected"} successfully.`);
        setPreviewItemModal(null);
        setActionNotes("");
        loadReviewQueue();
        loadSyncStatus();
        loadStats();
      }
    } catch (err) {
      showError(err.message || "Review action failed.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedBatchItemIds.size === 0) return;
    setIsProcessingAction(true);
    try {
      const res = await fetch("/api/admin/sync/review/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemIds: Array.from(selectedBatchItemIds),
          reviewNotes: "Batch approved via admin portal",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error || "Batch approval failed.");
      } else {
        showSuccess(`Batch approved ${data.approvedCount || 0} schemes into live registry.`);
        setSelectedBatchItemIds(new Set());
        loadReviewQueue();
        loadSyncStatus();
        loadStats();
      }
    } catch (err) {
      showError(err.message || "Batch approval failed.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRetryRun = async (runId) => {
    try {
      showSuccess("Retrying sync run...");
      const res = await fetch(`/api/admin/sync/retry/${runId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error || "Retry failed.");
      } else {
        showSuccess(`Retry run completed. Status: ${data.run?.status}`);
        loadSyncStatus();
        loadSyncRuns();
        loadReviewQueue();
      }
    } catch (err) {
      showError(err.message || "Retry trigger failed.");
    }
  };

  const handleToggleScheduler = async (action) => {
    try {
      const res = await fetch("/api/admin/sync/scheduler", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Ingestion Scheduler ${action === "start" ? "started" : "stopped"}.`);
        loadSyncStatus();
      }
    } catch (err) {
      showError(err.message || "Failed to update scheduler.");
    }
  };

  useEffect(() => {
    if (isAdmin && token) {
      loadStats();
      const interval = setInterval(() => {
        loadStats();
        if (activeTab === "citizens") loadCitizens();
        if (activeTab === "documents") loadDocuments();
        if (activeTab === "sync") {
          loadSyncStatus();
          loadSyncRuns();
        }
      }, 10000); // 10s auto-refresh for real-time live data
      return () => clearInterval(interval);
    }
  }, [isAdmin, token, activeTab, docStatusFilter, docSearch, docPage]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    if (activeTab === "schemes") loadSchemes();
  }, [activeTab, schemeSearch, schemeLevelFilter, schemeActiveFilter, schemeStatusFilter, schemePage, isAdmin, token]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    if (activeTab === "documents") loadDocuments();
  }, [activeTab, docStatusFilter, docSearch, docPage, isAdmin, token]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    if (activeTab === "citizens") loadCitizens();
  }, [activeTab, isAdmin, token]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    if (activeTab === "sync") {
      loadSyncStatus();
      loadSyncRuns();
      loadSyncSources();
      loadReviewQueue();
    }
  }, [activeTab, isAdmin, token]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    if (activeTab === "sync") {
      loadReviewQueue();
    }
  }, [activeTab, reviewQueueFilter, reviewChangeTypeFilter, reviewSearch, reviewPage, isAdmin, token]);

  const showSuccess = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const showError = (msg) => {
    setActionError(msg);
    setTimeout(() => setActionError(""), 5000);
  };

  // Scheme Actions
  const handleToggleVerify = async (schemeId, currentVerified) => {
    try {
      const res = await fetch(`/api/admin/schemes/${encodeURIComponent(schemeId)}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isVerified: !currentVerified }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`Scheme verification status updated.`);
        setSchemes((prev) =>
          prev.map((s) => (s.id === schemeId ? { ...s, isVerified: !currentVerified } : s))
        );
      } else {
        showError(data.error || "Failed to update verification status.");
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDeleteScheme = async (schemeId, schemeName) => {
    if (!window.confirm(`Are you sure you want to delete scheme: ${schemeName}? This action is irreversible.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/schemes/${encodeURIComponent(schemeId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`Scheme deleted successfully.`);
        setSchemes((prev) => prev.filter((s) => s.id !== schemeId));
        loadStats();
      } else {
        showError(data.error || "Failed to delete scheme.");
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleSaveScheme = async (e) => {
    e.preventDefault();
    setSchemeFormErrors([]);
    try {
      if (isCreatingScheme) {
        const res = await fetch("/api/admin/schemes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(schemeForm),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showSuccess("New scheme added to codified catalog!");
          setIsCreatingScheme(false);
          setSchemeFormErrors([]);
          loadSchemes();
          loadStats();
        } else {
          setSchemeFormErrors(data.errors || [data.error || "Failed to create scheme."]);
          showError(data.error || "Scheme validation failed.");
        }
      } else if (editingScheme) {
        const res = await fetch(`/api/admin/schemes/${encodeURIComponent(editingScheme.id)}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(schemeForm),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showSuccess("Scheme parameters updated successfully.");
          setEditingScheme(null);
          setSchemeFormErrors([]);
          loadSchemes();
          loadStats();
        } else {
          setSchemeFormErrors(data.errors || [data.error || "Failed to update scheme."]);
          showError(data.error || "Scheme update validation failed.");
        }
      }
    } catch (err) {
      showError(err.message);
    }
  };

  // Review Document Action
  const handleReviewDocument = async (e) => {
    e.preventDefault();
    if (!reviewModalDoc) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/admin/documents/${encodeURIComponent(reviewModalDoc.id)}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: reviewDecision,
          remark: reviewRemark,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`Document marked as "${reviewDecision}". Recorded in audit log.`);
        setReviewModalDoc(null);
        setReviewRemark("");
        loadDocuments();
        loadStats();
      } else {
        showError(data.error || "Failed to update document status.");
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  // 1. Unauthenticated Gate
  if (!token) {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", textAlign: "center", padding: 30 }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: serif, fontSize: 24, color: INK, margin: "0 0 10px 0" }}>
          Administrative Authentication Required
        </h2>
        <p style={{ color: "#64748B", fontSize: 14, marginBottom: 20 }}>
          This portal is restricted to authorized Ministry administrators. Please authenticate with your administrator credentials.
        </p>
        <button
          onClick={() => setScreen("admin-login")}
          style={{
            padding: "10px 20px",
            background: "#1E293B",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 4,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Go to Administrative Login
        </button>
      </div>
    );
  }

  // 2. Unauthorized Citizen Gate (403 Forbidden)
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", textAlign: "center", padding: 30 }}>
        <div
          style={{
            width: 60,
            height: 60,
            margin: "0 auto 16px auto",
            borderRadius: "50%",
            background: "#FEF2F2",
            border: "2px solid #FECACA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#DC2626",
          }}
        >
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontFamily: serif, fontSize: 24, color: "#991B1B", margin: "0 0 10px 0" }}>
          403 Access Denied: Administrator Clearance Required
        </h2>
        <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
          You are currently signed in as citizen <strong>{currentUser?.name || "Citizen User"}</strong> (Role: <code>{currentUser?.systemRole || "citizen"}</code>). Your account does not have permission to view or manage institutional records.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => setScreen("dashboard")}
            style={{
              padding: "10px 18px",
              background: SEAL,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 4,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Return to Citizen Dashboard
          </button>
          <button
            onClick={() => {
              onLogout();
              setScreen("admin-login");
            }}
            style={{
              padding: "10px 18px",
              background: "#1E293B",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 4,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Sign In with Admin Account
          </button>
        </div>
      </div>
    );
  }

  // Filter schemes
  const filteredSchemes = schemes.filter((s) => {
    const matchesSearch =
      !schemeSearch ||
      s.name.toLowerCase().includes(schemeSearch.toLowerCase()) ||
      s.ministry.toLowerCase().includes(schemeSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(schemeSearch.toLowerCase());
    const matchesLevel = schemeLevelFilter === "ALL" || s.level === schemeLevelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div style={{ maxWidth: 1140, margin: "0 auto" }}>
      {/* Admin Masthead */}
      <div
        style={{
          background: "#1E293B",
          color: "#FFFFFF",
          borderRadius: 4,
          padding: "20px 24px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 4,
              background: "#334155",
              border: "1px solid #475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FDE68A",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 19, fontFamily: serif, color: "#FFFFFF", fontWeight: 700 }}>
                {currentUser?.name || "Yuvraj Choudhary"}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  background: "#3B82F6",
                  color: "#FFFFFF",
                  padding: "2px 8px",
                  borderRadius: 3,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                }}
              >
                OFFICIAL ADMIN
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>
              Ministry Administration Console · {currentUser?.email || "Nodal Administrator"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => {
              setIsPasswordModalOpen(true);
              setPassChangeError("");
              setCurrentPassInput("");
              setNewPassInput("");
              setConfirmPassInput("");
            }}
            style={{
              padding: "7px 12px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#FFFFFF",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Rotate Password
          </button>
          <button
            onClick={() => setScreen("home")}
            style={{
              padding: "7px 12px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#FFFFFF",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Citizen View
          </button>
          <button
            onClick={onLogout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              background: "#DC2626",
              border: "none",
              color: "#FFFFFF",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LogOut size={13} />
            <span>Admin Logout</span>
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {actionSuccess && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            color: OK,
            padding: "10px 14px",
            borderRadius: 4,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            padding: "10px 14px",
            borderRadius: 4,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `2px solid ${RULE}`,
          marginBottom: 20,
          gap: 6,
          overflowX: "auto",
        }}
      >
        {[
          { id: "overview", label: "Executive Overview", icon: Activity },
          {
            id: "schemes",
            label: `Codified Schemes (${stats?.counts?.schemes || schemes.length})`,
            icon: FileCheck2,
          },
          {
            id: "documents",
            label: `Verification Desk (${stats?.counts?.documentsNeedingReview ?? "..."})`,
            icon: FolderUp,
          },
          {
            id: "citizens",
            label: `Citizen Registry (${stats?.counts?.citizens ?? "..."})`,
            icon: Users,
          },
          {
            id: "sync",
            label: syncStatus?.status?.pendingReviewCount
              ? `Scheme Data Sync (${syncStatus.status.pendingReviewCount})`
              : "Scheme Data Sync",
            icon: RefreshCw,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? `3px solid #1E293B` : "3px solid transparent",
                color: isActive ? INK : "#64748B",
                fontWeight: isActive ? 700 : 500,
                fontSize: 13.5,
                cursor: "pointer",
                marginBottom: -2,
              }}
            >
              <TabIcon size={16} color={isActive ? "#1E293B" : "#94A3B8"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === "overview" && (
        <div>
          {/* Key Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>REGISTERED CITIZENS</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginTop: 4 }}>
                {stats?.counts?.citizens ?? 0}
              </div>
              <div style={{ fontSize: 11, color: OK, marginTop: 4 }}>✓ Authenticated DB Accounts</div>
            </div>

            <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>CODIFIED SCHEMES</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginTop: 4 }}>
                {stats?.counts?.schemes || 0}
              </div>
              <div style={{ fontSize: 11, color: "#2563EB", marginTop: 4 }}>
                {stats?.counts?.activeSchemes ?? 0} Active · {stats?.counts?.inactiveSchemes ?? 0} Inactive
              </div>
            </div>

            <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>BANK LEAD DOSSIERS</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginTop: 4 }}>
                {stats?.counts?.dossiers || 0}
              </div>
              <div style={{ fontSize: 11, color: "#1E3A8A", marginTop: 4 }}>Generated &amp; Stored in SQLite</div>
            </div>

            <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>UPLOADED DOCUMENTS</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginTop: 4 }}>
                {stats?.documents?.total ?? stats?.counts?.totalDocuments ?? 0}
              </div>
              <div style={{ fontSize: 11, color: (stats?.counts?.documentsNeedingReview || 0) > 0 ? "#B91C1C" : "#64748B", marginTop: 4 }}>
                {stats?.counts?.documentsNeedingReview || 0} Pending · {stats?.documents?.verified ?? stats?.counts?.documentsVerified ?? 0} Verified
              </div>
            </div>

            <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>APPLICATION PIPELINE</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginTop: 4 }}>
                {stats?.counts?.applications || 0}
              </div>
              <div style={{ fontSize: 11, color: OK, marginTop: 4 }}>
                ₹{Number(stats?.counts?.totalRequestedAmount ?? stats?.financials?.totalRequested ?? 0).toLocaleString("en-IN")} Total Loan Requested
              </div>
            </div>
          </div>

          {/* Recent Audit Trail Log */}
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 6,
              padding: 24,
              boxShadow: "0 1px 3px rgba(22, 32, 50, 0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 14,
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: `1px solid ${RULE}`,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <ShieldCheck size={18} color="#B45309" />
                  <h3 style={{ margin: 0, fontFamily: serif, fontSize: 18, color: INK, fontWeight: 700 }}>
                    System Audit Events Log (Chronological Record)
                  </h3>
                  <span
                    style={{
                      background: "#F1F5F9",
                      color: "#475569",
                      border: "1px solid #CBD5E1",
                      borderRadius: 12,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {stats?.recentLogs?.length || 0} Events
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: "#64748B", fontFamily: sans }}>
                  Immutable chronological record of administrative clearances, scheme lifecycle changes, security authentications, and verification decisions.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={loadStats}
                  style={{
                    background: "#F8FAFC",
                    border: `1px solid ${RULE}`,
                    color: INK,
                    borderRadius: 4,
                    padding: "7px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: sans,
                    transition: "all 0.15s ease",
                  }}
                  title="Reload audit records from SQLite database"
                >
                  <RefreshCw size={13} color="#B45309" />
                  <span>Refresh Log</span>
                </button>
              </div>
            </div>

            {/* Controls Bar: Category Filter & Search */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { id: "all", label: "All Events" },
                  { id: "auth", label: "Security & Logins" },
                  { id: "scheme", label: "Scheme Operations" },
                  { id: "document", label: "Document Reviews" },
                ].map((f) => {
                  const isActive = auditFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setAuditFilter(f.id)}
                      style={{
                        background: isActive ? "#1E293B" : "#F8FAFC",
                        color: isActive ? "#FFFFFF" : "#475569",
                        border: `1px solid ${isActive ? "#1E293B" : "#CBD5E1"}`,
                        borderRadius: 4,
                        padding: "5px 11px",
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 500,
                        cursor: "pointer",
                        fontFamily: sans,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ position: "relative", minWidth: 240, flex: "0 1 280px" }}>
                <Search size={13} style={{ position: "absolute", left: 9, top: 10, color: "#94A3B8" }} />
                <input
                  type="text"
                  placeholder="Search action, target, actor, details..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  style={{
                    ...inputStyle,
                    fontSize: 12,
                    padding: "6px 10px 6px 28px",
                    width: "100%",
                  }}
                />
              </div>
            </div>

            {/* Event List */}
            {(() => {
              const allLogs = stats?.recentLogs || [];
              const filtered = allLogs.filter((log) => {
                const act = (log.action || "").toLowerCase();
                const res = (log.resource_type || log.targetType || log.target_type || "").toLowerCase();
                const id = (log.target_id || log.targetId || log.resource_id || "").toLowerCase();
                const actor = (log.user_name || log.user_email || log.actor_id || "").toLowerCase();

                if (auditFilter === "auth" && !act.includes("login") && !act.includes("auth") && !act.includes("token")) return false;
                if (auditFilter === "scheme" && !act.includes("scheme") && res !== "scheme") return false;
                if (auditFilter === "document" && !act.includes("document") && res !== "document") return false;

                if (auditSearch.trim()) {
                  const q = auditSearch.trim().toLowerCase();
                  const det = String(log.details || "").toLowerCase();
                  return act.includes(q) || res.includes(q) || id.includes(q) || actor.includes(q) || det.includes(q);
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: "1px dashed #CBD5E1",
                      borderRadius: 4,
                      padding: "24px 16px",
                      textAlign: "center",
                      color: "#64748B",
                      fontSize: 13,
                    }}
                  >
                    No audit events matching current search or filter criteria.
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {filtered.map((log) => {
                    const ts = formatAuditTimestamp(log.created_at || log.createdAt);
                    const actStyle = getAuditActionStyle(log.action);
                    const detailsObj = parseAuditDetails(log.details);
                    const targetType = (log.target_type || log.targetType || log.resource_type || "SYSTEM").toUpperCase();
                    const targetId = log.target_id || log.targetId || log.resource_id || "NONE";
                    const actorName = log.user_name || log.user_email || log.actor_id;

                    return (
                      <div
                        key={log.id}
                        style={{
                          background: "#FAFAFA",
                          border: "1px solid #E2E8F0",
                          borderRadius: 6,
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 12,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {/* LEFT SECTION: [DATE & TIME BADGE] [ACTION PILL] [TARGET] [ACTOR] */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flex: 1, minWidth: 320 }}>
                          {/* 1. FRONT: Monospace Date & Time Badge */}
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              background: "#FFFFFF",
                              border: "1px solid #CBD5E1",
                              borderRadius: 4,
                              padding: "5px 10px",
                              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                              flexShrink: 0,
                            }}
                            title={`Timestamp: ${ts.date} ${ts.time}`}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#0F172A", fontWeight: 700, fontSize: 11.5 }}>
                              <Calendar size={12} color="#475569" />
                              <span>{ts.date}</span>
                            </div>
                            <span style={{ color: "#CBD5E1" }}>|</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#1D4ED8", fontWeight: 600, fontSize: 11.5 }}>
                              <Clock size={11} color="#2563EB" />
                              <span>{ts.time}</span>
                            </div>
                            {ts.relative && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  color: "#64748B",
                                  background: "#F1F5F9",
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                  fontWeight: 500,
                                }}
                              >
                                {ts.relative}
                              </span>
                            )}
                          </div>

                          {/* 2. Action Pill */}
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: "ui-monospace, monospace",
                              background: actStyle.bg,
                              color: actStyle.text,
                              border: `1px solid ${actStyle.border}`,
                              padding: "3px 8px",
                              borderRadius: 4,
                              letterSpacing: 0.3,
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: actStyle.dot }} />
                            <span>{log.action}</span>
                          </span>

                          {/* 3. Target Resource */}
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}>
                            <span style={{ color: "#64748B", fontSize: 11.5 }}>Target:</span>
                            <code
                              style={{
                                background: "#FFFFFF",
                                border: "1px solid #E2E8F0",
                                padding: "2px 6px",
                                borderRadius: 3,
                                color: "#0F172A",
                                fontWeight: 600,
                                fontSize: 11.5,
                              }}
                            >
                              {targetType}:{targetId}
                            </code>
                          </div>

                          {/* 4. Actor Context */}
                          {actorName && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#475569" }}>
                              <User size={11} color="#64748B" />
                              <span style={{ fontWeight: 600, color: "#1E293B" }}>{actorName}</span>
                              {log.system_role && (
                                <span
                                  style={{
                                    background: log.system_role === "admin" ? "#EDE9FE" : "#F1F5F9",
                                    color: log.system_role === "admin" ? "#6D28D9" : "#475569",
                                    border: `1px solid ${log.system_role === "admin" ? "#DDD6FE" : "#E2E8F0"}`,
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {log.system_role}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* RIGHT SECTION: Structured Details Payload */}
                        {detailsObj && (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "#334155",
                              background: "#FFFFFF",
                              padding: "4px 9px",
                              borderRadius: 4,
                              border: "1px dashed #CBD5E1",
                              maxWidth: 360,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                          >
                            {detailsObj.name && <span><strong>Scheme:</strong> {detailsObj.name} </span>}
                            {detailsObj.email && <span><strong>Email:</strong> {detailsObj.email} </span>}
                            {detailsObj.newStatus && <span><strong>Status:</strong> {detailsObj.newStatus} </span>}
                            {detailsObj.verificationNotes && <span><strong>Notes:</strong> {detailsObj.verificationNotes} </span>}
                            {detailsObj.updatedKeys && <span><strong>Fields:</strong> {detailsObj.updatedKeys.join(", ")} </span>}
                            {!detailsObj.name && !detailsObj.email && !detailsObj.newStatus && !detailsObj.updatedKeys && (
                              <span>{typeof log.details === "string" ? log.details : JSON.stringify(log.details)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 2: SCHEME RECORDS MANAGEMENT */}
      {activeTab === "schemes" && (
        <div>
          {/* Controls Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 260, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "#94A3B8" }} />
                <input
                  type="text"
                  placeholder="Search scheme name, ministry, code..."
                  value={schemeSearch}
                  onChange={(e) => {
                    setSchemeSearch(e.target.value);
                    setSchemePage(1);
                  }}
                  style={{ ...inputStyle, paddingLeft: 30 }}
                />
              </div>
              <select
                value={schemeLevelFilter}
                onChange={(e) => {
                  setSchemeLevelFilter(e.target.value);
                  setSchemePage(1);
                }}
                style={{ ...inputStyle, width: 130 }}
              >
                <option value="ALL">All Levels</option>
                <option value="Central">Central</option>
                <option value="State">State</option>
              </select>
              <select
                value={schemeActiveFilter}
                onChange={(e) => {
                  setSchemeActiveFilter(e.target.value);
                  setSchemePage(1);
                }}
                style={{ ...inputStyle, width: 140 }}
              >
                <option value="all">All Active &amp; Inactive</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>
              <select
                value={schemeStatusFilter}
                onChange={(e) => {
                  setSchemeStatusFilter(e.target.value);
                  setSchemePage(1);
                }}
                style={{ ...inputStyle, width: 140 }}
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified Only</option>
                <option value="unverified">Unverified Only</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSchemeFormErrors([]);
                setSchemeForm({
                  code: `SCH-${Date.now().toString().slice(-4)}`,
                  name: "",
                  ministry: "",
                  level: "Central",
                  category: "All Communities",
                  financialAssistance: "",
                  description: "",
                  portalUrl: "https://myscheme.gov.in",
                  source: "",
                  minAge: "",
                  maxAge: "",
                  incomeLimit: "",
                });
                setIsCreatingScheme(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "#1E293B",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <Plus size={14} />
              <span>Codify New Scheme</span>
            </button>
          </div>

          {/* Scheme Modal (Create or Edit) */}
          {(isCreatingScheme || editingScheme) && (
            <div
              style={{
                background: "#F8FAFC",
                border: "2px solid #334155",
                borderRadius: 4,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <h3 style={{ margin: "0 0 14px 0", fontSize: 16, color: INK, fontFamily: serif }}>
                {isCreatingScheme ? "Codify New Government Scheme" : `Edit Scheme: ${editingScheme.code || editingScheme.id}`}
              </h3>

              {schemeFormErrors.length > 0 && (
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: 4,
                    padding: "10px 14px",
                    marginBottom: 14,
                  }}
                >
                  <div style={{ color: "#991B1B", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    Validation Error: Please resolve the following before saving
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#B91C1C", fontSize: 12 }}>
                    {schemeFormErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSaveScheme}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Scheme Code *
                    </label>
                    <input
                      type="text"
                      value={schemeForm.code}
                      onChange={(e) => setSchemeForm({ ...schemeForm, code: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Official Scheme Title *
                    </label>
                    <input
                      type="text"
                      value={schemeForm.name}
                      onChange={(e) => setSchemeForm({ ...schemeForm, name: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Jurisdiction Level *
                    </label>
                    <select
                      value={schemeForm.level}
                      onChange={(e) => setSchemeForm({ ...schemeForm, level: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="Central">Central</option>
                      <option value="State">State</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Nodal Ministry / Department *
                    </label>
                    <input
                      type="text"
                      value={schemeForm.ministry}
                      onChange={(e) => setSchemeForm({ ...schemeForm, ministry: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Financial Assistance / Max Benefit
                    </label>
                    <input
                      type="text"
                      value={schemeForm.financialAssistance}
                      onChange={(e) => setSchemeForm({ ...schemeForm, financialAssistance: e.target.value })}
                      placeholder="e.g. Up to ₹50 Lakh subsidy (35%)"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Official Portal URL (Must be valid HTTP/HTTPS) *
                    </label>
                    <input
                      type="url"
                      value={schemeForm.portalUrl}
                      onChange={(e) => setSchemeForm({ ...schemeForm, portalUrl: e.target.value })}
                      placeholder="https://myscheme.gov.in"
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Source Reference / Gazette Link
                    </label>
                    <input
                      type="text"
                      value={schemeForm.source || ""}
                      onChange={(e) => setSchemeForm({ ...schemeForm, source: e.target.value })}
                      placeholder="e.g. Ministry Notification No. 12/2024"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Minimum Age (Years)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={schemeForm.minAge || ""}
                      onChange={(e) => setSchemeForm({ ...schemeForm, minAge: e.target.value })}
                      placeholder="e.g. 18"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Maximum Age (Years)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={schemeForm.maxAge || ""}
                      onChange={(e) => setSchemeForm({ ...schemeForm, maxAge: e.target.value })}
                      placeholder="e.g. 65"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Annual Family Income Ceiling (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={schemeForm.incomeLimit || ""}
                      onChange={(e) => setSchemeForm({ ...schemeForm, incomeLimit: e.target.value })}
                      placeholder="e.g. 800000"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Operational Scheme Summary &amp; Eligibility Guidelines
                  </label>
                  <textarea
                    rows={3}
                    value={schemeForm.description}
                    onChange={(e) => setSchemeForm({ ...schemeForm, description: e.target.value })}
                    style={{ ...inputStyle, height: "auto" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 16px",
                      background: OK,
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 4,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Save Scheme Record
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingScheme(false);
                      setEditingScheme(null);
                      setSchemeFormErrors([]);
                    }}
                    style={{
                      padding: "8px 14px",
                      background: "#FFFFFF",
                      border: `1px solid ${RULE}`,
                      color: INK,
                      borderRadius: 4,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Scheme Table */}
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${RULE}`, color: INK }}>
                  <th style={{ padding: "10px 14px" }}>Code</th>
                  <th style={{ padding: "10px 14px" }}>Scheme Name &amp; Ministry</th>
                  <th style={{ padding: "10px 14px" }}>Level</th>
                  <th style={{ padding: "10px 14px" }}>Criteria Status</th>
                  <th style={{ padding: "10px 14px" }}>State</th>
                  <th style={{ padding: "10px 14px" }}>Verification</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingSchemes ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      Loading schemes catalog from SQLite...
                    </td>
                  </tr>
                ) : schemes.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      No schemes matched your search filter.
                    </td>
                  </tr>
                ) : (
                  schemes.map((s) => {
                    const isActive = s.isActive !== false && s.is_active !== 0;
                    const isMissingCriteria = s.criteriaCompleteness === "missing_criteria";

                    return (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${RULE}`, background: isActive ? "#FFFFFF" : "#F8FAFC" }}>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#475569" }}>
                          {s.code || s.id}
                        </td>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: INK }}>
                          <div>{s.name}</div>
                          <div style={{ color: "#64748B", fontSize: 11.5, fontWeight: 400 }}>{s.ministry}</div>
                          {s.officialUrl && (
                            <a
                              href={s.officialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#2563EB", fontSize: 11, textDecoration: "none", display: "inline-block", marginTop: 2 }}
                            >
                              {s.officialUrl.replace(/^https?:\/\//, "").slice(0, 32)}...
                            </a>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              background: s.level === "Central" ? "#EFF6FF" : "#F0FDF4",
                              color: s.level === "Central" ? "#1E40AF" : "#166534",
                              padding: "2px 6px",
                              borderRadius: 3,
                              fontWeight: 600,
                            }}
                          >
                            {s.level}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {isMissingCriteria ? (
                            <span
                              style={{
                                fontSize: 10.5,
                                background: "#FFFBEB",
                                border: "1px solid #FDE68A",
                                color: "#B45309",
                                padding: "2px 6px",
                                borderRadius: 3,
                                fontWeight: 600,
                              }}
                              title="Missing min age, max age, or income threshold criteria"
                            >
                              ⚠ Missing Criteria
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 10.5,
                                background: "#F0FDF4",
                                border: "1px solid #BBF7D0",
                                color: OK,
                                padding: "2px 6px",
                                borderRadius: 3,
                                fontWeight: 600,
                              }}
                            >
                              ✓ Codified
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              background: isActive ? "#F0FDF4" : "#FEF2F2",
                              color: isActive ? OK : "#DC2626",
                              border: `1px solid ${isActive ? "#BBF7D0" : "#FECDD3"}`,
                              padding: "2px 6px",
                              borderRadius: 3,
                              fontWeight: 600,
                            }}
                          >
                            {isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <button
                            type="button"
                            onClick={() => handleToggleVerify(s.id, s.isVerified)}
                            style={{
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                              padding: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title="Click to toggle verification status"
                          >
                            {s.isVerified ? (
                              <span style={{ color: OK, fontWeight: 600, fontSize: 12 }}>✓ Verified</span>
                            ) : (
                              <span style={{ color: "#D97706", fontSize: 12 }}>⏳ Unverified</span>
                            )}
                          </button>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(s.id, isActive)}
                              style={{
                                background: isActive ? "#FFF1F2" : "#F0FDF4",
                                border: `1px solid ${isActive ? "#FECDD3" : "#BBF7D0"}`,
                                color: isActive ? "#BE123C" : OK,
                                padding: "4px 8px",
                                borderRadius: 3,
                                cursor: "pointer",
                                fontSize: 11.5,
                                fontWeight: 600,
                              }}
                              title={isActive ? "Deactivate scheme from matcher" : "Activate scheme"}
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSchemeFormErrors([]);
                                setEditingScheme(s);
                                setSchemeForm({
                                  code: s.code || s.id,
                                  name: s.name,
                                  ministry: s.ministry,
                                  level: s.level || "Central",
                                  category: s.targetBeneficiary || "All Communities",
                                  financialAssistance: s.maxBenefitAmount || "",
                                  description: s.summary || "",
                                  portalUrl: s.officialUrl || "https://myscheme.gov.in",
                                  source: s.source || "",
                                  minAge: s.minAge || "",
                                  maxAge: s.maxAge || "",
                                  incomeLimit: s.incomeLimit || "",
                                });
                              }}
                              style={{
                                background: "#F1F5F9",
                                border: "none",
                                padding: "4px 8px",
                                borderRadius: 3,
                                cursor: "pointer",
                                color: INK,
                              }}
                              title="Edit scheme parameters"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteScheme(s.id, s.name)}
                              style={{
                                background: "#FEF2F2",
                                border: "none",
                                padding: "4px 8px",
                                borderRadius: 3,
                                cursor: "pointer",
                                color: "#DC2626",
                              }}
                              title="Delete scheme"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Schemes Pagination Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderTop: `1px solid ${RULE}`,
                background: "#F8FAFC",
                fontSize: 12,
                color: "#64748B",
              }}
            >
              <div>
                Showing {totalSchemes === 0 ? 0 : (schemePage - 1) * schemePageSize + 1} to{" "}
                {Math.min(schemePage * schemePageSize, totalSchemes)} of {totalSchemes} schemes
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setSchemePage((p) => Math.max(1, p - 1))}
                  disabled={schemePage <= 1}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    background: schemePage <= 1 ? "#F1F5F9" : "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    borderRadius: 3,
                    cursor: schemePage <= 1 ? "not-allowed" : "pointer",
                    color: schemePage <= 1 ? "#94A3B8" : INK,
                    fontWeight: 600,
                  }}
                >
                  <ChevronLeft size={13} />
                  <span>Previous</span>
                </button>
                <span style={{ fontWeight: 600, color: INK, padding: "0 6px" }}>
                  Page {schemePage} of {Math.max(1, Math.ceil(totalSchemes / schemePageSize))}
                </span>
                <button
                  type="button"
                  onClick={() => setSchemePage((p) => p + 1)}
                  disabled={schemePage * schemePageSize >= totalSchemes}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    background: schemePage * schemePageSize >= totalSchemes ? "#F1F5F9" : "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    borderRadius: 3,
                    cursor: schemePage * schemePageSize >= totalSchemes ? "not-allowed" : "pointer",
                    color: schemePage * schemePageSize >= totalSchemes ? "#94A3B8" : INK,
                    fontWeight: 600,
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DOCUMENT VERIFICATION DESK */}
      {activeTab === "documents" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontFamily: serif, fontSize: 16, color: INK }}>
                Citizen Document Verification Desk
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
                Official officer review queue. Review uploaded credentials and record binding verification decisions.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: 200 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "#94A3B8" }} />
                <input
                  type="text"
                  placeholder="Search citizen or document..."
                  value={docSearch}
                  onChange={(e) => {
                    setDocSearch(e.target.value);
                    setDocPage(1);
                  }}
                  style={{ ...inputStyle, paddingLeft: 30 }}
                />
              </div>

              <select
                value={docStatusFilter}
                onChange={(e) => {
                  setDocStatusFilter(e.target.value);
                  setDocPage(1);
                }}
                style={{ ...inputStyle, width: 190 }}
              >
                <option value="all">All Uploaded Documents</option>
                <option value="Needs Review">Queue: Needs Review</option>
                <option value="Verified Against Provided Criteria">Status: Verified</option>
                <option value="Rejected With Reason">Status: Rejected</option>
                <option value="Pending">Status: Pending</option>
              </select>

              <button
                type="button"
                onClick={loadDocuments}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  background: "#FFFFFF",
                  border: `1px solid ${RULE}`,
                  color: INK,
                  borderRadius: 4,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Refresh review queue"
              >
                <RefreshCw size={13} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Review Modal */}
          {reviewModalDoc && (
            <div
              style={{
                background: "#F8FAFC",
                border: "2px solid #334155",
                borderRadius: 4,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: 16, color: INK }}>
                    Review Case: {reviewModalDoc.docName || reviewModalDoc.name} ({reviewModalDoc.userName})
                  </h4>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    Citizen: {reviewModalDoc.userName} · {reviewModalDoc.userEmail} · Category: {reviewModalDoc.docType || reviewModalDoc.type}
                    {reviewModalDoc.schemeId ? ` · Target Scheme: ${reviewModalDoc.schemeId}` : " · General Vault"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `/api/documents/${encodeURIComponent(reviewModalDoc.id)}/download?token=${encodeURIComponent(token)}`;
                      window.open(url, "_blank");
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      background: "#FFFFFF",
                      border: `1px solid ${RULE}`,
                      color: INK,
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <FileText size={14} />
                    <span>Download / View File</span>
                  </button>
                </div>
              </div>

              {/* Extracted Credentials Drawer */}
              {reviewModalDoc.extractedData && (
                <div
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    borderRadius: 4,
                    padding: "12px 16px",
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                    Extracted Structured Credentials (OCR Confidence: {Math.round((reviewModalDoc.extractionConfidence || 0) * 100)}%)
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 10,
                      fontSize: 12,
                    }}
                  >
                    {reviewModalDoc.extractedData.applicantName && (
                      <div>
                        <span style={{ color: "#64748B" }}>Applicant Name: </span>
                        <strong style={{ color: INK }}>{reviewModalDoc.extractedData.applicantName}</strong>
                      </div>
                    )}
                    {reviewModalDoc.extractedData.annualFamilyIncome != null && (
                      <div>
                        <span style={{ color: "#64748B" }}>Annual Income: </span>
                        <strong style={{ color: OK }}>
                          ₹{Number(reviewModalDoc.extractedData.annualFamilyIncome).toLocaleString("en-IN")}
                        </strong>
                      </div>
                    )}
                    {reviewModalDoc.extractedData.certificateNumber && (
                      <div>
                        <span style={{ color: "#64748B" }}>Certificate No: </span>
                        <strong style={{ color: INK, fontFamily: "monospace" }}>
                          {reviewModalDoc.extractedData.certificateNumber}
                        </strong>
                      </div>
                    )}
                    {reviewModalDoc.extractedData.issuingAuthority && (
                      <div>
                        <span style={{ color: "#64748B" }}>Authority: </span>
                        <strong style={{ color: INK }}>{reviewModalDoc.extractedData.issuingAuthority}</strong>
                      </div>
                    )}
                    {reviewModalDoc.extractedData.issueDate && (
                      <div>
                        <span style={{ color: "#64748B" }}>Issue Date: </span>
                        <strong style={{ color: INK }}>{reviewModalDoc.extractedData.issueDate}</strong>
                      </div>
                    )}
                    {reviewModalDoc.extractedData.expiryDate && (
                      <div>
                        <span style={{ color: "#64748B" }}>Expiry Date: </span>
                        <strong style={{ color: INK }}>{reviewModalDoc.extractedData.expiryDate}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Automated Verification Evidence / Reason */}
              {reviewModalDoc.verificationReason && (
                <div
                  style={{
                    background: "#FFFBEB",
                    border: "1px solid #FDE68A",
                    borderRadius: 4,
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "#92400E",
                    marginBottom: 14,
                  }}
                >
                  <strong>Automated Rule Finding: </strong> {reviewModalDoc.verificationReason}
                </div>
              )}

              <form onSubmit={handleReviewDocument}>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Officer Verification Decision *
                    </label>
                    <select
                      value={reviewDecision}
                      onChange={(e) => setReviewDecision(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Verified Against Provided Criteria">Approve · Verified Against Provided Criteria</option>
                      <option value="Needs Review">Flag · Needs Further Review</option>
                      <option value="Rejected With Reason">Reject · Rejected With Reason</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Officer Verification Remark / Defect Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Document clearly matches citizen Aadhaar and State registry."
                      value={reviewRemark}
                      onChange={(e) => setReviewRemark(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    style={{
                      padding: "8px 18px",
                      background: reviewDecision.includes("Verified") ? OK : reviewDecision.includes("Reject") ? "#DC2626" : "#B45309",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 4,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: submittingReview ? "wait" : "pointer",
                      opacity: submittingReview ? 0.7 : 1,
                    }}
                  >
                    {submittingReview ? "Recording Decision..." : "Submit Verification Decision"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewModalDoc(null)}
                    style={{
                      padding: "8px 14px",
                      background: "#FFFFFF",
                      border: `1px solid ${RULE}`,
                      color: INK,
                      borderRadius: 4,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${RULE}`, color: INK }}>
                  <th style={{ padding: "10px 14px" }}>Citizen</th>
                  <th style={{ padding: "10px 14px" }}>Document &amp; Scheme</th>
                  <th style={{ padding: "10px 14px" }}>Extracted Highlights</th>
                  <th style={{ padding: "10px 14px" }}>Uploaded</th>
                  <th style={{ padding: "10px 14px" }}>Status</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingDocs ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      Loading document queue from database...
                    </td>
                  </tr>
                ) : documentsQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      No documents currently matching selected filter in review queue.
                    </td>
                  </tr>
                ) : (
                  documentsQueue.map((doc) => {
                    const statusText = doc.verificationStatus || doc.status || "Pending";
                    const isVerified = statusText.includes("Verified");
                    const isRejected = statusText.includes("Reject");
                    const isReview = statusText.includes("Review") || statusText === "Under Review";

                    const badgeBg = isVerified ? "#F0FDF4" : isRejected ? "#FEF2F2" : isReview ? "#FFFBEB" : "#F1F5F9";
                    const badgeColor = isVerified ? OK : isRejected ? "#991B1B" : isReview ? "#92400E" : "#475569";
                    const badgeBorder = isVerified ? "#BBF7D0" : isRejected ? "#FECDD3" : isReview ? "#FDE68A" : "#CBD5E1";

                    return (
                      <tr key={doc.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: INK }}>
                          {doc.userName || "Citizen"}
                          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 400 }}>{doc.userEmail}</div>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#334155" }}>
                          <div>{doc.docType || doc.type}</div>
                          <div style={{ fontSize: 11, color: "#64748B", fontFamily: "monospace" }}>
                            {doc.docName || doc.name} ({doc.docSize || doc.size || "file"})
                          </div>
                          {doc.schemeId && (
                            <span style={{ fontSize: 10, background: "#EFF6FF", color: "#1D4ED8", padding: "1px 6px", borderRadius: 2 }}>
                              {doc.schemeId}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 12 }}>
                          {doc.extractedData ? (
                            <div>
                              {doc.extractedData.annualFamilyIncome != null && (
                                <div>Income: ₹{Number(doc.extractedData.annualFamilyIncome).toLocaleString("en-IN")}</div>
                              )}
                              {doc.extractedData.certificateNumber && (
                                <div style={{ fontFamily: "monospace", fontSize: 11, color: "#475569" }}>
                                  Cert: {doc.extractedData.certificateNumber}
                                </div>
                              )}
                              {doc.extractionConfidence ? (
                                <div style={{ fontSize: 10, color: "#059669" }}>
                                  OCR: {Math.round(doc.extractionConfidence * 100)}%
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>No OCR extract</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px", color: "#64748B", fontSize: 12 }}>
                          {new Date(doc.createdAt || doc.uploadedAt || Date.now()).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              background: badgeBg,
                              color: badgeColor,
                              border: `1px solid ${badgeBorder}`,
                              padding: "2px 8px",
                              borderRadius: 3,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {statusText}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const url = `/api/documents/${encodeURIComponent(doc.id)}/download?token=${encodeURIComponent(token)}`;
                                window.open(url, "_blank");
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "5px 9px",
                                background: "#FFFFFF",
                                border: `1px solid ${RULE}`,
                                color: INK,
                                borderRadius: 3,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                              title="Download or preview full uploaded file"
                            >
                              <FileText size={12} />
                              <span>View File</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewModalDoc(doc);
                                setReviewDecision(doc.verificationStatus || (doc.status === "Verified" ? "Verified Against Provided Criteria" : "Verified Against Provided Criteria"));
                                setReviewRemark(doc.verificationNotes || doc.verificationRemark || "");
                              }}
                              style={{
                                padding: "5px 12px",
                                background: "#1E293B",
                                color: "#FFFFFF",
                                border: "none",
                                borderRadius: 3,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Review Case
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Document Pagination Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderTop: `1px solid ${RULE}`,
                background: "#F8FAFC",
                fontSize: 12,
                color: "#64748B",
              }}
            >
              <div>
                Showing {totalDocs === 0 ? 0 : (docPage - 1) * docPageSize + 1} to{" "}
                {Math.min(docPage * docPageSize, totalDocs)} of {totalDocs} documents
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setDocPage((p) => Math.max(1, p - 1))}
                  disabled={docPage <= 1}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    background: docPage <= 1 ? "#F1F5F9" : "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    borderRadius: 3,
                    cursor: docPage <= 1 ? "not-allowed" : "pointer",
                    color: docPage <= 1 ? "#94A3B8" : INK,
                    fontWeight: 600,
                  }}
                >
                  <ChevronLeft size={13} />
                  <span>Previous</span>
                </button>
                <span style={{ fontWeight: 600, color: INK, padding: "0 6px" }}>
                  Page {docPage} of {Math.max(1, Math.ceil(totalDocs / docPageSize))}
                </span>
                <button
                  type="button"
                  onClick={() => setDocPage((p) => p + 1)}
                  disabled={docPage * docPageSize >= totalDocs}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    background: docPage * docPageSize >= totalDocs ? "#F1F5F9" : "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    borderRadius: 3,
                    cursor: docPage * docPageSize >= totalDocs ? "not-allowed" : "pointer",
                    color: docPage * docPageSize >= totalDocs ? "#94A3B8" : INK,
                    fontWeight: 600,
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CITIZEN REGISTRY */}
      {activeTab === "citizens" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontFamily: serif, fontSize: 16, color: INK }}>
                Registered Citizen Profiles ({citizens.length})
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
                Permanent database accounts with access control role isolation. Real-time updates as citizens register.
              </p>
            </div>
            <button
              type="button"
              onClick={loadCitizens}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                color: INK,
                borderRadius: 4,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={13} />
              <span>Refresh Citizens</span>
            </button>
          </div>

          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${RULE}`, color: INK }}>
                  <th style={{ padding: "10px 14px" }}>Citizen Name</th>
                  <th style={{ padding: "10px 14px" }}>System Role</th>
                  <th style={{ padding: "10px 14px" }}>Email / Mobile</th>
                  <th style={{ padding: "10px 14px" }}>State</th>
                  <th style={{ padding: "10px 14px" }}>Category</th>
                  <th style={{ padding: "10px 14px" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {loadingCitizens ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      Loading citizen records...
                    </td>
                  </tr>
                ) : citizens.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      No citizens registered.
                    </td>
                  </tr>
                ) : (
                  citizens.map((c) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: INK }}>
                        <span style={{ marginRight: 6 }}>{c.avatar || "👤"}</span>
                        {c.name}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            background: c.systemRole === "admin" ? "#FEF3C7" : "#F1F5F9",
                            color: c.systemRole === "admin" ? "#92400E" : "#475569",
                            border: `1px solid ${c.systemRole === "admin" ? "#FCD34D" : "#CBD5E1"}`,
                            padding: "2px 6px",
                            borderRadius: 3,
                            fontWeight: 700,
                          }}
                        >
                          {c.systemRole.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748B", fontSize: 12 }}>
                        {c.email || c.mobile || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#334155" }}>
                        {c.profileData?.state || c.state || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#334155" }}>
                        {c.profileData?.category || c.category || c.categoryBadge || "General"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748B", fontSize: 12 }}>
                        {c.createdAt || c.created_at ? new Date(c.createdAt || c.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scheme Data Sync Tab */}
      {activeTab === "sync" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Top Control Header */}
          <div
            style={{
              background: CARD,
              border: `1px solid ${RULE}`,
              borderRadius: 8,
              padding: "18px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    background: "#0B3C5D",
                    color: "#FFFFFF",
                    padding: 8,
                    borderRadius: 6,
                    display: "flex",
                  }}
                >
                  <RefreshCw size={20} className={isSyncing ? "spin-icon" : ""} />
                </div>
                <div>
                  <h2
                    style={{
                      fontFamily: serif,
                      fontSize: 18,
                      fontWeight: 700,
                      color: INK,
                      margin: 0,
                    }}
                  >
                    Automated Government Scheme Data Ingestion & Synchronization
                  </h2>
                  <p style={{ margin: "2px 0 0 0", fontSize: 13, color: "#64748B" }}>
                    Official integration with myScheme (API Setu), data.gov.in open catalogs, and authorized datasets.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <select
                value={selectedSourceToSync}
                onChange={(e) => setSelectedSourceToSync(e.target.value)}
                style={{
                  ...inputStyle,
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 500,
                  minWidth: 190,
                }}
              >
                <option value="src_myscheme_api">myScheme (API Setu)</option>
                <option value="src_datagov_in">data.gov.in Open Data</option>
                <option value="src_file_dataset">File Dataset Ingestion</option>
              </select>

              <button
                onClick={handleTriggerSyncNow}
                disabled={isSyncing}
                style={{
                  background: isSyncing ? "#94A3B8" : "#0B3C5D",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "9px 18px",
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isSyncing ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 1px 2px rgba(11,60,93,0.2)",
                }}
              >
                <RefreshCw size={15} className={isSyncing ? "spin-icon" : ""} />
                <span>{isSyncing ? "Synchronizing..." : "Sync Now"}</span>
              </button>

              <button
                onClick={() => setUploadModalOpen(true)}
                style={{
                  background: "#FFFFFF",
                  color: "#0B3C5D",
                  border: `1px solid #CBD5E1`,
                  padding: "9px 16px",
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Upload size={15} />
                <span>Import Dataset File</span>
              </button>

              <button
                onClick={() => {
                  loadSyncStatus();
                  loadSyncRuns();
                  loadReviewQueue();
                }}
                style={{
                  background: "#F8FAFC",
                  color: "#475569",
                  border: `1px solid #E2E8F0`,
                  padding: "9px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                }}
                title="Refresh Status"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Scheduler Status Banner */}
          <div
            style={{
              background: syncStatus?.scheduler?.isRunning ? "#F0FDF4" : "#FFFBEB",
              border: `1px solid ${syncStatus?.scheduler?.isRunning ? "#BBF7D0" : "#FDE68A"}`,
              borderRadius: 6,
              padding: "10px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: syncStatus?.scheduler?.isRunning ? "#16A34A" : "#D97706",
                }}
              />
              <span style={{ fontWeight: 600, color: syncStatus?.scheduler?.isRunning ? "#166534" : "#92400E" }}>
                Background Synchronization Daemon:{" "}
                {syncStatus?.scheduler?.isRunning ? "Active & Monitoring" : "Paused"}
              </span>
              <span style={{ color: "#64748B" }}>
                (Check frequency: {((syncStatus?.scheduler?.checkIntervalMs || 60000) / 1000)}s | Active scheduled sources: {syncStatus?.scheduler?.activeScheduledSources?.length || 0})
              </span>
            </div>
            <div>
              <button
                onClick={() => handleToggleScheduler(syncStatus?.scheduler?.isRunning ? "stop" : "start")}
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${syncStatus?.scheduler?.isRunning ? "#86EFAC" : "#FCD34D"}`,
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: syncStatus?.scheduler?.isRunning ? "#166534" : "#92400E",
                }}
              >
                {syncStatus?.scheduler?.isRunning ? "Pause Scheduler" : "Start Scheduler"}
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            {/* Card 1: Sync Status */}
            <div style={{ background: CARD, border: `1px solid ${RULE}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                Sync Engine Status
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: syncStatus?.status?.isRunning
                      ? "#E06D14"
                      : syncStatus?.status?.lastRun?.status === "failed"
                      ? "#DC2626"
                      : "#16A34A",
                  }}
                />
                <span style={{ fontSize: 16, fontWeight: 700, color: INK }}>
                  {syncStatus?.status?.isRunning
                    ? "In Progress..."
                    : syncStatus?.status?.lastRun?.status === "failed"
                    ? "Attention Needed"
                    : "Idle (Ready)"}
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 11.5, color: "#64748B" }}>
                {syncStatus?.status?.isRunning ? "Processing batch items" : "Ready for next trigger"}
              </div>
            </div>

            {/* Card 2: Last Successful Sync */}
            <div style={{ background: CARD, border: `1px solid ${RULE}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                Last Sync Run
              </div>
              <div style={{ marginTop: 8, fontSize: 15, fontWeight: 700, color: INK }}>
                {syncStatus?.status?.lastRun?.completedAt
                  ? new Date(syncStatus.status.lastRun.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : "Never"}
              </div>
              <div style={{ marginTop: 6, fontSize: 11.5, color: "#64748B" }}>
                {syncStatus?.status?.lastRun?.completedAt
                  ? new Date(syncStatus.status.lastRun.completedAt).toLocaleDateString()
                  : "No prior runs logged"}
              </div>
            </div>

            {/* Card 3: Total Retrieved */}
            <div style={{ background: CARD, border: `1px solid ${RULE}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                Total Records Retrieved
              </div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: "#0B3C5D" }}>
                {syncStatus?.status?.lastRun?.totalRetrieved ?? 0}
              </div>
              <div style={{ marginTop: 6, fontSize: 11.5, color: "#64748B" }}>
                In last executed sync run
              </div>
            </div>

            {/* Card 4: New Schemes Detected */}
            <div style={{ background: CARD, border: `1px solid ${RULE}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                New Schemes Detected
              </div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: "#16A34A" }}>
                {syncStatus?.status?.lastRun?.newDetected ?? 0}
              </div>
              <div style={{ marginTop: 6, fontSize: 11.5, color: "#64748B" }}>
                New unique identifiers
              </div>
            </div>

            {/* Card 5: Updated Schemes Detected */}
            <div style={{ background: CARD, border: `1px solid ${RULE}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                Updated Schemes Detected
              </div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: "#2563EB" }}>
                {syncStatus?.status?.lastRun?.updatedDetected ?? 0}
              </div>
              <div style={{ marginTop: 6, fontSize: 11.5, color: "#64748B" }}>
                Hash difference detected
              </div>
            </div>

            {/* Card 6: Needs Review Queue */}
            <div style={{ background: CARD, border: `1px solid ${syncStatus?.status?.pendingReviewCount > 0 ? "#FCD34D" : RULE}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B45309", textTransform: "uppercase" }}>
                Needs Review Queue
              </div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: "#D97706" }}>
                {syncStatus?.status?.pendingReviewCount ?? 0}
              </div>
              <div style={{ marginTop: 6, fontSize: 11.5, color: "#64748B" }}>
                Requires admin verification
              </div>
            </div>
          </div>

          {/* Staged Ingestion Review Queue Table */}
          <div
            style={{
              background: CARD,
              border: `1px solid ${RULE}`,
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: serif,
                    fontSize: 16,
                    fontWeight: 700,
                    color: INK,
                    margin: 0,
                  }}
                >
                  Staged Ingestion & Criteria Verification Queue
                </h3>
                <p style={{ margin: "3px 0 0 0", fontSize: 12.5, color: "#64748B" }}>
                  Review incoming schemes prior to database upsert. Unstructured criteria are flagged to protect eligibility logic.
                </p>
              </div>

              {/* Batch Actions */}
              {selectedBatchItemIds.size > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0B3C5D" }}>
                    {selectedBatchItemIds.size} selected
                  </span>
                  <button
                    onClick={handleBatchApprove}
                    disabled={isProcessingAction}
                    style={{
                      background: "#16A34A",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "6px 14px",
                      borderRadius: 4,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Check size={14} />
                    <span>Approve Selected</span>
                  </button>
                  <button
                    onClick={() => setSelectedBatchItemIds(new Set())}
                    style={{
                      background: "#F1F5F9",
                      color: "#475569",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Filters Bar */}
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 16,
                paddingBottom: 14,
                borderBottom: `1px solid ${RULE}`,
              }}
            >
              <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
                <Search
                  size={15}
                  color="#94A3B8"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder="Search scheme name or code in queue..."
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: 32,
                    fontSize: 12.5,
                    width: "100%",
                  }}
                />
              </div>

              <select
                value={reviewQueueFilter}
                onChange={(e) => setReviewQueueFilter(e.target.value)}
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 12.5, width: "auto" }}
              >
                <option value="all">All Statuses</option>
                <option value="staged">Staged (Pending)</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={reviewChangeTypeFilter}
                onChange={(e) => setReviewChangeTypeFilter(e.target.value)}
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 12.5, width: "auto" }}
              >
                <option value="all">All Change Types</option>
                <option value="new">New Schemes</option>
                <option value="update">Updates to Existing</option>
                <option value="unchanged">Unchanged</option>
              </select>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: `2px solid ${RULE}`, textAlign: "left" }}>
                    <th style={{ padding: "10px 14px", width: 40 }}>
                      <input
                        type="checkbox"
                        checked={
                          reviewQueue.length > 0 &&
                          reviewQueue.every((item) => selectedBatchItemIds.has(item.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBatchItemIds(new Set(reviewQueue.map((item) => item.id)));
                          } else {
                            setSelectedBatchItemIds(new Set());
                          }
                        }}
                      />
                    </th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700 }}>Scheme Identification</th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700 }}>Ministry / Level</th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700 }}>Change Type</th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700 }}>Review Status</th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700 }}>Criteria Verification</th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                          <CheckCircle2 size={32} color="#16A34A" />
                          <div style={{ fontWeight: 600, color: INK }}>No items currently in review queue</div>
                          <div style={{ fontSize: 12 }}>
                            All imported schemes are synchronized with live registry. Trigger a new sync or upload a dataset file.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reviewQueue.map((item) => {
                      const isSelected = selectedBatchItemIds.has(item.id);
                      const norm = item.normalized_payload || {};
                      const isNew = item.change_type === "new";
                      const isUpdate = item.change_type === "update";
                      const isNeedsReview = item.review_status === "Needs Review";

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: `1px solid ${RULE}`,
                            background: isSelected ? "#F0F9FF" : "transparent",
                          }}
                        >
                          <td style={{ padding: "10px 14px" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const next = new Set(selectedBatchItemIds);
                                if (e.target.checked) next.add(item.id);
                                else next.delete(item.id);
                                setSelectedBatchItemIds(next);
                              }}
                            />
                          </td>

                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ fontWeight: 600, color: INK }}>{norm.name || item.scheme_id}</div>
                            <div style={{ fontSize: 11, color: "#64748B", fontFamily: "monospace", marginTop: 2 }}>
                              ID: {norm.id || item.scheme_id}
                            </div>
                          </td>

                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ color: "#334155", fontSize: 12 }}>{norm.ministry || "General Administration"}</div>
                            <span
                              style={{
                                display: "inline-block",
                                marginTop: 2,
                                fontSize: 10,
                                fontWeight: 700,
                                background: norm.level === "Central" ? "#E0E7FF" : "#FEF3C7",
                                color: norm.level === "Central" ? "#3730A3" : "#92400E",
                                padding: "1px 5px",
                                borderRadius: 3,
                              }}
                            >
                              {norm.level || "Central"}
                            </span>
                          </td>

                          <td style={{ padding: "10px 14px" }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 4,
                                background: isNew ? "#DCFCE7" : isUpdate ? "#DBEAFE" : "#F1F5F9",
                                color: isNew ? "#166534" : isUpdate ? "#1E40AF" : "#475569",
                              }}
                            >
                              {item.change_type?.toUpperCase()}
                            </span>
                          </td>

                          <td style={{ padding: "10px 14px" }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 4,
                                background:
                                  item.status === "approved"
                                    ? "#DCFCE7"
                                    : item.status === "rejected"
                                    ? "#FEE2E2"
                                    : "#FEF3C7",
                                color:
                                  item.status === "approved"
                                    ? "#166534"
                                    : item.status === "rejected"
                                    ? "#991B1B"
                                    : "#92400E",
                              }}
                            >
                              {item.status?.toUpperCase()}
                            </span>
                          </td>

                          <td style={{ padding: "10px 14px" }}>
                            {isNeedsReview ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#D97706", fontSize: 12 }}>
                                <AlertTriangle size={14} />
                                <span style={{ fontWeight: 600 }}>Unstructured Text</span>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#16A34A", fontSize: 12 }}>
                                <CheckCircle2 size={14} />
                                <span>Criteria Verified</span>
                              </div>
                            )}
                          </td>

                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <button
                                onClick={() => setPreviewItemModal(item)}
                                style={{
                                  background: "#F1F5F9",
                                  border: "none",
                                  padding: "5px 8px",
                                  borderRadius: 4,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: "#0F172A",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                                title="Inspect Scheme Diff"
                              >
                                <Eye size={13} />
                                <span>Preview</span>
                              </button>

                              {item.status === "staged" && (
                                <>
                                  <button
                                    onClick={() => handleReviewAction(item.id, "approve")}
                                    style={{
                                      background: "#16A34A",
                                      border: "none",
                                      padding: "5px 8px",
                                      borderRadius: 4,
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      color: "#FFFFFF",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Approve
                                  </button>

                                  <button
                                    onClick={() => handleReviewAction(item.id, "reject")}
                                    style={{
                                      background: "#FEE2E2",
                                      border: "none",
                                      padding: "5px 8px",
                                      borderRadius: 4,
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      color: "#991B1B",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {norm.official_source_url && (
                                <a
                                  href={norm.official_source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    background: "#F8FAFC",
                                    border: "1px solid #CBD5E1",
                                    padding: "5px 7px",
                                    borderRadius: 4,
                                    fontSize: 11,
                                    color: "#475569",
                                    display: "inline-flex",
                                    alignItems: "center",
                                  }}
                                  title="View Official Source"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sync History Table */}
          <div
            style={{
              background: CARD,
              border: `1px solid ${RULE}`,
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <h3
                style={{
                  fontFamily: serif,
                  fontSize: 16,
                  fontWeight: 700,
                  color: INK,
                  margin: 0,
                }}
              >
                Synchronization Audit Logs & Execution History
              </h3>
              <p style={{ margin: "3px 0 0 0", fontSize: 12.5, color: "#64748B" }}>
                Immutable historical records of every automated and manual scheme ingestion task.
              </p>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: `2px solid ${RULE}`, textAlign: "left" }}>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700 }}>Run Identifier</th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700 }}>Source System</th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700 }}>Trigger</th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700 }}>Execution Time</th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700 }}>Records Processed</th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700 }}>Status</th>
                    <th style={{ padding: "10px 14px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {syncRuns.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#64748B" }}>
                        No synchronization history logged yet.
                      </td>
                    </tr>
                  ) : (
                    syncRuns.map((run) => (
                      <tr key={run.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                          {run.id}
                        </td>
                        <td style={{ padding: "10px 14px", color: INK }}>
                          {run.source_name || run.source_id}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              background: run.trigger_type === "scheduled" ? "#EDE9FE" : "#F1F5F9",
                              color: run.trigger_type === "scheduled" ? "#5B21B6" : "#475569",
                              padding: "2px 6px",
                              borderRadius: 3,
                              fontWeight: 600,
                            }}
                          >
                            {run.trigger_type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 12 }}>
                          {run.started_at ? (() => {
                            const ts = formatAuditTimestamp(run.started_at);
                            return (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "ui-monospace, monospace", fontSize: 11.5 }}>
                                <span style={{ color: "#0F172A", fontWeight: 700 }}>{ts.date}</span>
                                <span style={{ color: "#CBD5E1" }}>•</span>
                                <span style={{ color: "#2563EB", fontWeight: 600 }}>{ts.time}</span>
                              </div>
                            );
                          })() : "—"}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontSize: 12 }}>
                            <span style={{ fontWeight: 600 }}>{run.total_retrieved}</span> total (
                            <span style={{ color: "#16A34A" }}>+{run.new_detected} new</span>,{" "}
                            <span style={{ color: "#2563EB" }}>~{run.updated_detected} upd</span>,{" "}
                            <span style={{ color: "#D97706" }}>!{run.needs_review_count} rev</span>)
                          </div>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background:
                                run.status === "succeeded"
                                  ? "#DCFCE7"
                                  : run.status === "failed"
                                  ? "#FEE2E2"
                                  : "#FEF3C7",
                              color:
                                run.status === "succeeded"
                                  ? "#166534"
                                  : run.status === "failed"
                                  ? "#991B1B"
                                  : "#92400E",
                            }}
                          >
                            {run.status?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              onClick={() => setActiveRunDetailModal(run)}
                              style={{
                                background: "#F1F5F9",
                                border: "none",
                                padding: "4px 8px",
                                borderRadius: 4,
                                fontSize: 11.5,
                                cursor: "pointer",
                                fontWeight: 500,
                              }}
                            >
                              Logs
                            </button>
                            {run.status === "failed" && (
                              <button
                                onClick={() => handleRetryRun(run.id)}
                                style={{
                                  background: "#FEF2F2",
                                  border: "1px solid #FCA5A5",
                                  padding: "4px 8px",
                                  borderRadius: 4,
                                  fontSize: 11.5,
                                  color: "#991B1B",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                Retry
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Registered Government Sources Information Box */}
          <div
            style={{
              background: "#F8FAFC",
              border: `1px solid ${RULE}`,
              borderRadius: 8,
              padding: 20,
            }}
          >
            <h4
              style={{
                fontFamily: serif,
                fontSize: 15,
                fontWeight: 700,
                color: INK,
                margin: "0 0 8px 0",
              }}
            >
              Authorized Data Sources & Integration Credentials
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 6, padding: 14 }}>
                <div style={{ fontWeight: 600, color: "#0B3C5D", fontSize: 13.5 }}>myScheme (API Setu)</div>
                <p style={{ margin: "4px 0 8px 0", fontSize: 12, color: "#64748B" }}>
                  Official national scheme repository. Connects via API Setu token. Set <code style={{ background: "#F1F5F9", padding: "1px 4px", borderRadius: 3 }}>MYSCHEME_API_KEY</code> in environment.
                </p>
                <div style={{ fontSize: 11.5, color: "#059669", fontWeight: 600 }}>• Authorized Direct Connector</div>
              </div>

              <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 6, padding: 14 }}>
                <div style={{ fontWeight: 600, color: "#0B3C5D", fontSize: 13.5 }}>data.gov.in Open Data Catalogs</div>
                <p style={{ margin: "4px 0 8px 0", fontSize: 12, color: "#64748B" }}>
                  Open Government Data (OGD) platform catalog. Set <code style={{ background: "#F1F5F9", padding: "1px 4px", borderRadius: 3 }}>DATAGOV_API_KEY</code> in environment.
                </p>
                <div style={{ fontSize: 11.5, color: "#059669", fontWeight: 600 }}>• Public API Key Authorized</div>
              </div>

              <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 6, padding: 14 }}>
                <div style={{ fontWeight: 600, color: "#0B3C5D", fontSize: 13.5 }}>Authorized Machine-Readable Datasets</div>
                <p style={{ margin: "4px 0 8px 0", fontSize: 12, color: "#64748B" }}>
                  Downloadable JSON/CSV government datasets with verified schemas, validated against statutory criteria.
                </p>
                <div style={{ fontSize: 11.5, color: "#0284C7", fontWeight: 600 }}>• Local Machine-Readable Pipeline</div>
              </div>
            </div>
          </div>

          {/* Modal: Import Dataset File */}
          {uploadModalOpen && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: 16,
              }}
            >
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 8,
                  padding: 24,
                  maxWidth: 620,
                  width: "100%",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, margin: 0, color: INK }}>
                    Import Official Government Scheme Dataset
                  </h3>
                  <button
                    onClick={() => {
                      setUploadModalOpen(false);
                      setUploadFileContent("");
                      setUploadFileName("");
                      setUploadError("");
                    }}
                    style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: "#64748B" }}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px 0" }}>
                  Upload an authorized JSON or CSV file containing machine-readable government scheme data. Records will be validated and staged for admin review.
                </p>

                {uploadError && (
                  <div
                    style={{
                      background: "#FEE2E2",
                      border: "1px solid #FCA5A5",
                      color: "#991B1B",
                      padding: "10px 14px",
                      borderRadius: 6,
                      fontSize: 12.5,
                      marginBottom: 16,
                    }}
                  >
                    {uploadError}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 6 }}>
                    Select Dataset File (.json or .csv)
                  </label>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileSelected}
                    style={{ ...inputStyle, width: "100%", padding: "8px 10px" }}
                  />
                  {uploadFileName && (
                    <div style={{ fontSize: 12, color: "#059669", fontWeight: 600, marginTop: 4 }}>
                      Selected: {uploadFileName} ({uploadFileFormat.toUpperCase()})
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 6 }}>
                    Or Paste Raw Dataset Payload Content
                  </label>
                  <textarea
                    rows={8}
                    placeholder="[ { &quot;id&quot;: &quot;SCHEME-1&quot;, &quot;name&quot;: &quot;...&quot;, &quot;ministry&quot;: &quot;...&quot; } ]"
                    value={uploadFileContent}
                    onChange={(e) => setUploadFileContent(e.target.value)}
                    style={{
                      ...inputStyle,
                      width: "100%",
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    onClick={() => {
                      setUploadModalOpen(false);
                      setUploadFileContent("");
                      setUploadFileName("");
                    }}
                    style={{
                      background: "#F1F5F9",
                      color: "#475569",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteImportUpload}
                    disabled={isUploading}
                    style={{
                      background: "#0B3C5D",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "8px 18px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isUploading ? "not-allowed" : "pointer",
                    }}
                  >
                    {isUploading ? "Importing & Validating..." : "Execute Import & Staging"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Scheme Staged Review & Diff Modal */}
          {previewItemModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: 16,
              }}
            >
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 8,
                  padding: 24,
                  maxWidth: 720,
                  width: "100%",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: previewItemModal.change_type === "new" ? "#DCFCE7" : "#DBEAFE",
                        color: previewItemModal.change_type === "new" ? "#166534" : "#1E40AF",
                      }}
                    >
                      {previewItemModal.change_type?.toUpperCase()} SCHEME
                    </span>
                    <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, margin: "6px 0 0 0", color: INK }}>
                      {previewItemModal.normalized_payload?.name}
                    </h3>
                    <div style={{ fontSize: 12, color: "#64748B", fontFamily: "monospace", marginTop: 2 }}>
                      ID: {previewItemModal.scheme_id} | Hash: {previewItemModal.content_hash?.substring(0, 16)}...
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewItemModal(null)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: "#64748B" }}
                  >
                    ✕
                  </button>
                </div>

                {/* Criteria Protection Banner */}
                <div
                  style={{
                    background: previewItemModal.review_status === "Needs Review" ? "#FFFBEB" : "#F0FDF4",
                    border: `1px solid ${previewItemModal.review_status === "Needs Review" ? "#FDE68A" : "#BBF7D0"}`,
                    borderRadius: 6,
                    padding: "10px 14px",
                    fontSize: 12.5,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 600, color: previewItemModal.review_status === "Needs Review" ? "#92400E" : "#166534" }}>
                    Criteria Protection Status: {previewItemModal.review_status}
                  </div>
                  <div style={{ color: "#475569", marginTop: 2 }}>
                    {previewItemModal.review_status === "Needs Review"
                      ? "Official source provides text-only criteria without structured bounds. Structured requirements remain Unknown to prevent hallucination."
                      : "Criteria match structured specifications."}
                  </div>
                </div>

                {/* Details Breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#475569", fontSize: 12 }}>Description & Benefits:</div>
                    <div style={{ color: INK, marginTop: 4, lineHeight: 1.5 }}>
                      {previewItemModal.normalized_payload?.description || "No description provided."}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#475569", fontSize: 12 }}>Ministry / Level:</div>
                      <div style={{ color: INK, marginTop: 2 }}>
                        {previewItemModal.normalized_payload?.ministry} ({previewItemModal.normalized_payload?.level})
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#475569", fontSize: 12 }}>Financial Assistance:</div>
                      <div style={{ color: INK, marginTop: 2 }}>
                        {previewItemModal.normalized_payload?.financial_assistance || "In-kind / Subsidized"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, background: "#F8FAFC", padding: 12, borderRadius: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#64748B", fontSize: 11 }}>Min Age:</div>
                      <div style={{ color: INK, fontWeight: 600 }}>
                        {previewItemModal.normalized_payload?.min_age != null ? previewItemModal.normalized_payload.min_age : "None / Any"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#64748B", fontSize: 11 }}>Max Age:</div>
                      <div style={{ color: INK, fontWeight: 600 }}>
                        {previewItemModal.normalized_payload?.max_age != null ? previewItemModal.normalized_payload.max_age : "None / Any"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#64748B", fontSize: 11 }}>Income Limit:</div>
                      <div style={{ color: INK, fontWeight: 600 }}>
                        {previewItemModal.normalized_payload?.income_limit != null ? `₹${previewItemModal.normalized_payload.income_limit}` : "No Ceiling"}
                      </div>
                    </div>
                  </div>

                  {previewItemModal.normalized_payload?.official_source_url && (
                    <div>
                      <div style={{ fontWeight: 600, color: "#475569", fontSize: 12 }}>Official Source URL:</div>
                      <a
                        href={previewItemModal.normalized_payload.official_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#0B3C5D", wordBreak: "break-all", fontSize: 12 }}
                      >
                        {previewItemModal.normalized_payload.official_source_url}
                      </a>
                    </div>
                  )}

                  {/* Review Notes Input */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                      Admin Review Notes / Rationale:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Verified against ministry gazette notification..."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      style={{ ...inputStyle, width: "100%", fontSize: 12 }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    onClick={() => setPreviewItemModal(null)}
                    style={{
                      background: "#F1F5F9",
                      color: "#475569",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleReviewAction(previewItemModal.id, "reject")}
                    disabled={isProcessingAction}
                    style={{
                      background: "#FEE2E2",
                      color: "#991B1B",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isProcessingAction ? "not-allowed" : "pointer",
                    }}
                  >
                    Reject Item
                  </button>
                  <button
                    onClick={() => handleReviewAction(previewItemModal.id, "approve")}
                    disabled={isProcessingAction}
                    style={{
                      background: "#16A34A",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "8px 18px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isProcessingAction ? "not-allowed" : "pointer",
                    }}
                  >
                    Approve & Upsert Scheme
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Execution Logs Modal */}
          {activeRunDetailModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: 16,
              }}
            >
              <div
                style={{
                  background: "#0F172A",
                  color: "#F8FAFC",
                  borderRadius: 8,
                  padding: 24,
                  maxWidth: 720,
                  width: "100%",
                  maxHeight: "80vh",
                  overflowY: "auto",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#38BDF8" }}>
                    Execution Log: {activeRunDetailModal.id}
                  </div>
                  <button
                    onClick={() => setActiveRunDetailModal(null)}
                    style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 16 }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ background: "#1E293B", padding: 12, borderRadius: 6, lineHeight: 1.6 }}>
                  {activeRunDetailModal.logs && activeRunDetailModal.logs.length > 0 ? (
                    activeRunDetailModal.logs.map((l, i) => (
                      <div key={i} style={{ color: l.level === "error" ? "#F87171" : l.level === "warn" ? "#FBBF24" : "#94A3B8" }}>
                        <span style={{ color: "#64748B" }}>[{l.timestamp?.substring(11, 19)}]</span> [{l.level?.toUpperCase()}] {l.message}
                      </div>
                    ))
                  ) : (
                    <div>No detailed log traces available for this run.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Administrative Password Rotation */}
      {isPasswordModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 8,
              padding: 24,
              maxWidth: 460,
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, margin: 0, color: INK }}>
                Rotate Administrative Password
              </h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: "#64748B" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px 0" }}>
              Secure administrative credentials. New password must be at least 8 characters and contain letters and numbers.
            </p>

            {passChangeError && (
              <div
                style={{
                  background: "#FEE2E2",
                  border: "1px solid #FCA5A5",
                  color: "#991B1B",
                  padding: "10px 14px",
                  borderRadius: 6,
                  fontSize: 12.5,
                  marginBottom: 16,
                }}
              >
                {passChangeError}
              </div>
            )}

            <form onSubmit={handleRotatePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                  Current Password:
                </label>
                <input
                  type="password"
                  value={currentPassInput}
                  onChange={(e) => setCurrentPassInput(e.target.value)}
                  style={{ ...inputStyle, width: "100%", fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                  New Password (min 8 chars):
                </label>
                <input
                  type="password"
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  style={{ ...inputStyle, width: "100%", fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                  Confirm New Password:
                </label>
                <input
                  type="password"
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  style={{ ...inputStyle, width: "100%", fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  style={{
                    background: "#F1F5F9",
                    color: "#475569",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  style={{
                    background: "#0B3C5D",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isChangingPass ? "not-allowed" : "pointer",
                  }}
                >
                  {isChangingPass ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
