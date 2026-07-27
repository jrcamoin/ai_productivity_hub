"use client";

import {
  ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, Circle,
  Clock3, FileText, Inbox, LayoutGrid, ListTodo, Menu,
  Mic2, MoreHorizontal, Paperclip, Plus, Search, Send, Settings2,
  Sparkles, StickyNote, Upload, Users, X
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Task = { id: string; title: string; meta: string; tag: string; color: string; done: boolean };
type SearchResult = { type: string; id: string; title: string; excerpt: string };

const initialTasks: Task[] = [
  { id: "demo-1", title: "Review Q3 launch brief", meta: "Today · 2:00 PM", tag: "Launch", color: "violet", done: false },
  { id: "demo-2", title: "Send design feedback to Maya", meta: "Today · 4:30 PM", tag: "Design", color: "blue", done: false },
  { id: "demo-3", title: "Prepare investor update", meta: "Tomorrow", tag: "Strategy", color: "amber", done: false },
  { id: "demo-4", title: "Book customer research calls", meta: "Friday", tag: "Research", color: "green", done: true }
];

const events = [
  { time: "10:00", period: "AM", title: "Product standup", detail: "Team sync · 25 min", color: "violet" },
  { time: "1:30", period: "PM", title: "Design critique", detail: "Studio room · 45 min", color: "blue" },
  { time: "4:00", period: "PM", title: "Jordan / Weekly 1:1", detail: "Google Meet · 30 min", color: "green" }
];

const nav = [
  [LayoutGrid, "Home", true], [Inbox, "Inbox", false], [CalendarDays, "Calendar", false],
  [ListTodo, "Tasks", false], [StickyNote, "Notes", false], [FileText, "Files", false],
  [Mic2, "Meetings", false]
] as const;

export function Dashboard() {
  const [tasks, setTasks] = useState(initialTasks);
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Good morning, Alex. I can search your workspace, draft replies, summarize documents, or help plan your day." }
  ]);
  const [input, setInput] = useState("");
  const completed = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);

  useEffect(() => {
    fetch("/api/tasks").then((response) => response.json()).then((data) => {
      if (data.tasks?.length) setTasks(data.tasks.map((task: { id: string; title: string; status: string; priority: string; dueAt: string | null }) => ({
        id: task.id, title: task.title, done: task.status === "DONE", meta: task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "No due date",
        tag: task.priority, color: task.priority === "high" ? "amber" : task.priority === "low" ? "green" : "violet"
      })));
    }).catch(() => undefined);
  }, []);

  async function toggleTask(id: string) {
    const current = tasks.find((task) => task.id === id);
    if (!current) return;
    setTasks(tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task));
    if (!id.startsWith("demo-")) await fetch(`/api/tasks/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: current.done ? "TODO" : "DONE" })
    });
  }

  async function addTask() {
    const title = window.prompt("What needs to be done?");
    if (!title?.trim()) return;
    const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    const data = await response.json();
    if (data.task) setTasks((current) => [{ id: data.task.id, title: data.task.title, done: false, meta: "No due date", tag: "medium", color: "violet" }, ...current.filter((task) => !task.id.startsWith("demo-"))]);
  }

  async function search(value: string) {
    setQuery(value);
    if (value.trim().length < 2) return setSearchResults([]);
    const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
    const data = await response.json();
    setSearchResults(data.results ?? []);
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/files", { method: "POST", body: form });
    const data = await response.json();
    setUploading(false);
    window.alert(response.ok ? `${file.name} is ready for AI search (${data.chunks} sections).` : data.error);
    event.target.value = "";
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    setMessages((current) => [...current, { role: "user", text: value }]);
    setInput("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value })
      });
      const data = await response.json();
      setMessages((current) => [...current, { role: "assistant", text: data.message }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: "I couldn't reach the assistant. Check your connection and try again." }]);
    }
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><Sparkles size={18} strokeWidth={2.4} /></span>
          <span>orbit</span>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <button className="workspace-switch">
          <span className="workspace-avatar">A</span>
          <span><b>Acme Studio</b><small>Personal workspace</small></span>
          <ChevronDown size={15} />
        </button>
        <nav className="primary-nav">
          {nav.map(([Icon, label, active]) => (
            <button className={active ? "active" : ""} key={label}><Icon size={18} /><span>{label}</span>{label === "Inbox" && <em>8</em>}</button>
          ))}
        </nav>
        <p className="nav-label">Workspace</p>
        <nav className="primary-nav compact">
          <button><Users size={18} /><span>Team</span></button>
          <button><Search size={18} /><span>Search</span><kbd>⌘ K</kbd></button>
        </nav>
        <div className="upgrade">
          <div className="upgrade-icon"><Sparkles size={18} /></div>
          <b>Unlock your full potential</b>
          <p>Get unlimited AI actions and document chat.</p>
          <button>Explore Pro <ArrowUpRight size={14} /></button>
        </div>
        <button className="profile">
          <span className="profile-avatar">AC</span>
          <span><b>Alex Chen</b><small>alex@acme.studio</small></span>
          <MoreHorizontal size={18} />
        </button>
      </aside>

      {sidebarOpen && <button className="scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <section className="content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="search-wrap">
            <div className="searchbox"><Search size={17} /><input value={query} onChange={(event) => search(event.target.value)} placeholder="Search anything..." /><kbd>⌘ K</kbd></div>
            {searchResults.length > 0 && <div className="search-results">
              {searchResults.slice(0, 8).map((result) => <button key={`${result.type}-${result.id}`}><em>{result.type}</em><b>{result.title}</b><span>{result.excerpt}</span></button>)}
            </div>}
          </div>
          <div className="top-actions">
            <button aria-label="Notifications" className="icon-button"><Bell size={19} /><i /></button>
            <button aria-label="Settings" className="icon-button"><Settings2 size={19} /></button>
            <button className="ask-button" onClick={() => setChatOpen(true)}><Sparkles size={17} />Ask Orbit</button>
          </div>
        </header>

        <div className="dashboard">
          <div className="welcome">
            <div><p>MONDAY, JULY 27</p><h1>Good morning, Alex.</h1><span>Here’s what needs your attention today.</span></div>
            <button className="quick-add"><Plus size={18} />Quick add</button>
          </div>

          <section className="briefing">
            <div className="briefing-glow" />
            <div className="ai-orb"><Sparkles size={22} /></div>
            <div className="briefing-copy">
              <p>YOUR MORNING BRIEFING</p>
              <h2>You have a focused day ahead.</h2>
              <span>3 meetings, 2 priority tasks, and one email that needs a reply before noon.</span>
              <div className="briefing-links">
                <button><Inbox size={15} />Draft the reply</button>
                <button><CalendarDays size={15} />Plan my day</button>
              </div>
            </div>
            <button className="briefing-arrow" onClick={() => setChatOpen(true)}><ArrowUpRight size={20} /></button>
          </section>

          <div className="stats-grid">
            <Stat icon={<Inbox size={18} />} label="Inbox" value="8" detail="3 need a reply" tint="coral" />
            <Stat icon={<CalendarDays size={18} />} label="Meetings" value="3" detail="Next in 42 min" tint="violet" />
            <Stat icon={<ListTodo size={18} />} label="Open tasks" value={`${tasks.length - completed}`} detail={`${completed} completed`} tint="blue" />
            <Stat icon={<FileText size={18} />} label="Documents" value="24" detail="2 added this week" tint="green" />
          </div>

          <div className="main-grid">
            <section className="card schedule-card">
              <div className="card-head">
                <div><p>TODAY</p><h3>Your schedule</h3></div>
                <button>Open calendar <ArrowUpRight size={15} /></button>
              </div>
              <div className="timeline">
                {events.map((event) => (
                  <div className="event-row" key={event.time}>
                    <div className="event-time"><b>{event.time}</b><small>{event.period}</small></div>
                    <div className={`event-line ${event.color}`} />
                    <div className="event-copy"><b>{event.title}</b><span>{event.detail}</span></div>
                    <button><MoreHorizontal size={18} /></button>
                  </div>
                ))}
              </div>
              <button className="schedule-gap"><Plus size={15} />Block focus time in your open 2:15–4:00 PM window</button>
            </section>

            <section className="card tasks-card">
              <div className="card-head">
                <div><p>PRIORITIES</p><h3>Tasks</h3></div>
                <button>View all <ArrowUpRight size={15} /></button>
              </div>
              <div className="task-list">
                {tasks.map((task) => (
                  <div className={`task-row ${task.done ? "done" : ""}`} key={task.id}>
                    <button className="task-check" onClick={() => toggleTask(task.id)}>{task.done ? <Check size={14} /> : <Circle size={17} />}</button>
                    <div><b>{task.title}</b><span><Clock3 size={12} />{task.meta}</span></div>
                    <em className={task.color}>{task.tag}</em>
                  </div>
                ))}
              </div>
              <button className="add-task" onClick={addTask}><Plus size={15} />Add task</button>
            </section>
          </div>

          <section className="card recent-card">
            <div className="card-head">
              <div><p>KEEP WORKING</p><h3>Recent</h3></div>
              <button>View all files <ArrowUpRight size={15} /></button>
            </div>
            <div className="recent-grid">
              <Recent icon={<FileText />} color="violet" title="Q3 Product Strategy" meta="Edited 18 min ago" />
              <Recent icon={<StickyNote />} color="amber" title="Homepage ideas" meta="Edited yesterday" />
              <Recent icon={<Mic2 />} color="green" title="Design review · Jul 24" meta="12 min summary" />
              <button className="upload-card" onClick={() => fileInput.current?.click()} disabled={uploading}><Upload size={20} /><b>{uploading ? "Processing..." : "Upload a file"}</b><span>PDF, DOCX, TXT</span></button>
              <input ref={fileInput} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={uploadFile} />
            </div>
          </section>
        </div>
      </section>

      <button className="floating-ai" onClick={() => setChatOpen(true)}><Sparkles size={19} /><span>Ask Orbit</span></button>

      <aside className={`chat-panel ${chatOpen ? "open" : ""}`}>
        <div className="chat-head">
          <div className="ai-orb small"><Sparkles size={17} /></div>
          <div><b>Orbit AI</b><span><i />Ready to help</span></div>
          <button onClick={() => setChatOpen(false)}><X size={19} /></button>
        </div>
        <div className="chat-context"><FileText size={15} />Searching across your workspace</div>
        <div className="messages">
          {messages.map((message, index) => (
            <div className={`message ${message.role}`} key={index}>{message.text}</div>
          ))}
        </div>
        <div className="suggestions">
          {["What should I focus on?", "Summarize recent meetings", "Draft a follow-up email"].map((text) => (
            <button key={text} onClick={() => setInput(text)}>{text}</button>
          ))}
        </div>
        <form className="chat-input" onSubmit={sendMessage}>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about anything..." rows={2} />
          <div><button type="button"><Paperclip size={18} /></button><button className="send" type="submit"><Send size={17} /></button></div>
        </form>
      </aside>
    </main>
  );
}

function Stat({ icon, label, value, detail, tint }: { icon: React.ReactNode; label: string; value: string; detail: string; tint: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tint}`}>{icon}</div><div><span>{label}</span><b>{value}</b><small>{detail}</small></div></div>;
}

function Recent({ icon, color, title, meta }: { icon: React.ReactNode; color: string; title: string; meta: string }) {
  return <button className="recent-item"><span className={`recent-icon ${color}`}>{icon}</span><span><b>{title}</b><small>{meta}</small></span><MoreHorizontal size={17} /></button>;
}
