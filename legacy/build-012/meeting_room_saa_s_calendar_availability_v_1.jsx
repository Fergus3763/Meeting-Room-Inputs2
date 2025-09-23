// Meeting Room SaaS — Calendar & Availability (v1)
// Single-file preview that includes:
// 1) JSON Schemas (as JS consts, exportable)
// 2) Pure functions (timezone-aware via Luxon)
// 3) Availability endpoint mock + sample responses
// 4) Minimal Admin UI (Day/Week) to add/edit/delete/drag/resize
// 5) Integration note: Quote Preview -> isAvailable before pricing
//
// Libraries available in this preview:
// - React, Tailwind CSS
// - shadcn/ui components (Button, Card, Dialog, Input, Select, etc.)
// - lucide-react for icons
// - luxon for timezone handling
//
// Notes:
// - All times are stored & exchanged as ISO 8601 with timezone (IANA tz).
// - This file aims to be production-ready in structure and APIs, while the UI is intentionally minimal.
// - The in-memory store can be replaced by a DB later without changing the pure functions.
// - Unit-test stubs (Vitest) are provided at the bottom as reference.

import React, { useMemo, useRef, useState, useEffect } from "react";
import { DateTime, Duration, Interval } from "luxon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Plus, Trash2, Save, X, Copy, Upload, Download } from "lucide-react";

/**********************
 * 1) JSON SCHEMAS
 **********************/
export const EVENT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/schemas/room-event.json",
  title: "RoomEvent",
  type: "object",
  required: [
    "id",
    "roomId",
    "type",
    "startsAt",
    "endsAt",
    "createdBy",
    "createdAt",
    "status"
  ],
  properties: {
    id: { type: "string", description: "Unique event ID (ULID/UUID)." },
    roomId: { type: "string" },
    type: {
      type: "string",
      enum: ["BOOKING", "HOLD", "BLACKOUT", "MAINTENANCE"],
    },
    status: {
      type: "string",
      enum: ["provisional", "confirmed", "cancelled"],
      default: "provisional",
    },
    startsAt: {
      type: "string",
      format: "date-time",
      description: "ISO 8601 with timezone (e.g., 2025-09-07T09:00:00+01:00)",
    },
    endsAt: {
      type: "string",
      format: "date-time",
      description: "ISO 8601 with timezone",
    },
    title: { type: "string" },
    notes: { type: "string" },
    createdBy: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    recurrence: {
      type: ["null", "object"],
      description: "Optional simple weekly recurrence pattern",
      properties: {
        type: { const: "WEEKLY" },
        byWeekday: {
          type: "array",
          items: { enum: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] },
        },
        until: { type: ["null", "string"], format: "date-time" },
        // For venue hours/closures only (admin-driven patterns)
      },
    },
    preBufferMins: { type: ["integer", "null"], minimum: 0 },
    postBufferMins: { type: ["integer", "null"], minimum: 0 },
  },
  additionalProperties: false,
} as const;

export const ROOM_CALENDAR_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/schemas/room-calendar.json",
  title: "RoomCalendar",
  type: "object",
  required: ["roomId", "timezone"],
  properties: {
    roomId: { type: "string" },
    timezone: { type: "string", description: "IANA timezone, e.g., Europe/Dublin" },
    defaultPreBufferMins: { type: "integer", minimum: 0, default: 0 },
    defaultPostBufferMins: { type: "integer", minimum: 0, default: 0 },
    roundingStepMins: { type: "integer", enum: [5, 10, 15, 20, 30, 60], default: 15 },
    halfDayCutoffHour: { type: ["integer", "null"], minimum: 0, maximum: 23 },
    dayCutoffHour: { type: ["integer", "null"], minimum: 0, maximum: 23 },
    minLeadTimeMins: { type: "integer", minimum: 0, default: 0 },
    maxLeadTimeDays: { type: "integer", minimum: 0, default: 365 },
    openingHours: {
      type: "object",
      description: "Weekly opening hours. Local to timezone. 24h clock HH:mm.",
      properties: {
        // Example: Mon–Fri 07:00–22:00, Sat 08:00–20:00, Sun closed
        MO: { type: "array", items: timeRangeSchema() },
        TU: { type: "array", items: timeRangeSchema() },
        WE: { type: "array", items: timeRangeSchema() },
        TH: { type: "array", items: timeRangeSchema() },
        FR: { type: "array", items: timeRangeSchema() },
        SA: { type: "array", items: timeRangeSchema() },
        SU: { type: "array", items: timeRangeSchema() },
      },
      additionalProperties: false,
    },
    events: {
      type: "array",
      items: { $ref: "room-event.json" },
      description: "All events for this room (BOOKING, HOLD, BLACKOUT, MAINTENANCE)",
    },
  },
  additionalProperties: false,
} as const;

function timeRangeSchema() {
  return {
    type: "object",
    required: ["start", "end"],
    properties: {
      start: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
      end: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
  },
    additionalProperties: false,
  } as const;
}

/**********************
 * TypeScript types
 **********************/
