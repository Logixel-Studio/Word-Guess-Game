import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Truck, ShoppingCart, Receipt,
  Package, TrendingUp, CreditCard, Settings, UserCircle,
  ChevronLeft, ChevronRight, Leaf, Warehouse, X, UsersRound
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/suppliers', label: 'Suppliers', icon: Truck },
  { path: '/purchasing', label: 'Purchasing', icon: ShoppingCart },
  { path: '/expenses', label: 'Expenses', icon: Receipt },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/sales', label: 'Sales', icon: TrendingUp },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/stock', label: 'Stock', icon: Warehouse },
];

const bottomItems = [
  { path: '/team', label: 'Team', icon: UsersRound },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/profile', label: 'Profile', icon: UserCircle },
];

function NavLink({ item, collapsed, isMobile, onClose }) {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  return (
    <Link key={item.path} to={item.path} onClick={isMobile ? onClose : undefined}>
      <motion.div
        whileHover={{ x: 2 }}
        title={collapsed && !isMobile ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
          collapsed && !isMobile ? 'justify-center' : '',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
            : 'text-sidebar-foreground hover:bg-sidebar-accent'
        )}
      >
        <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? '' : 'group-hover:text-sidebar-primary')} />
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
}

export default function Sidebar({ collapsed, setCollapsed, isMobile = false, onClose }) {
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
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-lg font-bold text-sidebar-foreground whitespace-nowrap overflow-hidden"
              >
                NUTRIMETH
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {isMobile && (
          <button onClick={onClose} className="text-sidebar-foreground hover:text-sidebar-primary flex-shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Nav Items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.path} item={item} collapsed={collapsed} isMobile={isMobile} onClose={onClose} />
        ))}
      </nav>

      {/* Bottom items: Team, Settings, Profile */}
      <div className="py-2 px-2 space-y-0.5 border-t border-sidebar-border flex-shrink-0">
        {bottomItems.map(item => (
          <NavLink key={item.path} item={item} collapsed={collapsed} isMobile={isMobile} onClose={onClose} />
        ))}
      </div>

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
