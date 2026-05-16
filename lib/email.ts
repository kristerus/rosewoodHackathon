// Department email routing via Resend.
//
// In production we send via the Resend HTTP API. If RESEND_API_KEY is absent
// (local dev / preview without secrets) we log the would-have-been email to
// the server console and return { sent: false, error: '...stubbed' } so the
// rest of the flow keeps working.

import { Resend } from 'resend';
import type { Department, Urgency } from '@/lib/types';
import { DEPT_ROUTING, type DepartmentRouting } from '@/lib/dept-routing';

export interface TicketLike {
  id: string;
  department: Department;
  urgency: Urgency;
  intent: string;
  action_required: string;
  guest_name: string | null;
  room_number: string | null;
  internal_notes?: string | null;
  raw_transcript: string;
  staff_id: string;
}

export interface NotifyResult {
  sent: boolean;
  to?: string;
  error?: string;
}

export async function notifyDepartment(ticket: TicketLike): Promise<NotifyResult> {
  const routing = DEPT_ROUTING[ticket.department];
  if (!routing) {
    return { sent: false, error: `Unknown department: ${ticket.department}` };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.log(
      `[email-stub] Would have sent to ${routing.email}: [${ticket.urgency}] ${ticket.intent}` +
        (ticket.room_number ? ` (room ${ticket.room_number})` : ''),
    );
    return { sent: false, to: routing.email, error: 'RESEND_API_KEY not set (stubbed)' };
  }

  try {
    const resend = new Resend(apiKey);
    // Resend's sandbox sender works without domain verification — great for
    // hackathon demos. Swap for a verified hotel.eliaspfeffer.de sender later.
    const subject =
      `[${ticket.urgency.toUpperCase()}] ${ticket.intent}` +
      (ticket.room_number ? ` · Room ${ticket.room_number}` : '');

    const result = await resend.emails.send({
      from: 'AI Concierge <onboarding@resend.dev>',
      to: routing.email,
      subject,
      html: buildEmailHtml(ticket, routing),
    });
    if (result.error) {
      return { sent: false, to: routing.email, error: String(result.error) };
    }
    return { sent: true, to: routing.email };
  } catch (e) {
    return { sent: false, to: routing.email, error: e instanceof Error ? e.message : String(e) };
  }
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function urgencyColor(u: Urgency): string {
  switch (u) {
    case 'urgent': return '#B23B2B';
    case 'high':   return '#C76E1A';
    case 'normal': return '#1F1D1B';
    case 'low':    return '#6B6760';
    default:       return '#1F1D1B';
  }
}

function buildEmailHtml(ticket: TicketLike, routing: DepartmentRouting): string {
  const u = ticket.urgency;
  const color = urgencyColor(u);
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#F6F4EF;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1F1D1B;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center" style="background:#FFFFFF;border:1px solid #E6E2D8;border-radius:6px;">
      <tr>
        <td style="padding:18px 22px;border-bottom:1px solid #E6E2D8;background:#F6F4EF;">
          <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6B6760;">AI Concierge — Service Request</div>
          <div style="margin-top:6px;font-size:18px;font-weight:600;color:#1F1D1B;">${escapeHtml(ticket.intent)}</div>
          <div style="margin-top:4px;font-size:12px;color:#6B6760;">
            For <strong style="color:#1F1D1B;">${escapeHtml(routing.name)}</strong> · Target response ${routing.sla_minutes} min
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 22px;">
          <div style="display:inline-block;padding:3px 10px;border-radius:999px;background:${color};color:#FFFFFF;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">
            ${escapeHtml(u)}
          </div>
          ${ticket.room_number ? `<div style="display:inline-block;margin-left:8px;font-size:12px;color:#6B6760;">Room ${escapeHtml(ticket.room_number)}</div>` : ''}
          ${ticket.guest_name ? `<div style="margin-top:10px;font-size:13px;color:#1F1D1B;"><strong>Guest:</strong> ${escapeHtml(ticket.guest_name)}</div>` : ''}

          <hr style="margin:16px 0;border:0;border-top:1px solid #E6E2D8;" />

          <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6B6760;margin-bottom:4px;">Action required</div>
          <div style="font-size:14px;color:#1F1D1B;line-height:1.5;">${escapeHtml(ticket.action_required)}</div>

          ${ticket.internal_notes ? `
          <div style="margin-top:14px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6B6760;margin-bottom:4px;">Internal notes</div>
          <div style="font-size:13px;color:#1F1D1B;line-height:1.5;">${escapeHtml(ticket.internal_notes)}</div>
          ` : ''}

          <div style="margin-top:14px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6B6760;margin-bottom:4px;">Original transcript</div>
          <div style="font-size:12px;color:#6B6760;font-style:italic;background:#F6F4EF;border-left:3px solid #C9C3B3;padding:10px 12px;border-radius:3px;line-height:1.5;">
            ${escapeHtml(ticket.raw_transcript)}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 22px;border-top:1px solid #E6E2D8;background:#F6F4EF;font-size:11px;color:#6B6760;">
          Ticket <code>${escapeHtml(ticket.id)}</code> · Staff <code>${escapeHtml(ticket.staff_id)}</code>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