export type EventType = "BOOKING" | "HOLD" | "BLACKOUT" | "MAINTENANCE";
export type EventStatus = "provisional" | "confirmed" | "cancelled";

export interface RoomEvent {
  id: string;
  roomId: string;
  type: EventType;
  status: EventStatus;
  startsAt: string; // ISO 8601 with tz
  endsAt: string;   // ISO 8601 with tz
  title?: string;
  notes?: string;
  createdBy: string;
  createdAt: string; // ISO
  recurrence?: {
    type: "WEEKLY";
    byWeekday: ("MO"|"TU"|"WE"|"TH"|"FR"|"SA"|"SU")[];
    until?: string | null;
  } | null;
  preBufferMins?: number | null;
  postBufferMins?: number | null;
}

export interface RoomCalendar {
  roomId: string;
  timezone: string; // IANA
  defaultPreBufferMins?: number;
  defaultPostBufferMins?: number;
  roundingStepMins?: number; // 15 default
  halfDayCutoffHour?: number | null;
  dayCutoffHour?: number | null;
  minLeadTimeMins?: number; // e.g., 1440
  maxLeadTimeDays?: number; // e.g., 365
  openingHours?: WeeklyHours;
  events: RoomEvent[];
}

export type WeeklyHours = {
  [K in "MO"|"TU"|"WE"|"TH"|"FR"|"SA"|"SU"]?: { start: string; end: string }[];
};

/*************************
 * 2) PURE FUNCTIONS
 *************************/

// Helpers
const WD: Array<"SU"|"MO"|"TU"|"WE"|"TH"|"FR"|"SA"> = ["SU","MO","TU","WE","TH","FR","SA"];
function weekdayToken(dt: DateTime): "MO"|"TU"|"WE"|"TH"|"FR"|"SA"|"SU" {
  return WD[dt.weekday % 7] as any; // Luxon: Monday=1
}
function parseISO(iso: string) { return DateTime.fromISO(iso, { setZone: true }); }
function toISO(dt: DateTime) { return dt.toISO(); }

export function roundToStep(dt: DateTime, stepMins: number, dir: "up"|"down" = "down"): DateTime {
  const minutes = dt.minute + dt.hour*60;
  const rounded = dir === "down" ? Math.floor(minutes/stepMins)*stepMins : Math.ceil(minutes/stepMins)*stepMins;
  const hour = Math.floor(rounded/60); const minute = rounded % 60;
  return dt.set({ hour, minute, second: 0, millisecond: 0 });
}

export function applyBuffers(event: RoomEvent, cal: RoomCalendar): { bufferedStart: DateTime; bufferedEnd: DateTime } {
  const start = parseISO(event.startsAt);
  const end = parseISO(event.endsAt);
  const pre = event.preBufferMins ?? cal.defaultPreBufferMins ?? 0;
  const post = event.postBufferMins ?? cal.defaultPostBufferMins ?? 0;
  return { bufferedStart: start.minus({ minutes: pre }), bufferedEnd: end.plus({ minutes: post }) };
}

export function intervalsOverlap(aStart: DateTime, aEnd: DateTime, bStart: DateTime, bEnd: DateTime): boolean {
  return aStart < bEnd && bStart < aEnd; // strict overlap
}

export function checkOverlap(cal: RoomCalendar, candidate: RoomEvent): { ok: true } | { ok: false; reason: string; conflictingEvent?: RoomEvent } {
  const { bufferedStart, bufferedEnd } = applyBuffers(candidate, cal);
  if (bufferedEnd <= bufferedStart) return { ok: false, reason: "Invalid time range" };
  const tz = cal.timezone;
  for (const ev of cal.events) {
    if (ev.status === "cancelled") continue;
    if (ev.id === candidate.id) continue; // allow updating same event
    const { bufferedStart: s, bufferedEnd: e } = applyBuffers(ev, cal);
    if (intervalsOverlap(bufferedStart, bufferedEnd, s, e)) {
      return { ok: false, reason: `Conflicts with ${ev.type} (${ev.title ?? ev.id}) after buffers`, conflictingEvent: ev };
    }
  }
  return { ok: true };
}

export function withinLeadTimes(cal: RoomCalendar, start: DateTime): { ok: true } | { ok: false; reason: string } {
  const now = DateTime.now().setZone(cal.timezone);
  const minLead = cal.minLeadTimeMins ?? 0;
  const maxDays = cal.maxLeadTimeDays ?? 365;
  if (start < now.plus({ minutes: minLead })) return { ok: false, reason: `Inside minimum lead time (${minLead} mins)` };
  if (start > now.plus({ days: maxDays })) return { ok: false, reason: `Beyond maximum lead time (${maxDays} days)` };
  return { ok: true };
}

