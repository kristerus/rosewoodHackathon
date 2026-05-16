import type { Department } from '@/lib/types';

export interface DepartmentRouting {
  email: string;
  name: string;
  /** Internal target response time in minutes — surfaced in the email subject/body. */
  sla_minutes: number;
}

/**
 * Where each department's tickets get emailed.
 * All addresses point at the hotel.eliaspfeffer.de catch-all so the user can
 * verify receipt without setting up real inboxes. Swap for real distribution
 * lists when going live.
 */
export const DEPT_ROUTING: Record<Department, DepartmentRouting> = {
  concierge:    { email: 'concierge@hotel.eliaspfeffer.de',    name: 'Concierge Desk',  sla_minutes: 15 },
  housekeeping: { email: 'housekeeping@hotel.eliaspfeffer.de', name: 'Housekeeping',    sla_minutes: 30 },
  fnb:          { email: 'fnb@hotel.eliaspfeffer.de',          name: 'Food & Beverage', sla_minutes: 20 },
  maintenance:  { email: 'engineering@hotel.eliaspfeffer.de',  name: 'Engineering',     sla_minutes: 45 },
  frontdesk:    { email: 'frontdesk@hotel.eliaspfeffer.de',    name: 'Front Desk',      sla_minutes: 10 },
};
