import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// 1. CONFIGURATION
const GEMINI_API_KEY = "AQ.Ab8RN6J_hXFh98X_30h_2yNyYDGDwdoK1Yf5Ei6pC7_EyPHi2g"; 

const firebaseConfig = {
    apiKey: "AIzaSyC5D9ubr8BfdngM5WJZuFnSnm1Xru0DhoY",
    authDomain: "ielts-studio-ab42a.firebaseapp.com",
    projectId: "ielts-studio-ab42a",
    storageBucket: "ielts-studio-ab42a.firebasestorage.app",
    messagingSenderId: "235346696121",
    appId: "1:235346696121:web:9065e6003a9b04b5040868"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
let unsubscribeLeaderboard = null;

// --- 2. MOBILE MENU LOGIC ---
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const toggleMenu = () => {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
};
document.getElementById('mobile-menu-btn')?.addEventListener('click', toggleMenu);
document.getElementById('close-sidebar')?.addEventListener('click', toggleMenu);
overlay?.addEventListener('click', toggleMenu);

// --- 3. AUTHENTICATION & DATA ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    btn.textContent = "Authenticating...";
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value);
    } catch (error) {
        document.getElementById('login-error').textContent = error.message.replace('Firebase: ', '');
        document.getElementById('login-error').classList.remove('hidden');
        btn.textContent = "Secure Login";
    }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        loginScreen.classList.add('hide');
        mainApp.classList.remove('hide');
        
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        // Initialize User Data if completely new
        if (!docSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.email.split('@')[0],
                targetBand: "7.5",
                examDate: "",
                studyStreak: 0,
                lastStreakUpdate: 0 
            });
        }

        // Live User Sync (Streak & Countdown)
        onSnapshot(userRef, async (liveSnap) => {
            const data = liveSnap.data();
            
            // Streak Logic (Resets to 0 for new users, then strictly +1 every 24 hours)
            const now = Date.now();
            let currentStreak = data.studyStreak || 0;
            let lastUpdate = data.lastStreakUpdate || 0;
            
            if (now - lastUpdate >= 86400000) { // 24 Hours in Milliseconds
                currentStreak = lastUpdate === 0 ? 0 : currentStreak + 1; 
                await setDoc(userRef, { 
                    studyStreak: currentStreak, 
                    lastStreakUpdate: now 
                }, { merge: true });
            }

            // Countdown Logic
            if (data.examDate) {
                const diffTime = new Date(data.examDate) - new Date();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                document.getElementById('dash-countdown').innerHTML = `${diffDays > 0 ? diffDays : 0} <span class="text-lg text-slate-500">Days</span>`;
            } else {
                document.getElementById('dash-countdown').innerHTML = `-- <span class="text-lg text-slate-500">Days</span>`;
            }

            // Update Header & Dashboard Text
            const displayName = data.displayName || 'Student';
            document.getElementById('topbar-name').textContent = displayName;
            document.getElementById('dash-name').textContent = displayName;
            document.getElementById('dash-streak').innerHTML = `${currentStreak} <span class="text-lg text-slate-500">Days</span>`;
            
            const avatarUrl = `https://ui-avatars.com/api/?name=${displayName}&background=0D8ABC&color=fff`;
            document.getElementById('topbar-avatar').src = avatarUrl;
            
            // Fill Settings Form
            document.getElementById('set-name').value = displayName;
            document.getElementById('set-date').value = data.examDate || '';
            document.getElementById('set-band').value = data.targetBand || '7.5';
        });

        // Live Leaderboard
        const q = query(collection(db, "users"), orderBy("targetBand", "desc"));
        unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
            const tbody = document.getElementById('leaderboard-body');
            tbody.innerHTML = '';
            snapshot.forEach((uDoc) => {
                const u = uDoc.data();
                const avatar = `https://ui-avatars.com/api/?name=${u.displayName}&background=0D8ABC&color=fff`;
                tbody.innerHTML += `
                    <tr class="border-b border-slate-700/50">
                        <td class="py-3 flex items-center gap-3">
                            <img src="${avatar}" class="w-8 h-8 rounded-full border border-slate-600">
                            <span class="font-medium text-slate-200">${u.displayName}</span>
                        </td>
                        <td class="py-3 font-bold text-orange-400"><i class="fa-solid fa-fire text-xs"></i> ${u.studyStreak || 0}</td>
                        <td class="py-3 font-bold text-slate-200">${u.targetBand}</td>
                    </tr>
                `;
            });
        });

    } else {
        loginScreen.classList.remove('hide');
        mainApp.classList.add('hide');
        if(unsubscribeLeaderboard) unsubscribeLeaderboard();
        document.getElementById('btn-login').textContent = "Secure Login";
    }
});

