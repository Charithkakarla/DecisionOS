import { PageHeader } from "../components/ui/PageHeader";
import { User, Mail, Shield, Key } from "lucide-react";

export function Profile() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="User Profile" 
        description="Manage your personal account settings and security."
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-8 border-b border-border flex items-center space-x-6 bg-secondary/30">
          <div className="h-24 w-24 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center shadow-sm">
            <User size={40} className="text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Enterprise Admin</h2>
            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center"><Mail size={16} className="mr-1.5" /> admin@decisionos.com</span>
              <span className="flex items-center"><Shield size={16} className="mr-1.5 text-primary" /> System Owner</span>
            </div>
          </div>
        </div>
        
        <div className="p-8 space-y-6">
          <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Security</h3>
          <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
            <div>
              <p className="font-medium text-foreground">Password</p>
              <p className="text-sm text-muted-foreground mt-1">Last changed 3 months ago</p>
            </div>
            <button className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors font-medium">
              Update
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
            <div>
              <div className="flex items-center space-x-2">
                <p className="font-medium text-foreground">Two-Factor Authentication</p>
                <span className="bg-status-success-bg text-status-success text-xs px-2.5 py-0.5 rounded-full border border-status-success/20 font-medium">Enabled</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Protect your account with an extra layer of security</p>
            </div>
            <button className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors font-medium">
              Manage
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
            <div>
              <p className="font-medium text-foreground">API Keys</p>
              <p className="text-sm text-muted-foreground mt-1">Manage personal API keys for programmatic access</p>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors font-medium">
              <Key size={16} />
              <span>View Keys</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
