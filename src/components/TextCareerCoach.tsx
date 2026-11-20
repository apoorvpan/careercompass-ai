"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type Message = { role: "user" | "assistant"; content: string };
const suggestions = ["What are my three biggest skill gaps?", "Help me improve a résumé bullet.", "What should I learn first?", "Ask me a practice interview question."];

export default function TextCareerCoach({ sessionId }: { sessionId: string }) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (messages.length) bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError("");
    try {
      // Keep the latest five turns. The server reloads the assessment on every question.
      const history = messages.slice(-10).map(message => ({ ...message, content: message.content.slice(0, 6000) }));
      while (history.reduce((sum, message) => sum + message.content.length, 0) > 32000) history.splice(0, 2);
      const response = await fetch("/api/coach/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ sessionId, question: text, history }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || typeof result?.answer !== "string") throw new Error(result?.error || "Unable to get an answer.");
      setMessages(previous => [...previous.slice(-38), { role: "user", content: text }, { role: "assistant", content: result.answer }]);
      setQuestion("");
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to get an answer.");
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }
  return <section aria-labelledby={`${id}-heading`} className="rounded-xl border border-teal-800 bg-teal-950/20 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={`${id}-heading`} className="text-xl font-semibold">Ask your AI career coach</h2>
      {messages.length > 0 && <button type="button" disabled={busy} onClick={() => { setMessages([]); setError(""); }} className="text-sm text-slate-300 underline disabled:opacity-50">Clear chat</button>}
    </div>
    <p className="mt-3 text-sm leading-6 text-slate-300">Ask about your résumé, job fit, interview preparation, or what to learn next. Answers use this saved assessment and learning plan.</p>
    <p className="mt-2 text-xs leading-5 text-slate-400">Ask questions about your saved assessment. This chat clears when you leave or reload this page.</p>
    <div className="mt-4 flex flex-wrap gap-2">{suggestions.map(suggestion => <button key={suggestion} type="button" disabled={busy} onClick={() => setQuestion(suggestion)} className="rounded-lg border border-slate-700 px-3 py-2 text-left text-xs text-slate-300 hover:border-teal-500 disabled:opacity-50">{suggestion}</button>)}</div>
    {messages.length > 0 && <div role="log" aria-label="Career coach conversation" aria-live="polite" className="mt-5 max-h-96 space-y-4 overflow-y-auto">{messages.map((message, index) => <article key={index} className={`rounded-lg p-4 ${message.role === "user" ? "bg-slate-800" : "border border-teal-900 bg-slate-950"}`}><h3 className="mb-2 text-sm font-semibold text-teal-300">{message.role === "user" ? "You" : "AI career coach"}</h3><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{message.content}</p></article>)}<div ref={bottom} /></div>}
    <form onSubmit={send} className="mt-5 space-y-3">
      <label htmlFor={`${id}-question`} className="block text-sm font-medium">Your question</label>
      <textarea id={`${id}-question`} value={question} onChange={event => setQuestion(event.target.value)} disabled={busy} required maxLength={2000} rows={3} placeholder="How can I improve my résumé for this role?" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-100" />
      <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{question.length}/2,000</span><button type="submit" disabled={busy || !question.trim()} className="rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Thinking…" : "Send question"}</button></div>
    </form>
    {busy && <p role="status" className="mt-3 text-sm text-teal-300">Your coach is preparing an answer…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </section>;
}
