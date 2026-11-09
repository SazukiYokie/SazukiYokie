import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log("🚀 app.js has loaded successfully!");

// 🛠️ YOUR FIREBASE CONFIGURATION:
const myFirebaseConfig = {
  apiKey: "AIzaSyC5D9ubr8BfdngM5WJZuFnSnm1Xru0DhoY",
  authDomain: "ielts-studio-ab42a.firebaseapp.com",
  projectId: "ielts-studio-ab42a",
  storageBucket: "ielts-studio-ab42a.firebasestorage.app",
  messagingSenderId: "235346696121",
  appId: "1:235346696121:web:9065e6003a9b04b5040868"
};

const state = {
  appId: 'ielts-masterclass',
  user: null,
  savedTests: []
};

let auth, db;

// Toast Utility (UI Feedback)
window.showToast = function(msg, color = 'var(--accent-primary)') {
  console.log("TOAST:", msg); // Prints to F12 Console
  const c = document.getElementById('toast-container');
  if(!c) return;
  const t = document.createElement('div');
  t.className = 'glass-panel px-4 py-2.5 text-xs font-medium shadow-lg transition-all duration-300 text-white';
  t.style.borderLeft = `4px solid ${color}`;
  t.style.backgroundColor = 'var(--bg-secondary)';
  t.style.color = 'var(--text-primary)';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 3000);
}

// Initialize Firebase safely
try {
  const app = initializeApp(myFirebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("✅ Firebase Initialized");
} catch (error) {
  console.error("❌ Firebase Init Error:", error);
}

// Auth Listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("👤 User is logged in:", user.email);
    state.user = user;
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    document.getElementById('user-email-display').textContent = user.email;
    initFirestoreListeners();
  } else {
    console.log("🔒 User is logged out.");
    state.user = null;
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('app-view').classList.add('hidden');
  }
});

// ==========================================
// BULLETPROOF EVENT LISTENERS
// This ensures the buttons work even when split into modules.
// ==========================================

// Global functions attached to window for HTML access
window.switchTab = function(tabId) {
  ['dashboard', 'academy', 'builder', 'workspace'].forEach(t => {
    document.getElementById(`sec-${t}`).classList.toggle('hidden', t !== tabId);
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tabId);
  });
};

window.handleLogout = function() {
  console.log("Logging out...");
  signOut(auth);
};

window.handleFileUpload = function(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    document.getElementById('ai-source-text').value = evt.target.result;
    showToast('File extracted.', '#10b981');
  };
  reader.readAsText(file);
};

// Login Button Logic
window.handleLogin = async function() {
  console.log("Login button clicked!");
  const e = document.getElementById('auth-email').value;
  const p = document.getElementById('auth-pass').value;
  
  if(!e || !p) {
    showToast('Please enter both email and password.', '#ea580c');
    return;
  }
  
  try { 
      showToast('Attempting to log in...');
      await signInWithEmailAndPassword(auth, e, p); 
      showToast('Logged in successfully!', '#10b981'); 
  }
  catch(err) { 
      console.error("Login Error:", err);
      showToast('Login failed. Check your email/password.', '#dc2626'); 
  }
};


// Database Logic
function initFirestoreListeners() {
  const testsRef = collection(db, 'artifacts', state.appId, 'users', state.user.uid, 'tests');
  onSnapshot(testsRef, (snap) => {
    state.savedTests = [];
    snap.forEach(doc => state.savedTests.push({ id: doc.id, ...doc.data() }));
    state.savedTests.sort((a,b) => b.timestamp - a.timestamp);
    renderDashboard();
  }, (err) => console.error(err));
}

