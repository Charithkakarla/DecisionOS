import { PageHeader } from "../components/ui/PageHeader";
import { QuickAction } from "../components/ui/QuickAction";
import { Download, FileText, FileSearch, RefreshCcw } from "lucide-react";

export function Reports() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Reports" 
        description="Access Executive Summaries, Workflow Reports, and Reflection logs."
      />

      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction 
            primary
            title="Generate Executive Report"
            description="Synthesize all completed workflows from the past 7 days"
            icon={<FileText size={24} />}
          />
          <QuickAction 
            title="Reflection Audit"
            description="Export the AI Governance and Reflection log"
            icon={<FileSearch size={24} />}
          />
          <QuickAction 
            title="Refresh Data"
            description="Sync latest analytics"
            icon={<RefreshCcw size={24} />}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Reports</h2>
        <div className="bg-card border border-border rounded-xl divide-y divide-border/50 shadow-sm">
          {[
            { title: "Weekly Executive Summary", type: "Executive", date: "Today" },
            { title: "Q3 Strategy Analysis", type: "Workflow", date: "Yesterday" },
            { title: "Governance Audit Log", type: "Reflection", date: "Oct 12, 2026" }
          ].map((report, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-secondary rounded-lg text-primary">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{report.title}</p>
                  <p className="text-sm text-muted-foreground">{report.type} Report • {report.date}</p>
                </div>
              </div>
              <button className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary transition-colors px-4 py-2 rounded-lg border border-border hover:border-primary/50">
                <Download size={16} />
                <span>Export PDF</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
