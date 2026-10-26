import { useEffect, useState } from "react";
import { askAIAnalyst, fetchAIStatus } from "../api";

const SUGGESTIONS = [
  "Compare the shortest-distance and risk-aware Guwahati–Tawang routes.",
  "What are the highest-risk segments, and which factors contribute most?",
  "Summarize the latest field reports and identify what still needs review.",
];

export default function AIAnalyst() {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function newMessageId() {
    return globalThis.crypto?.randomUUID?.() || `message-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  useEffect(() => {
    fetchAIStatus().then(setStatus).catch((err) => setError(err.message));
  }, []);

  async function submitQuestion(event, suggestedQuestion, replay = null) {
    event?.preventDefault();
    const question = (suggestedQuestion || draft).trim();
    if (!question || busy || !status?.configured) return;
    const historySource = replay?.history || messages;
    const priorMessages = historySource.slice(-6).map(({ role, content }) => ({ role, content }));
    const userMessageId = replay?.userMessageId || newMessageId();
    if (!replay) {
      setMessages((current) => [...current, { id: userMessageId, role: "user", content: question }]);
      setDraft("");
    }
    setError(null);
    setBusy(true);
    try {
      const result = await askAIAnalyst(question, priorMessages);
      setMessages((current) => [
        ...current.filter((message) => message.replyTo !== userMessageId),
        {
          id: newMessageId(),
          replyTo: userMessageId,
          role: "assistant",
          content: result.answer,
          sources: result.sources,
          model: result.model,
          provider: result.provider,
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function resendQuestion(messageId) {
    const index = messages.findIndex((message) => message.id === messageId);
    const message = messages[index];
    if (!message || message.role !== "user") return;
    submitQuestion(null, message.content, {
      userMessageId: message.id,
      history: messages.slice(0, index),
    });
  }

  function deleteMessage(messageId) {
    const message = messages.find((item) => item.id === messageId);
    setMessages((current) => current.filter((item) =>
      item.id !== messageId && !(message?.role === "user" && item.replyTo === messageId)
    ));
  }

  return (
    <section className="panel ai-analyst-panel" aria-label="AI logistics analyst">
      <div className="panel-heading">
        <div><div className="eyebrow">MODEL-GROUNDED · READ ONLY</div><h2>AI logistics analyst</h2></div>
        <span className={`ai-connection ${status?.configured ? "configured" : ""}`}>{status?.configured ? `${status.provider} · ${status.model}` : "API KEY REQUIRED"}</span>
      </div>
      <p className="ai-analyst-intro">Ask about corridor routes, heuristic risk scores, historical incidents, or field reports. Answers use a bounded snapshot of project data.</p>
      {!status?.configured && <div className="ai-setup-note">Set <code>GEMINI_API_KEY</code> or <code>GROQ_API_KEY</code> on the backend to enable model responses. The keys stay server-side.</div>}
      <div className="ai-chat-transcript" aria-live="polite">
        {messages.length === 0 && <div className="ai-empty-state">Try a question below. The analyst can compare routes and summarize the current project data.</div>}
        {messages.map((message) => <article key={message.id} className={`ai-message ai-message-${message.role}`}>
          <div className="ai-message-toolbar">
            <strong>{message.role === "user" ? "You" : "Analyst"}</strong>
            <div className="ai-message-actions">
              {message.role === "user" && <button type="button" disabled={busy} onClick={() => resendQuestion(message.id)} aria-label="Resend this question">Resend</button>}
              <button type="button" disabled={busy} onClick={() => deleteMessage(message.id)} aria-label={`Delete ${message.role === "user" ? "question" : "answer"}`}>Delete</button>
            </div>
          </div>
          <p>{message.content}</p>
          {message.provider && <small className="ai-model-used">Answered by {message.provider} · {message.model}</small>}
          {message.sources?.length > 0 && <div className="ai-sources"><span>Context used:</span>{message.sources.map((source) => <small key={source}>{source}</small>)}</div>}
        </article>)}
        {busy && <div className="ai-thinking" role="status">Checking the project data and preparing an answer…</div>}
        {error && <div className="ai-error" role="alert">{error}</div>}
      </div>
      {status?.configured && messages.length === 0 && <div className="ai-suggestions">{SUGGESTIONS.map((question) => <button key={question} type="button" disabled={busy} onClick={(event) => submitQuestion(event, question)}>{question}</button>)}</div>}
      <form className="ai-chat-form" onSubmit={submitQuestion}>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1200} rows={2} placeholder="Ask a question about the current graph and reports…" aria-label="Question for the AI logistics analyst" />
        <button type="submit" disabled={!status?.configured || busy || !draft.trim()}>{busy ? "Thinking…" : "Ask analyst"}<span aria-hidden="true"> →</span></button>
      </form>
      <div className="ai-analyst-footnote">Read-only demo · route scores are heuristic · field reports and incident descriptions are sent to the configured model provider when you ask a question.</div>
    </section>
  );
}
