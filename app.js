import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log("🚀 IELTS SaaS Platform Initialized.");

// ==========================================
// 🛠️ DEVELOPER CONFIGURATION (YOUR KEYS)
// ==========================================

const myFirebaseConfig = {
  apiKey: "AIzaSyC5D9ubr8BfdngM5WJZuFnSnm1Xru0DhoY",
  authDomain: "ielts-studio-ab42a.firebaseapp.com",
  projectId: "ielts-studio-ab42a",
  storageBucket: "ielts-studio-ab42a.firebasestorage.app",
  messagingSenderId: "235346696121",
  appId: "1:235346696121:web:9065e6003a9b04b5040868"
};

// Paste your permanent "AIza..." key here. 
// If it fails, the app will now automatically ask you for a backup key and save it permanently!
const DEVELOPER_GEMINI_API_KEY = "AQ.Ab8RN6KUpSHM9ByPmkrZmZCJziCxq1tHtiXmRqNdNhi0DtqnEg"; 

// ==========================================

const state = {
  appId: 'ielts-masterclass',
  user: null,
  savedTests: [],
  isLoginMode: true
};

let auth, db;

// Beautiful Toast Utility
window.showToast = function(msg, color = 'var(--accent-primary)') {
  const c = document.getElementById('toast-container');
  if(!c) return;
  const t = document.createElement('div');
  t.className = 'glass-panel px-5 py-3 text-sm font-bold shadow-2xl transition-all duration-500 transform translate-y-0 rounded-xl flex items-center gap-3 border';
  t.style.borderColor = color;
  t.style.backgroundColor = 'var(--bg-secondary)';
  t.style.color = 'var(--text-primary)';
  t.innerHTML = `<div class="w-2 h-2 rounded-full" style="background-color: ${color}"></div> ${msg}`;
  
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = 0; t.style.transform = 'translateY(10px)'; setTimeout(() => t.remove(), 500); }, 4000);
}

// Initialize Firebase
try {
  const app = initializeApp(myFirebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("❌ Firebase Init Error:", error);
}

// ==========================================
// USER AUTHENTICATION
// ==========================================

window.toggleAuthMode = function() {
  state.isLoginMode = !state.isLoginMode;
  
  const nameField = document.getElementById('register-name-field');
  const mainBtn = document.getElementById('auth-main-btn');
  const toggleBtn = document.getElementById('auth-toggle-btn');
  const subtitle = document.getElementById('auth-subtitle');

  if (state.isLoginMode) {
    nameField.classList.add('hidden');
    mainBtn.textContent = 'Authenticate & Enter';
    toggleBtn.textContent = "Don't have an account? Sign up here.";
    subtitle.textContent = "Welcome back. Please log in.";
  } else {
    nameField.classList.remove('hidden');
    mainBtn.textContent = 'Create Account';
    toggleBtn.textContent = "Already have an account? Log in here.";
    subtitle.textContent = "Create an account to save your progress.";
  }
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    state.user = user;
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    
    const displayName = user.displayName || "Scholar";
    const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
    const avatarUrl = user.photoURL || defaultAvatar;

    document.getElementById('user-display-name').textContent = displayName;
    document.getElementById('nav-avatar').src = avatarUrl;
    document.getElementById('dash-name').textContent = displayName;

    document.getElementById('settings-name-display').textContent = displayName;
    document.getElementById('settings-email-display').textContent = user.email;
    document.getElementById('settings-avatar').src = avatarUrl;
    document.getElementById('input-prof-name').value = user.displayName || "";
    document.getElementById('input-prof-avatar').value = user.photoURL || "";

    initFirestoreListeners();
  } else {
    state.user = null;
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('app-view').classList.add('hidden');
  }
});

window.handleAuth = async function() {
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-pass').value;
  const name = document.getElementById('auth-name').value;
  
  if(!email || !pass) return showToast('Email and password required.', '#ea580c');
  
  try { 
    if (state.isLoginMode) {
      await signInWithEmailAndPassword(auth, email, pass); 
      showToast('Login Successful!', '#10b981'); 
    } else {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      showToast('Account Created Successfully!', '#10b981');
    }
  } catch(err) { 
    showToast(err.message.replace('Firebase: ', ''), '#dc2626'); 
  }
};

window.handleLogout = () => signOut(auth);

window.saveProfile = async function() {
  const newName = document.getElementById('input-prof-name').value.trim();
  const newAvatar = document.getElementById('input-prof-avatar').value.trim();
  
  try {
    await updateProfile(auth.currentUser, {
      displayName: newName || null,
      photoURL: newAvatar || null
    });
    showToast('Profile updated! Reloading...', '#10b981');
    setTimeout(() => window.location.reload(), 1500);
  } catch(err) {
    showToast('Failed to update profile.', '#dc2626');
  }
}

