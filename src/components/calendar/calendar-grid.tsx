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
  Mail,
  GripVertical,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";

export interface ScheduledPost {
  id: string;
  channel: "x" | "linkedin" | "email";
  scheduled_for: string;
  posted_at?: string | null;
  status: string;
  error_message?: string | null;
  created_at?: string;
  assets?: { id: string; title: string | null; type: string; content?: string | null } | null;
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
  if (channel === "x") return <Twitter className="h-3 w-3 text-accent" />;
  if (channel === "linkedin")
    return <Linkedin className="h-3 w-3 text-[#0A66C2]" />;
  return <Mail className="h-3 w-3 text-success" />;
}

function statusColor(status: string) {
  if (status === "posted") return "success";
  if (status === "failed") return "error";
  if (status === "cancelled") return "secondary";
  return "warning";
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
    post.assets?.content?.slice(0, 60) ||
    "Untitled post";

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-1 rounded px-1.5 py-1 text-[11px] leading-tight cursor-pointer transition-all ${
        isDragging
          ? "opacity-30"
          : "bg-surface-2 hover:bg-surface-1 border border-transparent hover:border-border-default"
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
          <GripVertical className="h-3 w-3 text-text-tertiary" />
        </span>
      )}
      <span className="shrink-0">{channelIcon(post.channel)}</span>
      <span className="truncate text-text-secondary flex-1">{preview}</span>
      <Badge
        variant={statusColor(post.status) as "success" | "error" | "warning" | "secondary"}
        className="text-[9px] px-1 py-0 leading-none shrink-0"
      >
        {post.status === "pending" ? "sched" : post.status.slice(0, 4)}
      </Badge>
    </div>
  );
}

/* ---- Overlay card shown while dragging ---- */
function DragOverlayCard({ post }: { post: ScheduledPost }) {
  const preview =
    post.assets?.title ||
    post.assets?.content?.slice(0, 60) ||
    "Untitled post";

  return (
    <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] bg-surface-1 border border-accent shadow-lg shadow-accent/10 max-w-[200px]">
      {channelIcon(post.channel)}
      <span className="truncate text-text-primary">{preview}</span>
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
      className={`min-h-[90px] p-1.5 text-left transition-colors cursor-pointer ${
        isCurrentMonth ? "bg-surface-0" : "bg-surface-0/50"
      } ${isToday ? "ring-1 ring-inset ring-accent" : ""} ${
        isOver ? "bg-accent/10" : "hover:bg-surface-1"
      }`}
    >
      <span
        className={`text-small font-mono block mb-1 ${
          isToday
            ? "text-accent font-bold"
            : isCurrentMonth
            ? "text-text-secondary"
            : "text-text-tertiary"
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
          <span className="text-[10px] text-text-tertiary font-mono pl-1">
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
            <h3 className="text-h2 text-text-primary">{weekLabel}</h3>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - 7);
                  setCurrentDate(d);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() + 7);
                  setCurrentDate(d);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px rounded-lg border border-border-default overflow-hidden bg-border-default">
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
                className="text-caption text-text-tertiary font-medium text-center"
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
          <h3 className="text-h2 text-text-primary">
            {new Date(year, month).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px mb-px">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-caption text-text-tertiary font-medium text-center py-2"
            >
              {name}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px rounded-lg border border-border-default overflow-hidden bg-border-default">
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

        <div className="flex items-center gap-4 mt-3 text-caption text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> X
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0A66C2]" /> LinkedIn
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" /> Email
          </span>
        </div>
      </div>

      <DragOverlay>
        {activePost ? <DragOverlayCard post={activePost} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
