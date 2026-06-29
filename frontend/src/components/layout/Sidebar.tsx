import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Workflow, History, BookOpen,
  GitBranch, BarChart2, FileText, Settings, User, Layers,
} from "lucide-react";

const NAV = [
  { path: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { path: "/workflows", icon: <Workflow size={18} />, label: "Sales Calls" },
  { path: "/history", icon: <History size={18} />, label: "History" },
  { path: "/knowledge", icon: <BookOpen size={18} />, label: "Playbooks" },
  { path: "/pipeline", icon: <GitBranch size={18} />, label: "Pipeline" },
  { path: "/analytics", icon: <BarChart2 size={18} />, label: "Analytics" },
  { path: "/reports", icon: <FileText size={18} />, label: "Reports" },
];

const BOTTOM = [
  { path: "/settings", icon: <Settings size={18} />, label: "Settings" },
  { path: "/profile", icon: <User size={18} />, label: "Profile" },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <aside
      className="bg-card border-r border-border h-full flex flex-col shrink-0 overflow-hidden"
      style={{ width: collapsed ? 52 : 220 }}
    >
      {/* Logo */}
      <div className="flex h-[65px] items-center border-b border-border shrink-0 px-3 gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground cursor-pointer select-none">
          <Layers size={15} strokeWidth={2.5} />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              key="logo-label"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="text-sm font-bold text-foreground whitespace-nowrap overflow-hidden tracking-tight"
            >
              DecisionOS
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col py-3 gap-0.5 overflow-y-auto px-2">
        {NAV.map((item, i) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            className="w-full"
          >
            <NavLink
              to={item.path}
              end={item.path === "/"}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex h-9 items-center gap-3 rounded-md px-2 transition-all duration-150 ${collapsed ? "justify-center w-9 mx-auto" : "w-full"
                } ${isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`shrink-0 ${isActive ? "text-primary" : ""}`}>
                    {item.icon}
                  </span>
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key={`label-${item.path}`}
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="text-sm whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="flex flex-col py-3 gap-0.5 border-t border-border shrink-0 px-2">
        {BOTTOM.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex h-9 items-center gap-3 rounded-md px-2 transition-all duration-150 ${collapsed ? "justify-center w-9 mx-auto" : "w-full"
              } ${isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`shrink-0 ${isActive ? "text-primary" : ""}`}>
                  {item.icon}
                </span>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key={`bottom-label-${item.path}`}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="text-sm whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
