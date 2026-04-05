import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ===== axiosインスタンス =====
export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ===== トークンを自動付与 =====
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ===== 型定義 =====

export interface KpiData {
  total_balance: number;
  tx_count:      number;
  tx_amount:     number;
  flagged_count: number;
  open_alerts: {
    total:    number;
    critical: number;
    high:     number;
    medium:   number;
    low:      number;
  };
  user_count:  number;
  growth_rate: number;
}

export interface FraudAlert {
  id:          number;
  alert_type:  string;
  severity:    string;
  description: string;
  status:      string;
  created_at:  string;
  user_name:   string | null;
  amount:      number | null;
}

export interface ChatResponse {
  answer:       string;
  result:       string;
  response:     string;
  route:        string;
  session_id:   string;
  graph_base64: string | null;
  graph_json:   string | null;
}

export interface RagResponse {
  query:   string;
  quality: string;
  results: {
    content:  string;
    metadata: Record<string, string>;
  }[];
}

export interface WebCollectResponse {
  message: string;
  results: {
    title:   string;
    url:     string;
    content: string;
  }[];
}

export interface WebLog {
  id:           number;
  url:          string;
  status:       string;
  data_type:    string;
  processed_at: string;
}

export interface CollectResponse {
  message: string;
}

export interface FraudCheckResponse {
  transaction_id: number;
  is_fraud:       boolean;
  risk_score:     number;
  severity:       string;
  reasoning:      string;
  session_id:     string;
}

export interface FraudManualRequest {
  account_id:       number;
  amount:           number;
  transaction_type: string;
  description:      string;
}

// ===== API関数 =====

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("access_token", res.data.access_token);
    return res.data;
  },
  logout: () => {
    localStorage.removeItem("access_token");
  },
};

export const reportApi = {
  getKpi: async (): Promise<KpiData> => {
    const res = await api.get("/api/report/kpi");
    return res.data;
  },
  getAuditLogs: async () => {
    const res = await api.get("/api/report/audit");
    return res.data;
  },
  getTransactions: async () => {
    const res = await api.get("/api/report/transactions");
    return res.data;
  },
};

export const alertApi = {
  getAlerts: async (status?: string): Promise<FraudAlert[]> => {
    const res = await api.get("/api/alert", {
      params: status ? { status } : {},
    });
    return res.data;
  },
  updateAlert: async (id: number, status: string, comment: string) => {
    const res = await api.patch(`/api/alert/${id}`, { status, comment });
    return res.data;
  },
};

export const chatApi = {
  send: async (
    question:    string,
    thinking:    boolean = false,
    mode:        string  = "standard",
    temperature: number  = 0.7,
    top_p:       number  = 0.9,
    provider:    string  = "production",
    model_key:   string  = "sonnet",
  ): Promise<ChatResponse> => {
    const res = await api.post("/api/chat", { question, thinking, mode, temperature, top_p, provider, model_key });
    return res.data;
  },
};

export const ragApi = {
  search: async (query: string, k: number = 3): Promise<RagResponse> => {
    const res = await api.post("/api/rag/search", { query, k });
    return res.data;
  },
  rebuild: async () => {
    const res = await api.post("/api/rag/rebuild");
    return res.data;
  },
};

export const webApi = {
  collect: async (): Promise<WebCollectResponse> => {
    const res = await api.post("/api/web/collect");
    return res.data;
  },
  collectUrl: async (url: string) => {
    const res = await api.post("/api/web/collect/url", { url });
    return res.data;
  },
  getLogs: async (limit: number = 20): Promise<WebLog[]> => {
    const res = await api.get("/api/web/logs", { params: { limit } });
    return res.data;
  },
};

export const collectApi = {
  initialize: async (): Promise<CollectResponse> => {
    const res = await api.post("/api/collect/initialize");
    return res.data;
  },
  sync: async (): Promise<CollectResponse> => {
    const res = await api.post("/api/collect/sync");
    return res.data;
  },
};

export const fraudApi = {
  check: async (transactionId: number): Promise<FraudCheckResponse> => {
    const res = await api.post("/api/fraud/check", { transaction_id: transactionId });
    return res.data;
  },
  checkManual: async (data: FraudManualRequest): Promise<FraudCheckResponse> => {
    const res = await api.post("/api/fraud/check/manual", data);
    return res.data;
  },
  trainModel: async () => {
    const res = await api.post("/api/fraud/model/train");
    return res.data;
  },
  evaluateModel: async () => {
    const res = await api.get("/api/fraud/model/evaluate");
    return res.data;
  },
};
