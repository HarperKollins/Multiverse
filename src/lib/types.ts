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
    // Anti-poisoning fields (Phase 2)
    confirmationCount?: number;  // How many independent sources confirmed this
    confidence?: number;         // Computed confidence score
    sourcePeerId?: string;       // Which peer provided this knowledge
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

// Web search result from external providers
export interface WebSearchResult {
    title: string;
    url: string;
    snippet: string;
    source: string;  // 'searxng' | 'duckduckgo' | 'google' | 'brave'
}

export interface AgentMessage {
    id: string;
    role: 'user' | 'agent' | 'system' | 'peer';
    content: string;
    timestamp: number;
    knowledgeResults?: SearchResult[];
    webResults?: WebSearchResult[];
    peerName?: string;
    isThinking?: boolean;
}

export interface AgentState {
    messages: AgentMessage[];
    isOpen: boolean;
    isThinking: boolean;
}
