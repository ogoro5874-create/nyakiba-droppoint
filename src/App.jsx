import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// ── Firebase setup ────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBeO7RI6iojClImevc6U4vKzdemGI7cWkc",
  authDomain: "nyakiba-droppoint.firebaseapp.com",
  projectId: "nyakiba-droppoint",
  storageBucket: "nyakiba-droppoint.firebasestorage.app",
  messagingSenderId: "110177019073",
  appId: "1:110177019073:web:cd45745307aebd15e66040"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const storage = {
  async get(key) {
    try {
      const snap = await getDoc(doc(db, "droppoint", key));
      return snap.exists() ? snap.data().value : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      await setDoc(doc(db, "droppoint", key), { value });
    } catch(e) { console.error("Firebase write error:", e); }
  }
};

const genId = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const now = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const STATUS = {
  pre_registered: { label: "Incoming",          color: "#8B5CF6", bg: "#EDE9FE" },
  waiting:        { label: "Awaiting Pickup",    color: "#F59E0B", bg: "#FEF3C7" },
  notified:       { label: "Customer Notified",  color: "#3B82F6", bg: "#EFF6FF" },
  picked_up:      { label: "Picked Up",          color: "#10B981", bg: "#ECFDF5" },
};

const btnStyle = (bg, color, extra = {}) => ({
  background: bg, color, border: "none", borderRadius: 8, padding: "8px 16px",
  fontSize: 13, fontWeight: 600, cursor: "pointer", ...extra
});
const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
  fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#1e293b"
};
const labelStyle = {
  fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em",
  display: "block", marginBottom: 4, textTransform: "uppercase"
};

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const colors = { success: "#10b981", info: "#3b82f6", warn: "#f59e0b", error: "#ef4444" };
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "#1e293b", color: "#fff", borderRadius: 12,
      padding: "14px 20px", fontSize: 14, fontWeight: 600,
      boxShadow: "0 8px 24px rgba(0,0,0,.25)", display: "flex", alignItems: "center", gap: 10,
      borderLeft: `4px solid ${colors[type] || colors.info}`, maxWidth: 340
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 9998,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 360, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <p style={{ margin: "0 0 20px", fontSize: 15, color: "#1e293b", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={btnStyle("#f1f5f9", "#475569")}>Cancel</button>
          <button onClick={onConfirm} style={btnStyle("#ef4444", "#fff")}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Signature Pad ─────────────────────────────────────────────────────────────
function SignaturePad({ onSave, onCancel }) {
  const [drawing, setDrawing] = useState(false);
  const [ctx, setCtx] = useState(null);
  const canvasRef = (canvas) => {
    if (canvas && !ctx) {
      const c = canvas.getContext("2d");
      c.strokeStyle = "#1e293b"; c.lineWidth = 2.5; c.lineCap = "round";
      setCtx(c);
    }
  };
  const pos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return [src.clientX - r.left, src.clientY - r.top];
  };
  const start = (e) => { const c = e.currentTarget; const [x, y] = pos(e, c); ctx.beginPath(); ctx.moveTo(x, y); setDrawing(true); };
  const move = (e) => { if (!drawing) return; e.preventDefault(); const c = e.currentTarget; const [x, y] = pos(e, c); ctx.lineTo(x, y); ctx.stroke(); };
  const end = () => setDrawing(false);
  const clear = () => { if (ctx) ctx.clearRect(0, 0, 300, 120); };
  const save = () => { const canvas = document.querySelector("#sig-canvas"); onSave(canvas.toDataURL()); };
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginTop: 16 }}>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Have the customer sign below</p>
      <canvas id="sig-canvas" ref={canvasRef} width={300} height={120}
        style={{ border: "1.5px solid #cbd5e1", borderRadius: 8, display: "block", touchAction: "none", cursor: "crosshair" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={clear} style={btnStyle("#f8fafc", "#475569")}>Clear</button>
        <button onClick={onCancel} style={btnStyle("#f8fafc", "#475569")}>Cancel</button>
        <button onClick={save} style={btnStyle("#1e293b", "#fff")}>Confirm Pickup</button>
      </div>
    </div>
  );
}

// ── Barcode utilities ────────────────────────────────────────────────────────
let _jsBarcodePromise = null;
const loadJsBarcode = () => {
  if (!_jsBarcodePromise) {
    _jsBarcodePromise = new Promise((resolve) => {
      if (window.JsBarcode) return resolve(window.JsBarcode);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js";
      s.onload = () => resolve(window.JsBarcode);
      document.head.appendChild(s);
    });
  }
  return _jsBarcodePromise;
};

function BarcodeDisplay({ value, height = 60 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!value) return;
    loadJsBarcode().then(JsBarcode => {
      if (ref.current) {
        try {
          JsBarcode(ref.current, value, {
            format: "CODE128", width: 2, height,
            displayValue: true, fontSize: 13, margin: 6,
            background: "#ffffff", lineColor: "#1e293b",
          });
        } catch(e) { console.error("Barcode error:", e); }
      }
    });
  }, [value, height]);
  return <svg ref={ref} style={{ maxWidth: "100%" }} />;
}

function printPackageLabel(pkg) {
  const val = (pkg.pkgLabel || pkg.id);
  const w = window.open("", "_blank", "width=420,height=380");
  w.document.write(`<!DOCTYPE html><html><head>
    <title>Label ${val}</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
    <style>
      body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#fff;}
      .label{border:2px solid #1e293b;border-radius:8px;padding:16px;max-width:320px;margin:0 auto;text-align:center;}
      .shop{font-size:10px;letter-spacing:3px;color:#64748b;text-transform:uppercase;margin-bottom:6px;}
      .num{font-size:30px;font-weight:900;color:#1e293b;font-family:monospace;margin:4px 0;}
      .name{font-size:15px;font-weight:700;color:#1e293b;margin:6px 0 2px;}
      .sender{font-size:12px;color:#64748b;}
      .date{font-size:10px;color:#94a3b8;margin-top:6px;}
      .desc{font-size:11px;color:#94a3b8;}
      @media print{button{display:none!important;}}
    </style>
  </head><body>
    <div class="label">
      <div class="shop">DropPoint Nairobi</div>
      <div class="num">${val}</div>
      <svg id="bc"></svg>
      <div class="name">${pkg.recipientName}</div>
      ${pkg.businessName ? `<div class="sender">From: ${pkg.businessName}</div>` : ""}
      ${pkg.description ? `<div class="desc">${pkg.description}</div>` : ""}
      <div class="date">Received: ${new Date(pkg.createdAt).toLocaleDateString()}</div>
    </div>
    <br/>
    <div style="text-align:center">
      <button onclick="window.print()" style="padding:10px 28px;background:#1e293b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;">🖨️ Print Label</button>
    </div>
    <script>window.onload=function(){JsBarcode("#bc","${val}",{format:"CODE128",width:2,height:70,displayValue:false,margin:4,background:"#fff",lineColor:"#1e293b"});}<\/script>
  </body></html>`);
  w.document.close();
}

// ── helpers ───────────────────────────────────────────────────────────────────
const DEFAULT_STAFF = [{ id: "owner", username: "admin", password: "admin123", role: "admin", name: "Owner" }];

// ── Landing Screen ────────────────────────────────────────────────────────────
function LandingScreen({ onStaff, onCustomer, onBusiness }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e293b 0%, #0f4c81 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif", padding: 24 }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>📦</div>
      <div style={{ color: "#fff", fontWeight: 900, fontSize: 32, letterSpacing: "-0.03em" }}>DropPoint</div>
      <div style={{ color: "#93c5fd", fontSize: 15, marginTop: 6, marginBottom: 40 }}>Nairobi Package Pickup</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 320 }}>
        <button onClick={onCustomer} style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(37,211,102,.4)" }}>
          📲 Track My Package
        </button>
        <button onClick={onBusiness} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,.4)" }}>
          🏢 Business Portal
        </button>
        <button onClick={onStaff} style={{ background: "rgba(255,255,255,.08)", color: "#fff", border: "1.5px solid rgba(255,255,255,.2)", borderRadius: 14, padding: "16px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
          🔐 Staff Login
        </button>
      </div>
      <div style={{ color: "#475569", fontSize: 12, marginTop: 40 }}>DropPoint Nairobi · Open Mon–Sat 8am–8pm</div>
    </div>
  );
}