export function detectOOH(cal: RoomCalendar, ev: RoomEvent): boolean {
  // Returns true if ANY part of ev is outside venue opening hours.
  if (!cal.openingHours) return false; // if not configured, treat as always open
  const tz = cal.timezone;
  let cursor = parseISO(ev.startsAt);
  const end = parseISO(ev.endsAt);
  while (cursor < end) {
    const dayEnd = cursor.endOf("day");
    const segEnd = end < dayEnd ? end : dayEnd;
    const weekday = weekdayToken(cursor);
    const ranges = cal.openingHours[weekday as keyof WeeklyHours] ?? [];

    // Build array of open intervals for this day in local tz
    const openIntervals = ranges.map(r => {
      const [sh, sm] = r.start.split(":").map(Number);
      const [eh, em] = r.end.split(":").map(Number);
      return Interval.fromDateTimes(cursor.set({ hour: sh, minute: sm, second: 0, millisecond: 0 }), cursor.set({ hour: eh, minute: em, second: 0, millisecond: 0 }));
    });

    // If segment intersects with any open interval fully? OOH if any part not covered
    const seg = Interval.fromDateTimes(cursor, segEnd);
    const covered = openIntervals.some(iv => iv.engulfs(seg) || iv.overlaps(seg));
    if (!covered) return true; // outside opening hours for this day segment

    cursor = segEnd;
  }
  return false;
}

export function isAvailable(cal: RoomCalendar, startISO: string, endISO: string): { available: true } | { available: false; reason: string; conflictingEvent?: RoomEvent } {
  const candidate: RoomEvent = {
    id: "_probe_",
    roomId: cal.roomId,
    type: "BOOKING",
    status: "provisional",
    startsAt: startISO,
    endsAt: endISO,
    createdBy: "system",
    createdAt: DateTime.now().toISO()!,
  };
  const lead = withinLeadTimes(cal, parseISO(startISO));
  if (!lead.ok) return { available: false, reason: lead.reason };

  const overlap = checkOverlap(cal, candidate);
  if (!overlap.ok) return { available: false, reason: overlap.reason, conflictingEvent: overlap.conflictingEvent };
  return { available: true };
}

export function addEvent(cal: RoomCalendar, ev: RoomEvent): { ok: true; cal: RoomCalendar } | { ok: false; reason: string; conflictingEvent?: RoomEvent } {
  // Rounding enforcement
  const step = cal.roundingStepMins ?? 15;
  const s = parseISO(ev.startsAt); const e = parseISO(ev.endsAt);
  if (!isOnStep(s, step) || !isOnStep(e, step)) return { ok: false, reason: `Times must align to ${step}-minute steps` };

  const lead = withinLeadTimes(cal, s);
  if (!lead.ok) return { ok: false, reason: lead.reason };

  const overlap = checkOverlap(cal, ev);
  if (!overlap.ok) return { ok: false, reason: overlap.reason, conflictingEvent: overlap.conflictingEvent };

  return { ok: true, cal: { ...cal, events: [...cal.events, ev] } };
}

export function updateEvent(cal: RoomCalendar, ev: RoomEvent): { ok: true; cal: RoomCalendar } | { ok: false; reason: string; conflictingEvent?: RoomEvent } {
  const idx = cal.events.findIndex(e => e.id === ev.id);
  if (idx === -1) return { ok: false, reason: "Event not found" };
  const overlap = checkOverlap(cal, ev);
  if (!overlap.ok) return { ok: false, reason: overlap.reason, conflictingEvent: overlap.conflictingEvent };
  const next = [...cal.events];
  next[idx] = ev;
  return { ok: true, cal: { ...cal, events: next } };
}

export function deleteEvent(cal: RoomCalendar, id: string): RoomCalendar {
  return { ...cal, events: cal.events.filter(e => e.id !== id) };
}

export function listFreeSlots(cal: RoomCalendar, fromISO: string, toISO: string, stepMins: number): Array<{ start: string; end: string }> {
  // Returns all free slots on step grid, respecting buffers and opening hours & existing events.
  const from = parseISO(fromISO); const to = parseISO(toISO);
  const step = Duration.fromObject({ minutes: stepMins });
  const free: Array<{ start: string; end: string }> = [];

  let cursor = roundToStep(from, stepMins, "up");
  while (cursor < to) {
    const next = cursor.plus(step);
    const probe = isAvailable(cal, cursor.toISO()!, next.toISO()!);
    if (probe.available && !detectOOH(cal, { id: "_probe_", roomId: cal.roomId, type: "BOOKING", status: "provisional", startsAt: cursor.toISO()!, endsAt: next.toISO()!, createdBy: "system", createdAt: DateTime.now().toISO()! })) {
      free.push({ start: cursor.toISO()!, end: next.toISO()! });
    }
    cursor = next;
  }
  return free;
}

function isOnStep(dt: DateTime, stepMins: number): boolean {
  return (dt.minute + dt.hour*60) % stepMins === 0 && dt.second === 0 && dt.millisecond === 0;
}

/********************************
 * 3) AVAILABILITY ENDPOINT MOCK
 ********************************/

// Request shape: GET /availability?from=ISO&to=ISO&pax=X&roomIds=rid1,rid2
// Response shape:
// {
//   from: ISO,
//   to: ISO,
//   freeRooms: string[],
//   suggestions?: Array<{ roomId: string; alternative: { start: string; end: string }[] }>,
//   pricingFlags?: Array<{ roomId: string; ooh: boolean; billableHours: number }>
// }

