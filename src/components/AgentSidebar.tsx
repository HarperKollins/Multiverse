import { useState, useRef, useEffect } from 'react';
import type { AgentMessage } from '../lib/types';
import { generateAgentResponse } from '../lib/knowledge';
import { seedSampleKnowledge, getKnowledgeCount } from '../lib/database';
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
            content: `Nexus online. ${getKnowledgeCount()} knowledge entries loaded. Ask me anything — I'll search your local knowledge first.`,
            timestamp: Date.now(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Seed sample data on mount
    useEffect(() => {
        seedSampleKnowledge();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const handleSubmit = (e: React.FormEvent) => {
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

        // Simulate thinking
        setIsThinking(true);
        setTimeout(() => {
            const { response, results } = generateAgentResponse(query);

            const agentMsg: AgentMessage = {
                id: `agent-${Date.now()}`,
                role: 'agent',
                content: response,
                timestamp: Date.now(),
                knowledgeResults: results,
            };

            setMessages((prev) => [...prev, agentMsg]);
            setIsThinking(false);
        }, 600 + Math.random() * 800);
    };

    return (
        <>
            {/* Toggle button */}
            <button
                className={`sidebar-toggle ${isOpen ? 'open' : ''}`}
                onClick={onToggle}
                title={isOpen ? 'Close Nexus' : 'Open Nexus'}
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
                            <span className="as-title">NEXUS</span>
                            <span className="as-subtitle mono">Agent Online</span>
                        </div>
                    </div>
                    <button className="as-close" onClick={onToggle}>✕</button>
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
        </>
    );
}

function MessageBubble({ message }: { message: AgentMessage }) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
        <div className={`msg-bubble ${isUser ? 'msg-user' : isSystem ? 'msg-system' : 'msg-agent'}`}>
            {!isUser && (
                <span className="msg-label mono">
                    {isSystem ? 'SYSTEM' : 'NEXUS'}
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
            <span className="msg-label mono">NEXUS</span>
            <div className="thinking-dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
            </div>
        </div>
    );
}