// ── Staff Login ───────────────────────────────────────────────────────────────
function StaffLoginScreen({ staffAccounts, onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const attempt = () => {
    const found = staffAccounts.find(a => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password);
    if (found) { setError(""); onLogin(found); }
    else setError("Incorrect username or password.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e293b 0%, #0f4c81 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#1e293b" }}>Staff Login</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>DropPoint Nairobi</div>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" autoComplete="username" />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input style={{ ...inputStyle, paddingRight: 44 }} type={showPw ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && attempt()} placeholder="Enter password" autoComplete="current-password" />
              <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14 }}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          {error && <div style={{ background: "#fef2f2", color: "#ef4444", fontSize: 13, padding: "10px 14px", borderRadius: 8, fontWeight: 600 }}>{error}</div>}
          <button onClick={attempt} style={{ background: "#1e293b", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
            Sign In
          </button>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", textAlign: "center" }}>← Back</button>
        </div>
      </div>
    </div>
  );
}

// ── Customer Login ────────────────────────────────────────────────────────────
function CustomerLoginScreen({ packages, savePackages, onBack }) {
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [customerPkgs, setCustomerPkgs] = useState([]);
  const [onMyWay, setOnMyWay] = useState({});

  const sendOtp = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) return setError("Enter a valid phone number.");
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(code);
    setError("");
    setStep("otp");
  };

  const verifyOtp = () => {
    if (otp.trim() === generatedOtp) {
      const digits = phone.replace(/\D/g, "");
      const found = packages.filter(p => (p.recipientPhone || "").replace(/\D/g, "").includes(digits.slice(-9)));
      setCustomerPkgs(found);
      setVerified(true);
      setError("");
    } else {
      setError("Incorrect code. Please try again.");
    }
  };

  const markOnMyWay = (pkg) => {
    const updated = packages.map(p => p.id === pkg.id ? { ...p, customerEta: Date.now() } : p);
    savePackages(updated);
    setOnMyWay(m => ({ ...m, [pkg.id]: true }));
  };

  const statusInfo = (p) => {
    if (p.status === "picked_up") return { icon: "✅", title: "Already Collected", desc: "This package was already picked up.", color: "#10b981", bg: "#ecfdf5" };
    return { icon: "📦", title: "Ready for Pickup", desc: "Your package is at DropPoint Nairobi. Please come collect it.", color: "#3b82f6", bg: "#eff6ff" };
  };

  if (verified) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e293b 0%, #0f4c81 100%)", fontFamily: "'Inter',system-ui,sans-serif", padding: "32px 20px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>📦</div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>DropPoint</div>
          <div style={{ color: "#93c5fd", fontSize: 13, marginTop: 4 }}>Nairobi · Your Packages</div>
        </div>
        {customerPkgs.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 32 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginTop: 8 }}>No packages found</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>No packages are registered to this number. Ask staff for help.</div>
          </div>
        ) : customerPkgs.map(p => {
          const info = statusInfo(p);
          const alreadyOnWay = onMyWay[p.id] || p.customerEta;
          return (
            <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: 22, marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,.15)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ background: info.color, color: "#fff", fontFamily: "monospace", fontWeight: 900, fontSize: 16, padding: "5px 14px", borderRadius: 8 }}>{p.pkgLabel || p.id}</span>
                <span style={{ fontSize: 28 }}>{info.icon}</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: info.color, marginBottom: 4 }}>{info.title}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>{info.desc}</div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, display: "grid", gap: 8, marginBottom: 14 }}>
                <Row label="Name" value={p.recipientName} />
                {p.businessName && <Row label="Sender" value={p.businessName} />}
                {p.description && <Row label="Item" value={p.description} />}
                <Row label="Arrived" value={fmt(p.createdAt)} />
              </div>
              {p.status !== "picked_up" && (
                <button onClick={() => !alreadyOnWay && markOnMyWay(p)}
                  style={{ width: "100%", padding: "13px", background: alreadyOnWay ? "#dcfce7" : "#1e293b", color: alreadyOnWay ? "#16a34a" : "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: alreadyOnWay ? "default" : "pointer" }}>
                  {alreadyOnWay ? "✅ Staff notified — we'll have it ready!" : "🚶 I'm On My Way"}
                </button>
              )}
            </div>
          );
        })}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "8px 20px", fontSize: 12, cursor: "pointer" }}>← Back to Home</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e293b 0%, #0f4c81 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        {step === "phone" ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📲</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#1e293b" }}>Track Your Package</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Enter the phone number used when sending your package</div>
            </div>
            <label style={labelStyle}>Phone Number</label>
            <input style={{ ...inputStyle, marginBottom: 14 }} value={phone} onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendOtp()} placeholder="07XX XXX XXX" type="tel" />
            {error && <div style={{ background: "#fef2f2", color: "#ef4444", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
            <button onClick={sendOtp} style={{ width: "100%", background: "#25D366", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Get Verification Code
            </button>
            <button onClick={onBack} style={{ width: "100%", background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", marginTop: 12 }}>← Back</button>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#1e293b" }}>Enter Your Code</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Show this screen to the staff or enter the code below</div>
            </div>
            {/* OTP display — staff reads this to customer or customer sees it */}
            <div style={{ background: "#eff6ff", border: "2px dashed #93c5fd", borderRadius: 14, padding: "18px", textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Your Verification Code</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: "#1e293b", fontFamily: "monospace", letterSpacing: 8 }}>{generatedOtp}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Valid for this session only</div>
            </div>
            <label style={labelStyle}>Enter Code</label>
            <input style={{ ...inputStyle, marginBottom: 14, textAlign: "center", fontSize: 22, fontWeight: 800, letterSpacing: 6, fontFamily: "monospace" }}
              value={otp} onChange={e => setOtp(e.target.value)} onKeyDown={e => e.key === "Enter" && verifyOtp()} placeholder="••••" maxLength={4} type="text" inputMode="numeric" />
            {error && <div style={{ background: "#fef2f2", color: "#ef4444", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
            <button onClick={verifyOtp} style={{ width: "100%", background: "#1e293b", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Verify & View Packages
            </button>
            <button onClick={() => { setStep("phone"); setOtp(""); setError(""); }} style={{ width: "100%", background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", marginTop: 12 }}>← Change number</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing"); // "landing" | "staff-login" | "customer-login" | "staff-dashboard"
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [packages, setPackages] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [staffAccounts, setStaffAccounts] = useState(DEFAULT_STAFF);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [pkgCounter, setPkgCounter] = useState(0);

  useEffect(() => {
    (async () => {
      const pkgs = await storage.get("dp-packages") || [];
      const biz = await storage.get("dp-businesses") || [];
      const counter = await storage.get("dp-counter") || 0;
      const staff = await storage.get("dp-staff") || DEFAULT_STAFF;
      setPackages(pkgs);
      setBusinesses(biz);
      setPkgCounter(counter);
      setStaffAccounts(staff);
      setLoading(false);
    })();
  }, []);

  const showToast = (message, type = "success") => setToast({ message, type });
  const showConfirm = (message, onConfirm) => setConfirm({ message, onConfirm });
  const savePackages = async (updated, newCounter) => {
    setPackages(updated);
    await storage.set("dp-packages", updated);
    if (newCounter !== undefined) { setPkgCounter(newCounter); await storage.set("dp-counter", newCounter); }
  };
  const saveBusinesses = async (updated) => { setBusinesses(updated); await storage.set("dp-businesses", updated); };
  const saveStaff = async (updated) => { setStaffAccounts(updated); await storage.set("dp-staff", updated); };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ color: "#64748b", fontSize: 15 }}>Loading…</div>
    </div>
  );

  if (screen === "landing") return <LandingScreen onStaff={() => setScreen("staff-login")} onCustomer={() => setScreen("customer-login")} onBusiness={() => setScreen("business-login")} />;
  if (screen === "business-login") return <BusinessPortal businesses={businesses} packages={packages} savePackages={savePackages} pkgCounter={pkgCounter} onBack={() => setScreen("landing")} />;
  if (screen === "staff-login") return <StaffLoginScreen staffAccounts={staffAccounts} onLogin={(user) => { setCurrentUser(user); setScreen("staff-dashboard"); }} onBack={() => setScreen("landing")} />;
  if (screen === "customer-login") return <CustomerLoginScreen packages={packages} savePackages={savePackages} onBack={() => setScreen("landing")} />;

  // Staff dashboard
  const isAdmin = currentUser?.role === "admin";

  const tabs = [
    { id: "dashboard",  label: "📊 Dashboard",    adminOnly: false },
    { id: "packages",   label: "📦 Log Package",  adminOnly: false },
    { id: "pickup",     label: "✅ Pickup",        adminOnly: false },
    { id: "businesses", label: "🏢 Businesses",   adminOnly: true  },
    { id: "payments",   label: "💵 Payments",     adminOnly: true  },
    { id: "reports",    label: "📈 Reports",      adminOnly: true  },
    { id: "staff",      label: "👥 Staff",        adminOnly: true  },
  ].filter(t => !t.adminOnly || isAdmin);

  const ctx = { packages, businesses, savePackages, saveBusinesses, showToast, showConfirm, setTab, pkgCounter, staffAccounts, saveStaff, currentUser, isAdmin };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter',system-ui,sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <div style={{ background: "#1e293b", color: "#fff", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>📦</span>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>DropPoint</span>
            <span style={{ background: "#334155", color: "#94a3b8", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Nairobi</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>👤 {currentUser?.name}</span>
            {currentUser?.role === "admin" && <span style={{ background: "#6366f1", color: "#fff", fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>ADMIN</span>}
            <button onClick={() => setScreen("customer-login")} style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Customer View</button>
            <button onClick={() => { setCurrentUser(null); setScreen("landing"); }} style={{ background: "#334155", color: "#94a3b8", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Log Out</button>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 2, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 14px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                color: tab === t.id ? "#fff" : "#94a3b8",
                borderBottom: tab === t.id ? "2px solid #3b82f6" : "2px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        {tab === "dashboard"  && <Dashboard {...ctx} />}
        {tab === "packages"   && <LogPackage {...ctx} />}
        {tab === "pickup"     && <Pickup {...ctx} />}
        {tab === "businesses" && (isAdmin ? <Businesses {...ctx} /> : <AccessDenied />)}
        {tab === "payments"   && (isAdmin ? <Payments {...ctx} /> : <AccessDenied />)}
        {tab === "reports"    && (isAdmin ? <Reports {...ctx} /> : <AccessDenied />)}
        {tab === "staff"      && (isAdmin ? <StaffManager {...ctx} /> : <AccessDenied />)}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ packages, businesses, setTab }) {
  const incoming = packages.filter(p => p.status === "pre_registered").length;
  const pending  = packages.filter(p => p.status === "pending").length;
  const waiting  = packages.filter(p => p.status === "waiting").length;
  const notified = packages.filter(p => p.status === "notified").length;
  const pickedUp = packages.filter(p => p.status === "picked_up").length;
  const unpaid   = packages.filter(p => !p.paid).length;
  const revenue  = packages.filter(p => p.paid).reduce((s, p) => s + (p.fee || 0), 0);
  const recent   = [...packages].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  const Card = ({ label, value, color, onClick }) => (
    <div onClick={onClick} style={{
      background: "#fff", borderRadius: 14, padding: "20px 22px",
      boxShadow: "0 1px 3px rgba(0,0,0,.07)", cursor: onClick ? "pointer" : "default",
      flex: 1, minWidth: 130, borderTop: `3px solid ${color}`
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-0.03em" }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Overview</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <Card label="Incoming"            value={incoming}            color="#8B5CF6" onClick={() => setTab("pickup")} />
        <Card label="Pending Drop-Off"   value={pending}             color="#8B5CF6" onClick={() => setTab("pickup")} />
        <Card label="Awaiting Pickup"    value={waiting}             color="#F59E0B" onClick={() => setTab("pickup")} />
        <Card label="Customer Notified"  value={notified}            color="#3B82F6" onClick={() => setTab("pickup")} />
        <Card label="Picked Up (total)"  value={pickedUp}            color="#10B981" />
        <Card label="Unpaid Packages"    value={unpaid}              color="#EF4444" onClick={() => setTab("payments")} />
        <Card label="Revenue Collected"  value={`KSH ${revenue.toFixed(2)}`} color="#6366F1" />
      </div>

      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Recent Packages</span>
          <button onClick={() => setTab("packages")} style={btnStyle("#f1f5f9", "#475569", { fontSize: 12 })}>+ Log Package</button>
        </div>
        {recent.length === 0 ? (
          <div style={{ padding: "36px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No packages yet — log your first one.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Pkg #", "Recipient", "Business", "Arrived", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {recent.map((p, i) => (
                <tr key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: "monospace", color: "#6366f1", fontWeight: 900 }}>{p.pkgLabel || p.id}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#1e293b", fontWeight: 600 }}>{p.recipientName}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b" }}>{p.businessName || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b" }}>{fmt(p.createdAt)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: STATUS[p.status]?.bg, color: STATUS[p.status]?.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                      {STATUS[p.status]?.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Log Package ───────────────────────────────────────────────────────────────
function LogPackage({ packages, businesses, savePackages, showToast, pkgCounter }) {
  const empty = { recipientName: "", recipientPhone: "", recipientEmail: "", businessName: "", description: "", fee: "60", notes: "" };
  const [form, setForm] = useState(empty);
  const [lastPkg, setLastPkg] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const nextNum = pkgCounter + 1;
  const fmtNum = (n) => String(n).padStart(4, "0");

  const submit = () => {
    if (!form.recipientName.trim()) return showToast("Recipient name is required.", "error");
    if (!form.recipientPhone.trim()) return showToast("Recipient phone is required.", "error");
    const pkg = {
      ...form,
      id: genId(),
      pkgNumber: nextNum,
      pkgLabel: `#${fmtNum(nextNum)}`,
      status: "waiting", paid: false,
      fee: parseFloat(form.fee) || 5,
      createdAt: Date.now(), createdDate: today(), createdTime: now(),
      signature: null, pickedUpAt: null,
    };
    savePackages([pkg, ...packages], nextNum);
    setLastPkg(pkg);
    setForm(empty);
    showToast(`Package ${pkg.pkgLabel} logged for ${pkg.recipientName}`, "success");
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Log Incoming Package</h2>

      <div style={{ background: "#1e293b", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ background: "#3b82f6", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 26, fontWeight: 900, fontFamily: "monospace", letterSpacing: 2 }}>
          #{fmtNum(nextNum)}
        </div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Next Package Number</div>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>Write this on the package label when it arrives</div>
        </div>
      </div>

      {lastPkg && (
        <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#065f46", fontSize: 14 }}>
                Package <span style={{ fontFamily: "monospace", fontSize: 16 }}>{lastPkg.pkgLabel}</span> logged for {lastPkg.recipientName}
              </div>
              <div style={{ color: "#047857", fontSize: 13 }}>Print the label below and stick it on the package.</div>
            </div>
            <button onClick={() => setLastPkg(null)} style={btnStyle("#fff", "#065f46", { border: "1px solid #6ee7b7" })}>Dismiss</button>
          </div>
          <div style={{ background: "#fff", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <BarcodeDisplay value={lastPkg.pkgLabel} height={55} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#1e293b", fontFamily: "monospace" }}>{lastPkg.pkgLabel}</div>
              <div style={{ fontSize: 14, color: "#475569", marginTop: 2 }}>{lastPkg.recipientName}</div>
              {lastPkg.businessName && <div style={{ fontSize: 13, color: "#94a3b8" }}>From: {lastPkg.businessName}</div>}
            </div>
            <button onClick={() => printPackageLabel(lastPkg)} style={btnStyle("#1e293b", "#fff", { fontSize: 13, padding: "10px 18px" })}>
              🖨️ Print Label
            </button>
          </div>
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Recipient Name *</label>
            <input style={inputStyle} value={form.recipientName} onChange={e => set("recipientName", e.target.value)} placeholder="Jane Smith" />
          </div>
          <div>
            <label style={labelStyle}>Recipient Phone *</label>
            <input style={inputStyle} value={form.recipientPhone} onChange={e => set("recipientPhone", e.target.value)} placeholder="(203) 555-0100" />
          </div>
          <div>
            <label style={labelStyle}>Recipient Email</label>
            <input style={inputStyle} value={form.recipientEmail} onChange={e => set("recipientEmail", e.target.value)} placeholder="jane@email.com" />
          </div>
          <div>
            <label style={labelStyle}>Sender / Business</label>
            <input style={inputStyle} list="biz-list" value={form.businessName} onChange={e => set("businessName", e.target.value)} placeholder="Amazon, UPS, FedEx…" />
            <datalist id="biz-list">{businesses.map(b => <option key={b.id} value={b.name} />)}</datalist>
          </div>


          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Package Description</label>
            <input style={inputStyle} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Small brown box, fragile label…" />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Internal Notes</label>
            <input style={inputStyle} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Anything to remember about this package" />
          </div>
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <button onClick={submit} style={btnStyle("#1e293b", "#fff", { padding: "10px 24px", fontSize: 14 })}>Log Package</button>
          <button onClick={() => setForm(empty)} style={btnStyle("#f1f5f9", "#475569", { padding: "10px 24px", fontSize: 14 })}>Clear</button>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)", marginTop: 24, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>All Packages ({packages.length})</span>
        </div>
        {packages.length === 0 ? (
          <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No packages logged yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                {["Pkg #", "Recipient", "Sender", "Arrived", "Fee", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {packages.map((p, i) => (
                  <tr key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "monospace", color: "#6366f1", fontWeight: 900 }}>{p.pkgLabel || p.id}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "#1e293b" }}>{p.recipientName}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{p.businessName || "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{fmt(p.createdAt)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "#1e293b", fontWeight: 600 }}>KSH {(p.fee || 0).toFixed(2)}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ background: STATUS[p.status]?.bg, color: STATUS[p.status]?.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                        {STATUS[p.status]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pickup ────────────────────────────────────────────────────────────────────
function Pickup({ packages, savePackages, showToast }) {
  const [search, setSearch] = useState("");
  const [sigFor, setSigFor] = useState(null);
  const [msgEdit, setMsgEdit] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [highlightId, setHighlightId] = useState(null);

  const handleScanFound = (pkg) => {
    setShowScanner(false);
    setSearch("");
    setHighlightId(pkg.id);
    setTimeout(() => {
      const el = document.getElementById("pkg-" + pkg.id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    showToast(`Found: ${pkg.pkgLabel || pkg.id} — ${pkg.recipientName}`, "success");
  };

  const active = packages.filter(p =>
    p.status !== "picked_up" &&
    (p.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      (p.pkgLabel || p.id).toLowerCase().includes(search.toLowerCase()) ||
      (p.recipientPhone || "").includes(search))
  );

  const confirmArrival = (pkg) => {
    const updated = packages.map(p => p.id === pkg.id ? { ...p, status: "waiting", arrivedAt: Date.now() } : p);
    savePackages(updated);
    showToast(`Package ${pkg.pkgLabel || pkg.id} confirmed as arrived ✓`, "success");
  };

  // Format phone for Kenya: strip leading 0, add 254
  const fmtPhone = (phone) => {
    const digits = (phone || "").replace(/\D/g, "");
    if (digits.startsWith("254")) return digits;
    if (digits.startsWith("0")) return "254" + digits.slice(1);
    return "254" + digits;
  };

  const defaultMsg = (pkg) => {
    const deliveryDate = new Date(pkg.createdAt).toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    return `Hello ${pkg.recipientName}, your package ${pkg.pkgLabel || ""}${pkg.businessName ? " from " + pkg.businessName : ""} was delivered to our location on ${deliveryDate} and is ready for pickup.\n\n📍 Nyakiba DropPoint\nBank House, 5th Floor, Shop No. 22\nNairobi\n\nPlease collect it at your earliest convenience. Thank you!`;
  };

  const openSMS = (pkg) => {
    const phone = fmtPhone(pkg.recipientPhone);
    const text = encodeURIComponent(defaultMsg(pkg));
    window.open(`sms:+${phone}?body=${text}`, "_blank");
    const updated = packages.map(p => p.id === pkg.id ? { ...p, status: "notified", notifiedAt: Date.now(), notifiedVia: "sms" } : p);
    savePackages(updated);
    showToast(`SMS opened for ${pkg.recipientName}`, "info");
  };

  const openWhatsApp = (pkg, customText) => {
    const phone = fmtPhone(pkg.recipientPhone);
    const text = encodeURIComponent(customText || defaultMsg(pkg));
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
    // Mark as notified
    const updated = packages.map(p => p.id === pkg.id ? { ...p, status: "notified", notifiedAt: Date.now(), notifiedVia: "whatsapp" } : p);
    savePackages(updated);
    showToast(`WhatsApp opened for ${pkg.recipientName}`, "success");
    setMsgEdit(null);
  };

  const confirmPickup = (pkgId, sig) => {
    const updated = packages.map(p => p.id === pkgId ? { ...p, status: "picked_up", signature: sig, pickedUpAt: Date.now() } : p);
    savePackages(updated);
    setSigFor(null);
    showToast("Package marked as picked up ✓", "success");
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Pickup Station</h2>
        <button onClick={() => setShowScanner(v => !v)}
          style={btnStyle(showScanner ? "#1e293b" : "#f1f5f9", showScanner ? "#fff" : "#475569", { fontSize: 13 })}>
          {showScanner ? "✕ Close Scanner" : "📷 Scan Barcode"}
        </button>
      </div>

      {showScanner && <BarcodeScanner packages={packages} onFound={handleScanFound} onClose={() => setShowScanner(false)} />}

      <input style={{ ...inputStyle, marginBottom: 20, maxWidth: 360 }} value={search}
        onChange={e => setSearch(e.target.value)} placeholder="Search by name, #number, or phone…" />

      {active.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          {search ? "No matching packages found." : "All packages have been picked up! 🎉"}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {active.map(p => (
            <div id={"pkg-" + p.id} key={p.id} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: highlightId === p.id ? `0 0 0 3px ${STATUS[p.status]?.color}` : "0 1px 3px rgba(0,0,0,.07)", borderLeft: `4px solid ${STATUS[p.status]?.color}`, transition: "box-shadow 0.3s" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 18, color: "#6366f1", fontWeight: 900 }}>{p.pkgLabel || p.id}</span>
                    <span style={{ background: STATUS[p.status]?.bg, color: STATUS[p.status]?.color, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>
                      {STATUS[p.status]?.label}
                    </span>
                    {p.notifiedVia === "whatsapp" && (
                      <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>via WhatsApp</span>
                    )}
                    {p.notifiedVia === "sms" && (
                      <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>via SMS</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>{p.recipientName}</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{p.recipientPhone}{p.recipientEmail ? ` · ${p.recipientEmail}` : ""}</div>
                  {p.businessName && <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>From: {p.businessName}</div>}
                  {p.description && <div style={{ fontSize: 13, color: "#94a3b8" }}>📦 {p.description}</div>}
                  <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>Logged {fmt(p.createdAt)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {p.status === "pending" && (
                    <button onClick={() => confirmArrival(p)}
                      style={btnStyle("#8B5CF6", "#fff", { fontSize: 13 })}>
                      📦 Confirm Arrival
                    </button>
                  )}
                  {(p.status === "waiting" || p.status === "notified") && (
                    <button
                      onClick={() => setMsgEdit(msgEdit?.pkgId === p.id ? null : { pkgId: p.id, text: defaultMsg(p) })}
                      style={btnStyle("#25D366", "#fff", { fontSize: 13, display: "flex", alignItems: "center", gap: 6 })}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.558 4.112 1.528 5.837L.057 23.882a.5.5 0 0 0 .606.63l6.337-1.638A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.523-5.183-1.434l-.362-.216-3.754.97.998-3.645-.236-.376A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                      {p.status === "notified" ? "Re-notify" : "WhatsApp"}
                    </button>
                    <button onClick={() => openSMS(p)}
                      style={btnStyle("#0ea5e9", "#fff", { fontSize: 13, display: "flex", alignItems: "center", gap: 6 })}>
                      💬 SMS
                    </button>
                  )}
                  <button onClick={() => setSigFor(sigFor?.id === p.id ? null : p)} style={btnStyle("#1e293b", "#fff", { fontSize: 13 })}>
                    ✅ Mark Picked Up
                  </button>
                </div>
              </div>

              {/* WhatsApp message editor */}
              {msgEdit?.pkgId === p.id && (
                <div style={{ marginTop: 16, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    WhatsApp Message — {p.recipientPhone}
                  </div>
                  <textarea
                    value={msgEdit.text}
                    onChange={e => setMsgEdit(m => ({ ...m, text: e.target.value }))}
                    rows={4}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #86efac", fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", outline: "none", color: "#1e293b", background: "#fff" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button onClick={() => openWhatsApp(p, msgEdit.text)}
                      style={btnStyle("#25D366", "#fff", { fontSize: 13, display: "flex", alignItems: "center", gap: 6 })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.558 4.112 1.528 5.837L.057 23.882a.5.5 0 0 0 .606.63l6.337-1.638A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.523-5.183-1.434l-.362-.216-3.754.97.998-3.645-.236-.376A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                      Open in WhatsApp
                    </button>
                    <button onClick={() => setMsgEdit(m => ({ ...m, text: defaultMsg(p) }))}
                      style={btnStyle("#f0fdf4", "#15803d", { fontSize: 12, border: "1px solid #86efac" })}>Reset message</button>
                    <button onClick={() => setMsgEdit(null)} style={btnStyle("#f1f5f9", "#475569", { fontSize: 12 })}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Barcode strip */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <BarcodeDisplay value={p.pkgLabel || p.id} height={40} />
                <button onClick={() => printPackageLabel(p)} style={btnStyle("#f8fafc", "#475569", { fontSize: 12 })}>🖨️ Print Label</button>
              </div>

              {sigFor?.id === p.id && (
                <SignaturePad onSave={(sig) => confirmPickup(p.id, sig)} onCancel={() => setSigFor(null)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Businesses ────────────────────────────────────────────────────────────────
function Businesses({ businesses, saveBusinesses, showToast, showConfirm }) {
  const empty = { name: "", contactName: "", phone: "", email: "", notes: "" };
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  const add = () => {
    if (!form.name.trim()) return showToast("Business name is required.", "error");
    const accessCode = genCode();
    saveBusinesses([{ ...form, id: genId(), accessCode, createdAt: Date.now() }, ...businesses]);
    setForm(empty);
    showToast(`${form.name} added — access code generated`, "success");
  };

  const remove = (id, name) => {
    showConfirm(`Remove "${name}" from your business accounts?`, () => {
      saveBusinesses(businesses.filter(b => b.id !== id));
      showToast(`${name} removed`, "warn");
    });
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Business Accounts</h2>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.07)", marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Add Business</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Business Name *</label>
            <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Acme Corp" />
          </div>
          <div>
            <label style={labelStyle}>Contact Person</label>
            <input style={inputStyle} value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="John Doe" />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(203) 555-0100" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={form.email} onChange={e => set("email", e.target.value)} placeholder="contact@acme.com" />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Notes</label>
            <input style={inputStyle} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Drop-off schedule, special instructions…" />
          </div>
        </div>
        <button onClick={add} style={{ ...btnStyle("#1e293b", "#fff", { padding: "10px 22px", fontSize: 14 }), marginTop: 16 }}>Add Business</button>
      </div>

      {businesses.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: "36px", textAlign: "center", color: "#94a3b8", fontSize: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          No businesses added yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {businesses.map(b => (
            <div key={b.id} style={{ background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,.07)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{b.name}</div>
                {b.contactName && <div style={{ fontSize: 13, color: "#64748b" }}>{b.contactName}</div>}
                <div style={{ fontSize: 13, color: "#94a3b8" }}>{b.phone}{b.email ? ` · ${b.email}` : ""}</div>
                {b.notes && <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>{b.notes}</div>}
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>ACCESS CODE:</span>
                  <span style={{ background: "#ede9fe", color: "#6366f1", fontFamily: "monospace", fontWeight: 900, fontSize: 14, padding: "2px 10px", borderRadius: 6, letterSpacing: 2 }}>
                    {b.accessCode || "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Share with business owner</span>
                </div>
              </div>
              <button onClick={() => remove(b.id, b.name)} style={btnStyle("#fef2f2", "#ef4444", { fontSize: 12 })}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Payments ──────────────────────────────────────────────────────────────────
function Payments({ packages, savePackages, showToast, showConfirm }) {
  const unpaid = packages.filter(p => !p.paid);
  const paid   = packages.filter(p => p.paid);
  const totalOwed      = unpaid.reduce((s, p) => s + (p.fee || 0), 0);
  const totalCollected = paid.reduce((s, p) => s + (p.fee || 0), 0);

  const markPaid = (id, method = "cash") => {
    savePackages(packages.map(p => p.id === id ? { ...p, paid: true, paidAt: Date.now(), paymentMethod: method } : p));
    showToast(`Payment recorded via ${method === "mpesa" ? "M-Pesa" : "Cash"} ✓`, "success");
  };

  const [mpesaConfirm, setMpesaConfirm] = useState(null); // pkg being confirmed via mpesa
  const [mpesaCode, setMpesaCode] = useState("");

  const confirmMpesa = () => {
    if (!mpesaCode.trim()) return showToast("Enter the M-Pesa confirmation code", "error");
    savePackages(packages.map(p => p.id === mpesaConfirm.id ? { ...p, paid: true, paidAt: Date.now(), paymentMethod: "mpesa", mpesaCode: mpesaCode.trim().toUpperCase() } : p));
    showToast(`M-Pesa payment confirmed ✓`, "success");
    setMpesaConfirm(null);
    setMpesaCode("");
  };

  const markAllPaid = () => {
    showConfirm(`Mark all ${unpaid.length} packages as paid by business (KSH ${totalOwed.toFixed(2)})?`, () => {
      savePackages(packages.map(p => !p.paid ? { ...p, paid: true, paidAt: Date.now() } : p));
      showToast(`${unpaid.length} packages marked as paid`, "success");
    });
  };

  const SummaryCard = ({ label, value, color, bg }) => (
    <div style={{ background: bg, borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color, opacity: 0.8, marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Business Payments</h2>

      {/* M-Pesa confirmation modal */}
      {mpesaConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 360, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#1e293b" }}>Confirm M-Pesa Payment</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Package {mpesaConfirm.pkgLabel || mpesaConfirm.id} · KSH {(mpesaConfirm.fee || 60).toFixed(2)}</div>
              <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 600, marginTop: 2 }}>{mpesaConfirm.recipientName}</div>
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: "#15803d" }}>
              <strong>Instructions:</strong> Ask the business to send KSH {(mpesaConfirm.fee || 60).toFixed(2)} to your M-Pesa Till, then enter the confirmation code they receive.
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", display: "block", marginBottom: 6, textTransform: "uppercase" }}>M-Pesa Confirmation Code</label>
            <input
              value={mpesaCode}
              onChange={e => setMpesaCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && confirmMpesa()}
              placeholder="e.g. QK7X2Y3Z8A"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 15, fontFamily: "monospace", fontWeight: 700, outline: "none", boxSizing: "border-box", color: "#1e293b", letterSpacing: 2, marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setMpesaConfirm(null)} style={{ flex: 1, background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "11px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmMpesa} style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontWeight: 700, cursor: "pointer" }}>Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <SummaryCard label="Pending Collection" value={`KSH ${totalOwed.toFixed(2)}`}      color="#ef4444" bg="#fef2f2" />
        <SummaryCard label="Total Collected"    value={`KSH ${totalCollected.toFixed(2)}`} color="#10b981" bg="#ecfdf5" />
        <SummaryCard label="Unpaid Packages"    value={unpaid.length}                   color="#f59e0b" bg="#fef3c7" />
      </div>

      {unpaid.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Businesses Owing</span>
            <button onClick={markAllPaid} style={btnStyle("#1e293b", "#fff", { fontSize: 12 })}>Mark All Paid</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Pkg #", "Recipient", "Business", "Date", "Fee", "Action"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {unpaid.map((p, i) => (
                <tr key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                  <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 13, color: "#6366f1", fontWeight: 900 }}>{p.pkgLabel || p.id}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#1e293b" }}>{p.recipientName}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{p.businessName || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{fmt(p.createdAt)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>KSH {(p.fee || 0).toFixed(2)}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => markPaid(p.id, "cash")} style={btnStyle("#ecfdf5", "#10b981", { fontSize: 11 })}>💵 Cash</button>
                      <button onClick={() => { setMpesaConfirm(p); setMpesaCode(""); }} style={btnStyle("#e8f5e9", "#1b5e20", { fontSize: 11, fontWeight: 700 })}>📱 M-Pesa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paid.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Collected from Businesses ({paid.length})</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Pkg #", "Recipient", "Date", "Fee"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {paid.map((p, i) => (
                <tr key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                  <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 13, color: "#6366f1", fontWeight: 900 }}>{p.pkgLabel || p.id}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#1e293b" }}>{p.recipientName}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{fmt(p.createdAt)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 14, fontWeight: 700, color: "#10b981" }}>KSH {(p.fee || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────
function Reports({ packages }) {
  const total    = packages.length;
  const waiting  = packages.filter(p => p.status === "waiting").length;
  const notified = packages.filter(p => p.status === "notified").length;
  const pickedUp = packages.filter(p => p.status === "picked_up").length;
  const revenue  = packages.filter(p => p.paid).reduce((s, p) => s + (p.fee || 0), 0);
  const pending  = packages.filter(p => !p.paid).reduce((s, p) => s + (p.fee || 0), 0);

  const byBiz = {};
  packages.forEach(p => { const k = p.businessName || "Unknown"; byBiz[k] = (byBiz[k] || 0) + 1; });
  const bizRanking = Object.entries(byBiz).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const dayMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dayMap[fmt(d)] = 0;
  }
  packages.forEach(p => { const d = fmt(p.createdAt); if (d in dayMap) dayMap[d]++; });
  const maxDay = Math.max(...Object.values(dayMap), 1);

  const Stat = ({ label, value }) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#1e293b" }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Reports</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
        <Stat label="Total Packages"    value={total} />
        <Stat label="Awaiting Pickup"   value={waiting} />
        <Stat label="Notified"          value={notified} />
        <Stat label="Picked Up"         value={pickedUp} />
        <Stat label="Revenue Collected" value={`KSH ${revenue.toFixed(2)}`} />
        <Stat label="Pending Revenue"   value={`KSH ${pending.toFixed(2)}`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Packages — Last 7 Days</h3>
          {Object.entries(dayMap).map(([day, count]) => (
            <div key={day} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 72, fontSize: 12, color: "#64748b", flexShrink: 0 }}>{day}</div>
              <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 18 }}>
                <div style={{ width: `${(count / maxDay) * 100}%`, background: "#6366f1", borderRadius: 4, height: "100%", minWidth: count > 0 ? 8 : 0 }} />
              </div>
              <div style={{ width: 20, fontSize: 13, fontWeight: 700, color: "#1e293b", textAlign: "right" }}>{count}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Top Senders</h3>
          {bizRanking.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 14 }}>No data yet.</div>
          ) : bizRanking.map(([name, count]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 100, fontSize: 13, color: "#1e293b", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
              <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 18 }}>
                <div style={{ width: `${(count / bizRanking[0][1]) * 100}%`, background: "#3b82f6", borderRadius: 4, height: "100%", minWidth: 8 }} />
              </div>
              <div style={{ width: 28, fontSize: 13, fontWeight: 700, color: "#1e293b", textAlign: "right" }}>{count}</div>
            </div>
          ))}
        </div>
      </div>

      {total > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Pickup Rate</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 8, height: 24 }}>
              <div style={{ width: `${(pickedUp / total) * 100}%`, background: "#10b981", borderRadius: 8, height: "100%" }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#10b981" }}>{((pickedUp / total) * 100).toFixed(0)}%</div>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{pickedUp} of {total} packages picked up</div>
        </div>
      )}
    </div>
  );
}

// ── Customer View ─────────────────────────────────────────────────────────────
function CustomerView({ packages, savePackages, onStaffMode }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [onMyWay, setOnMyWay] = useState({});

  const search = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const found = packages.filter(p =>
      (p.recipientPhone || "").replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
      (p.pkgLabel || "").toLowerCase().includes(q) ||
      p.recipientName.toLowerCase().includes(q)
    );
    setResults(found);
  };

  const markOnMyWay = (pkg) => {
    const updated = packages.map(p =>
      p.id === pkg.id ? { ...p, customerEta: Date.now() } : p
    );
    savePackages(updated);
    setOnMyWay(m => ({ ...m, [pkg.id]: true }));
  };

  const statusInfo = (p) => {
    if (p.status === "picked_up") return { icon: "✅", title: "Picked Up", desc: "This package has already been collected.", color: "#10b981", bg: "#ecfdf5" };
    if (p.status === "notified" || p.status === "waiting") return { icon: "📦", title: "Ready for Pickup", desc: "Your package is at DropPoint Nairobi and ready to collect.", color: "#3b82f6", bg: "#eff6ff" };
    return { icon: "⏳", title: "In Transit", desc: "We haven't received this package yet.", color: "#f59e0b", bg: "#fef3c7" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e293b 0%, #0f4c81 100%)", fontFamily: "'Inter',system-ui,sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "32px 24px 0", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>📦</div>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 28, letterSpacing: "-0.03em" }}>DropPoint</div>
        <div style={{ color: "#93c5fd", fontSize: 14, marginTop: 4, fontWeight: 500 }}>Nairobi Package Pickup</div>
      </div>

      {/* Search card */}
      <div style={{ maxWidth: 480, width: "100%", margin: "32px auto 0", padding: "0 20px", boxSizing: "border-box" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#1e293b", marginBottom: 6 }}>Track Your Package</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Enter your phone number, name, or package number</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 15, fontFamily: "inherit", outline: "none", color: "#1e293b", boxSizing: "border-box" } }}
              value={query}
              onChange={e => { setQuery(e.target.value); setResults(null); }}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="0712 345 678 or #0001"
            />
            <button onClick={search}
              style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
              Search
            </button>
          </div>

          {/* Results */}
          {results !== null && (
            <div style={{ marginTop: 20 }}>
              {results.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>No packages found</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Try your phone number or ask the staff for help</div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {results.map(p => {
                    const info = statusInfo(p);
                    const alreadyOnWay = onMyWay[p.id] || p.customerEta;
                    return (
                      <div key={p.id} style={{ background: info.bg, borderRadius: 14, padding: 18, border: `1.5px solid ${info.color}33` }}>
                        {/* Package number badge */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <span style={{ background: info.color, color: "#fff", fontFamily: "monospace", fontWeight: 900, fontSize: 15, padding: "4px 12px", borderRadius: 8 }}>
                            {p.pkgLabel || p.id}
                          </span>
                          <span style={{ fontSize: 24 }}>{info.icon}</span>
                        </div>

                        {/* Status */}
                        <div style={{ fontWeight: 800, fontSize: 16, color: info.color, marginBottom: 4 }}>{info.title}</div>
                        <div style={{ fontSize: 13, color: "#475569", marginBottom: 12, lineHeight: 1.5 }}>{info.desc}</div>

                        {/* Details */}
                        <div style={{ background: "#fff", borderRadius: 10, padding: 14, display: "grid", gap: 8 }}>
                          <Row label="Name" value={p.recipientName} />
                          {p.businessName && <Row label="Sender" value={p.businessName} />}
                          {p.description && <Row label="Package" value={p.description} />}
                          <Row label="Arrived" value={fmt(p.createdAt)} />
                          {p.status === "picked_up" && p.pickedUpAt && <Row label="Collected" value={fmt(p.pickedUpAt)} />}
                        </div>

                        {/* On my way button */}
                        {p.status !== "picked_up" && (
                          <button
                            onClick={() => !alreadyOnWay && markOnMyWay(p)}
                            style={{
                              width: "100%", marginTop: 14, padding: "12px",
                              background: alreadyOnWay ? "#dcfce7" : "#1e293b",
                              color: alreadyOnWay ? "#16a34a" : "#fff",
                              border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14,
                              cursor: alreadyOnWay ? "default" : "pointer",
                            }}>
                            {alreadyOnWay ? "✅ Staff has been notified you're on the way!" : "🚶 I'm On My Way"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shop info */}
        <div style={{ textAlign: "center", marginTop: 24, paddingBottom: 32 }}>
          <div style={{ color: "#93c5fd", fontSize: 13, fontWeight: 600 }}>📍 DropPoint Nairobi</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Open Mon–Sat · 8am – 8pm</div>
        </div>
      </div>

      {/* Hidden staff button — small and discreet at bottom */}
      <div style={{ textAlign: "center", paddingBottom: 20 }}>
        <button onClick={onStaffMode}
          style={{ background: "none", border: "1px solid #334155", color: "#475569", borderRadius: 8, padding: "6px 16px", fontSize: 11, cursor: "pointer" }}>
          Staff Login
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ── Staff Manager (Admin only) ────────────────────────────────────────────────
function StaffManager({ staffAccounts, saveStaff, showToast, showConfirm, currentUser }) {
  const empty = { name: "", username: "", password: "", role: "staff" };
  const [form, setForm] = useState(empty);
  const [showPw, setShowPw] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const add = () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return showToast("All fields are required.", "error");
    if (staffAccounts.find(a => a.username.toLowerCase() === form.username.toLowerCase())) return showToast("Username already taken.", "error");
    const newStaff = { id: genId(), name: form.name, username: form.username, password: form.password, role: form.role };
    saveStaff([...staffAccounts, newStaff]);
    setForm(empty);
    showToast(`${form.name} added as ${form.role}`, "success");
  };

  const remove = (acc) => {
    if (acc.id === currentUser.id) return showToast("You can't remove yourself.", "error");
    showConfirm(`Remove ${acc.name} (${acc.username})?`, () => {
      saveStaff(staffAccounts.filter(a => a.id !== acc.id));
      showToast(`${acc.name} removed`, "warn");
    });
  };

  const roleColors = { admin: { bg: "#ede9fe", color: "#7c3aed" }, staff: { bg: "#eff6ff", color: "#3b82f6" } };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Staff Accounts</h2>

      {/* Add staff form */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.07)", marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Add Staff Member</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Jane Wanjiku" />
          </div>
          <div>
            <label style={labelStyle}>Username *</label>
            <input style={inputStyle} value={form.username} onChange={e => set("username", e.target.value)} placeholder="jane.w" />
          </div>
          <div>
            <label style={labelStyle}>Password *</label>
            <div style={{ position: "relative" }}>
              <input style={{ ...inputStyle, paddingRight: 44 }} type={showPw ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Choose a password" />
              <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13 }}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Role *</label>
            <select style={{ ...inputStyle, background: "#fff" }} value={form.role} onChange={e => set("role", e.target.value)}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button onClick={add} style={{ ...{ background: "#1e293b", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }, marginTop: 16 }}>
          Add Staff Member
        </button>
      </div>

      {/* Staff list */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>All Staff ({staffAccounts.length})</span>
        </div>
        {staffAccounts.map((acc, i) => (
          <div key={acc.id} style={{ padding: "16px 20px", borderTop: i === 0 ? "none" : "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                {acc.name[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                  {acc.name}
                  {acc.id === currentUser.id && <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>(you)</span>}
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>@{acc.username}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: roleColors[acc.role]?.bg, color: roleColors[acc.role]?.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" }}>
                {acc.role}
              </span>
              {acc.id !== currentUser.id && (
                <button onClick={() => remove(acc)} style={{ background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
        💡 Default admin login: username <strong>admin</strong> · password <strong>admin123</strong> — change this after your first login.
      </div>
    </div>
  );
}

// ── Business Portal ───────────────────────────────────────────────────────────
function BusinessPortal({ businesses, packages, onBack }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [bizAccount, setBizAccount] = useState(null);

  const login = () => {
    const found = businesses.find(b => (b.accessCode || "").toUpperCase() === code.trim().toUpperCase());
    if (found) { setBizAccount(found); setError(""); }
    else setError("Invalid access code. Please check with DropPoint staff.");
  };

  if (!bizAccount) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e293b 0%, #0f4c81 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏢</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#1e293b" }}>Business Portal</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Enter your unique access code to track your packages</div>
        </div>
        <label style={labelStyle}>Access Code</label>
        <input
          style={{ ...inputStyle, textAlign: "center", fontSize: 22, fontWeight: 900, fontFamily: "monospace", letterSpacing: 6, marginBottom: 14, textTransform: "uppercase" }}
          value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && login()}
          placeholder="XXXXXX" maxLength={6}
        />
        {error && <div style={{ background: "#fef2f2", color: "#ef4444", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
        <button onClick={login} style={{ width: "100%", background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Access My Dashboard
        </button>
        <button onClick={onBack} style={{ width: "100%", background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", marginTop: 12 }}>← Back</button>
      </div>
    </div>
  );

  // Business dashboard
  const [regForm, setRegForm] = useState({ recipientName: "", recipientPhone: "", description: "", specialInstructions: "" });
  const [regSuccess, setRegSuccess] = useState(null);
  const setReg = (k, v) => setRegForm(f => ({ ...f, [k]: v }));

  const registerPackage = () => {
    if (!regForm.recipientName.trim() || !regForm.recipientPhone.trim()) return;
    const newPkg = {
      ...regForm,
      id: Math.random().toString(36).slice(2, 9).toUpperCase(),
      pkgNumber: Date.now(),
      pkgLabel: "#PRE-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      businessName: bizAccount.name,
      status: "pending",
      paid: false,
      fee: 60,
      createdAt: Date.now(),
      createdDate: new Date().toLocaleDateString(),
      createdTime: new Date().toLocaleTimeString(),
      preRegistered: true,
      signature: null,
      pickedUpAt: null,
    };
    savePackages([newPkg, ...packages]);
    setRegSuccess(newPkg);
    setRegForm({ recipientName: "", recipientPhone: "", description: "", specialInstructions: "" });
  };

  const myPkgs = packages.filter(p => (p.businessName || "").toLowerCase() === bizAccount.name.toLowerCase());
  const pendingDropoff = myPkgs.filter(p => p.status === "pending");
  const awaitingPickup = myPkgs.filter(p => p.status === "waiting" || p.status === "notified");
  const collected = myPkgs.filter(p => p.status === "picked_up");

  const statusStyle = (status) => {
    if (status === "picked_up") return { label: "Picked Up ✓",     color: "#10b981", bg: "#ecfdf5" };
    if (status === "notified")  return { label: "Customer Notified", color: "#3b82f6", bg: "#eff6ff" };
    return                             { label: "Awaiting Pickup",   color: "#f59e0b", bg: "#fef3c7" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #312e81 100%)", color: "#fff", padding: "0 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>DropPoint</span>
            <span style={{ background: "rgba(255,255,255,.1)", color: "#c7d2fe", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Business Portal</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 600 }}>🏢 {bizAccount.name}</span>
            <button onClick={() => { setBizAccount(null); setCode(""); }} style={{ background: "rgba(255,255,255,.1)", color: "#c7d2fe", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Log Out</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
        {/* Register Package Form */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.07)", marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>📦 Pre-Register a Package</h3>
          {regSuccess && (
            <div style={{ background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, color: "#5b21b6", fontSize: 14 }}>Package registered — bring it in anytime!</div>
                <div style={{ color: "#6d28d9", fontSize: 13 }}>Ref: <strong>{regSuccess.pkgLabel}</strong> for {regSuccess.recipientName}</div>
              </div>
              <button onClick={() => setRegSuccess(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#8b5cf6", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", display: "block", marginBottom: 4, textTransform: "uppercase" }}>Recipient Name *</label>
              <input style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#1e293b" }}
                value={regForm.recipientName} onChange={e => setReg("recipientName", e.target.value)} placeholder="Jane Wanjiku" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", display: "block", marginBottom: 4, textTransform: "uppercase" }}>Recipient Phone *</label>
              <input style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#1e293b" }}
                value={regForm.recipientPhone} onChange={e => setReg("recipientPhone", e.target.value)} placeholder="07XX XXX XXX" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", display: "block", marginBottom: 4, textTransform: "uppercase" }}>Package Description</label>
              <input style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#1e293b" }}
                value={regForm.description} onChange={e => setReg("description", e.target.value)} placeholder="Small box, electronics, clothing…" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", display: "block", marginBottom: 4, textTransform: "uppercase" }}>Special Instructions</label>
              <input style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#1e293b" }}
                value={regForm.specialInstructions} onChange={e => setReg("specialInstructions", e.target.value)} placeholder="Fragile, keep upright…" />
            </div>
          </div>
          <button onClick={registerPackage}
            style={{ marginTop: 16, background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Register Package
          </button>
        </div>

        {/* Summary cards */}
        <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Package Overview</h2>
        <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          {[
            { label: "Pending Drop-Off",  value: pendingDropoff.length, color: "#8b5cf6", bg: "#ede9fe" },
            { label: "Awaiting Pickup",   value: awaitingPickup.length, color: "#f59e0b", bg: "#fef3c7" },
            { label: "Picked Up",         value: collected.length,      color: "#10b981", bg: "#ecfdf5" },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: "18px 24px", flex: 1, minWidth: 130 }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.color, opacity: 0.8, marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Pending drop-off packages */}
        {pendingDropoff.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#ede9fe", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🕐</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#5b21b6" }}>Pending Drop-Off ({pendingDropoff.length})</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                {["Ref", "Recipient", "Registered", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pendingDropoff.map((p, i) => (
                  <tr key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 13, fontWeight: 900, color: "#8b5cf6" }}>{p.pkgLabel || p.id}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#1e293b", fontWeight: 600 }}>{p.recipientName}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b" }}>{fmt(p.createdAt)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: "#ede9fe", color: "#8b5cf6", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Pending Drop-Off</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Awaiting pickup packages */}
        {awaitingPickup.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#fef3c7", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>⏳</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#92400e" }}>Awaiting Pickup ({awaitingPickup.length})</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                {["Pkg #", "Recipient", "Arrived", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {awaitingPickup.map((p, i) => {
                  const s = statusStyle(p.status);
                  return (
                    <tr key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 14, fontWeight: 900, color: "#6366f1" }}>{p.pkgLabel || p.id}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#1e293b", fontWeight: 600 }}>{p.recipientName}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b" }}>{fmt(p.createdAt)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Collected packages */}
        {collected.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#ecfdf5", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#065f46" }}>Picked Up ({collected.length})</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                {["Pkg #", "Recipient", "Dropped Off", "Collected"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {collected.map((p, i) => (
                  <tr key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 14, fontWeight: 900, color: "#10b981" }}>{p.pkgLabel || p.id}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#1e293b", fontWeight: 600 }}>{p.recipientName}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b" }}>{fmt(p.createdAt)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#10b981", fontWeight: 600 }}>{p.pickedUpAt ? fmt(p.pickedUpAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {myPkgs.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 14, padding: "48px", textAlign: "center", color: "#94a3b8", fontSize: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            No packages found for {bizAccount.name}. Make sure staff logs packages under your business name when they arrive.
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button onClick={onBack} style={{ background: "none", border: "1px solid #e2e8f0", color: "#94a3b8", borderRadius: 8, padding: "8px 20px", fontSize: 12, cursor: "pointer" }}>← Back to Home</button>
        </div>
      </div>
    </div>
  );
}

// ── Barcode Scanner Component ─────────────────────────────────────────────────
function BarcodeScanner({ packages, onFound, onClose }) {
  const [mode, setMode] = useState("physical");
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const bufferRef = useRef("");
  const lastKeyRef = useRef(Date.now());
  const timerRef = useRef(null);

  const findPackage = (val) => {
    const v = val.trim().toUpperCase().replace(/^#/, "");
    const found = packages.find(p => {
      const label = (p.pkgLabel || p.id).toUpperCase().replace(/^#/, "");
      return label === v || p.id.toUpperCase() === v;
    });
    if (found) { setError(""); onFound(found); }
    else setError(`No package found for "${val}". Try again.`);
  };

  // Global keydown listener for physical scanner
  useEffect(() => {
    if (mode !== "physical") return;
    const onKey = (e) => {
      const now = Date.now();
      if (now - lastKeyRef.current > 300) bufferRef.current = "";
      lastKeyRef.current = now;
      if (e.key === "Enter") {
        const v = bufferRef.current.trim();
        if (v.length >= 2) findPackage(v);
        bufferRef.current = "";
        return;
      }
      if (e.key.length === 1) bufferRef.current += e.key;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const v = bufferRef.current.trim();
        if (v.length >= 2) findPackage(v);
        bufferRef.current = "";
      }, 150);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, packages]);

  // Camera scanner
  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        scanLoop();
      }
    } catch { setError("Camera access denied. Please allow camera permissions and try again."); }
  };

  const scanLoop = async () => {
    if (!window.BarcodeDetector) {
      setError("Camera scanning requires Chrome or Edge browser. Please use a physical scanner instead.");
      stopCamera();
      return;
    }
    const detector = new window.BarcodeDetector({ formats: ["code_128", "code_39", "qr_code"] });
    const tick = async () => {
      if (!streamRef.current || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) { stopCamera(); findPackage(codes[0].rawValue); return; }
      } catch {}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div style={{ background: "#1e293b", borderRadius: 14, padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>📷 Barcode Scanner</span>
        <button onClick={() => { stopCamera(); onClose(); }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["physical", "🔫 Physical Scanner"], ["camera", "📷 Camera"]].map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); stopCamera(); setError(""); }}
            style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: mode === m ? "#3b82f6" : "#334155", color: "#fff" }}>
            {label}
          </button>
        ))}
      </div>

      {mode === "physical" && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 10, padding: 16, textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔫</div>
            <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Scan any package barcode</div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>Physical scanner input is detected automatically</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={manualInput} onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && findPackage(manualInput)}
              placeholder="Or type package number manually…"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #334155", background: "#0f172a", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <button onClick={() => findPackage(manualInput)}
              style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Find</button>
          </div>
        </div>
      )}

      {mode === "camera" && (
        <div>
          {!scanning ? (
            <button onClick={startCamera}
              style={{ width: "100%", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              📷 Start Camera
            </button>
          ) : (
            <div>
              <video ref={videoRef} muted playsInline
                style={{ width: "100%", borderRadius: 10, maxHeight: 220, objectFit: "cover", background: "#000", display: "block" }} />
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, margin: "8px 0" }}>Point camera at barcode label</div>
              <button onClick={stopCamera}
                style={{ width: "100%", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Stop Camera
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ background: "#fef2f2", color: "#ef4444", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginTop: 12, fontWeight: 600 }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ── Access Denied ─────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "48px 24px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: "#1e293b", marginBottom: 8 }}>Access Restricted</div>
      <div style={{ fontSize: 14, color: "#64748b" }}>This section is only available to admin accounts. Contact your manager for access.</div>
    </div>
  );
}
