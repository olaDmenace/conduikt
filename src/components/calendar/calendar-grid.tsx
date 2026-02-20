"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";

interface ScheduledPost {
  id: string;
  channel: "x" | "linkedin" | "email";
  scheduled_for: string;
  status: string;
}

interface CalendarGridProps {
  posts: ScheduledPost[];
  onDayClick: (date: Date) => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CHANNEL_COLORS: Record<string, string> = {
  x: "bg-accent",
  linkedin: "bg-[#0A66C2]",
  email: "bg-success",
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarGrid({ posts, onDayClick }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // First day offset (0=Mon..6=Sun)
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  // Build day cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to fill last row
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

  function getPostsForDay(day: number) {
    const date = new Date(year, month, day);
    return posts.filter((p) => isSameDay(new Date(p.scheduled_for), date));
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-h2 text-text-primary">
          {currentMonth.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
            }
          >
            Today
          </Button>
          <Button size="sm" variant="ghost" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
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

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-lg border border-border-default overflow-hidden bg-border-default">
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div key={`empty-${i}`} className="bg-surface-0 min-h-[80px]" />
            );
          }

          const dayPosts = getPostsForDay(day);
          const isToday = isSameDay(
            new Date(year, month, day),
            today
          );

          return (
            <button
              key={day}
              onClick={() => onDayClick(new Date(year, month, day))}
              className={`bg-surface-0 min-h-[80px] p-2 text-left transition-colors hover:bg-surface-1 ${
                isToday ? "ring-1 ring-inset ring-accent" : ""
              }`}
            >
              <span
                className={`text-small font-mono ${
                  isToday
                    ? "text-accent font-bold"
                    : "text-text-secondary"
                }`}
              >
                {day}
              </span>
              {dayPosts.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {dayPosts.slice(0, 4).map((post) => (
                    <span
                      key={post.id}
                      className={`h-2 w-2 rounded-full ${
                        CHANNEL_COLORS[post.channel] ?? "bg-text-tertiary"
                      } ${post.status === "cancelled" ? "opacity-30" : ""}`}
                    />
                  ))}
                  {dayPosts.length > 4 && (
                    <span className="text-[10px] text-text-tertiary font-mono">
                      +{dayPosts.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
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
  );
}
