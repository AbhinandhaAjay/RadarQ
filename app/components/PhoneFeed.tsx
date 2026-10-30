import { OVERHEARD } from "./HomeSections";
import { SOURCE_LABELS } from "@/lib/types";

// The phrase in each real post that names the pain, highlighted like a reader would.
const PAIN: Record<string, string> = {
  Bluesky: "about fifty reminders",
  "r/SmallBusinessCanada": "six to eight appointments a week",
  "r/AskAnAustralian": "ghost appointments",
};

const TABS = ["All", "Reddit", "Bluesky", "HN", "Stack Exchange"];

function Marked({ text, phrase }: { text: string; phrase?: string }) {
  const at = phrase ? text.indexOf(phrase) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{phrase}</mark>
      {text.slice(at + phrase!.length)}
    </>
  );
}

const Up = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 8h-4.5v6h-5v-6H5z" /></svg>
);
const Reply = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H9l-4 4z" /></svg>
);
const Share = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 9l5-5 5 5M5 14v5h14v-5" /></svg>
);

/** A 3D phone showing a community feed where people talk about their problems. */
export default function PhoneFeed() {
  const posts = [...OVERHEARD, ...OVERHEARD];
  return (
    <div className="phone" role="img" aria-label="A phone showing a community feed of people describing real problems">
      {[18, 14, 10, 6, 2].map((z) => (
        <span key={z} className="phone-edge" style={{ transform: `translateZ(-${z}px)` }} />
      ))}
      <div className="phone-body">
        <div className="phone-screen">
          <span className="island" />
          <div className="ps-status">
            <b>9:41</b>
            <span className="ps-icons"><i /><i /><i /></span>
          </div>
          <div className="ps-bar">
            <b>Discussions</b>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>
          </div>
          <div className="ps-tabs">
            {TABS.map((t, i) => <span key={t} className={i === 0 ? "on" : ""}>{t}</span>)}
          </div>
          <div className="ps-feed">
            <div className="ps-track">
              {posts.map((p, i) => (
                <article key={i} className="fp">
                  <div className="fp-head">
                    <span className={`fp-av ${p.source}`} />
                    <span className="fp-who">
                      <b>{p.where}</b>
                      <small>{SOURCE_LABELS[p.source]} · {p.tag}</small>
                    </span>
                  </div>
                  <p className="fp-text"><Marked text={p.text} phrase={PAIN[p.where]} /></p>
                  <div className="fp-acts"><Up /><Reply /><Share /></div>
                </article>
              ))}
            </div>
          </div>
          <span className="phone-glare" />
        </div>
      </div>
    </div>
  );
}
