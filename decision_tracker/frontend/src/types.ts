export interface ActionItem {
  task: string;
  assignee: string;
  dueDate?: string;
}

export interface DecisionPoint {
  decision: string;
  timeline?: string;
  rationale?: string;
}

export interface RiskConcern {
  description: string;
  severity?: string;
  mitigation?: string;
}

export interface UnresolvedQuestion {
  question: string;
  context?: string;
}

export interface InsightsData {
  executiveSummary: string;
  decisionPoints: DecisionPoint[];
  risksConcernsRaised: RiskConcern[];
  actionItems: ActionItem[];
  unresolvedQuestions: UnresolvedQuestion[];
}

export interface GoogleMeetConnectorProps {
  setActiveTab: (tab: 'audio' | 'gmeet' | 'insights') => void;
  setStatus: (status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error') => void;
  setInsights: (insights: InsightsData | null) => void;
} 