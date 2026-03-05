import { useState, useEffect } from 'react';
import { runtime } from '../../lib/agent-core/runtime';
import './ModelSettings.css';

type ProviderType = 'webgpu' | 'ollama' | 'api';

interface ModelSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ModelSettings({ isOpen, onClose }: ModelSettingsProps) {
    const [providerType, setProviderType] = useState<ProviderType>('ollama');
    const [apiKey, setApiKey] = useState(localStorage.getItem('MV_API_KEY') || '');
    const [webgpuModelName, setWebgpuModelName] = useState(localStorage.getItem('MV_WEBGPU_MODEL') || 'gemma-2b-it-q4f16_1-MLC');
    const [ollamaModelName, setOllamaModelName] = useState(localStorage.getItem('MV_OLLAMA_MODEL') || 'llama3');
    const [ollamaHost, setOllamaHost] = useState(localStorage.getItem('MV_OLLAMA_HOST') || 'http://localhost:11434');
    const [searchProvider, setSearchProvider] = useState(localStorage.getItem('MV_SEARCH_PROVIDER') || 'duckduckgo');
    const [searchKey, setSearchKey] = useState(localStorage.getItem('MV_SEARCH_API_KEY') || '');
    const [searchCx, setSearchCx] = useState(localStorage.getItem('MV_SEARCH_CX') || '');
    const [status, setStatus] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Load saved provider type
            const saved = localStorage.getItem('MV_PROVIDER_TYPE') as ProviderType | null;
            if (saved) setProviderType(saved);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsLoading(true);
        setStatus('Initializing provider...');
        try {
            // Save all settings
            localStorage.setItem('MV_PROVIDER_TYPE', providerType);
            if (providerType === 'api') {
                localStorage.setItem('MV_API_KEY', apiKey);
            }
            localStorage.setItem('MV_SEARCH_API_KEY', searchKey);
            localStorage.setItem('MV_SEARCH_CX', searchCx);
            localStorage.setItem('MV_SEARCH_PROVIDER', searchProvider);
            localStorage.setItem('MV_OLLAMA_MODEL', ollamaModelName);
            localStorage.setItem('MV_OLLAMA_HOST', ollamaHost);
            localStorage.setItem('MV_WEBGPU_MODEL', webgpuModelName);

            // Configure runtime with new API
            const selectedModelName = providerType === 'ollama'
                ? ollamaModelName
                : (providerType === 'webgpu' ? webgpuModelName : undefined);

            await runtime.setProvider(
                {
                    providerType,
                    apiKey,
                    modelName: selectedModelName,
                    ollamaHost,
                },
                (msg: string) => setStatus(msg)
            );

            // Also refresh search provider
            runtime.refreshSearch();

            setTimeout(() => {
                onClose();
                setStatus('');
            }, 1000);
        } catch (err: any) {
            setStatus(`Failed: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel">
                <div className="modal-header">
                    <h2>Jupiter Brain Settings</h2>
                    <button className="close-btn" onClick={onClose} disabled={isLoading}>×</button>
                </div>

                <div className="modal-body">
                    <p className="subtitle">Configure how Jupiter thinks. Choose a local or remote strategy.</p>

                    <div className="form-group">
                        <label>Execution Engine</label>
                        <select
                            value={providerType}
                            onChange={(e) => setProviderType(e.target.value as ProviderType)}
                            disabled={isLoading}
                        >
                            <option value="webgpu">WebGPU (Local In-Browser, Gemma 2B / Llama 3)</option>
                            <option value="ollama">Ollama (Local Desktop Host, llama3)</option>
                            <option value="api">Google/OpenAI API (Remote Fallback)</option>
                        </select>
                    </div>

                    {providerType === 'api' && (
                        <div className="form-group">
                            <label>API Key</label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                disabled={isLoading}
                            />
                        </div>
                    )}

                    {providerType === 'ollama' && (
                        <>
                            <div className="form-group">
                                <label>Model Name</label>
                                <input
                                    type="text"
                                    value={ollamaModelName}
                                    onChange={(e) => setOllamaModelName(e.target.value)}
                                    placeholder="e.g. llama3, llama3.2, mistral"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Ollama Host</label>
                                <input
                                    type="text"
                                    value={ollamaHost}
                                    onChange={(e) => setOllamaHost(e.target.value)}
                                    placeholder="http://localhost:11434"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="info-box">
                                Ensure Ollama is running. In Tauri mode, requests are proxied through Rust (no CORS issues). In browser mode, set <code>OLLAMA_ORIGINS=*</code>.
                            </div>
                        </>
                    )}

                    {providerType === 'webgpu' && (
                        <>
                            <div className="form-group">
                                <label>WebGPU Model</label>
                                <select
                                    value={webgpuModelName}
                                    onChange={(e) => setWebgpuModelName(e.target.value)}
                                    disabled={isLoading}
                                >
                                    <option value="gemma-2b-it-q4f16_1-MLC">Gemma 2B IT (Recommended for modest hardware)</option>
                                    <option value="Llama-3-8B-Instruct-q4f16_1-MLC">Llama 3 8B Instruct (High VRAM required)</option>
                                    <option value="Phi-3-mini-4k-instruct-q4f16_1-MLC">Phi-3 Mini 4K (Fast, lightweight)</option>
                                </select>
                            </div>
                            <div className="info-box">
                                Requires a browser with WebGPU support. Will download 1-4GB of model weights to your browser cache on first run depending on the model chosen.
                            </div>
                        </>
                    )}

                    <hr style={{ margin: '24px 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />
                    <p className="subtitle" style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Web Search Fallback (Optional)</p>

                    <div className="form-group">
                        <label>Search Provider</label>
                        <select
                            value={searchProvider}
                            onChange={(e) => setSearchProvider(e.target.value)}
                            disabled={isLoading}
                        >
                            <option value="duckduckgo">DuckDuckGo (Free HTML Scraper)</option>
                            <option value="searxng">SearXNG (Self-Hosted Meta Search)</option>
                            <option value="brave">Brave Search (2000 free/month)</option>
                            <option value="google">Google Custom Search API</option>
                        </select>
                    </div>

                    {searchProvider === 'google' && (
                        <>
                            <div className="form-group">
                                <label>Google Custom Search API Key</label>
                                <input
                                    type="password"
                                    value={searchKey}
                                    onChange={(e) => setSearchKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Search Engine ID (cx)</label>
                                <input
                                    type="text"
                                    value={searchCx}
                                    onChange={(e) => setSearchCx(e.target.value)}
                                    placeholder="0123456789abcdef..."
                                    disabled={isLoading}
                                />
                            </div>
                        </>
                    )}

                    {status && <div className="status-message mono">{status}</div>}

                </div>

                <div className="modal-footer">
                    <button className="action-button primary" onClick={handleSave} disabled={isLoading}>
                        {isLoading ? 'Connecting...' : 'Apply & Connect'}
                    </button>
                </div>
            </div>
        </div>
    );
}
