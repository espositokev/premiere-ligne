import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { now as currentTime } from "@/lib/clock";
import { sendEmail } from "@/lib/email/send";
import { reportReminderEmail } from "@/lib/email/templates";
import {
  daysSinceEnd,
  formatShortDay,
  reminderDue,
  REPORT_REMINDER_DELAY_MS,
} from "@/lib/domain/coaching";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Rappel des comptes rendus à rédiger (§6.5) : appelé chaque matin par Vercel Cron.
 * Un email par coach, listant ses coachings terminés depuis plus de 48 h et non clôturés,
 * au plus une fois par semaine pour un même coaching.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const now = currentTime();
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const service = createServiceClient();
  const { data, error } = await service
    .from("coachings")
    .select(
      `id, organization_id, coach_user_id, scheduled_at, duration_minutes, status, reminder_sent_at,
       subject:memberships!coachings_subject_membership_id_organization_id_fkey(profiles(first_name, last_name)),
       coach:profiles!coachings_coach_user_id_fkey(first_name, email),
       organizations(slug, status)`,
    )
    .eq("status", "planifie")
    .lt("scheduled_at", new Date(now.getTime() - REPORT_REMINDER_DELAY_MS).toISOString())
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string;
    organization_id: string;
    coach_user_id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: "planifie";
    reminder_sent_at: string | null;
    subject: { profiles: { first_name: string; last_name: string } | null } | null;
    coach: { first_name: string; email: string } | null;
    organizations: { slug: string; status: string } | null;
  };
  const due = ((data ?? []) as unknown as Row[]).filter(
    (c) =>
      c.organizations?.status === "actif" &&
      c.coach &&
      reminderDue(
        {
          status: c.status,
          scheduledAt: c.scheduled_at,
          durationMinutes: c.duration_minutes,
          reminderSentAt: c.reminder_sent_at,
        },
        now,
      ),
  );

  const byCoach = new Map<string, Row[]>();
  for (const c of due) byCoach.set(c.coach_user_id, [...(byCoach.get(c.coach_user_id) ?? []), c]);

  let sent = 0;
  for (const items of byCoach.values()) {
    const coach = items[0]?.coach;
    if (!coach) continue;
    const email = reportReminderEmail({
      firstName: coach.first_name,
      items: items.map((c) => ({
        repName: c.subject?.profiles
          ? `${c.subject.profiles.first_name} ${c.subject.profiles.last_name}`
          : "Commercial",
        when: formatShortDay(c.scheduled_at),
        days: daysSinceEnd(
          { scheduledAt: c.scheduled_at, durationMinutes: c.duration_minutes },
          now,
        ),
        link: `${appUrl}/e/${c.organizations?.slug}/coachings/${c.id}`,
      })),
    });
    const result = await sendEmail({
      to: coach.email,
      ...email,
      template: "coaching.rappel_cr",
      organizationId: items[0]?.organization_id ?? null,
    });
    if (result.ok) {
      sent += 1;
      await service
        .from("coachings")
        .update({ reminder_sent_at: now.toISOString() })
        .in(
          "id",
          items.map((c) => c.id),
        );
    }
  }

  return NextResponse.json({ coachings: due.length, emails: sent });
}
