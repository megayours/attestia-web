import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { startAuthentication } from "@simplewebauthn/browser";
import { useAuth } from "../context/AuthContext";
import { prepareSign, getSignOptions, verifySign, completeSign } from "../api";

export function SignPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<{ type: string; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!user || !user.orgId) {
    navigate("/login");
    return null;
  }

  async function handleSign() {
    if (!file) return;
    setLoading(true);

    try {
      // Phase 1: Upload & fingerprint
      setStatus({ type: "working", msg: "Extracting fingerprints... this may take a while." });
      const { content_id, merkle_root } = await prepareSign(file, description.trim());

      // Phase 2: Sign merkle root with passkey
      setStatus({ type: "working", msg: "Please authenticate to sign the content..." });
      const signOptions = await getSignOptions(merkle_root);
      const assertion = await startAuthentication({ optionsJSON: signOptions });

      // Verify the assertion server-side
      const signResult = await verifySign(assertion, signOptions.challenge);

      // Phase 3: Finalize
      setStatus({ type: "working", msg: "Finalizing registration..." });
      const result = await completeSign(content_id, assertion.response.signature, signResult.publicKey, signResult.credentialId);

      setStatus({ type: "success", msg: `Signed as ${result.ip_id}. Content ID: ${result.content_id}` });
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="header">
        <h1>Sign Content</h1>
        <p>Signing as <strong>{user.ipIdentifier}</strong></p>
      </div>

      <div className="form-container">
        <div className="field">
          <label>Media file</label>
          <div
            className={`file-pick ${file ? "has-file" : ""}`}
            onClick={() => inputRef.current?.click()}
          >
            <p>{file ? <span className="filename">{file.name}</span> : "Click to select a video or image file"}</p>
            <input
              ref={inputRef}
              type="file"
              accept=".mp4,.mkv,.avi,.mov,.webm,.png,.jpg,.jpeg,.bmp,.webp"
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files?.length) setFile(e.target.files[0]!); }}
            />
          </div>
        </div>

        <div className="field">
          <label>Description (optional)</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Episode 1 trailer" />
        </div>

        <button className="btn" disabled={!file || loading} onClick={handleSign}>
          Sign Content
        </button>

        {loading && <div className="progress-bar"><div className="fill" /></div>}

        {status && <div className={`status ${status.type}`}>{status.msg}</div>}
      </div>
    </div>
  );
}
