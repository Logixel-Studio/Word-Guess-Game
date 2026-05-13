import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const sidebarW = collapsed ? 72 : 260;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop fixed sidebar */}
      <div
        className="hidden lg:block fixed left-0 top-0 bottom-0 z-40"
        style={{ width: sidebarW, transition: 'width 0.3s ease' }}
      >
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed left-0 top-0 bottom-0 z-50 lg:hidden"
              style={{ width: 260 }}
            >
              <Sidebar collapsed={false} isMobile onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main area pushed right on desktop */}
      <MainContent sidebarW={sidebarW} onMobileMenuToggle={() => setMobileOpen(!mobileOpen)} />
    </div>
  );
}

function MainContent({ sidebarW, onMobileMenuToggle }) {
  // We use a CSS trick: on lg, add left margin equal to sidebar width
  return (
    <>
      <style>{`
        @media (min-width: 1024px) {
          .main-content-area { margin-left: ${sidebarW}px; transition: margin-left 0.3s ease; }
        }
      `}</style>
      <div className="main-content-area flex flex-col min-h-screen">
        <Topbar onMobileMenuToggle={onMobileMenuToggle} />
        <main className="flex-1 p-3 sm:p-4 lg:p-5 xl:p-6 overflow-x-hidden w-full">
          <div className="w-full max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}