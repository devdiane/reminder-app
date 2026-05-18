"use client";

import { formatDate, formatTime } from "@/lib/date-utils";
import { getUserId, getUserName, setUserId as saveUserId } from "@/lib/user";
import { useEffect, useState } from "react";

type EventItem = {
  id: string;
  title: string;
  type: string;
  startTime: string;
};

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("DEADLINE");
  const [startTime, setStartTime] = useState("");
  const [userId, setUserId] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [connected, setConnected] = useState(false);

  // Initialize userId from localStorage on mount
  useEffect(() => {
    const storedUserId = getUserId();
    const storedUserName = getUserName();
    if (storedUserId) {
      setUserId(storedUserId);
      setConnected(true);
    }
    if (storedUserName) {
      setUserDisplayName(storedUserName);
    }
  }, []);

  async function fetchEvents() {
    try {
      // Pass userId to filter events for the specific user
      const url = userId
        ? `/api/event/list?userId=${encodeURIComponent(userId)}`
        : "/api/event/list";
      const res = await fetch(url);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate userId is set
    if (!userId) {
      alert(
        "Please enter your Telegram User ID first. Click the button above to connect to Telegram!",
      );
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          type,
          startTime,
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Something went wrong");
        return;
      }

      alert("Event created successfully!");

      setTitle("");
      setType("DEADLINE");
      setStartTime("");

      fetchEvents();
    } catch (error) {
      console.error(error);
      alert("Failed to create event");
    } finally {
      setLoading(false);
    }
  }

  // Handle userId input change and save to localStorage
  function handleUserIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newUserId = e.target.value;
    setUserId(newUserId);
    if (newUserId) {
      saveUserId(newUserId); // Save to localStorage via imported function
      setConnected(true);
    } else {
      setConnected(false);
    }
  }

  // Handle manual userId input blur - save to localStorage
  function handleUserIdBlur() {
    if (userId) {
      saveUserId(userId); // Save to localStorage via imported function
      setConnected(true);
    }
  }

  // Connect to Telegram handler
  function handleConnectTelegram() {
    // Open Telegram bot in new window
    window.open("https://t.me/reminderOmega_bot", "_blank");
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Are you sure you want to delete this event?")) return;
    if (!userId) {
      alert("Please connect to Telegram first");
      return;
    }

    try {
      setDeletingId(eventId);

      const res = await fetch(
        `/api/event?id=${eventId}&userId=${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete event");
        return;
      }

      fetchEvents();
    } catch (error) {
      console.error(error);
      alert("Failed to delete event");
    } finally {
      setDeletingId(null);
    }
  }

  const getTypeEmoji = (eventType: string) => {
    switch (eventType) {
      case "DEADLINE":
        return "📌";
      case "MEETING":
        return "📅";
      case "BUSINESS_TRIP":
        return "✈️";
      default:
        return "📋";
    }
  };

  const getTypeColor = (eventType: string) => {
    switch (eventType) {
      case "DEADLINE":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "MEETING":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "BUSINESS_TRIP":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Stats calculations
  const now = new Date();
  const upcomingEvents = events.filter(
    (e) => new Date(e.startTime) > now,
  ).length;
  const pastEvents = events.filter((e) => new Date(e.startTime) <= now).length;

  // Group events by date for calendar view
  const eventsByDate = events.reduce(
    (acc, event) => {
      const dateKey = formatDate(event.startTime);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    },
    {} as Record<string, EventItem[]>,
  );

  const sortedDates = Object.keys(eventsByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="text-center py-6">
          <div className="inline-flex items-center justify-center bg-indigo-500/20 backdrop-blur-sm border border-indigo-500/30 rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
            <span className="text-indigo-300 text-sm font-medium">
              Bot Active
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Reminder
            </span>
            <span className="text-white">Omega</span>
          </h1>
          <p className="text-indigo-300 text-lg">
            Your smart task scheduler — Connect via{" "}
            <a
              href="https://t.me/reminderOmega_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition"
            >
              @reminderOmega_bot
            </a>
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {events.length}
            </div>
            <div className="text-indigo-400 text-sm">Total Events</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-3xl font-bold text-emerald-400 mb-1">
              {upcomingEvents}
            </div>
            <div className="text-indigo-400 text-sm">Upcoming</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-3xl font-bold text-rose-400 mb-1">
              {pastEvents}
            </div>
            <div className="text-indigo-400 text-sm">Completed</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Event Form */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <span className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-sm">
                +
              </span>
              Create New Event
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Telegram Connection Section */}
              <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      {connected ? (
                        <>
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                          Connected to Telegram
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                          Connect to Telegram
                        </>
                      )}
                    </h3>
                    <p className="text-indigo-300 text-sm mt-1">
                      {connected
                        ? `User ID: ${userId}`
                        : "Get your User ID from @reminderOmega_bot"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectTelegram}
                    className="shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-6.328 2.968c-.468.22-.947.22-1.415 0l-2.956-1.488c-.234-.117-.468-.117-.702 0l-1.404.702c-.468.234-.702.585-.702 1.054l0 2.976c0 .469.234.82.702 1.054l1.404.702c.234.117.468.117.702 0l2.956-1.488c.468-.22.947-.22 1.415 0l6.328 2.968c.234.117.585.117.82 0l1.404-1.054c.468-.234.702-.585.702-1.054l0-2.976c0-.469-.234-.82-.702-1.054l-1.404-.702c-.234-.117-.585-.117-.82 0z" />
                    </svg>
                    {connected ? "Reconnect" : "Open Bot"}
                  </button>
                </div>

                {/* User ID Input - Only show if not connected */}
                {!connected && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-indigo-200 mb-1">
                      Enter Your Telegram User ID
                    </label>
                    <p className="text-indigo-400 text-xs mb-2">
                      Open the bot above, type /start, then enter the User ID
                      shown
                    </p>
                    <input
                      type="text"
                      value={userId}
                      onChange={handleUserIdChange}
                      onBlur={handleUserIdBlur}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-indigo-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      placeholder="Your Telegram User ID (e.g., 123456789)"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-1">
                  Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-indigo-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="Project Submission"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-1">
                  Type
                </label>

                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                >
                  <option value="DEADLINE" className="bg-slate-900">
                    📌 Deadline
                  </option>
                  <option value="MEETING" className="bg-slate-900">
                    📅 Meeting
                  </option>
                  <option value="BUSINESS_TRIP" className="bg-slate-900">
                    ✈️ Business Trip
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-1">
                  Date &amp; Time
                </label>

                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium px-5 py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Event"}
              </button>
            </form>
          </div>

          {/* Events List / Calendar */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white text-sm">
                  📋
                </span>
                Your Events
              </h2>

              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    viewMode === "list"
                      ? "bg-white/20 text-white"
                      : "text-indigo-300 hover:text-white"
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    viewMode === "calendar"
                      ? "bg-white/20 text-white"
                      : "text-indigo-300 hover:text-white"
                  }`}
                >
                  Calendar
                </button>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                  <span className="text-3xl">📭</span>
                </div>
                <p className="text-indigo-300 text-lg">No events yet</p>
                <p className="text-indigo-400 text-sm mt-1">
                  Create your first event to get started
                </p>
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">
                            {getTypeEmoji(event.type)}
                          </span>
                          <h3 className="font-semibold text-white">
                            {event.title}
                          </h3>
                        </div>

                        <span
                          className={`inline-block text-xs px-2.5 py-1 rounded-full border ${getTypeColor(
                            event.type,
                          )}`}
                        >
                          {event.type.replace("_", " ")}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-indigo-200">
                          {formatDate(event.startTime)}
                        </div>
                        <div className="text-xs text-indigo-400">
                          {formatTime(event.startTime)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-end">
                      <button
                        onClick={() => handleDelete(event.id)}
                        disabled={deletingId === event.id}
                        className="text-sm text-rose-400 hover:text-rose-300 disabled:opacity-50 transition"
                      >
                        {deletingId === event.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {sortedDates.map((date) => (
                  <div key={date}>
                    <div className="text-sm font-medium text-indigo-300 mb-2 sticky top-0 bg-slate-900/80 py-1">
                      {date}
                    </div>
                    <div className="space-y-2">
                      {eventsByDate[date].map((event) => (
                        <div
                          key={event.id}
                          className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center"
                        >
                          <div className="flex items-center gap-2">
                            <span>{getTypeEmoji(event.type)}</span>
                            <span className="text-white text-sm font-medium">
                              {event.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-indigo-300 text-xs">
                              {formatTime(event.startTime)}
                            </span>
                            <button
                              onClick={() => handleDelete(event.id)}
                              disabled={deletingId === event.id}
                              className="text-rose-400 hover:text-rose-300 disabled:opacity-50 transition"
                            >
                              {deletingId === event.id ? "..." : "×"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 border-t border-white/10">
          <p className="text-indigo-400 text-sm">
            Powered by{" "}
            <a
              href="https://t.me/reminderOmega_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition"
            >
              @reminderOmega_bot
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
