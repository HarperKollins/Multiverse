// ── Multiverse Shared Types ──

export interface KnowledgeEntry {
    id: string;
    content: string;
    title: string;
    sourceUrl?: string;
    sourceType: 'page' | 'search' | 'peer' | 'user';
    tags: string[];
    trustScore: number;
    peerId?: string;
    createdAt: number;
    accessedAt: number;
}

export interface HistoryEntry {
    id: string;
    url: string;
    title: string;
    visitedAt: number;
}

export interface SearchResult {
    entry: KnowledgeEntry;
    score: number;
    matchedTerms: string[];
}

export interface AgentMessage {
    id: string;
    role: 'user' | 'agent' | 'system' | 'peer';
    content: string;
    timestamp: number;
    knowledgeResults?: SearchResult[];
    peerName?: string;
    isThinking?: boolean;
}

export interface AgentState {
    messages: AgentMessage[];
    isOpen: boolean;
    isThinking: boolean;
}
