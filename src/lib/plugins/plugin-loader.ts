// ── Multiverse Plugin System ──
// Plugins extend Jupiter's capabilities via a manifest + entry point pattern.
// Plugins run in isolation and declare the permissions they need.

import { toolRegistry, type ToolDefinition } from '../agent-core/tool-registry';

// ── Plugin Manifest (plugin.json schema) ──

export interface PluginManifest {
    name: string;
    version: string;
    description: string;
    author?: string;
    hooks: PluginHook[];
    permissions: PluginPermission[];
}

export type PluginHook = 'tools' | 'ui:panel' | 'data:source' | 'mesh:handler';
export type PluginPermission =
    | 'knowledge.read'
    | 'knowledge.write'
    | 'mesh.broadcast'
    | 'mesh.receive'
    | 'ui.panel'
    | 'web.fetch';

// ── Plugin API (exposed to plugins) ──

export interface PluginAPI {
    // Tool Registration
    registerTool(tool: Omit<ToolDefinition, 'source' | 'pluginName'>): void;

    // Knowledge Access (requires permission)
    searchKnowledge(query: string): any[];
    addKnowledge(title: string, content: string, tags: string[]): Promise<any>;

    // Events
    on(event: PluginEvent, handler: (...args: any[]) => void): void;
    off(event: PluginEvent, handler: (...args: any[]) => void): void;

    // Logging
    log(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

export type PluginEvent =
    | 'query'
    | 'peer:connect'
    | 'peer:disconnect'
    | 'knowledge:added'
    | 'knowledge:updated';

// ── Plugin Instance ──

export interface PluginInstance {
    manifest: PluginManifest;
    isLoaded: boolean;
    activate?: () => void;
    deactivate?: () => void;
}

// ── Plugin Loader ──

class PluginLoader {
    private plugins: Map<string, PluginInstance> = new Map();
    private eventHandlers: Map<PluginEvent, Set<(...args: any[]) => void>> = new Map();

    // Register a plugin programmatically
    register(manifest: PluginManifest, setup: (api: PluginAPI) => void): PluginInstance {
        if (this.plugins.has(manifest.name)) {
            console.warn(`[Plugin] ${manifest.name} already registered, replacing`);
            this.unregister(manifest.name);
        }

        const api = this.createAPI(manifest);
        const instance: PluginInstance = {
            manifest,
            isLoaded: false,
        };

        try {
            setup(api);
            instance.isLoaded = true;
            console.log(`[Plugin] Loaded: ${manifest.name} v${manifest.version}`);
        } catch (error: any) {
            console.error(`[Plugin] Failed to load ${manifest.name}:`, error);
        }

        this.plugins.set(manifest.name, instance);
        return instance;
    }

    unregister(name: string): void {
        const plugin = this.plugins.get(name);
        if (plugin) {
            plugin.deactivate?.();
            // Remove plugin's tools
            const tools = toolRegistry.getAll().filter(t => t.pluginName === name);
            for (const tool of tools) {
                toolRegistry.unregister(tool.name);
            }
            this.plugins.delete(name);
            console.log(`[Plugin] Unregistered: ${name}`);
        }
    }

    getAll(): PluginInstance[] {
        return Array.from(this.plugins.values());
    }

    // Emit an event to all interested plugins
    emit(event: PluginEvent, ...args: any[]): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    handler(...args);
                } catch (error) {
                    console.error(`[Plugin] Event handler error for ${event}:`, error);
                }
            }
        }
    }

    // Create sandboxed API for a plugin
    private createAPI(manifest: PluginManifest): PluginAPI {
        const self = this;
        const { searchKnowledge: sk } = require('../knowledge');
        const { addKnowledge: ak } = require('../database');

        return {
            registerTool(tool) {
                toolRegistry.register({
                    ...tool,
                    source: 'plugin',
                    pluginName: manifest.name,
                });
            },

            searchKnowledge(query: string) {
                if (!manifest.permissions.includes('knowledge.read')) {
                    throw new Error(`Plugin ${manifest.name} lacks 'knowledge.read' permission`);
                }
                return sk(query);
            },

            async addKnowledge(title: string, content: string, tags: string[]) {
                if (!manifest.permissions.includes('knowledge.write')) {
                    throw new Error(`Plugin ${manifest.name} lacks 'knowledge.write' permission`);
                }
                return ak({ title, content, tags, sourceType: 'user', trustScore: 0.7 });
            },

            on(event: PluginEvent, handler: (...args: any[]) => void) {
                if (!self.eventHandlers.has(event)) {
                    self.eventHandlers.set(event, new Set());
                }
                self.eventHandlers.get(event)!.add(handler);
            },

            off(event: PluginEvent, handler: (...args: any[]) => void) {
                self.eventHandlers.get(event)?.delete(handler);
            },

            log(message: string) {
                console.log(`[Plugin:${manifest.name}] ${message}`);
            },
            warn(message: string) {
                console.warn(`[Plugin:${manifest.name}] ${message}`);
            },
            error(message: string) {
                console.error(`[Plugin:${manifest.name}] ${message}`);
            },
        };
    }
}

// Singleton
export const pluginLoader = new PluginLoader();