function renderDashboard() {
  document.getElementById('dash-tests-built').textContent = state.savedTests.length;
  const grid = document.getElementById('saved-tests-grid');
  
  if(state.savedTests.length === 0) {
    grid.innerHTML = '<div class="text-sm" style="color: var(--text-muted);">No tests generated yet.</div>';
    return;
  }

  grid.innerHTML = state.savedTests.map(test => `
    <div class="surface-card p-4 flex flex-col justify-between items-start gap-3">
      <div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded border mb-2 inline-block uppercase" style="border-color: var(--border-subtle); color: var(--accent-primary);">${test.type}</span>
        <h4 class="font-bold text-sm line-clamp-2">${test.title || 'Generated Assessment'}</h4>
      </div>
      <button onclick="loadTestIntoWorkspace('${test.id}')" class="text-xs font-semibold px-3 py-1.5 rounded-lg border w-full hover:opacity-80 transition" style="border-color: var(--border-subtle);">
        Load into Workspace →
      </button>
    </div>
  `).join('');
}


// AI Generator Logic
window.generateMockTest = async function() {
  const apiKey = document.getElementById('gemini-api-key').value.trim() || ""; 
  const sourceText = document.getElementById('ai-source-text').value.trim();
  const type = document.getElementById('ai-test-type').value;
  
  if(!sourceText) { showToast('Provide source material first.', '#ea580c'); return; }

  document.getElementById('btn-generate').classList.add('hidden');
  document.getElementById('ai-loading').classList.remove('hidden');

  const sysPrompt = type === 'reading' 
    ? "Act as an IELTS examiner. Read the provided text and generate a Reading Comprehension test. Return ONLY a JSON object with this schema: { \"title\": \"string\", \"passage\": \"string (use HTML <p> tags)\", \"questions\": [ { \"q\": \"string\", \"options\": [\"A. ...\", \"B. ...\", \"C. ...\"], \"answer\": \"A, B, or C\" } ] }"
    : "Act as an IELTS examiner. Read the provided text and generate a Writing Task 2 prompt based on its themes. Return ONLY a JSON object with this schema: { \"title\": \"string\", \"prompt\": \"string\", \"instructions\": \"string\" }";

  const payload = {
    contents: [{ role: "user", parts: [{ text: `Source material: ${sourceText}` }] }],
    systemInstruction: { parts: [{ text: sysPrompt }] },
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    const jsonStr = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(jsonStr);

    const newTest = {
      type: type,
      title: parsed.title || 'Generated Test',
      content: parsed,
      timestamp: Date.now()
    };

    const testsRef = collection(db, 'artifacts', state.appId, 'users', state.user.uid, 'tests');
    await addDoc(testsRef, newTest);
    
    showToast('Test generated and saved!', '#10b981');
    switchTab('dashboard');

  } catch (err) {
    console.error(err);
    showToast('Failed to generate test. Check API Key.', '#dc2626');
  } finally {
    document.getElementById('btn-generate').classList.remove('hidden');
    document.getElementById('ai-loading').classList.add('hidden');
  }
};

window.loadTestIntoWorkspace = function(id) {
  const test = state.savedTests.find(t => t.id === id);
  if(!test) return;

  switchTab('workspace');
  document.getElementById('ws-title').textContent = test.title;
  document.getElementById('ws-type-badge').textContent = test.type.toUpperCase();

  const container = document.getElementById('ws-content');
  
  if(test.type === 'reading') {
    const qHtml = test.content.questions.map((q, i) => `
      <div class="mb-4">
        <p class="font-bold text-sm mb-2">${i+1}. ${q.q}</p>
        ${q.options.map(opt => `<div class="ml-4 text-xs mb-1 text-gray-500">${opt}</div>`).join('')}
        <div class="mt-2 text-[10px] uppercase text-emerald-500 font-mono">Ans: ${q.answer}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full text-left items-start">
        <div class="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed font-serif p-4 border rounded" style="border-color: var(--border-subtle);">${test.content.passage}</div>
        <div class="p-4 border rounded" style="border-color: var(--border-subtle);">${qHtml}</div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="max-w-2xl w-full text-left space-y-4">
        <div class="text-xs font-mono uppercase text-indigo-500">Writing Task 2</div>
        <h3 class="text-xl font-bold font-serif">${test.content.prompt}</h3>
        <p class="text-sm text-gray-500 italic">${test.content.instructions}</p>
        <textarea class="w-full h-64 p-4 rounded border mt-4 bg-transparent focus:outline-none" style="border-color: var(--border-subtle);" placeholder="Start typing your essay here..."></textarea>
      </div>
    `;
  }
};
