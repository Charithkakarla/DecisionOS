import { Sidebar } from "./Sidebar";
import { PipelineDrawer } from "./PipelineDrawer";
import { ReactNode, useState, useEffect } from "react";
import { useMatch, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LayoutDashboard, Workflow, History, BookOpen, GitBranch, BarChart2, FileText } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const isWorkflowDetail = !!useMatch("/workflows/:id");
  const location = useLocation();
  const navigate = useNavigate();

  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdSearch, setCmdSearch] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  
  const sidebarWidth = (isWorkflowDetail && !isHovered) ? 52 : 220;
  const isCollapsed = isWorkflowDetail && !isHovered;

  // Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
      if (e.key === "Escape") {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const cmdItems = [
    { label: "Go to Dashboard", path: "/", icon: <LayoutDashboard size={14} /> },
    { label: "Go to Sales Calls", path: "/workflows", icon: <Workflow size={14} /> },
    { label: "Go to Run History", path: "/history", icon: <History size={14} /> },
    { label: "Go to Sales Playbooks", path: "/knowledge", icon: <BookOpen size={14} /> },
    { label: "Go to Pipeline Canvas", path: "/pipeline", icon: <GitBranch size={14} /> },
    { label: "Go to Performance Analytics", path: "/analytics", icon: <BarChart2 size={14} /> },
    { label: "Go to Reports Archive", path: "/reports", icon: <FileText size={14} /> },
  ];

  const filteredItems = cmdItems.filter(item =>
    item.label.toLowerCase().includes(cmdSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">

      {/* Cmd+K Command Palette */}
      <AnimatePresence>
        {cmdOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1.5px] z-50 flex items-start justify-center pt-24">
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col mx-4"
            >
              {/* Input row */}
              <div className="flex items-center px-4 py-3.5 border-b border-border gap-2.5">
                <Search size={15} className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Type a page command or search..."
                  value={cmdSearch}
                  onChange={(e) => setCmdSearch(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-foreground outline-none border-none placeholder-muted-foreground/60 font-medium"
                  autoFocus
                />
                <button
                  onClick={() => setCmdOpen(false)}
                  className="text-[9px] bg-secondary border border-border px-1.5 py-0.5 rounded font-mono font-bold text-muted-foreground shadow-sm"
                >
                  ESC
                </button>
              </div>

              {/* Items List */}
              <div className="max-h-72 overflow-y-auto p-2 space-y-1 bg-[#f9fafb]">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setCmdOpen(false);
                        setCmdSearch("");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-primary/5 hover:text-primary rounded-lg text-xs font-semibold text-muted-foreground transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-muted-foreground/85">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono bg-white border border-border px-1.5 py-0.5 rounded font-semibold uppercase">
                        Jump
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground italic">
                    No commands matched '{cmdSearch}'
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-white border-t border-border px-4 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                <span>Use keyboard shortcut to toggle search</span>
                <span className="font-mono bg-secondary border px-1.5 py-0.5 rounded text-muted-foreground/80 font-bold">Ctrl+K</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar — expands on hover when in workflow detail */}
      <motion.div
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="shrink-0 h-full overflow-hidden"
        style={{ minWidth: 0 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Sidebar collapsed={isCollapsed} />
      </motion.div>

      {/* Analysis Pipeline drawer — slides in beside the icon rail */}
      <AnimatePresence initial={false}>
        {isWorkflowDetail && (
          <motion.div
            key="pipeline-drawer"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 232, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="shrink-0 h-full overflow-hidden"
            style={{ minWidth: 0 }}
          >
            <div className="w-[232px] h-full">
              <PipelineDrawer />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content with page transitions */}
      <main className="flex-1 overflow-y-auto min-w-0 bg-background">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-h-full px-6 py-8 lg:px-8 xl:px-10"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