// ==========================================
// NAVIGATION & UI
// ==========================================
window.switchTab = function(tabId) {
  const tabs = ['dashboard', 'academy', 'builder', 'workspace', 'profile'];
  tabs.forEach(t => {
    const sec = document.getElementById(`sec-${t}`);
    if(sec) sec.classList.toggle('hidden', t !== tabId);
    
    const dTab = document.getElementById(`tab-${t}`);
    if(dTab) dTab.classList.toggle('active', t === tabId);

    const mTab = document.getElementById(`mob-tab-${t}`);
    if(mTab) {
      if(t === tabId) mTab.classList.add('active-mob-tab');
      else mTab.classList.remove('active-mob-tab');
    }
  });
};

// ==========================================
// DATABASE & FILE LOGIC
// ==========================================
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
    grid.innerHTML = '<div class="col-span-full p-8 text-center border border-dashed rounded-xl border-gray-400/30 text-gray-500 text-sm">Your database is empty. Go to the AI Builder to generate a test!</div>';
    return;
  }

  grid.innerHTML = state.savedTests.map(test => `
    <div class="surface-card p-5 flex flex-col justify-between items-start gap-4 hover:-translate-y-1 transition-transform">
      <div>
        <span class="text-[10px] font-mono px-2.5 py-1 rounded-md border mb-3 inline-block uppercase font-bold" style="border-color: var(--border-focus); color: var(--accent-primary); background: var(--bg-tertiary)">${test.type}</span>
        <h4 class="font-bold text-sm leading-snug line-clamp-2">${test.title || 'Generated Assessment'}</h4>
      </div>
      <button onclick="loadTestIntoWorkspace('${test.id}')" class="text-xs font-bold px-4 py-2.5 rounded-lg border w-full hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-colors" style="border-color: var(--border-subtle);">
        Practice Now →
      </button>
    </div>
  `).join('');
}

window.handleFileUpload = function(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    document.getElementById('ai-source-text').value = evt.target.result;
    showToast('Document successfully parsed.', '#10b981');
  };
  reader.readAsText(file);
};

// ==========================================
// RESILIENT GEMINI AI GENERATOR
// ==========================================

// Helper function to get the best available API key
function getActiveApiKey() {
  // Check if user saved a backup key in the browser
  const savedBackupKey = localStorage.getItem("IELTS_STUDIO_BACKUP_KEY");
  if (savedBackupKey) return savedBackupKey;
  return DEVELOPER_GEMINI_API_KEY;
}

