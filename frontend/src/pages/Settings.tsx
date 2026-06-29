import { PageHeader } from "../components/ui/PageHeader";
import { Settings as SettingsIcon, Database, Cpu, Palette, Users } from "lucide-react";

export function Settings() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-up duration-300">
      <PageHeader 
        title="Settings" 
        description="Configure LLM providers, database connections, and system themes."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-2">
          {[
            { label: "General", icon: <SettingsIcon size={18} />, active: true },
            { label: "AI Providers", icon: <Cpu size={18} /> },
            { label: "Database Config", icon: <Database size={18} /> },
            { label: "Theme", icon: <Palette size={18} /> },
            { label: "Users & RBAC", icon: <Users size={18} /> },
          ].map((tab, i) => (
            <button 
              key={i}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-colors ${
                tab.active ? "bg-secondary text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className={tab.active ? "text-primary" : "text-muted-foreground"}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="md:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-lg font-medium text-foreground mb-4">System Preferences</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Organization Name</label>
                <input type="text" defaultValue="DecisionOS Enterprise" className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Support Email</label>
                <input type="email" defaultValue="admin@decisionos.com" className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
              <div className="pt-4">
                <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors shadow-sm">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


