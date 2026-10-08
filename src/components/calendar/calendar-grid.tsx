"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ChevronLeft,
  ChevronRight,
  Twitter,
  Linkedin,
  GripVertical,
} from "@/src/components/ui/lucide-icons";
import { Button, IconButton } from "@/src/components/ui/button";

export interface ScheduledPost {
  id: string;
  channel: "x" | "linkedin";
  scheduled_for: string;
  posted_at?: string | null;
  status: string;
  error_message?: string | null;
  created_at?: string;
  assets?: {
    id: string;
    title: string | null;
    type: string;
    // Supabase returns the content JSON blob as-is
    content?: Record<string, unknown> | string | null;
  } | null;
}

interface CalendarGridProps {
  posts: ScheduledPost[];
  view: "month" | "week";
  onDayClick: (date: Date) => void;
  onPostClick: (post: ScheduledPost) => void;
  onReschedule: (postId: string, newDate: Date) => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function channelIcon(channel: string) {
  if (channel === "linkedin")
    return <Linkedin className="h-3 w-3 text-text-2" />;
  return <Twitter className="h-3 w-3 text-text-2" />;
}

function statusDot(status: string) {
  if (status === "posted") return "bg-teal";
  if (status === "failed") return "bg-danger";
  if (status === "cancelled") return "bg-line";
  return "bg-accent";
}

/* ---- Draggable Post Card ---- */
function DraggablePostCard({
  post,
  onPostClick,
}: {
  post: ScheduledPost;
  onPostClick: (post: ScheduledPost) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
    data: { post },
    disabled: post.status !== "pending",
  });

  const preview =
    post.assets?.title ||
    contentPreview(post.assets?.content) ||
    "Untitled post";

  return (
    <div
      ref={setNodeRef}
      className={`group flex cursor-pointer items-center gap-1 rounded-sm border px-1.5 py-1 text-caption leading-tight transition-colors duration-[var(--duration-fast)] ${
        isDragging
          ? "border-transparent opacity-30"
          : "border-line bg-surface hover:border-line-strong"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onPostClick(post);
      }}
    >
      {post.status === "pending" && (
        <span
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-3 w-3 text-text-3" />
        </span>
      )}
      <span className="shrink-0">{channelIcon(post.channel)}</span>
      <span className="truncate text-text-2 flex-1">{preview}</span>
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(post.status)}`}
        aria-hidden
      />
      <span className="sr-only">
        {post.status === "pending" ? "scheduled" : post.status}
      </span>
    </div>
  );
}

function contentPreview(
  content: Record<string, unknown> | string | null | undefined
): string {
  if (!content) return "";
  if (typeof content === "string") return content.slice(0, 60);
  const text =
    (content.scheduled_text as string | undefined) ??
    (content.raw as string | undefined) ??
    "";
  return text.slice(0, 60);
}

/* ---- Overlay card shown while dragging ---- */
function DragOverlayCard({ post }: { post: ScheduledPost }) {
  const preview =
    post.assets?.title ||
    contentPreview(post.assets?.content) ||
    "Untitled post";

  return (
    <div className="flex max-w-[200px] items-center gap-1.5 rounded-md border border-accent bg-surface px-2.5 py-2 text-caption shadow-[var(--shadow-float)]">
      {channelIcon(post.channel)}
      <span className="truncate text-text">{preview}</span>
    </div>
  );
}