window.generateMockTest = async function() {
  const sourceText = document.getElementById('ai-source-text').value.trim();
  const type = document.getElementById('ai-test-type').value;
  
  if(!sourceText) { showToast('Provide some text for the AI to read first.', '#ea580c'); return; }

  const activeKey = getActiveApiKey();
  if(!activeKey || activeKey === "YOUR_AIZA_KEY_HERE") {
    // If no key is found, prompt the user and save it to browser memory forever
    const newKey = prompt("API Key missing or expired. Please enter a permanent AIza key from Google AI Studio:");
    if (newKey && newKey.trim() !== "") {
      localStorage.setItem("IELTS_STUDIO_BACKUP_KEY", newKey.trim());
      showToast('Key saved to browser memory! Click Generate again.', '#10b981');
    }
    return;
  }

  document.getElementById('btn-generate').classList.add('hidden');
  document.getElementById('ai-loading').classList.remove('hidden');

  const sysPrompt = type === 'reading' 
    ? "Act as an IELTS examiner. Read the provided text and generate a Reading Comprehension test. Return ONLY a JSON object with this schema: { \"title\": \"string\", \"passage\": \"string (use HTML <p> tags and break into multiple paragraphs)\", \"questions\": [ { \"q\": \"string\", \"options\": [\"A. ...\", \"B. ...\", \"C. ...\"], \"answer\": \"A, B, or C\" } ] }"
    : "Act as an IELTS examiner. Read the provided text and generate a Writing Task 2 prompt based on its themes. Return ONLY a JSON object with this schema: { \"title\": \"string\", \"prompt\": \"string\", \"instructions\": \"string\" }";

  const payload = {
    contents: [{ role: "user", parts: [{ text: `Source material: ${sourceText}` }] }],
    systemInstruction: { parts: [{ text: sysPrompt }] },
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if(!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "API request rejected.");
    }

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
    
    showToast('Test Generated & Saved Successfully!', '#10b981');
    switchTab('dashboard');
    document.getElementById('ai-source-text').value = '';

  } catch (err) {
    console.error("Gemini Error:", err);
    showToast(`Engine Failure: ${err.message}`, '#dc2626');
    
    // If the error was caused by an expired token, clear the saved token so they can enter a new one
    if (err.message.includes("API key not valid") || err.message.includes("expired")) {
       localStorage.removeItem("IELTS_STUDIO_BACKUP_KEY");
       showToast("Your API token expired. Click Generate again to enter a new one.", '#ea580c');
    }
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
      <div class="mb-5 p-4 rounded-xl border bg-gray-50/50 dark:bg-black/20" style="border-color: var(--border-subtle);">
        <p class="font-bold text-sm mb-3 text-[var(--text-primary)]">${i+1}. ${q.q}</p>
        <div class="space-y-2">
            ${q.options.map(opt => `<div class="ml-2 text-xs p-2 rounded border bg-[var(--bg-secondary)]" style="border-color: var(--border-subtle);">${opt}</div>`).join('')}
        </div>
        <div class="mt-4 pt-3 border-t text-[10px] uppercase text-emerald-500 font-bold tracking-wider" style="border-color: var(--border-subtle);">Key: ${q.answer}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full text-left items-start">
        <div class="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed font-serif p-6 rounded-2xl glass-panel">${test.content.passage}</div>
        <div class="space-y-4">${qHtml}</div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="max-w-3xl w-full text-left space-y-6 glass-panel p-8 rounded-2xl mx-auto">
        <div class="inline-block px-3 py-1 rounded-md text-[10px] font-mono uppercase font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">Writing Task 2</div>
        <h3 class="text-2xl font-bold font-serif leading-snug">${test.content.prompt}</h3>
        <p class="text-sm text-gray-500 italic border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-1">${test.content.instructions}</p>
        <textarea class="w-full h-80 p-5 rounded-xl border bg-[var(--bg-primary)] focus:outline-none focus:border-indigo-500 transition-colors custom-scrollbar text-sm leading-relaxed mt-6" style="border-color: var(--border-subtle);" placeholder="Commence drafting your response here..."></textarea>
      </div>
    `;
  }
};uage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${DEVELOPER_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if(!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "API request rejected.");
    }

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
    
    showToast('Test Generated & Saved Successfully!', '#10b981');
    switchTab('dashboard');
    document.getElementById('ai-source-text').value = '';

  } catch (err) {
    console.error("Gemini Error:", err);
    showToast(`Engine Failure: ${err.message}`, '#dc2626');
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
      <div class="mb-5 p-4 rounded-xl border bg-gray-50/50 dark:bg-black/20" style="border-color: var(--border-subtle);">
        <p class="font-bold text-sm mb-3 text-[var(--text-primary)]">${i+1}. ${q.q}</p>
        <div class="space-y-2">
            ${q.options.map(opt => `<div class="ml-2 text-xs p-2 rounded border bg-[var(--bg-secondary)]" style="border-color: var(--border-subtle);">${opt}</div>`).join('')}
        </div>
        <div class="mt-4 pt-3 border-t text-[10px] uppercase text-emerald-500 font-bold tracking-wider" style="border-color: var(--border-subtle);">Key: ${q.answer}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full text-left items-start">
        <div class="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed font-serif p-6 rounded-2xl glass-panel">${test.content.passage}</div>
        <div class="space-y-4">${qHtml}</div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="max-w-3xl w-full text-left space-y-6 glass-panel p-8 rounded-2xl mx-auto">
        <div class="inline-block px-3 py-1 rounded-md text-[10px] font-mono uppercase font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">Writing Task 2</div>
        <h3 class="text-2xl font-bold font-serif leading-snug">${test.content.prompt}</h3>
        <p class="text-sm text-gray-500 italic border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-1">${test.content.instructions}</p>
        <textarea class="w-full h-80 p-5 rounded-xl border bg-[var(--bg-primary)] focus:outline-none focus:border-indigo-500 transition-colors custom-scrollbar text-sm leading-relaxed mt-6" style="border-color: var(--border-subtle);" placeholder="Commence drafting your response here..."></textarea>
      </div>
    `;
  }
};
```ng\", \"instructions\": \"string\" }";

  const payload = {
    contents: [{ role: "user", parts: [{ text: `Source material: ${sourceText}` }] }],
    systemInstruction: { parts: [{ text: sysPrompt }] },
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${DEVELOPER_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if(!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "API request rejected.");
    }

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
    
    showToast('Test Generated & Saved Successfully!', '#10b981');
    switchTab('dashboard');
    document.getElementById('ai-source-text').value = '';

  } catch (err) {
    console.error("Gemini Error:", err);
    showToast(`Engine Failure: ${err.message}`, '#dc2626');
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
      <div class="mb-5 p-4 rounded-xl border bg-gray-50/50 dark:bg-black/20" style="border-color: var(--border-subtle);">
        <p class="font-bold text-sm mb-3 text-[var(--text-primary)]">${i+1}. ${q.q}</p>
        <div class="space-y-2">
            ${q.options.map(opt => `<div class="ml-2 text-xs p-2 rounded border bg-[var(--bg-secondary)]" style="border-color: var(--border-subtle);">${opt}</div>`).join('')}
        </div>
        <div class="mt-4 pt-3 border-t text-[10px] uppercase text-emerald-500 font-bold tracking-wider" style="border-color: var(--border-subtle);">Key: ${q.answer}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full text-left items-start">
        <div class="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed font-serif p-6 rounded-2xl glass-panel">${test.content.passage}</div>
        <div class="space-y-4">${qHtml}</div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="max-w-3xl w-full text-left space-y-6 glass-panel p-8 rounded-2xl mx-auto">
        <div class="inline-block px-3 py-1 rounded-md text-[10px] font-mono uppercase font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">Writing Task 2</div>
        <h3 class="text-2xl font-bold font-serif leading-snug">${test.content.prompt}</h3>
        <p class="text-sm text-gray-500 italic border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-1">${test.content.instructions}</p>
        <textarea class="w-full h-80 p-5 rounded-xl border bg-[var(--bg-primary)] focus:outline-none focus:border-indigo-500 transition-colors custom-scrollbar text-sm leading-relaxed mt-6" style="border-color: var(--border-subtle);" placeholder="Commence drafting your response here..."></textarea>
      </div>
    `;
  }
};
``` as an IELTS examiner. Read the provided text and generate a Reading Comprehension test. Return ONLY a JSON object with this schema: { \"title\": \"string\", \"passage\": \"string (use HTML <p> tags and break into multiple paragraphs)\", \"questions\": [ { \"q\": \"string\", \"options\": [\"A. ...\", \"B. ...\", \"C. ...\"], \"answer\": \"A, B, or C\" } ] }"
    : "Act as an IELTS examiner. Read the provided text and generate a Writing Task 2 prompt based on its themes. Return ONLY a JSON object with this schema: { \"title\": \"string\", \"prompt\": \"string\", \"instructions\": \"string\" }";

  const payload = {
    contents: [{ role: "user", parts: [{ text: `Source material: ${sourceText}` }] }],
    systemInstruction: { parts: [{ text: sysPrompt }] },
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    // We use the embedded DEVELOPER_GEMINI_API_KEY here
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${DEVELOPER_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if(!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "API request rejected.");
    }

    const data = await res.json();
    const jsonStr = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(jsonStr);

    const newTest = {
      type: type,
      title: parsed.title || 'Generated Test',
      content: parsed,
      timestamp: Date.now()
    };

    // Save to Firestore under the current user's UID
    const testsRef = collection(db, 'artifacts', state.appId, 'users', state.user.uid, 'tests');
    await addDoc(testsRef, newTest);
    
    showToast('Test Generated & Saved Successfully!', '#10b981');
    switchTab('dashboard');
    document.getElementById('ai-source-text').value = ''; // Clear box

  } catch (err) {
    console.error("Gemini Error:", err);
    showToast(`Engine Failure: ${err.message}`, '#dc2626');
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
      <div class="mb-5 p-4 rounded-xl border bg-gray-50/50 dark:bg-black/20" style="border-color: var(--border-subtle);">
        <p class="font-bold text-sm mb-3 text-[var(--text-primary)]">${i+1}. ${q.q}</p>
        <div class="space-y-2">
            ${q.options.map(opt => `<div class="ml-2 text-xs p-2 rounded border bg-[var(--bg-secondary)]" style="border-color: var(--border-subtle);">${opt}</div>`).join('')}
        </div>
        <div class="mt-4 pt-3 border-t text-[10px] uppercase text-emerald-500 font-bold tracking-wider" style="border-color: var(--border-subtle);">Key: ${q.answer}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full text-left items-start">
        <div class="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed font-serif p-6 rounded-2xl glass-panel">${test.content.passage}</div>
        <div class="space-y-4">${qHtml}</div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="max-w-3xl w-full text-left space-y-6 glass-panel p-8 rounded-2xl mx-auto">
        <div class="inline-block px-3 py-1 rounded-md text-[10px] font-mono uppercase font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">Writing Task 2</div>
        <h3 class="text-2xl font-bold font-serif leading-snug">${test.content.prompt}</h3>
        <p class="text-sm text-gray-500 italic border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-1">${test.content.instructions}</p>
        <textarea class="w-full h-80 p-5 rounded-xl border bg-[var(--bg-primary)] focus:outline-none focus:border-indigo-500 transition-colors custom-scrollbar text-sm leading-relaxed mt-6" style="border-color: var(--border-subtle);" placeholder="Commence drafting your response here..."></textarea>
      </div>
    `;
  }
};
