import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Workflow,
  Library,
  BarChart2,
  FileText,
  Settings,
  User,
  GitBranch,
  History,
  ChevronLeft,
} from "lucide-react";

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  const navItems = [
    { name: "Dashboard",   path: "/",          icon: <LayoutDashboard size={18} /> },
    { name: "Sales Calls", path: "/workflows",  icon: <Workflow size={18} /> },
    { name: "History",     path: "/history",    icon: <History size={18} /> },
    { name: "Playbooks",   path: "/knowledge",  icon: <Library size={18} /> },
    { name: "Pipeline",    path: "/pipeline",   icon: <GitBranch size={18} /> },
    { name: "Analytics",   path: "/analytics",  icon: <BarChart2 size={18} /> },
    { name: "Reports",     path: "/reports",    icon: <FileText size={18} /> },
    { name: "Settings",    path: "/settings",   icon: <Settings size={18} /> },
    { name: "Profile",     path: "/profile",    icon: <User size={18} /> },
  ];

  return (
    <div className={`bg-card border-r border-border h-full flex flex-col shadow-sm transition-all duration-300 ease-in-out ${
      isCollapsed ? "w-[72px]" : "w-60"
    }`}>
      <div className={`p-4 border-b border-border flex items-center h-[73px] ${
        isCollapsed ? "justify-center" : "px-5 justify-between"
      }`}>
        {!isCollapsed ? (
          <div className="truncate animate-in fade-in duration-300">
            <h1 className="text-xl font-bold text-primary tracking-tight">DecisionOS</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Intelligence Platform</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-xl font-black text-primary tracking-tight">D</h1>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === "/"}
            title={isCollapsed ? item.name : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-all duration-200 text-sm ${
                isCollapsed
                  ? "justify-center h-10 w-10 mx-auto"
                  : "gap-3 px-3 py-2.5 w-full"
              } ${
                isActive
                  ? "bg-secondary text-primary font-semibold"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`
            }
          >
            <div className="flex-shrink-0">{item.icon}</div>
            {!isCollapsed && <span className="truncate animate-in fade-in duration-200">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border mt-auto flex justify-center flex-shrink-0">
        <button
          onClick={toggleCollapse}
          className={`flex items-center rounded-lg border border-border hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all duration-200 text-xs font-medium ${
            isCollapsed ? "justify-center h-10 w-10" : "gap-2 px-3 py-2 w-full"
          }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <ChevronLeft size={16} className={`transition-transform duration-300 shrink-0 ${isCollapsed ? "rotate-180" : ""}`} />
          {!isCollapsed && <span className="animate-in fade-in duration-200">Collapse</span>}
        </button>
      </div>
    </div>
  );
}