/* ---- Droppable Day Cell ---- */
function DroppableDay({
  dateKey,
  day,
  isToday,
  isCurrentMonth,
  posts,
  onDayClick,
  onPostClick,
}: {
  dateKey: string;
  day: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  posts: ScheduledPost[];
  onDayClick: (date: Date) => void;
  onPostClick: (post: ScheduledPost) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick(new Date(dateKey))}
      className={`min-h-[90px] cursor-pointer p-1.5 text-left transition-colors duration-[var(--duration-fast)] ${
        isOver ? "bg-accent-soft" : isCurrentMonth ? "bg-ground hover:bg-surface" : "bg-surface-2 hover:bg-surface"
      } ${isToday ? "ring-1 ring-inset ring-accent" : ""}`}
    >
      <span
        className={`mb-1 block font-mono text-body-s ${
          isToday
            ? "font-medium text-accent"
            : isCurrentMonth
            ? "text-text-2"
            : "text-text-3"
        }`}
      >
        {day}
      </span>
      <div className="space-y-0.5">
        {posts.slice(0, 3).map((post) => (
          <DraggablePostCard
            key={post.id}
            post={post}
            onPostClick={onPostClick}
          />
        ))}
        {posts.length > 3 && (
          <span className="pl-1 font-mono text-caption text-text-3">
            +{posts.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

/* ---- Main CalendarGrid ---- */
export function CalendarGrid({
  posts,
  view,
  onDayClick,
  onPostClick,
  onReschedule,
}: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activePost, setActivePost] = useState<ScheduledPost | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const today = new Date();

  function getPostsForDay(date: Date) {
    return posts.filter((p) => isSameDay(new Date(p.scheduled_for), date));
  }

  function handleDragStart(event: DragStartEvent) {
    setActivePost(event.active.data.current?.post ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePost(null);
    const { active, over } = event;
    if (!over) return;
    const post = active.data.current?.post as ScheduledPost | undefined;
    if (!post) return;

    const newDate = new Date(over.id as string);
    const oldDate = new Date(post.scheduled_for);
    if (isSameDay(oldDate, newDate)) return;

    // Preserve time, change date
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
    onReschedule(post.id, newDate);
  }

  /* ---- Week View ---- */
  if (view === "week") {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = (startOfWeek.getDay() + 6) % 7; // Mon=0
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDays.push(d);
    }

    const weekLabel = `${weekDays[0].toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} – ${weekDays[6].toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;

    return (
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-heading text-text">{weekLabel}</h3>
            <div className="flex items-center gap-1">
              <IconButton
                label="Previous week"
                size="sm"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - 7);
                  setCurrentDate(d);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <IconButton
                label="Next week"
                size="sm"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() + 7);
                  setCurrentDate(d);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px rounded-lg border border-line overflow-hidden bg-line">
            {weekDays.map((date) => {
              const dateKey = date.toISOString().split("T")[0];
              const dayPosts = getPostsForDay(date);
              const isToday_ = isSameDay(date, today);

              return (
                <DroppableDay
                  key={dateKey}
                  dateKey={dateKey}
                  day={date.getDate()}
                  isToday={isToday_}
                  isCurrentMonth={true}
                  posts={dayPosts}
                  onDayClick={onDayClick}
                  onPostClick={onPostClick}
                />
              );
            })}
          </div>

          {/* Day labels under week */}
          <div className="grid grid-cols-7 gap-px mt-1">
            {weekDays.map((date, i) => (
              <div
                key={i}
                className="text-center text-label text-text-3"
              >
                {DAY_NAMES[i]}
              </div>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activePost ? <DragOverlayCard post={activePost} /> : null}
        </DragOverlay>
      </DndContext>
    );
  }

  /* ---- Month View ---- */
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: { day: number; date: Date; currentMonth: boolean }[] = [];

  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    cells.push({ day: d.getDate(), date: d, currentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(year, month, d), currentMonth: true });
  }

  // Next month padding
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, cells.length - firstDayOfWeek - daysInMonth + 1);
    cells.push({ day: d.getDate(), date: d, currentMonth: false });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading text-text">
            {new Date(year, month).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex items-center gap-1">
            <IconButton
              label="Previous month"
              size="sm"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <IconButton
              label="Next month"
              size="sm"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px mb-px">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="py-2 text-center text-label text-text-3"
            >
              {name}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px rounded-lg border border-line overflow-hidden bg-line">
          {cells.map((cell) => {
            const dateKey = cell.date.toISOString().split("T")[0];
            const dayPosts = getPostsForDay(cell.date);
            const isToday_ = isSameDay(cell.date, today);

            return (
              <DroppableDay
                key={dateKey}
                dateKey={dateKey}
                day={cell.day}
                isToday={isToday_}
                isCurrentMonth={cell.currentMonth}
                posts={dayPosts}
                onDayClick={onDayClick}
                onPostClick={onPostClick}
              />
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-caption text-text-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal" /> Posted
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" /> Failed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-line" /> Cancelled
          </span>
        </div>
      </div>

      <DragOverlay>
        {activePost ? <DragOverlayCard post={activePost} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
