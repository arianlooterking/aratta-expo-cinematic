"use client";

import { useMemo } from "react";
import { dmPartner, unreadTotals } from "@/lib/portal/chat";
import type { ChatChannel, ChatMember, StaffMember } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { personName } from "../people";
import { useCollection, usePortal } from "../PortalProvider";

const SLUG_ORDER = ["general", "sales", "operations", "alerts"];

export type ChatRoom = {
  channel: ChatChannel;
  member: ChatMember | null;
  /** "# فروش" or the colleague's name. */
  title: string;
  partner: StaffMember | null;
};

/** The signed-in person's memberships: unread badges for the menu and tab bar. */
export function useChatBadge() {
  const { user } = usePortal();
  const { rows } = useCollection("chat_members", { column: "staff_id", value: user.id });
  return useMemo(() => unreadTotals(rows), [rows]);
}

/** Every conversation this person can see, with their own membership and a display name. */
export function useChatRooms() {
  const { lang, user } = usePortal();
  const { staffById } = useExhibition();
  const channels = useCollection("chat_channels");
  const mine = useCollection("chat_members", { column: "staff_id", value: user.id });

  return useMemo(() => {
    const memberBy = new Map(mine.rows.map((m) => [m.channel_id, m]));
    const rooms: ChatRoom[] = channels.rows.map((channel) => {
      const partnerId = channel.kind === "direct" ? dmPartner(channel, user.id) : null;
      const partner = partnerId ? (staffById.get(partnerId) ?? null) : null;
      return {
        channel,
        member: memberBy.get(channel.id) ?? null,
        partner,
        title: channel.kind === "direct" ? personName(partner, lang) : (channel.name ?? ""),
      };
    });
    const open = rooms.filter((r) => !r.channel.archived_at);
    const joined = open
      .filter((r) => r.channel.kind === "channel" && r.member)
      .sort((a, b) => {
        const ia = SLUG_ORDER.indexOf(a.channel.slug ?? "");
        const ib = SLUG_ORDER.indexOf(b.channel.slug ?? "");
        if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        return a.title.localeCompare(b.title, "fa");
      });
    const others = open.filter((r) => r.channel.kind === "channel" && !r.member).sort((a, b) => a.title.localeCompare(b.title, "fa"));
    const direct = open
      .filter((r) => r.channel.kind === "direct" && r.member)
      .sort((a, b) => (b.channel.last_message_at ?? b.channel.created_at).localeCompare(a.channel.last_message_at ?? a.channel.created_at));
    const byId = new Map(rooms.map((r) => [r.channel.id, r]));
    const loading = channels.status === "loading" || mine.status === "loading";
    return { joined, others, direct, byId, loading };
  }, [channels.rows, channels.status, mine.rows, mine.status, staffById, user.id, lang]);
}
