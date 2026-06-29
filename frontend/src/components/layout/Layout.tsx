import { Sidebar } from "./Sidebar";
import { PipelineDrawer } from "./PipelineDrawer";
import { ReactNode } from "react";
import { useMatch, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: ReactNode }) {
  const isWorkflowDetail = !!useMatch("/workflows/:id");
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* Sidebar — expands with labels when no pipeline drawer, collapses to icon rail when pipeline opens */}
      <motion.div
        animate={{ width: isWorkflowDetail ? 52 : 220 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="shrink-0 h-full overflow-hidden"
        style={{ minWidth: 0 }}
      >
        <Sidebar collapsed={isWorkflowDetail} />
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