// --- 4. NAVIGATION TABS ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('bg-blue-600/10', 'text-blue-400');
            b.classList.add('text-slate-300');
        });
        const target = e.currentTarget;
        target.classList.add('bg-blue-600/10', 'text-blue-400');
        target.classList.remove('text-slate-300');
        
        document.querySelectorAll('.view-section').forEach(v => v.classList.add('hide'));
        const targetView = document.getElementById(`view-${target.getAttribute('data-target')}`);
        if(targetView) targetView.classList.remove('hide');
        
        // Auto-close menu on mobile after clicking
        if(window.innerWidth < 768) toggleMenu();
    });
});

// --- 5. SETTINGS FORM ---
document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: document.getElementById('set-name').value,
        examDate: document.getElementById('set-date').value,
        targetBand: document.getElementById('set-band').value
    }, { merge: true });
    
    const suc = document.getElementById('settings-success');
    suc.classList.remove('hidden');
    setTimeout(() => suc.classList.add('hidden'), 3000);
});

// --- 6. GEMINI AI TUTOR (NATIVE FETCH) ---
document.getElementById('ai-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputEl = document.getElementById('ai-input');
    const msg = inputEl.value;
    const chatBox = document.getElementById('ai-chat-box');
    inputEl.value = '';

    chatBox.innerHTML += `
        <div class="flex gap-3 flex-row-reverse">
            <div class="bg-blue-600 p-3 rounded-xl rounded-tr-none text-sm text-white">${msg}</div>
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadingId = "load-" + Date.now();
    chatBox.innerHTML += `
        <div id="${loadingId}" class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-robot"></i></div>
            <div class="bg-slate-800 p-3 rounded-xl rounded-tl-none text-sm text-slate-400 animate-pulse">Thinking...</div>
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: "You are an expert AI tutor for a Grade 12 student at វិទ្យាល័យ បឹងត្របែក in Cambodia. Keep answers concise, highly supportive, and focused on helping them score a Band 8.0+ in IELTS." }]
                },
                contents: [{
                    parts: [{ text: msg }]
                }]
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "Failed to fetch response");
        }

        const result = await response.json();
        const responseText = result.candidates[0].content.parts[0].text;
        
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `
            <div class="flex gap-3">
                <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-robot text-white"></i></div>
                <div class="bg-slate-800 p-3 rounded-xl rounded-tl-none text-sm text-slate-200 leading-relaxed">${responseText.replace(/\n/g, '<br>')}</div>
            </div>
        `;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="text-red-400 text-xs text-center mt-2">Error: ${error.message}</div>`;
    }
});

// --- 7. MODULE LOGICS (Labs & Timers) ---

// Listening Lab Calculator
document.getElementById('btn-calc-listen')?.addEventListener('click', () => {
    const raw = parseInt(document.getElementById('listen-raw').value);
    let band = 0;
    if (raw >= 39) band = 9.0;
    else if (raw >= 35) band = 8.0;
    else if (raw >= 30) band = 7.0;
    else if (raw >= 23) band = 6.0;
    else band = "< 6.0";
    document.getElementById('listen-result').textContent = isNaN(raw) ? "" : `Band: ${band}`;
});

// Timers for Reading & Writing
const runTimer = (elementId, seconds, btnEl) => {
    const el = document.getElementById(elementId);
    if (!el || el.dataset.running) return;
    el.dataset.running = "true";
    let time = seconds;
    btnEl.classList.add('opacity-50', 'pointer-events-none');
    
    const intv = setInterval(() => {
        time--;
        const m = Math.floor(time / 60).toString().padStart(2, '0');
        const s = (time % 60).toString().padStart(2, '0');
        el.textContent = `${m}:${s}`;
        if (time <= 0) {
            clearInterval(intv);
            delete el.dataset.running;
            btnEl.classList.remove('opacity-50', 'pointer-events-none');
        }
    }, 1000);
};

document.getElementById('btn-start-read')?.addEventListener('click', (e) => runTimer('reading-timer', 3600, e.currentTarget));
document.getElementById('btn-start-write')?.addEventListener('click', (e) => runTimer('writing-timer', 2400, e.currentTarget));

// Writing Area Logic
const textArea = document.getElementById('writing-area');
if(textArea) {
    textArea.addEventListener('input', () => {
        const text = textArea.value.trim();
        document.getElementById('word-count').textContent = `${text ? text.split(/\s+/).length : 0} words`;
    });
}

document.getElementById('btn-save-essay')?.addEventListener('click', async () => {
    if(!textArea || !textArea.value.trim()) return;
    const btn = document.getElementById('btn-save-essay');
    btn.textContent = "Saving...";
    await addDoc(collection(db, `users/${auth.currentUser.uid}/practiceLogs`), {
        module: 'writing',
        text: textArea.value,
        timestamp: serverTimestamp()
    });
    btn.textContent = "Saved ✓";
    setTimeout(() => btn.textContent = "Save to Cloud", 2000);
});

// Speaking Recorder
let mediaRec, chunks = [];
document.getElementById('btn-record')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const status = document.getElementById('rec-status');
    const audio = document.getElementById('audio-playback');

    if (mediaRec && mediaRec.state === "recording") {
        mediaRec.stop();
        btn.innerHTML = `<i class="fa-solid fa-record-vinyl mr-2"></i> Record Answer`;
        status.classList.add('hide');
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRec = new MediaRecorder(stream);
        chunks = [];
        
        mediaRec.ondataavailable = ev => chunks.push(ev.data);
        mediaRec.onstop = () => {
            audio.src = URL.createObjectURL(new Blob(chunks, { type: 'audio/webm' }));
            audio.classList.remove('hide');
            stream.getTracks().forEach(t => t.stop());
        };
        
        mediaRec.start();
        btn.innerHTML = `<i class="fa-solid fa-stop mr-2"></i> Stop`;
        status.classList.remove('hide');
        audio.classList.add('hide');
    } catch(err) {
        console.error("Microphone denied", err);
        alert("Please allow microphone access to record.");
    }
});
          </div>
        `;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="text-red-400 text-xs text-center mt-2">Error: ${error.message}</div>`;
    }
});


// --- 7. MODULE LOGICS (Labs & Timers) ---

// Listening Lab Calculator
document.getElementById('btn-calc-listen')?.addEventListener('click', () => {
    const raw = parseInt(document.getElementById('listen-raw').value);
    let band = 0;
    if (raw >= 39) band = 9.0;
    else if (raw >= 35) band = 8.0;
    else if (raw >= 30) band = 7.0;
    else if (raw >= 23) band = 6.0;
    else band = "< 6.0";
    document.getElementById('listen-result').textContent = isNaN(raw) ? "" : `Band: ${band}`;
});

// Timers for Reading & Writing
const runTimer = (elementId, seconds, btnEl) => {
    const el = document.getElementById(elementId);
    if (!el || el.dataset.running) return;
    el.dataset.running = "true";
    let time = seconds;
    btnEl.classList.add('opacity-50', 'pointer-events-none');
    
    const intv = setInterval(() => {
        time--;
        const m = Math.floor(time / 60).toString().padStart(2, '0');
        const s = (time % 60).toString().padStart(2, '0');
        el.textContent = `${m}:${s}`;
        if (time <= 0) {
            clearInterval(intv);
            delete el.dataset.running;
            btnEl.classList.remove('opacity-50', 'pointer-events-none');
        }
    }, 1000);
};

document.getElementById('btn-start-read')?.addEventListener('click', (e) => runTimer('reading-timer', 3600, e.currentTarget));
document.getElementById('btn-start-write')?.addEventListener('click', (e) => runTimer('writing-timer', 2400, e.currentTarget));

// Writing Area Logic
const textArea = document.getElementById('writing-area');
if(textArea) {
    textArea.addEventListener('input', () => {
        const text = textArea.value.trim();
        document.getElementById('word-count').textContent = `${text ? text.split(/\s+/).length : 0} words`;
    });
}

document.getElementById('btn-save-essay')?.addEventListener('click', async () => {
    if(!textArea || !textArea.value.trim()) return;
    const btn = document.getElementById('btn-save-essay');
    btn.textContent = "Saving...";
    await addDoc(collection(db, `users/${auth.currentUser.uid}/practiceLogs`), {
        module: 'writing',
        text: textArea.value,
        timestamp: serverTimestamp()
    });
    btn.textContent = "Saved ✓";
    setTimeout(() => btn.textContent = "Save to Cloud", 2000);
});

// Speaking Recorder
let mediaRec, chunks = [];
document.getElementById('btn-record')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const status = document.getElementById('rec-status');
    const audio = document.getElementById('audio-playback');

    if (mediaRec && mediaRec.state === "recording") {
        mediaRec.stop();
        btn.innerHTML = `<i class="fa-solid fa-record-vinyl mr-2"></i> Record Answer`;
        status.classList.add('hide');
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRec = new MediaRecorder(stream);
        chunks = [];
        
        mediaRec.ondataavailable = ev => chunks.push(ev.data);
        mediaRec.onstop = () => {
            audio.src = URL.createObjectURL(new Blob(chunks, { type: 'audio/webm' }));
            audio.classList.remove('hide');
            stream.getTracks().forEach(t => t.stop());
        };
        
        mediaRec.start();
        btn.innerHTML = `<i class="fa-solid fa-stop mr-2"></i> Stop`;
        status.classList.remove('hide');
        audio.classList.add('hide');
    } catch(err) {
        console.error("Microphone denied", err);
        alert("Please allow microphone access to record.");
    }
});
