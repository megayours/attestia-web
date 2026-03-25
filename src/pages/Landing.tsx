import { useState, useRef, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { validateFile, validateUrl, type ValidateResult, type Match } from "../api";
import { useAuth } from "../context/AuthContext";

export function LandingPage() {
  return (
    <div className="landing">
      <Hero />
      <Problem />
      <HowItWorks />
      <UseCases />
      <TechHighlights />
      <Footer />
    </div>
  );
}

// --- Hero with inline verify ---

const IP_COLORS = ["#22c55e", "#6366f1", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

function getIpColor(ip: string, allIps: string[]): string {
  return IP_COLORS[allIps.indexOf(ip) % IP_COLORS.length]!;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function Hero() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [source, setSource] = useState("");
  const [dragover, setDragover] = useState(false);
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setResult(null);
    setSource(file.name);
    try { setResult(await validateFile(file)); }
    catch { setResult({ valid: false, matches: [], timeline: { video: [], audio: [] } }); }
    finally { setLoading(false); }
  }

  async function handleUrl() {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setSource(url.trim());
    try { setResult(await validateUrl(url.trim())); }
    catch { setResult({ valid: false, matches: [], timeline: { video: [], audio: [] } }); }
    finally { setLoading(false); }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragover(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]!);
  }

  return (
    <section className="hero">
      <div className="hero-badge">Public Registry — Verify Any Content</div>
      <h1>Cryptographic Content Authentication<br />for the AI Era</h1>
      <p className="hero-sub">
        Attestia lets anyone cryptographically sign media and verify its authenticity.
        No watermarks, no metadata, no single point of control.
      </p>

      <div className="hero-verify">
        <div
          className={`hero-drop ${dragover ? "dragover" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={onDrop}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <div>
            <p className="hero-drop-title">Verify content authenticity</p>
            <p className="hero-drop-hint">Drop a video or image here, or click to browse</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".mp4,.mkv,.avi,.mov,.webm,.png,.jpg,.jpeg,.bmp,.webp"
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.length) handleFile(e.target.files[0]!); }}
          />
        </div>

        <div className="hero-url-row">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Or paste a YouTube URL"
            onKeyDown={(e) => { if (e.key === "Enter") handleUrl(); }}
          />
          <button onClick={handleUrl} disabled={!url.trim() || loading}>
            Verify
          </button>
        </div>

        {loading && <div className="spinner" />}

        {result && (
          <div className="hero-result">
            <div className="demo-source">
              <span>Source:</span>
              <span className="mono truncate">{source}</span>
            </div>

            {(result.timeline.video.length > 0 || result.timeline.audio.length > 0) && (
              <DemoTimeline result={result} />
            )}

            {result.matches.length === 0 ? (
              <div className="demo-card demo-invalid">
                <span className="demo-badge invalid">Not Verified</span>
                <p>No matching signed content found in the registry.</p>
              </div>
            ) : (
              result.matches.map((m, i) => <DemoMatchCard key={i} match={m} />)
            )}
          </div>
        )}
      </div>

      <div className="hero-actions">
        {user?.orgId ? (
          <Link to="/upload" className="btn-outline">Sign Your Content</Link>
        ) : (
          <Link to="/login" className="btn-outline">Register as Content Creator</Link>
        )}
      </div>
    </section>
  );
}

function DemoTimeline({ result }: { result: ValidateResult }) {
  const { timeline, duration, verified_percent } = result;
  const dur = duration || 0;

  const allIps = [...new Set([
    ...timeline.video.filter(t => t.match).map(t => t.match!.ip_identifier),
    ...timeline.audio.filter(t => t.match).map(t => t.match!.ip_identifier),
  ])];

  return (
    <div className="demo-timeline">
      <div className="demo-timeline-head">
        <span>Content Timeline</span>
        <span className="dim">{verified_percent ?? 0}% verified — {formatTime(dur)}</span>
      </div>

      {timeline.video.length > 0 && (
        <>
          <div className="demo-track-label">Video</div>
          <div className="timeline-bar">
            {timeline.video.map((entry, i) => (
              <div key={i} className="timeline-segment" style={{
                flex: 1,
                background: entry.match ? getIpColor(entry.match.ip_identifier, allIps) : "#333",
                opacity: entry.match ? 1 : 0.4,
              }} title={entry.match ? `${entry.time}s — ${entry.match.ip_identifier} (${(entry.match.score * 100).toFixed(0)}%)` : `${entry.time}s — Unverified`} />
            ))}
          </div>
        </>
      )}

      {timeline.audio.length > 0 && (
        <>
          <div className="demo-track-label">Audio</div>
          <div className="timeline-bar">
            {timeline.audio.map((entry, i) => (
              <div key={i} className="timeline-segment" style={{
                flex: entry.time_end - entry.time_start,
                background: entry.match ? getIpColor(entry.match.ip_identifier, allIps) : "#333",
                opacity: entry.match ? 1 : 0.4,
              }} title={entry.match ? `${entry.time_start}s–${entry.time_end}s — ${entry.match.ip_identifier}` : `${entry.time_start}s–${entry.time_end}s — Unverified`} />
            ))}
          </div>
        </>
      )}

      <div className="timeline-labels">
        <span>0:00</span><span>{formatTime(dur)}</span>
      </div>

      {allIps.length > 0 && (
        <div className="timeline-legend">
          {allIps.map((ip) => (
            <div key={ip} className="legend-item">
              <div className="legend-color" style={{ background: getIpColor(ip, allIps) }} />
              <span>{ip}</span>
            </div>
          ))}
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#333", opacity: 0.4 }} />
            <span>Unverified</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DemoMatchCard({ match }: { match: Match }) {
  return (
    <div className="demo-card demo-valid">
      <span className="demo-badge valid">Verified</span>
      <h3>IP: {match.ip_identifier}</h3>
      <div className="demo-detail"><span>Content ID</span><span className="mono truncate">{match.content_id}</span></div>
      {match.video_frames_matched != null && (
        <div className="demo-detail"><span>Video frames</span><span>{match.video_frames_matched} matched</span></div>
      )}
      {match.audio_segments_matched != null && (
        <div className="demo-detail"><span>Audio segments</span><span>{match.audio_segments_matched} matched</span></div>
      )}
      <div className="demo-detail"><span>Merkle proof</span><span>{match.merkle_verified ? "Verified" : "—"}</span></div>
      {match.timestamp && (
        <div className="demo-detail"><span>Signed</span><span>{new Date(match.timestamp).toLocaleString()}</span></div>
      )}
    </div>
  );
}

// --- Remaining sections ---

function Problem() {
  return (
    <section className="section">
      <div className="section-label">The Problem</div>
      <h2>AI-generated content is indistinguishable from reality</h2>
      <div className="grid-3">
        <div className="grid-card">
          <div className="grid-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3>Public Trust Erosion</h3>
          <p>No reliable way to determine if a news clip, political statement, or celebrity endorsement is real or fabricated.</p>
        </div>
        <div className="grid-card">
          <div className="grid-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v-2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/>
            </svg>
          </div>
          <h3>Creator Impersonation</h3>
          <p>Artists, journalists, and influencers have no way to prove that deepfakes impersonating them are not authentic.</p>
        </div>
        <div className="grid-card">
          <div className="grid-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <h3>No Universal Standard</h3>
          <p>Existing solutions — watermarks, metadata tags, centralized databases — are fragile, proprietary, and easy to strip.</p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="section section-dark" id="how-it-works">
      <div className="section-label">How It Works</div>
      <h2>Three steps to verifiable content</h2>
      <div className="steps">
        <div className="step">
          <div className="step-num">1</div>
          <div className="step-content">
            <h3>Fingerprint</h3>
            <p>Upload your content. Attestia extracts a perceptual fingerprint using neural embeddings — a mathematical representation of what the content looks and sounds like. The original content is never modified.</p>
          </div>
        </div>
        <div className="step">
          <div className="step-num">2</div>
          <div className="step-content">
            <h3>Sign</h3>
            <p>Your device's passkey cryptographically signs the fingerprint. The private key never leaves your hardware — we can't sign on your behalf. The signature is bound to a Merkle tree of all fingerprints.</p>
          </div>
        </div>
        <div className="step">
          <div className="step-num">3</div>
          <div className="step-content">
            <h3>Verify</h3>
            <p>Anyone can check any piece of content against the registry. Even after re-uploading, compression, cropping, or screenshotting — the fingerprint survives and the match is cryptographically provable.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    { title: "AI Transparency", desc: "AI companies sign every generated output. The public can verify if content came from a known AI model." },
    { title: "Deepfake Defense", desc: "Creators register authentic work. When manipulated versions appear, the forgery is exposed instantly." },
    { title: "Media Integrity", desc: "News organizations sign published content. Fabricated articles attributed to them are debunked in seconds." },
    { title: "Content Licensing", desc: "Stock footage companies sign their library. Downstream distributors verify which segments are licensed." },
    { title: "Cross-Platform Tracking", desc: "Content spread across YouTube, TikTok, X, Instagram — verified everywhere without platform cooperation." },
    { title: "Legal Evidence", desc: "Signed Merkle roots with timestamps serve as cryptographic proof of publication date and content integrity." },
  ];

  return (
    <section className="section">
      <div className="section-label">Use Cases</div>
      <h2>Built for a world where seeing is no longer believing</h2>
      <div className="grid-2">
        {cases.map((c) => (
          <div key={c.title} className="use-card">
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TechHighlights() {
  return (
    <section className="section section-dark">
      <div className="section-label">Technology</div>
      <h2>What makes Attestia different</h2>
      <div className="grid-2">
        <div className="tech-card">
          <h3>No Content Modification</h3>
          <p>Unlike watermarks or metadata, Attestia never touches the original file. The proof is external — a signed fingerprint in a public registry. Nothing to strip, nothing to detect.</p>
        </div>
        <div className="tech-card">
          <h3>Survives Any Transformation</h3>
          <p>CLIP neural embeddings capture semantic content, not pixel data. Re-compression, cropping, screenshotting, format conversion — the fingerprint survives them all with 0.95+ cosine similarity.</p>
        </div>
        <div className="tech-card">
          <h3>Cryptographic Proof</h3>
          <p>Every fingerprint set is committed to a Merkle tree and signed with the creator's passkey. Individual frames can be proven authentic with O(log N) hash proofs — no trust required.</p>
        </div>
        <div className="tech-card">
          <h3>Decentralized by Design</h3>
          <p>Moving to on-chain Merkle root anchoring and an open indexer network. Anyone can run a verification node. No single entity controls the registry.</p>
        </div>
        <div className="tech-card">
          <h3>Per-Frame Timeline</h3>
          <p>For compilations, remixes, and clips — the system reports which frames and audio segments match which signed content. Partial matches are first-class citizens.</p>
        </div>
        <div className="tech-card">
          <h3>Open Protocol</h3>
          <p>The signing and verification protocol will be published as an open standard. Any app, platform, or browser extension can integrate without depending on a single vendor.</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">Attestia</span>
          <span className="footer-tagline">Cryptographic content authentication</span>
        </div>
        <div className="footer-links">
          <Link to="/login">Get Started</Link>
        </div>
      </div>
    </footer>
  );
}
