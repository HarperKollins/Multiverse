import { useState, useCallback } from 'react';
import Sidebar from "./components/Sidebar";
import CommandBar from "./components/CommandBar";
import Dashboard from "./components/Dashboard";
import StatusBar from "./components/StatusBar";
import AgentSidebar from "./components/AgentSidebar";

export default function App() {
  const [agentOpen, setAgentOpen] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  const handleAgentToggle = useCallback(() => {
    setAgentOpen((prev) => !prev);
  }, []);

  const handleCommandQuery = useCallback((query: string) => {
    setPendingQuery(query);
    setAgentOpen(true);
  }, []);

  return (
    <div className="app-layout">
      <div className="app-sidebar">
        <Sidebar />
      </div>
      <div className="app-main">
        <CommandBar onQuery={handleCommandQuery} />
        <Dashboard />
      </div>
      <div className="app-statusbar">
        <StatusBar />
      </div>
      <AgentSidebar
        isOpen={agentOpen}
        onToggle={handleAgentToggle}
        onQuery={pendingQuery ? () => setPendingQuery(null) : undefined}
      />
    </div>
  );
}
