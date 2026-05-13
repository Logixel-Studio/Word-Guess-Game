import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function SummaryCard({ title, value, icon: Icon, trend, trendUp, className, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all duration-300 group",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
          <p className="text-xl font-bold text-foreground truncate">{value}</p>
          {trend && (
            <p className={cn("text-xs font-medium", trendUp ? "text-emerald-500" : "text-red-500")}>
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 flex-shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </motion.div>
  );
}