export function getAvailabilityMock(
  calendars: RoomCalendar[],
  query: { from: string; to: string; pax?: number; roomIds?: string[]; suggestDays?: number }
) {
  const { from, to, roomIds, suggestDays = 2 } = query;
  const rooms = roomIds?.length ? calendars.filter(c => roomIds.includes(c.roomId)) : calendars;
  const freeRooms: string[] = [];
  const suggestions: Array<{ roomId: string; alternative: { start: string; end: string }[] }> = [];
  const pricingFlags: Array<{ roomId: string; ooh: boolean; billableHours: number }> = [];

  for (const cal of rooms) {
    const avail = isAvailable(cal, from, to);
    if (avail.available) {
      freeRooms.push(cal.roomId);
    } else {
      // Suggest nearest alternatives ±N days on same clock window
      const start = parseISO(from); const end = parseISO(to);
      const windowDur = end.diff(start);
      const alts: { start: string; end: string }[] = [];
      for (let d = 1; d <= suggestDays; d++) {
        const beforeStart = start.minus({ days: d });
        const beforeEnd = beforeStart.plus(windowDur);
        if (isAvailable(cal, beforeStart.toISO()!, beforeEnd.toISO()!).available) alts.push({ start: beforeStart.toISO()!, end: beforeEnd.toISO()! });
        const afterStart = start.plus({ days: d });
        const afterEnd = afterStart.plus(windowDur);
        if (isAvailable(cal, afterStart.toISO()!, afterEnd.toISO()!).available) alts.push({ start: afterStart.toISO()!, end: afterEnd.toISO()! });
      }
      if (alts.length) suggestions.push({ roomId: cal.roomId, alternative: alts });
    }

    // Pricing hooks
    const ooh = detectOOH(cal, { id: "_probe_", roomId: cal.roomId, type: "BOOKING", status: "provisional", startsAt: from, endsAt: to, createdBy: "system", createdAt: DateTime.now().toISO()! });
    const billableHours = Math.ceil(Interval.fromDateTimes(parseISO(from), parseISO(to)).length("hours"));
    pricingFlags.push({ roomId: cal.roomId, ooh, billableHours });
  }

  return { from, to, freeRooms, suggestions: suggestions.length ? suggestions : undefined, pricingFlags };
}

/*******************************************
 * 4) MINIMAL ADMIN UI (Day/Week) + STORE
 *******************************************/

type Store = {
  calendars: RoomCalendar[];
  setCalendars: React.Dispatch<React.SetStateAction<RoomCalendar[]>>;
};

const initialCalendars: RoomCalendar[] = [
  {
    roomId: "Room-A",
    timezone: "Europe/Dublin",
    defaultPreBufferMins: 15,
    defaultPostBufferMins: 15,
    roundingStepMins: 15,
    minLeadTimeMins: 60,
    maxLeadTimeDays: 365,
    openingHours: { MO: [{ start: "07:00", end: "22:00" }], TU: [{ start: "07:00", end: "22:00" }], WE: [{ start: "07:00", end: "22:00" }], TH: [{ start: "07:00", end: "22:00" }], FR: [{ start: "07:00", end: "22:00" }], SA: [{ start: "08:00", end: "20:00" }], SU: [] },
    events: [],
  },
  {
    roomId: "Room-B",
    timezone: "Europe/Dublin",
    defaultPreBufferMins: 0,
    defaultPostBufferMins: 0,
    roundingStepMins: 30,
    minLeadTimeMins: 0,
    maxLeadTimeDays: 365,
    openingHours: { MO: [{ start: "09:00", end: "18:00" }], TU: [{ start: "09:00", end: "18:00" }], WE: [{ start: "09:00", end: "18:00" }], TH: [{ start: "09:00", end: "18:00" }], FR: [{ start: "09:00", end: "18:00" }], SA: [], SU: [] },
    events: [],
  }
];

function useStore(): Store {
  const [calendars, setCalendars] = useState<RoomCalendar[]>(initialCalendars);
  return { calendars, setCalendars };
}

function uid() { return Math.random().toString(36).slice(2, 10); }

// Grid helpers for UI
function timeSlots(start: DateTime, end: DateTime, stepMins: number) {
  const out: DateTime[] = [];
  let c = start;
  while (c < end) { out.push(c); c = c.plus({ minutes: stepMins }); }
  return out;
}

function dayStart(dt: DateTime) { return dt.startOf("day"); }
function dayEnd(dt: DateTime) { return dt.endOf("day"); }

// Colors by type
const TYPE_COLORS: Record<EventType, string> = {
  BOOKING: "bg-emerald-500/80",
  HOLD: "bg-amber-500/80",
  BLACKOUT: "bg-slate-700/80",
  MAINTENANCE: "bg-indigo-500/80",
};

