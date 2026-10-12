import { useEffect, useMemo, useRef, useState } from "react";

const CATEGORIES = ["Candy", "Toys", "Gift Cards", "Accessories", "Other"];
const MAX_BATCH = 30;
const MAX_LEN = 80;

let nextId = 1;
const key = (s) => s.trim().toLowerCase();

export default function App() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [draft, setDraft] = useState("");
  const [batch, setBatch] = useState([]);
  const [approved, setApproved] = useState(null);
  const [status, setStatus] = useState(null); // {kind: "ok" | "error" | "note", text}
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch("/api/ideas")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setApproved(d.items))
      .catch(() => setApproved([]));
  }, []);

  const onList = useMemo(() => new Set((approved || []).map((i) => key(i.item))), [approved]);

  function addItems(lines) {
    const seen = new Set(batch.map((b) => key(b.item)));
    const added = [];
    let skipped = 0;
    for (const raw of lines) {
      const item = raw.replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
      if (!item) continue;
      if (seen.has(key(item)) || onList.has(key(item))) { skipped++; continue; }
      if (batch.length + added.length >= MAX_BATCH) { skipped++; continue; }
      seen.add(key(item));
      added.push({ id: nextId++, item, category });
    }
    if (added.length) setBatch((b) => [...b, ...added]);
    setStatus(skipped ? { kind: "note", text: `${skipped} skipped (already on your list, already approved, or over the ${MAX_BATCH} item limit).` } : null);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addItems([draft]);
      setDraft("");
    }
  }

  function onPaste(e) {
    const text = e.clipboardData.getData("text");
    if (text.includes("\n")) {
      e.preventDefault();
      addItems(text.split("\n"));
    }
  }

  async function send() {
    const pending = draft.trim() ? [...batch, { id: nextId++, item: draft.trim().slice(0, MAX_LEN), category }] : batch;
    if (!pending.length) return;
    setSending(true);
    setStatus(null);
    try {
      for (let i = 0; i < pending.length; i += 10) {
        const chunk = pending.slice(i, i + 10).map(({ item, category }) => ({ item, category }));
        const r = await fetch("/api/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: chunk, website: "" }),
        });
        if (!r.ok) throw new Error();
      }
      setBatch([]);
      setDraft("");
      setStatus({ kind: "ok", text: `Sent ${pending.length} idea${pending.length === 1 ? "" : "s"}. They show up below once approved.` });
      inputRef.current?.focus();
    } catch {
      setStatus({ kind: "error", text: "Could not send. Your ideas are still here, try again." });
    } finally {
      setSending(false);
    }
  }

  const count = batch.length + (draft.trim() ? 1 : 0);
  const grouped = CATEGORIES.map((c) => ({ c, items: (approved || []).filter((i) => i.category === c) })).filter((g) => g.items.length);

  return (
    <main>
      <header>
        <p className="kicker">Courtyard Bozeman Bistro</p>
        <h1>ABC Prize Box</h1>
        <p className="lede">What should winners get? Add as many ideas as you want. Type one, hit Enter, type the next.</p>
      </header>

      <section className="entry">
        <div className="chips" role="radiogroup" aria-label="Category for the next items">
          {CATEGORIES.map((c) => (
            <button key={c} role="radio" aria-checked={c === category} className={c === category ? "chip on" : "chip"} onClick={() => { setCategory(c); inputRef.current?.focus(); }}>
              {c}
            </button>
          ))}
        </div>

        <input
          ref={inputRef}
          autoFocus
          value={draft}
          maxLength={MAX_LEN}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={`${category}: type an idea, press Enter`}
          aria-label="Prize idea"
          enterKeyHint="done"
        />
        <p className="tip">Tip: paste a list with one item per line to add them all at once.</p>

        {batch.length > 0 && (
          <ul className="batch">
            {batch.map((b) => (
              <li key={b.id}>
                <span className="name">{b.item}</span>
                <select value={b.category} aria-label={`Category for ${b.item}`} onChange={(e) => setBatch((all) => all.map((x) => (x.id === b.id ? { ...x, category: e.target.value } : x)))}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <button className="x" aria-label={`Remove ${b.item}`} onClick={() => setBatch((all) => all.filter((x) => x.id !== b.id))}>×</button>
              </li>
            ))}
          </ul>
        )}

        <button className="send" disabled={!count || sending} onClick={send}>
          {sending ? "Sending…" : count ? `Send ${count} idea${count === 1 ? "" : "s"}` : "Send"}
        </button>
        {status && <p className={`status ${status.kind}`} role="status">{status.text}</p>}
      </section>

      <section>
        <h2>On the list</h2>
        {approved === null && <p className="muted">Loading…</p>}
        {approved && !grouped.length && <p className="muted">Nothing approved yet. Yours could be first.</p>}
        {grouped.map(({ c, items }) => (
          <div className="group" key={c}>
            <h3>{c} <span>{items.length}</span></h3>
            <ul>{items.map((i) => <li key={i.id}>{i.item}</li>)}</ul>
          </div>
        ))}
      </section>
    </main>
  );
}
