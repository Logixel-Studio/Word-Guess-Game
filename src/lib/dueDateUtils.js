import { differenceInCalendarDays, differenceInHours, differenceInMinutes, isPast, isToday, isTomorrow } from 'date-fns';

export function getDueDateInfo(dueDateStr) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const now = new Date();

  const diffDays = differenceInCalendarDays(due, now);
  const diffHours = differenceInHours(due, now);
  const diffMins = differenceInMinutes(due, now);

  if (isPast(due) && diffDays < 0) {
    return { label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', badge: 'overdue', urgent: true };
  }
  if (isToday(due)) {
    if (diffHours <= 0) {
      return { label: `Due now`, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', badge: 'overdue', urgent: true };
    }
    return { label: `Due Today — ${diffHours}h ${diffMins % 60}m left`, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', badge: 'today', urgent: true };
  }
  if (isTomorrow(due)) {
    return { label: 'Due Tomorrow', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', badge: 'tomorrow', urgent: false };
  }
  if (diffDays <= 3) {
    return { label: `${diffDays} Days Left`, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', badge: 'soon', urgent: false };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays} Days Left`, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', badge: 'upcoming', urgent: false };
  }
  return { label: `${diffDays} Days Left`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', badge: 'ok', urgent: false };
}

export function isOverdue(dueDateStr) {
  if (!dueDateStr) return false;
  const due = new Date(dueDateStr);
  return isPast(due) && differenceInCalendarDays(due, new Date()) < 0;
}

export function isUpcoming(dueDateStr, days = 3) {
  if (!dueDateStr) return false;
  const info = getDueDateInfo(dueDateStr);
  return info && !info.badge !== 'overdue' && ['today', 'tomorrow', 'soon'].includes(info.badge);
}