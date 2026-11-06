"use client";

import { Archive, ArchiveRestore, Crown, Pencil, Plus, Trash2, UserRoundPlus, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { num, pick } from "@/lib/portal/format";
import { newId } from "@/lib/portal/store";
import { canEditTeam, TEAM_COLORS } from "@/lib/portal/team";
import type { Team } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { useCollection, usePortal } from "../PortalProvider";
import { AvatarStack, PeoplePicker, personName, StaffAvatar } from "../people";
import { Button, Card, Empty, Field, Input, Select, Sheet, Skeleton, Textarea } from "../ui";

export function TeamsBoard() {
  const { lang, user } = usePortal();
  const fa = lang === "fa";
  const x = useExhibition();
  const teams = useCollection("teams");
  const [editing, setEditing] = useState<Team | "new" | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const rows = (teams.rows as Team[]).filter((t) => (showArchived ? t.archived_at : !t.archived_at)).sort((a, b) => a.sort_order - b.sort_order || a.name_fa.localeCompare(b.name_fa, "fa"));
  const archivedCount = (teams.rows as Team[]).filter((t) => t.archived_at).length;
  const onTeam = new Set((teams.rows as Team[]).filter((t) => !t.archived_at).flatMap((t) => t.member_ids));
  const loose = x.staff.filter((s) => s.status !== "suspended" && !onTeam.has(s.id));
  const canCreate = canEditTeam(user, null);
  const exhibitionName = (id: string | null) => {
    if (!id) return fa ? "همه نمایشگاه ها" : "All exhibitions";
    const e = x.exhibitions.find((ex) => ex.id === id);
    return e ? pick(lang, e.name_fa, e.name_en) : fa ? "نمایشگاه حذف شده" : "Removed exhibition";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-p-ink-3">
          {fa
            ? "تیم ها همکاران را کنار هم می گذارند: فروش، مالی، گروه تحویل هر سالن. سرپرست هر تیم می تواند اعضای تیمش را تغییر دهد."
            : "Teams group colleagues: sales, finance, the handover crew for a hall. A team's lead can change who is on it."}
        </p>
        <div className="flex gap-2">
          {archivedCount ? (
            <Button tone="ghost" size="sm" icon={<Archive className="size-4" />} onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? (fa ? "تیم های فعال" : "Active teams") : fa ? `بایگانی (${num(lang, archivedCount)})` : `Archived (${archivedCount})`}
            </Button>
          ) : null}
          {canCreate ? (
            <Button tone="primary" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
              {fa ? "تیم تازه" : "New team"}
            </Button>
          ) : null}
        </div>
      </div>

      {teams.status === "loading" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : !rows.length ? (
        <Card>
          <Empty
            icon={<UsersRound className="size-6" />}
            title={showArchived ? (fa ? "تیم بایگانی شده ای نیست" : "No archived teams") : fa ? "هنوز تیمی ساخته نشده" : "No teams yet"}
            hint={fa ? "برای هر گروه کاری یک تیم بسازید و سرپرستش را مشخص کنید." : "Make a team for each working group and choose its lead."}
            action={
              canCreate && !showArchived ? (
                <Button tone="primary" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
                  {fa ? "تیم تازه" : "New team"}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((team) => {
            const lead = team.lead_id ? x.staffById.get(team.lead_id) : null;
            const members = team.member_ids.filter((id) => id !== team.lead_id);
            const editable = canEditTeam(user, team);
            return (
              <li key={team.id}>
                <Card className={cn("flex h-full flex-col overflow-hidden", team.archived_at && "opacity-75")}>
                  <div className="h-1.5" style={{ background: team.color }} aria-hidden />
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">{pick(lang, team.name_fa, team.name_en)}</h3>
                        <p className="text-xs text-p-ink-3">
                          {exhibitionName(team.exhibition_id)} · {fa ? `${num(lang, team.member_ids.length)} نفر` : `${team.member_ids.length} people`}
                        </p>
                      </div>
                      {editable ? (
                        <Button size="sm" tone="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(team)}>
                          {fa ? "ویرایش" : "Edit"}
                        </Button>
                      ) : null}
                    </div>
                    {team.description ? <p className="line-clamp-2 text-sm text-p-ink-2">{team.description}</p> : null}
                    <div className="rounded-xl bg-p-surface-2 p-2.5">
                      {lead ? (
                        <Link href={`/${lang}/staff/team/${lead.id}`} className="flex items-center gap-2.5 rounded-lg hover:bg-p-sunken">
                          <StaffAvatar staff={lead} size={34} />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-p-gold">
                              <Crown className="size-3" aria-hidden />
                              {fa ? "سرپرست" : "Lead"}
                            </span>
                            <span className="block truncate text-sm font-medium">{personName(lead, lang)}</span>
                          </span>
                        </Link>
                      ) : (
                        <p className="text-xs text-p-ink-3">{fa ? "سرپرست تعیین نشده" : "No lead yet"}</p>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      {members.length ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <AvatarStack ids={members} size={28} max={5} />
                          <span className="truncate text-xs text-p-ink-3">{members.slice(0, 3).map((id) => personName(x.staffById.get(id), lang)).join("، ")}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-p-ink-3">{fa ? "عضو دیگری ندارد" : "No other members"}</span>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {loose.length && !showArchived ? (
        <Card className="p-4">
          <p className="text-sm font-semibold">{fa ? "همکارانی که در هیچ تیمی نیستند" : "Colleagues not on any team"}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {loose.map((s) => (
              <li key={s.id}>
                <Link href={`/${lang}/staff/team/${s.id}`} className="inline-flex items-center gap-2 rounded-full border border-p-line py-1 pe-3 ps-1 text-sm hover:bg-p-sunken">
                  <StaffAvatar staff={s} size={26} />
                  {personName(s, lang)}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <TeamSheet team={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/* ----------------------------------------------------------- Edit sheet */

export function TeamSheet({ team, onClose }: { team: Team | "new" | null; onClose: () => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={team !== null} onClose={onClose} title={team === "new" ? (fa ? "تیم تازه" : "New team") : fa ? "ویرایش تیم" : "Edit team"} closeLabel={fa ? "بستن" : "Close"}>
      {team ? <TeamForm key={team === "new" ? "new" : team.id} team={team === "new" ? null : team} onClose={onClose} /> : null}
    </Sheet>
  );
}

function TeamForm({ team, onClose }: { team: Team | null; onClose: () => void }) {
  const { lang, store, toast, user, can } = usePortal();
  const fa = lang === "fa";
  const x = useExhibition();
  const [color, setColor] = useState(team?.color ?? TEAM_COLORS[0]);
  const [lead, setLead] = useState<string>(team?.lead_id ?? "");
  const [scope, setScope] = useState<string>(team?.exhibition_id ?? "");
  const [members, setMembers] = useState<string[]>(team?.member_ids.filter((id) => id !== team.lead_id) ?? []);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // A member who leads the team may change its members but not hand it over.
  const fullEdit = canEditTeam(user, null);
  const people = x.staff.filter((s) => s.status !== "suspended" || s.id === lead);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const nameFa = String(form.get("name_fa") ?? "").trim();
        if (!nameFa) return;
        setBusy(true);
        const patch = {
          name_fa: nameFa,
          name_en: String(form.get("name_en") ?? "").trim() || null,
          description: String(form.get("description") ?? "").trim() || null,
          color,
          lead_id: lead || null,
          member_ids: lead ? [lead, ...members.filter((m) => m !== lead)] : members,
          exhibition_id: scope || null,
        };
        const result = team ? await store.update("teams", team.id, patch) : await store.insert("teams", { id: newId(), ...patch, sort_order: Date.now() % 100000 });
        setBusy(false);
        if (result.ok) {
          toast(team ? (fa ? "تیم ذخیره شد" : "Team saved") : fa ? "تیم ساخته شد" : "Team created");
          onClose();
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fa ? "نام فارسی" : "Name (Persian)"}>
          <Input name="name_fa" defaultValue={team?.name_fa ?? ""} required dir="rtl" />
        </Field>
        <Field label={fa ? "نام انگلیسی" : "Name (English)"}>
          <Input name="name_en" defaultValue={team?.name_en ?? ""} dir="ltr" />
        </Field>
      </div>
      <Field label={fa ? "کار این تیم" : "What this team does"}>
        <Textarea name="description" defaultValue={team?.description ?? ""} rows={2} />
      </Field>
      <Field label={fa ? "رنگ" : "Colour"}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={fa ? "رنگ" : "Colour"}>
          {TEAM_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => setColor(c)}
              className={cn("size-8 rounded-full transition", color === c ? "ring-2 ring-p-ink ring-offset-2 ring-offset-p-surface" : "hover:scale-110")}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fa ? "سرپرست" : "Lead"} hint={!fullEdit ? (fa ? "فقط مدیر می تواند سرپرست را عوض کند." : "Only a manager can change the lead.") : undefined}>
          <Select value={lead} onChange={(e) => setLead(e.target.value)} disabled={!fullEdit}>
            <option value="">{fa ? "بدون سرپرست" : "No lead"}</option>
            {people.map((s) => (
              <option key={s.id} value={s.id}>
                {personName(s, lang)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={fa ? "برای" : "Applies to"}>
          <Select value={scope} onChange={(e) => setScope(e.target.value)} disabled={!fullEdit}>
            <option value="">{fa ? "همه نمایشگاه ها (دائمی)" : "All exhibitions (permanent)"}</option>
            {x.exhibitions.map((e) => (
              <option key={e.id} value={e.id}>
                {pick(lang, e.name_fa, e.name_en)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={fa ? "اعضا" : "Members"}>
        <div className="flex flex-wrap items-center gap-2">
          {members.filter((m) => m !== lead).map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-p-line py-0.5 pe-2.5 ps-0.5 text-xs">
              <StaffAvatar staff={x.staffById.get(id)} size={22} />
              {personName(x.staffById.get(id), lang)}
            </span>
          ))}
          <Button size="sm" icon={<UserRoundPlus className="size-4" />} onClick={() => setPicking(true)}>
            {fa ? "انتخاب اعضا" : "Choose members"}
          </Button>
        </div>
      </Field>
      <PeoplePicker
        open={picking}
        onClose={() => setPicking(false)}
        value={members.filter((m) => m !== lead)}
        onSave={setMembers}
        title={fa ? "اعضای تیم" : "Team members"}
        hint={fa ? "سرپرست همیشه عضو تیم است." : "The lead is always on the team."}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-p-line pt-3">
        <div className="flex gap-2">
          {team && fullEdit ? (
            <Button
              tone="ghost"
              size="sm"
              icon={team.archived_at ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
              onClick={async () => {
                const res = await store.update("teams", team.id, { archived_at: team.archived_at ? null : new Date().toISOString() });
                if (res.ok) {
                  toast(team.archived_at ? (fa ? "تیم برگشت" : "Team restored") : fa ? "تیم بایگانی شد" : "Team archived");
                  onClose();
                }
              }}
            >
              {team.archived_at ? (fa ? "بازگرداندن" : "Restore") : fa ? "بایگانی" : "Archive"}
            </Button>
          ) : null}
          {team && can.manage ? (
            confirmDelete ? (
              <Button
                tone="danger"
                size="sm"
                icon={<Trash2 className="size-4" />}
                onClick={async () => {
                  const res = await store.remove("teams", team.id);
                  if (res.ok) {
                    toast(fa ? "تیم حذف شد" : "Team deleted");
                    onClose();
                  }
                }}
              >
                {fa ? "بله، حذف شود" : "Yes, delete"}
              </Button>
            ) : (
              <Button tone="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)} className="text-p-danger">
                {fa ? "حذف" : "Delete"}
              </Button>
            )
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button tone="ghost" onClick={onClose}>
            {fa ? "انصراف" : "Cancel"}
          </Button>
          <Button tone="primary" type="submit" disabled={busy}>
            {team ? (fa ? "ذخیره" : "Save") : fa ? "ساخت تیم" : "Create team"}
          </Button>
        </div>
      </div>
    </form>
  );
}
