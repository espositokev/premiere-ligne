import { CalendarPlus, ChevronLeft, ChevronRight, MessageCirclePlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CoachingList, WeekCalendar } from "@/components/coaching/coaching-list";
import { ManagerRequestList, MyRequestList } from "@/components/coaching/request-list";
import { SessionList } from "@/components/dojo/session-list";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/page";
import { TabsNav } from "@/components/ui/tabs-nav";
import { getOrgContext } from "@/lib/auth/org-context";
import { now as currentTime } from "@/lib/clock";
import { listCoachingRequests, listCoachings, type CoachingSummary } from "@/lib/data/coachings";
import { listDojoSessions } from "@/lib/data/dojo-sessions";
import {
  groupCoachings,
  shiftDays,
  todayInZone,
  utcToLocalInput,
  weekDays,
  weekStart,
} from "@/lib/domain/coaching";
import { isCoach } from "@/lib/domain/roles";

export const metadata: Metadata = { title: "Coachings" };

const dayOf = (iso: string) => utcToLocalInput(iso).slice(0, 10);

/** Coachings (§4.7) : à traiter, semaine, clôturés, demandes — ou « Mes coachings » côté commercial. */
export default async function CoachingsPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/coachings">) {
  const { slug } = await params;
  const { vue, semaine } = await searchParams;
  const context = await getOrgContext(slug);
  const orgId = context.organization.id;
  const now = currentTime();
  const base = `/e/${slug}/coachings`;
  const hrefFor = (c: CoachingSummary) => `${base}/${c.id}`;

  if (!isCoach(context.role)) {
    const [coachings, requests, sessions] = await Promise.all([
      listCoachings(orgId, { memberId: context.membershipId ?? undefined }),
      listCoachingRequests(orgId, { memberId: context.membershipId ?? undefined }),
      context.membershipId
        ? listDojoSessions(orgId, { memberId: context.membershipId })
        : Promise.resolve([]),
    ]);
    const groups = groupCoachings(coachings, now);
    const upcoming = [...groups.upcoming, ...groups.toWrite];
    return (
      <>
        <PageHeader
          title="Mes coachings"
          action={
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href={`${base}/demander`}>
                <MessageCirclePlus aria-hidden="true" /> Demander un coaching
              </Link>
            </Button>
          }
        />
        <div className="flex flex-col gap-8">
          <section>
            <SectionTitle>À venir</SectionTitle>
            {upcoming.length ? (
              <CoachingList
                coachings={upcoming}
                now={now}
                hrefFor={hrefFor}
                showRep={false}
                showCoach
              />
            ) : (
              <EmptyState
                icon={CalendarPlus}
                title="Aucun coaching prévu"
                text="Tu veux travailler un point précis ? Demande un coaching à ton manager."
              />
            )}
          </section>
          {requests.length ? (
            <section>
              <SectionTitle>Mes demandes</SectionTitle>
              <MyRequestList slug={slug} requests={requests.slice(0, 10)} />
            </section>
          ) : null}
          {groups.closed.length ? (
            <section>
              <SectionTitle>Comptes rendus</SectionTitle>
              <CoachingList
                coachings={groups.closed}
                now={now}
                hrefFor={hrefFor}
                showRep={false}
                showCoach
              />
            </section>
          ) : null}
          {sessions.length ? (
            <section>
              <SectionTitle>Mes séances de Dojo</SectionTitle>
              <SessionList
                sessions={sessions}
                showDojo
                dojoHref={(s) => `/e/${slug}/dojos/${s.dojoId}`}
              />
            </section>
          ) : null}
        </div>
      </>
    );
  }

  const tab = ["semaine", "clotures", "demandes"].includes(String(vue)) ? String(vue) : "a-traiter";
  const today = todayInZone(now);
  const monday = weekStart(
    typeof semaine === "string" && /^\d{4}-\d{2}-\d{2}$/.test(semaine) ? semaine : today,
  );

  const [coachings, requests] = await Promise.all([
    listCoachings(orgId),
    listCoachingRequests(orgId, { pendingOnly: tab !== "demandes" }),
  ]);
  const groups = groupCoachings(coachings, now);
  const pending = requests.filter((r) => r.status === "en_attente");
  const in14days = new Date(now.getTime() + 14 * 86_400_000).toISOString();

  return (
    <>
      <PageHeader
        title="Coachings"
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href={`${base}/nouveau`}>
              <CalendarPlus aria-hidden="true" /> Planifier un coaching
            </Link>
          </Button>
        }
      />
      <TabsNav
        label="Vues des coachings"
        current={tab}
        tabs={[
          {
            key: "a-traiter",
            label: `À traiter${groups.toWrite.length + pending.length ? ` (${groups.toWrite.length + pending.length})` : ""}`,
            href: base,
          },
          { key: "semaine", label: "Semaine", href: `${base}?vue=semaine` },
          { key: "clotures", label: "Clôturés", href: `${base}?vue=clotures` },
          {
            key: "demandes",
            label: `Demandes${pending.length ? ` (${pending.length})` : ""}`,
            href: `${base}?vue=demandes`,
          },
        ]}
      />

      {tab === "a-traiter" ? (
        <div className="flex flex-col gap-8">
          <section>
            <SectionTitle>Comptes rendus à rédiger</SectionTitle>
            {groups.toWrite.length ? (
              <CoachingList coachings={groups.toWrite} now={now} hrefFor={hrefFor} />
            ) : (
              <p className="text-muted">Rien en retard, bravo.</p>
            )}
          </section>
          {pending.length ? (
            <section>
              <SectionTitle>Demandes en attente</SectionTitle>
              <ManagerRequestList slug={slug} requests={pending} />
            </section>
          ) : null}
          <section>
            <SectionTitle>À venir (14 jours)</SectionTitle>
            {groups.upcoming.filter((c) => c.scheduledAt < in14days).length ? (
              <CoachingList
                coachings={groups.upcoming.filter((c) => c.scheduledAt < in14days)}
                now={now}
                hrefFor={hrefFor}
              />
            ) : (
              <EmptyState
                icon={Users}
                title="Aucun coaching prévu"
                text="Planifiez un coaching pour accompagner un commercial sur le terrain."
              />
            )}
          </section>
        </div>
      ) : null}

      {tab === "semaine" ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-2">
            <Button asChild variant="outline" size="sm">
              <Link
                href={`${base}?vue=semaine&semaine=${shiftDays(monday, -7)}`}
                aria-label="Semaine précédente"
              >
                <ChevronLeft aria-hidden="true" /> Précédente
              </Link>
            </Button>
            <p className="text-sm font-semibold">
              Semaine du{" "}
              {new Date(`${monday}T12:00:00Z`).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              })}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`${base}?vue=semaine&semaine=${shiftDays(monday, 7)}`}
                aria-label="Semaine suivante"
              >
                Suivante <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <WeekCalendar
            days={weekDays(monday)}
            coachings={coachings}
            today={today}
            hrefFor={hrefFor}
            dayOf={dayOf}
          />
        </>
      ) : null}

      {tab === "clotures" ? (
        groups.closed.length ? (
          <CoachingList coachings={groups.closed} now={now} hrefFor={hrefFor} />
        ) : (
          <p className="text-muted">Aucun compte rendu clôturé pour l&apos;instant.</p>
        )
      ) : null}

      {tab === "demandes" ? (
        requests.length ? (
          <ManagerRequestList slug={slug} requests={requests} />
        ) : (
          <p className="text-muted">Aucune demande de coaching.</p>
        )
      ) : null}
    </>
  );
}
