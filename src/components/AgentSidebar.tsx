import { useState, useRef, useEffect } from 'react';
import type { AgentMessage } from '../lib/types';
import { seedSampleKnowledge, getKnowledgeCount } from '../lib/database';
import { peerManager } from '../lib/peer-manager';
import { runtime } from '../lib/agent-core/runtime';
import { ModelSettings } from './Settings/ModelSettings';
import KnowledgeCard from './KnowledgeCard';
import './AgentSidebar.css';

interface Props {
    isOpen: boolean;
    onToggle: () => void;
    onQuery?: (query: string) => void;
}

export default function AgentSidebar({ isOpen, onToggle }: Props) {
    const [messages, setMessages] = useState<AgentMessage[]>([
        {
            id: 'welcome',
            role: 'system',
            content: `Jupiter online. ${getKnowledgeCount()} knowledge entries loaded. Ask me anything — I'll search your local knowledge first.`,
            timestamp: Date.now(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [pendingMeshQueries, setPendingMeshQueries] = useState<Set<string>>(new Set());
    const bottomRef = useRef<HTMLDivElement>(null);

    // Seed sample data on mount
    useEffect(() => {
        seedSampleKnowledge();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    // Listen for mesh answers
    useEffect(() => {
        const unsub = peerManager.subscribe((meshState) => {
            setMessages((prev) => {
                let updated = [...prev];
                let changed = false;
                for (const answer of meshState.answers) {
                    if (pendingMeshQueries.has(answer.queryId)) {
                        const msgId = `peer-${answer.queryId}-${answer.peerId}`;
                        if (!updated.some((m) => m.id === msgId)) {
                            updated.push({
                                id: msgId,
                                role: 'peer',
                                peerName: answer.peerName,
                                content: `**[Mesh Response]**\n\n${answer.answer}`,
                                timestamp: Date.now(),
                            });
                            changed = true;
                        }
                    }
                }
                return changed ? updated : prev;
            });
        });
        return unsub;
    }, [pendingMeshQueries]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isThinking) return;

        const query = input.trim();
        setInput('');

        // Add user message
        const userMsg: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: query,
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);

        setIsThinking(true);

        try {
            if (!runtime.isReady()) {
                setMessages((prev) => [...prev, {
                    id: `sys-${Date.now()}`,
                    role: 'system',
                    content: 'LLM Engine is not ready. Please click the gear icon in my header to configure Jupiter.',
                    timestamp: Date.now(),
                }]);
                setIsThinking(false);
                return;
            }

            // Ask the mesh synchronously so it broadcasts
            if (peerManager.getState().isOnline && peerManager.getState().peers.some(p => p.isOnline)) {
                const meshQueryId = peerManager.askMesh(query);
                setPendingMeshQueries((prev) => new Set(prev).add(meshQueryId));
            }

            const agentMsgId = `agent-${Date.now()}`;
            let streamedResponse = '';

            const fullResponse = await runtime.ask(query, (text) => {
                streamedResponse = text;
                setMessages((prev) => {
                    const existing = prev.find(m => m.id === agentMsgId);
                    if (existing) {
                        return prev.map(m => m.id === agentMsgId ? { ...m, content: text } : m);
                    } else {
                        return [...prev, {
                            id: agentMsgId,
                            role: 'agent',
                            content: text,
                            timestamp: Date.now()
                        }];
                    }
                });
            });

            if (!streamedResponse) {
                setMessages((prev) => [...prev, {
                    id: agentMsgId,
                    role: 'agent',
                    content: fullResponse,
                    timestamp: Date.now(),
                }]);
            }
        } catch (error: any) {
            setMessages((prev) => [...prev, {
                id: `sys-${Date.now()}`,
                role: 'system',
                content: `Error thinking: ${error.message}`,
                timestamp: Date.now(),
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <>
            {/* Toggle button */}
            <button
                className={`sidebar-toggle ${isOpen ? 'open' : ''}`}
                onClick={onToggle}
                title={isOpen ? 'Close Jupiter' : 'Open Jupiter'}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="var(--accent-primary)" strokeWidth="1.2" opacity="0.6" />
                    <circle cx="8" cy="8" r="2.5" fill="var(--accent-primary)" />
                </svg>
            </button>

            {/* Sidebar panel */}
            <aside className={`agent-sidebar ${isOpen ? 'open' : ''}`}>
                <div className="as-header">
                    <div className="as-header-left">
                        <div className="as-avatar">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <circle cx="10" cy="10" r="8" stroke="var(--accent-primary)" strokeWidth="1.2" />
                                <circle cx="10" cy="10" r="4" stroke="var(--accent-primary)" strokeWidth="1" />
                                <circle cx="10" cy="10" r="1.5" fill="var(--accent-primary)" />
                            </svg>
                        </div>
                        <div>
                            <span className="as-title">JUPITER</span>
                            <span className="as-subtitle mono" style={{ opacity: runtime.isReady() ? 1 : 0.6 }}>
                                {runtime.getProviderName()}
                            </span>
                        </div>
                    </div>
                    <div>
                        <button className="as-close" onClick={() => setShowSettings(true)} title="Settings" style={{ marginRight: '8px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </button>
                        <button className="as-close" onClick={onToggle}>✕</button>
                    </div>
                </div>

                <div className="as-messages">
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                    {isThinking && <ThinkingIndicator />}
                    <div ref={bottomRef} />
                </div>

                <form className="as-input-area" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="as-input mono"
                        placeholder="Ask anything..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        spellCheck={false}
                    />
                    <button type="submit" className="as-send" disabled={!input.trim() || isThinking}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 7H13M13 7L8 2M13 7L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </form>
            </aside>
            <ModelSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </>
    );
}

function MessageBubble({ message }: { message: AgentMessage }) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const isPeer = message.role === 'peer';

    return (
        <div className={`msg-bubble ${isUser ? 'msg-user' : isSystem ? 'msg-system' : isPeer ? 'msg-peer' : 'msg-agent'}`}>
            {!isUser && (
                <span className="msg-label mono">
                    {isSystem ? 'SYSTEM' : isPeer ? message.peerName : 'JUPITER'}
                </span>
            )}
            <div className="msg-content">
                {message.content.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                        return <strong key={i}>{line.slice(2, -2)}</strong>;
                    }
                    if (line.startsWith('_') && line.endsWith('_')) {
                        return <em key={i} className="text-secondary">{line.slice(1, -1)}</em>;
                    }
                    if (line.startsWith('📎')) {
                        return <span key={i} className="msg-source text-muted">{line}</span>;
                    }
                    return line ? <p key={i}>{line}</p> : <br key={i} />;
                })}
            </div>
            {message.knowledgeResults && message.knowledgeResults.length > 0 && (
                <div className="msg-knowledge">
                    <span className="msg-knowledge-label mono">RELATED KNOWLEDGE</span>
                    {message.knowledgeResults.slice(0, 3).map((result) => (
                        <KnowledgeCard key={result.entry.id} result={result} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ThinkingIndicator() {
    return (
        <div className="msg-bubble msg-agent">
            <span className="msg-label mono">JUPITER</span>
            <div className="thinking-dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
            </div>
        </div>
    );
}
