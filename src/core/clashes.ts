import type {BlockedPeriod,Meeting} from '../shared/model';
export function periodsOverlap(a:BlockedPeriod,b:BlockedPeriod):boolean {
  return a.day===b.day && a.startMinute<b.endMinute && b.startMinute<a.endMinute;
}
export function meetingsClash(a:Meeting,b:Meeting):boolean {
  return periodsOverlap(a,b) && a.weeks.some(w=>b.weeks.includes(w));
}
