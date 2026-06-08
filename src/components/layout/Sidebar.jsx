import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Leaf, X, Shield } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { getUserNavGroups, ROLE_LABELS, ROLE_COLORS } from '@/lib/roleConfig';

export default function Sidebar({ collapsed, setCollapsed, isMobile = false, onClose }) {
  const location = useLocation();
  const user = useCurrentUser();
  const userRole = user?.role || 'employee';
  const navGroups = getUserNavGroups(userRole);

  return (
    <motion.aside
      animate={{ width: collapsed && !isMobile ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden"
      style={{ minWidth: collapsed && !isMobile ? 72 : 260 }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <AnimatePresence>
            {(!collapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <p className="text-sm font-bold text-sidebar-foreground whitespace-nowrap">NUTRIMETH</p>
                {user && (
                  <p className={cn('text-[10px] font-semibold whitespace-nowrap', ROLE_COLORS[userRole] || 'text-sidebar-foreground/50')}>
                    {ROLE_LABELS[userRole] || 'User'} Panel
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {isMobile && (
          <button onClick={onClose} className="text-sidebar-foreground hover:text-sidebar-primary flex-shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-0.5">
        {navGroups.map(group => (
          <div key={group.label}>
            <AnimatePresence>
              {(!collapsed || isMobile) && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3 pt-3 pb-1"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            {group.items.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} onClick={isMobile ? onClose : undefined}>
                  <motion.div
                    whileHover={{ x: 2 }}
                    title={collapsed && !isMobile ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group',
                      collapsed && !isMobile ? 'justify-center' : '',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                  >
                    <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? '' : 'group-hover:text-sidebar-primary')} />
                    <AnimatePresence>
                      {(!collapsed || isMobile) && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="text-sm font-medium whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse Toggle - desktop only */}
      {!isMobile && (
        <div className="p-3 border-t border-sidebar-border flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      )}
    </motion.aside>
  );
}