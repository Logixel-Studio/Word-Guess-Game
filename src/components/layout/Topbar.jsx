import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sun, Moon, Menu, UserCircle, LogOut, Settings } from 'lucide-react';
import { useTheme } from '@/lib/useTheme';
import { base44 } from '@/api/base44Client';
import NotificationPanel from './NotificationPanel';
import ActionCenterPanel from '@/components/actions/ActionCenterPanel';
import { ROLE_LABELS, ROLE_COLORS, ROLES } from '@/lib/roleConfig';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function Topbar({ onMobileMenuToggle }) {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const roleLabel = ROLE_LABELS[user?.role] || '';
  const roleColor = ROLE_COLORS[user?.role] || '';

  return (
    <header className="h-14 sm:h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={onMobileMenuToggle}>
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden sm:flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">NUTRIMETH ERP</h2>
          {roleLabel && (
            <Badge variant="outline" className={cn('text-[10px] font-semibold border-current', roleColor)}>
              {roleLabel}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 text-muted-foreground hover:text-foreground">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <NotificationPanel />

        {(user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN) && (
          <ActionCenterPanel />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2 text-muted-foreground hover:text-foreground">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {user?.full_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-foreground leading-none">{user?.full_name || 'User'}</p>
                {roleLabel && <p className={cn('text-[10px] leading-none mt-0.5', roleColor)}>{roleLabel}</p>}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
              {roleLabel && <p className={cn('text-xs font-semibold mt-1', roleColor)}>{roleLabel}</p>}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile"><UserCircle className="w-4 h-4 mr-2" /> Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings"><Settings className="w-4 h-4 mr-2" /> Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" /> Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}