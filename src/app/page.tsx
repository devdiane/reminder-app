"use client";

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
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchEvents() {
    try {
      const res = await fetch("/api/event/list");
      const data = await res.json();

      setEvents(data.events || []);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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
      setUserId("");

      fetchEvents();
    } catch (error) {
      console.error(error);
      alert("Failed to create event");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      setDeletingId(eventId);

      const res = await fetch(`/api/event?id=${eventId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Failed to delete event");
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
        return "bg-red-50 text-red-700";
      case "MEETING":
        return "bg-blue-50 text-blue-700";
      case "BUSINESS_TRIP":
        return "bg-green-50 text-green-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Event Reminder System
          </h1>
          <p className="text-gray-500 mt-1">
            Schedule reminders and never miss a deadline
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Create New Event
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telegram User ID
              </label>

              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-black focus:border-transparent transition"
                placeholder="Enter your Telegram user ID"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-black focus:border-transparent transition"
                placeholder="Project Submission"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-black focus:border-transparent transition"
              >
                <option value="DEADLINE">📌 Deadline</option>
                <option value="MEETING">📅 Meeting</option>
                <option value="BUSINESS_TRIP">✈️ Business Trip</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date &amp; Time
              </label>

              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-black focus:border-transparent transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-medium px-5 py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Event"}
            </button>
          </form>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Upcoming Events
            {events.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({events.length})
              </span>
            )}
          </h2>

          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">No events yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Create your first event above
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {getTypeEmoji(event.type)}
                        </span>
                        <h3 className="font-semibold text-gray-900">
                          {event.title}
                        </h3>
                      </div>

                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full ${getTypeColor(
                          event.type,
                        )}`}
                      >
                        {event.type.replace("_", " ")}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {new Date(event.startTime).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(event.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => handleDelete(event.id)}
                      disabled={deletingId === event.id}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 transition"
                    >
                      {deletingId === event.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
