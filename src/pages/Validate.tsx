import { useState, useRef, type DragEvent } from "react";
import { validateFile, validateUrl, type ValidateResult, type Match } from "../api";

export function ValidatePage() {
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
    <div className="page">
      <div className="header">
        <h1>IP Protection Validator</h1>
        <p>Verify if content is IP-signed</p>
      </div>

      <div
        className={`drop-zone ${dragover ? "dragover" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={onDrop}
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p>Drop a video or image here, or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mkv,.avi,.mov,.webm,.png,.jpg,.jpeg,.bmp,.webp"
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.length) handleFile(e.target.files[0]!); }}
        />
      </div>

      <div className="divider">or</div>

      <div className="url-input">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube URL"
          onKeyDown={(e) => { if (e.key === "Enter") handleUrl(); }}
        />
        <button className="btn-inline" onClick={handleUrl} disabled={!url.trim() || loading}>
          Validate
        </button>
      </div>

      {loading && <div className="spinner" />}

      {result && (
        <div className="result">
          <div className="result-source">
            <span className="label">Source</span>
            <span className="value truncate">{source}</span>
          </div>

          {(result.timeline.video.length > 0 || result.timeline.audio.length > 0) && (
            <Timeline result={result} />
          )}

          {result.matches.length === 0 ? (
            <div className="card invalid">
              <span className="badge">Not Verified</span>
              <h2>No matching signed content found</h2>
            </div>
          ) : (
            result.matches.map((m, i) => <MatchCard key={i} match={m} />)
          )}
        </div>
      )}
    </div>
  );
}

// --- Timeline ---

const IP_COLORS = ["#22c55e", "#6366f1", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#8b5cf6", "#14b8a6"];

function getIpColor(ip: string, allIps: string[]): string {
  return IP_COLORS[allIps.indexOf(ip) % IP_COLORS.length]!;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function Timeline({ result }: { result: ValidateResult }) {
  const { timeline, duration, verified_percent } = result;
  const dur = duration || 0;

  const allIps = [...new Set([
    ...timeline.video.filter(t => t.match).map(t => t.match!.ip_identifier),
    ...timeline.audio.filter(t => t.match).map(t => t.match!.ip_identifier),
  ])];

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <span>Content Timeline</span>
        <span className="timeline-stats">
          {verified_percent ?? 0}% verified — {formatTime(dur)}
        </span>
      </div>

      {timeline.video.length > 0 && (
        <>
          <div className="timeline-track-label">Video</div>
          <div className="timeline-bar">
            {timeline.video.map((entry, i) => (
              <div
                key={i}
                className="timeline-segment"
                style={{
                  flex: 1,
                  background: entry.match ? getIpColor(entry.match.ip_identifier, allIps) : "#333",
                  opacity: entry.match ? 1 : 0.4,
                }}
                title={
                  entry.match
                    ? `${entry.time}s — ${entry.match.ip_identifier}${entry.match.description ? ` / ${entry.match.description}` : ""} (${(entry.match.score * 100).toFixed(0)}%)${entry.match.merkle_verified ? " ✓ Merkle" : ""}`
                    : `${entry.time}s — Unverified`
                }
              />
            ))}
          </div>
        </>
      )}

      {timeline.audio.length > 0 && (
        <>
          <div className="timeline-track-label">Audio</div>
          <div className="timeline-bar">
            {timeline.audio.map((entry, i) => (
              <div
                key={i}
                className="timeline-segment"
                style={{
                  flex: entry.time_end - entry.time_start,
                  background: entry.match ? getIpColor(entry.match.ip_identifier, allIps) : "#333",
                  opacity: entry.match ? 1 : 0.4,
                }}
                title={
                  entry.match
                    ? `${entry.time_start}s–${entry.time_end}s — ${entry.match.ip_identifier} (${(entry.match.score * 100).toFixed(0)}%)${entry.match.merkle_verified ? " ✓ Merkle" : ""}`
                    : `${entry.time_start}s–${entry.time_end}s — Unverified`
                }
              />
            ))}
          </div>
        </>
      )}

      <div className="timeline-labels">
        <span>0:00</span>
        <span>{formatTime(dur)}</span>
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

// --- Match Card ---

function MatchCard({ match }: { match: Match }) {
  return (
    <div className="card valid">
      <span className="badge">Verified</span>
      <h2>IP: {match.ip_identifier}</h2>
      <div className="detail"><span className="label">Content ID</span><span className="value truncate">{match.content_id}</span></div>
      {match.video_frames_matched != null && (
        <div className="detail"><span className="label">Video frames matched</span><span className="value">{match.video_frames_matched}</span></div>
      )}
      {match.audio_segments_matched != null && (
        <div className="detail"><span className="label">Audio segments matched</span><span className="value">{match.audio_segments_matched}</span></div>
      )}
      <div className="detail"><span className="label">Merkle proof</span><span className="value">{match.merkle_verified ? "Verified" : "—"}</span></div>
      {match.timestamp && (
        <div className="detail"><span className="label">Signed</span><span className="value">{new Date(match.timestamp).toLocaleString()}</span></div>
      )}
      {match.description && (
        <div className="detail"><span className="label">Description</span><span className="value">{match.description}</span></div>
      )}
    </div>
  );
}
