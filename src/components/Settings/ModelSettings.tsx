import { useState, useEffect } from 'react';
import { runtime, ProviderType } from '../../lib/agent-core/runtime';
import './ModelSettings.css';

interface ModelSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ModelSettings({ isOpen, onClose }: ModelSettingsProps) {
    const [providerType, setProviderType] = useState<ProviderType>(runtime.getProviderType());
    const [apiKey, setApiKey] = useState(localStorage.getItem('MV_API_KEY') || '');
    const [status, setStatus] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setProviderType(runtime.getProviderType());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsLoading(true);
        setStatus('Initializing provider...');
        try {
            if (providerType === 'api') {
                localStorage.setItem('MV_API_KEY', apiKey);
            }
            // Ask runtime to configure and connect
            await runtime.setProvider(providerType, apiKey, (msg: string) => {
                setStatus(msg);
            });
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
                            <option value="webgpu">WebGPU (Local In-Browser, Llama-3-8B)</option>
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
                        <div className="info-box">
                            Assumes Ollama is running internally on <code>http://localhost:11434</code>. Make sure you have pulled 'llama3'.
                        </div>
                    )}

                    {providerType === 'webgpu' && (
                        <div className="info-box">
                            Requires a browser with WebGPU support. Will download ~4GB of model weights to your browser cache on first run.
                        </div>
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
