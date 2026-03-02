import Sidebar from "./components/Sidebar";
import CommandBar from "./components/CommandBar";
import Dashboard from "./components/Dashboard";
import StatusBar from "./components/StatusBar";

export default function App() {
  return (
    <div className="app-layout">
      <div className="app-sidebar">
        <Sidebar />
      </div>
      <div className="app-main">
        <CommandBar />
        <Dashboard />
      </div>
      <div className="app-statusbar">
        <StatusBar />
      </div>
    </div>
  );
}