// Event Modal
function EventModal({ open, onOpenChange, onSave, initial, calendar }: { open: boolean; onOpenChange: (o: boolean)=>void; onSave: (ev: RoomEvent)=>void; initial?: Partial<RoomEvent>; calendar: RoomCalendar }) {
  const [type, setType] = useState<EventType>(initial?.type ?? "BOOKING");
  const [status, setStatus] = useState<EventStatus>(initial?.status ?? "provisional");
  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [startsAt, setStartsAt] = useState<string>(initial?.startsAt ?? DateTime.now().setZone(calendar.timezone).toISO({ suppressMilliseconds: true })!);
  const [endsAt, setEndsAt] = useState<string>(initial?.endsAt ?? DateTime.now().setZone(calendar.timezone).plus({ hours: 1 }).toISO({ suppressMilliseconds: true })!);
  const [preBuffer, setPreBuffer] = useState<string>((initial?.preBufferMins ?? calendar.defaultPreBufferMins ?? 0).toString());
  const [postBuffer, setPostBuffer] = useState<string>((initial?.postBufferMins ?? calendar.defaultPostBufferMins ?? 0).toString());

  function submit() {
    const ev: RoomEvent = {
      id: initial?.id ?? uid(),
      roomId: calendar.roomId,
      type,
      status,
      title,
      notes,
      startsAt,
      endsAt,
      createdBy: "admin",
      createdAt: DateTime.now().toISO()!,
      preBufferMins: Number(preBuffer) || 0,
      postBufferMins: Number(postBuffer) || 0,
    };
    onSave(ev);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-sm">Title</label>
            <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g., Client booking" />
          </div>
          <div>
            <label className="text-sm">Type</label>
            <Select value={type} onValueChange={(v:any)=>setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BOOKING">BOOKING</SelectItem>
                <SelectItem value="HOLD">HOLD</SelectItem>
                <SelectItem value="BLACKOUT">BLACKOUT</SelectItem>
                <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm">Status</label>
            <Select value={status} onValueChange={(v:any)=>setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="provisional">provisional</SelectItem>
                <SelectItem value="confirmed">confirmed</SelectItem>
                <SelectItem value="cancelled">cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm">Starts At (ISO)</label>
            <Input value={startsAt} onChange={e=>setStartsAt(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Ends At (ISO)</label>
            <Input value={endsAt} onChange={e=>setEndsAt(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Pre-buffer (mins)</label>
            <Input value={preBuffer} onChange={e=>setPreBuffer(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Post-buffer (mins)</label>
            <Input value={postBuffer} onChange={e=>setPostBuffer(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-sm">Notes</label>
            <Textarea value={notes} onChange={e=>setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={()=>onOpenChange(false)}><X className="h-4 w-4 mr-1"/>Cancel</Button>
          <Button onClick={submit}><Save className="h-4 w-4 mr-1"/>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoomHeader({ calendar, onImport, onExportJSON, onExportICS }: { calendar: RoomCalendar; onImport: (json: string)=>void; onExportJSON: ()=>void; onExportICS: ()=>void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="font-semibold">{calendar.roomId} — {calendar.timezone}</div>
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={e=>{
          const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = ()=> onImport(String(reader.result)); reader.readAsText(f);
        }} />
        <Button variant="outline" onClick={()=>fileRef.current?.click()}><Upload className="h-4 w-4 mr-1"/>Import JSON</Button>
        <Button variant="outline" onClick={onExportJSON}><Download className="h-4 w-4 mr-1"/>Export JSON</Button>
        <Button variant="outline" onClick={onExportICS}><CalendarIcon className="h-4 w-4 mr-1"/>Export ICS</Button>
      </div>
    </div>
  );
}

function DayWeekView({ store }: { store: Store }) {
  const [view, setView] = useState<"day"|"week">("day");
  const [date, setDate] = useState<DateTime>(DateTime.now().setZone("Europe/Dublin").startOf("day"));
  const [activeRoom, setActiveRoom] = useState<string>(store.calendars[0]?.roomId ?? "");
  const cal = useMemo(()=> store.calendars.find(c => c.roomId === activeRoom)!, [store.calendars, activeRoom]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoomEvent | null>(null);

  const step = cal.roundingStepMins ?? 15;
  const daySlots = useMemo(()=> timeSlots(date.startOf("day").set({ hour: 6 }), date.startOf("day").set({ hour: 22 }), step), [date, step]);

  function saveEvent(ev: RoomEvent) {
    let res;
    if (editing) {
      res = updateEvent(cal, ev);
    } else {
      res = addEvent(cal, ev);
    }
    if (res.ok) {
      store.setCalendars(prev => prev.map(c => c.roomId === cal.roomId ? res!.cal : c));
      setModalOpen(false); setEditing(null);
    } else {
      alert(`Cannot save: ${res.reason}`);
    }
  }

  function removeEvent(id: string) {
    if (!confirm("Delete event?")) return;
    const next = deleteEvent(cal, id);
    store.setCalendars(prev => prev.map(c => c.roomId === cal.roomId ? next : c));
  }

  // Drag & Resize
  const [dragState, setDragState] = useState<null | { id?: string; start: DateTime; end: DateTime; mode: "create"|"move"|"resize-start"|"resize-end" }>(null);

  function onGridMouseDown(e: React.MouseEvent, slotStart: DateTime) {
    if ((e.target as HTMLElement).closest("[data-event]") ) return; // ignore when clicking event body
    const s = slotStart; const eend = slotStart.plus({ minutes: step });
    setDragState({ start: s, end: eend, mode: "create" });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragState) return;
    const y = (e.target as HTMLElement).closest("[data-grid]") as HTMLElement | null;
    if (!y) return;
    const rect = y.getBoundingClientRect();
    const relY = e.clientY - rect.top; // px within grid
    const slotHeight = 28; // px per slot
    const slotsFromTop = Math.max(0, Math.round(relY/slotHeight));
    const newEnd = daySlots[0].plus({ minutes: slotsFromTop*step });
    if (dragState.mode === "create") {
      if (newEnd > dragState.start) setDragState({ ...dragState, end: newEnd });
    } else if (dragState.mode === "move" && dragState.id) {
      const ev = cal.events.find(e => e.id === dragState.id)!;
      const dur = parseISO(ev.endsAt).diff(parseISO(ev.startsAt));
      const newStart = roundToStep(daySlots[0].plus({ minutes: slotsFromTop*step }), step, "down");
      const newEnd2 = newStart.plus(dur);
      setDragState({ ...dragState, start: newStart, end: newEnd2 });
    } else if (dragState.mode === "resize-start" && dragState.id) {
      const ev = cal.events.find(e => e.id === dragState.id)!;
      const origEnd = parseISO(ev.endsAt);
      const newStart = roundToStep(daySlots[0].plus({ minutes: slotsFromTop*step }), step, "down");
      if (newStart < origEnd) setDragState({ ...dragState, start: newStart });
    } else if (dragState.mode === "resize-end" && dragState.id) {
      const ev = cal.events.find(e => e.id === dragState.id)!;
      const origStart = parseISO(ev.startsAt);
      const newEnd2 = roundToStep(daySlots[0].plus({ minutes: slotsFromTop*step }), step, "down");
      if (newEnd2 > origStart) setDragState({ ...dragState, end: newEnd2 });
    }
  }

  function onMouseUp() {
    if (!dragState) return;
    if (dragState.mode === "create") {
      setModalOpen(true);
      setEditing(null);
      // pass initial times via modal state
    } else if (dragState.id) {
      const ev = cal.events.find(e => e.id === dragState.id)!;
      const updated: RoomEvent = { ...ev, startsAt: dragState.start.toISO()!, endsAt: dragState.end.toISO()! };
      const res = updateEvent(cal, updated);
      if (res.ok) {
        store.setCalendars(prev => prev.map(c => c.roomId === cal.roomId ? res!.cal : c));
      } else {
        alert(`Cannot update: ${res.reason}`);
      }
    }
    setDragState(null);
  }

  // Export / Import
  function exportJSON() {
    const blob = new Blob([JSON.stringify(cal, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${cal.roomId}.json`; a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(json: string) {
    try { const parsed = JSON.parse(json) as RoomCalendar; if (parsed.roomId !== cal.roomId) throw new Error("Room mismatch"); store.setCalendars(prev => prev.map(c => c.roomId === cal.roomId ? parsed : c)); } catch (e:any) { alert("Invalid JSON: "+ e.message); }
  }
  function exportICS() {
    const ics = toICS(cal);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${cal.roomId}.ics`; a.click(); URL.revokeObjectURL(url);
  }

  // Pre-fill modal times from drag create
  const modalInitial = dragState?.mode === "create" && dragState ? {
    startsAt: dragState.start.toISO({ suppressMilliseconds: true })!,
    endsAt: dragState.end.toISO({ suppressMilliseconds: true })!,
  } : undefined;

  const days = useMemo(()=> view === "day" ? [date] : Array.from({length:7}, (_,i)=> date.startOf("week").plus({ days: i })) , [view, date]);

  return (
    <Card className="shadow-lg">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v:any)=>setView(v)}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={()=>setDate(date.minus({ days: view === "day" ? 1 : 7 }))}>Prev</Button>
            <Button variant="outline" onClick={()=>setDate(DateTime.now().setZone(cal.timezone).startOf("day"))}>Today</Button>
            <Button variant="outline" onClick={()=>setDate(date.plus({ days: view === "day" ? 1 : 7 }))}>Next</Button>
            <div className="ml-2 text-sm opacity-80">{date.toLocaleString(DateTime.DATE_FULL)} ({view})</div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={activeRoom} onValueChange={setActiveRoom}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Room"/></SelectTrigger>
              <SelectContent>
                {store.calendars.map(c=> (<SelectItem key={c.roomId} value={c.roomId}>{c.roomId}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <RoomHeader calendar={cal} onImport={importJSON} onExportJSON={exportJSON} onExportICS={exportICS} />
          <div className="overflow-x-auto">
            <div className="grid" style={{ gridTemplateColumns: `100px repeat(${days.length}, 1fr)` }}>
              {/* Time column header */}
              <div></div>
              {days.map(d => (
                <div key={d.toISODate()} className="text-center font-medium py-2 border-b">{d.toFormat("ccc dd LLL")}</div>
              ))}
              {/* Rows */}
              {daySlots.map((slot, idx) => (
                <React.Fragment key={idx}>
                  <div className="text-right pr-2 py-1 text-xs border-r">{slot.toFormat("HH:mm")}</div>
                  {days.map(d => {
                    const slotStart = d.set({ hour: slot.hour, minute: slot.minute, second: 0, millisecond: 0 });
                    const slotEnd = slotStart.plus({ minutes: step });
                    return (
                      <div key={d.toISODate()+idx} data-grid className="relative border-b h-7 select-none"
                           onMouseDown={(e)=> onGridMouseDown(e, slotStart)}
                           onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
                        {/* Existing events rendered if they intersect this slot row */}
                        {cal.events.filter(ev => {
                          const s = parseISO(ev.startsAt); const e = parseISO(ev.endsAt);
                          return intervalsOverlap(s, e, slotStart, slotEnd);
                        }).map(ev => {
                          const s = parseISO(ev.startsAt); const e = parseISO(ev.endsAt);
                          const dayTop = daySlots[0];
                          const slotHeight = 28; // px
                          const topPx = Math.max(0, Math.round(s.diff(dayTop, 'minutes').minutes/step) * slotHeight);
                          const heightPx = Math.max(slotHeight, Math.round(e.diff(s, 'minutes').minutes/step) * slotHeight);
                          return (
                            <div key={ev.id} data-event className={`absolute left-1 right-1 ${TYPE_COLORS[ev.type]} rounded-xl shadow text-white text-xs p-1 cursor-move`}
                                 style={{ top: topPx, height: heightPx }}
                                 onMouseDown={() => setDragState({ id: ev.id, start: s, end: e, mode: "move" })}
                                 onDoubleClick={() => { setEditing(ev); setModalOpen(true); }}>
                              <div className="flex justify-between items-center">
                                <div className="truncate font-semibold">{ev.title ?? ev.type}</div>
                                <div className="flex items-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={(e)=>{ e.stopPropagation(); setDragState({ id: ev.id, start: s, end: e, mode: "resize-start" }); }}><div className="w-1 h-4 bg-white/80 rounded"/></Button>
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={(e)=>{ e.stopPropagation(); setDragState({ id: ev.id, start: s, end: e, mode: "resize-end" }); }}><div className="w-1 h-4 bg-white/80 rounded"/></Button>
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={(e)=>{ e.stopPropagation(); removeEvent(ev.id); }}><Trash2 className="h-3 w-3"/></Button>
                                </div>
                              </div>
                              <div className="opacity-90">{s.toFormat("HH:mm")}–{e.toFormat("HH:mm")} ({ev.status})</div>
                            </div>
                          );
                        })}

                        {/* Drag create ghost */}
                        {dragState && dragState.mode === "create" && dragState.start <= slotStart && dragState.end > slotStart && (
                          <div className="absolute inset-x-1 bg-sky-500/30 rounded-xl border border-sky-500/50" style={{ top: 0, bottom: 0 }} />
                        )}

                        {/* Drag move/resize ghost */}
                        {dragState && dragState.id && dragState.start <= slotStart && dragState.end > slotStart && (
                          <div className="absolute inset-x-1 bg-white/20 border border-white rounded-xl" style={{ top: 0, bottom: 0 }} />
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Create/Edit Modal */}
        <EventModal open={modalOpen} onOpenChange={(o)=>{ setModalOpen(o); if (!o) setEditing(null); }} initial={editing ?? modalInitial ?? undefined} calendar={cal} onSave={saveEvent} />

        {/* Availability probe & sample endpoint call */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Search API demo</h3>
          <ApiDemo calendars={store.calendars} />
        </div>
      </CardContent>
    </Card>
  );
}

function ApiDemo({ calendars }: { calendars: RoomCalendar[] }) {
  const [from, setFrom] = useState<string>(DateTime.now().setZone("Europe/Dublin").set({ hour: 10, minute: 0, second:0, millisecond:0 }).toISO()!);
  const [to, setTo] = useState<string>(DateTime.now().setZone("Europe/Dublin").set({ hour: 12, minute: 0, second:0, millisecond:0 }).toISO()!);
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const data = useMemo(()=> getAvailabilityMock(calendars, { from, to, roomIds }), [calendars, from, to, roomIds]);

  return (
    <div className="p-3 border rounded-xl bg-muted/40">
      <div className="grid md:grid-cols-4 gap-2">
        <div>
          <label className="text-xs">From (ISO)</label>
          <Input value={from} onChange={e=>setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs">To (ISO)</label>
          <Input value={to} onChange={e=>setTo(e.target.value)} />
        </div>
        <div>
          <label className="text-xs">Room IDs (comma separated; empty=all)</label>
          <Input onChange={e=> setRoomIds(e.target.value.split(",").map(s=>s.trim()).filter(Boolean))} />
        </div>
        <div className="flex items-end">
          <Button variant="outline" onClick={()=> navigator.clipboard.writeText(JSON.stringify(data, null, 2))}><Copy className="h-4 w-4 mr-1"/>Copy JSON</Button>
        </div>
      </div>
      <pre className="text-xs mt-3 bg-background p-3 rounded-lg border overflow-auto max-h-64">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

/*******************************************
 * 5) INTEGRATION NOTE (Quote Preview)
 *******************************************/
// In the Quote Preview flow:
// 1) Frontend gathers requested start/end and selected roomId(s)
// 2) Call isAvailable(cal, startISO, endISO) for the chosen room
// 3) If available, proceed to pricing. Provide pricing hooks:
//    - detectOOH(cal, ev) -> OOH surcharge flag
//    - round to billable units using roundingStepMins and half/day cutoffs
// 4) If not available, call getAvailabilityMock (or real API) for alternatives

/**************************
 * ICS Export (read-only)
 **************************/
function toICS(cal: RoomCalendar): string {
  const esc = (s:string)=> s.replace(/[\\;,\n]/g, m=> ({"\\":"\\\\",";":"\\;",",":"\\,","\n":"\\n"}[m]!));
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//MeetingRoomSaaS//${cal.roomId}//EN`,
  ];
  for (const ev of cal.events) {
    if (ev.status === "cancelled") continue;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${esc(ev.id)}@${esc(cal.roomId)}`);
    lines.push(`DTSTAMP:${DateTime.now().toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")}`);
    lines.push(`DTSTART:${parseISO(ev.startsAt).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")}`);
    lines.push(`DTEND:${parseISO(ev.endsAt).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")}`);
    lines.push(`SUMMARY:${esc(ev.title ?? ev.type)}`);
    if (ev.notes) lines.push(`DESCRIPTION:${esc(ev.notes)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**************************
 * UNIT TEST STUBS (Vitest)
 **************************/
/*
import { describe, it, expect } from "vitest";

describe("overlap with buffers", () => {
  it("rejects conflicting add", () => {
    const cal: RoomCalendar = { roomId: "X", timezone: "Europe/Dublin", events: [], roundingStepMins: 15 };
    const a: RoomEvent = { id: "1", roomId: "X", type: "BOOKING", status: "confirmed", startsAt: "2025-03-30T09:00:00+00:00", endsAt: "2025-03-30T10:00:00+00:00", createdBy: "t", createdAt: "2025-03-01T00:00:00Z", preBufferMins: 15, postBufferMins: 15 };
    const r1 = addEvent(cal, a); expect(r1.ok).toBe(true);
    const b: RoomEvent = { ...a, id: "2", startsAt: "2025-03-30T10:00:00+00:00", endsAt: "2025-03-30T11:00:00+00:00" };
    const r2 = addEvent(r1.cal, b); expect(r2.ok).toBe(false); // post+pre buffers collide at 10:00
  });
});

describe("DST boundaries (Europe/Dublin)", () => {
  it("handles spring forward correctly", () => {
    const cal: RoomCalendar = { roomId: "X", timezone: "Europe/Dublin", events: [], roundingStepMins: 30 };
    const s = "2025-03-30T00:30:00+00:00"; const e = "2025-03-30T02:30:00+01:00"; // crosses DST shift
    const avail = isAvailable(cal, s, e); expect(avail.available).toBe(true);
  });
});
*/

/**********************
 * DEFAULT EXPORT (UI)
 **********************/
export default function CalendarAvailabilityApp() {
  const store = useStore();
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Meeting Room SaaS — Calendar & Availability (v1)</h1>
      <p className="text-sm text-muted-foreground">Buffers, opening hours, lead times, rounding, overlap prevention, availability search, JSON/ICS import-export. Timezone-aware (Europe/Dublin by default).</p>
      <DayWeekView store={store} />

      <div className="prose max-w-none">
        <h3>API Shape & Sample Response</h3>
        <pre>{`
GET /availability?from=2025-09-07T10:00:00+01:00&to=2025-09-07T12:00:00+01:00&roomIds=Room-A,Room-B

200 OK
{
  "from": "2025-09-07T10:00:00+01:00",
  "to": "2025-09-07T12:00:00+01:00",
  "freeRooms": ["Room-A"],
  "suggestions": [
    { "roomId": "Room-B", "alternative": [
      { "start": "2025-09-06T10:00:00+01:00", "end": "2025-09-06T12:00:00+01:00" },
      { "start": "2025-09-08T10:00:00+01:00", "end": "2025-09-08T12:00:00+01:00" }
    ]}
  ],
  "pricingFlags": [
    { "roomId": "Room-A", "ooh": false, "billableHours": 2 },
    { "roomId": "Room-B", "ooh": true, "billableHours": 2 }
  ]
}
`}</pre>
        <h3>Integration Note</h3>
        <ol>
          <li>Quote flow calls <code>isAvailable(roomCal, startISO, endISO)</code>. If false, show clear reason from return payload.</li>
          <li>When true, compute pricing using <code>pricingFlags</code> logic: OOH via <code>detectOOH</code>, hours via rounding rules.</li>
          <li>On confirmation, persist via real API, then <code>addEvent</code> with <code>status: "confirmed"</code>.</li>
        </ol>
      </div>
    </div>
  );
}
