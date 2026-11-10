import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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

// Expose db and auth so ai.js can save scores if needed
window.ieltsAuth = auth;
window.ieltsDb = db;

// Show immediate visual confirmation on login screen that app.js loaded
const statusBadge = document.getElementById('system-status');
if (statusBadge) {
    statusBadge.textContent = "Firebase Ready ✓";
    statusBadge.className = "inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs mb-5";
}

const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
let unsubscribeLeaderboard = null;
let unsubscribeUser = null;

// --- 1. BULLETPROOF LOGIN HANDLER ---
async function executeLogin() {
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    const btn = document.getElementById('btn-login');
    const errEl = document.getElementById('login-error');

    const email = emailEl ? emailEl.value.trim() : "";
    const password = passEl ? passEl.value.trim() : "";

    if (!email || !password) {
        if (errEl) {
            errEl.textContent = "Please enter both your Email and Password.";
            errEl.classList.remove('hidden');
        }
        return;
    }

    if (btn) btn.textContent = "Signing in...";
    if (errEl) errEl.classList.add('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        if (errEl) {
            errEl.textContent = "Login Error: " + error.message.replace('Firebase: ', '');
            errEl.classList.remove('hidden');
        }
        if (btn) btn.textContent = "Secure Login";
    }
}

document.getElementById('btn-login')?.addEventListener('click', executeLogin);
document.getElementById('login-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeLogin();
});

document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));

// --- 2. AUTH STATE & FIRESTORE SYNC ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loginScreen?.classList.add('hide');
        mainApp?.classList.remove('hide');

        const userRef = doc(db, 'users', user.uid);
        try {
            const docSnap = await getDoc(userRef);
            if (!docSnap.exists()) {
                const defaultName = user.email ? user.email.split('@')[0] : "Student";
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: defaultName,
                    photoURL: `https://ui-avatars.com/api/?name=${defaultName}&background=0D8ABC&color=fff`,
                    targetBand: "7.5",
                    status: "IELTS Self-Study",
                    examDate: "",
                    studyStreak: 0,
                    lastStreakUpdate: Date.now()
                });
            } else {
                // One-time auto-fix if old hardcoded 12 streak exists without lastStreakUpdate
                const existing = docSnap.data();
                if (!existing.lastStreakUpdate) {
                    await setDoc(userRef, { studyStreak: 0, lastStreakUpdate: Date.now() }, { merge: true });
                }
            }
        } catch (err) {
            console.warn("Firestore init note:", err);
        }

        // Real-time User Listener
        if (unsubscribeUser) unsubscribeUser();
        unsubscribeUser = onSnapshot(userRef, async (snap) => {
            const data = snap.data();
            if (!data) return;

            // 24-Hour Streak Increment Logic (+1 every 24h)
            const now = Date.now();
            let streak = typeof data.studyStreak === 'number' ? data.studyStreak : 0;
            let lastUpdate = data.lastStreakUpdate || now;

            if (now - lastUpdate >= 86400000) {
                const daysPassed = Math.floor((now - lastUpdate) / 86400000);
                // If user logged in within 48h, add +1; if missed > 48h, reset to 0
                streak = daysPassed === 1 ? streak + 1 : 0;
                await setDoc(userRef, { studyStreak: streak, lastStreakUpdate: now }, { merge: true });
            }

            // Update UI Names & Avatars
            const name = data.displayName || "Student";
            const band = data.targetBand || "7.5";
            const avatar = data.photoURL || `https://ui-avatars.com/api/?name=${name}&background=0D8ABC&color=fff`;

            document.getElementById('topbar-name').textContent = name;
            document.getElementById('dash-name').textContent = name;
            document.getElementById('topbar-band').textContent = `Target: Band ${band}`;
            document.getElementById('dash-band').textContent = `Target: Band ${band}`;
            document.getElementById('dash-streak').innerHTML = `${streak} <span class="text-base font-normal text-slate-400">Days</span>`;

            document.getElementById('topbar-avatar').src = avatar;
            document.getElementById('mobile-avatar').src = avatar;
            document.getElementById('settings-avatar-preview').src = avatar;

            // Exam Date Countdown
            const countdownEl = document.getElementById('dash-countdown');
            if (data.examDate) {
                const targetTime = new Date(data.examDate + "T00:00:00").getTime();
                const todayTime = new Date().setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((targetTime - todayTime) / 86400000);
                countdownEl.innerHTML = `${diffDays > 0 ? diffDays : 0} <span class="text-base font-normal text-slate-400">Days Left</span>`;
                document.getElementById('quick-exam-date').value = data.examDate;
            } else {
                countdownEl.innerHTML = `-- <span class="text-base font-normal text-slate-400">Days Left</span>`;
            }

            // Populate Settings Inputs
            document.getElementById('set-name').value = name;
            document.getElementById('set-status').value = data.status || "";
            document.getElementById('set-date').value = data.examDate || "";
            document.getElementById('set-band').value = band;
        });

        // Real-time Leaderboard Listener
        if (unsubscribeLeaderboard) unsubscribeLeaderboard();
        const q = query(collection(db, "users"), orderBy("targetBand", "desc"));
        unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
            const tbody = document.getElementById('leaderboard-body');
            if (!tbody) return;
            tbody.innerHTML = '';
            snapshot.forEach((uDoc) => {
                const u = uDoc.data();
                const uName = u.displayName || "Student";
                const uAvatar = u.photoURL || `https://ui-avatars.com/api/?name=${uName}&background=0D8ABC&color=fff`;
                tbody.innerHTML += `
                    <tr class="border-b border-slate-700/50">
                        <td class="py-3 flex items-center gap-2.5">
                            <img src="${uAvatar}" class="w-8 h-8 rounded-full border border-slate-600 object-cover">
                            <span class="font-medium text-slate-200">${uName}</span>
                        </td>
                        <td class="py-3 font-bold text-orange-400"><i class="fa-solid fa-fire mr-1"></i>${u.studyStreak || 0}d</td>
                        <td class="py-3 font-bold text-blue-400">Band ${u.targetBand || '7.5'}</td>
                        <td class="py-3 text-xs text-slate-400">${u.status || 'Studying'}</td>
                    </tr>
                `;
            });
        });

    } else {
        loginScreen?.classList.remove('hide');
        mainApp?.classList.add('hide');
        const btn = document.getElementById('btn-login');
        if (btn) btn.textContent = "Secure Login";
    }
});

// --- 3. MOBILE SIDEBAR & TAB NAVIGATION ---
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');

function closeMobileMenu() {
    sidebar?.classList.add('-translate-x-full');
    overlay?.classList.add('hidden');
}

function openMobileMenu() {
    sidebar?.classList.remove('-translate-x-full');
    overlay?.classList.remove('hidden');
}

document.getElementById('mobile-menu-btn')?.addEventListener('click', openMobileMenu);
document.getElementById('close-sidebar')?.addEventListener('click', closeMobileMenu);
overlay?.addEventListener('click', closeMobileMenu);

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('bg-blue-600/20', 'text-blue-400');
            b.classList.add('text-slate-300');
        });
        btn.classList.add('bg-blue-600/20', 'text-blue-400');
        btn.classList.remove('text-slate-300');

        document.querySelectorAll('.view-section').forEach(v => v.classList.add('hide'));
        const targetId = `view-${btn.getAttribute('data-target')}`;
        document.getElementById(targetId)?.classList.remove('hide');

        if (window.innerWidth < 768) closeMobileMenu();
    });
});

// --- 4. STREAK RESET, EXAM DATE & PROFILE SAVE ---
document.getElementById('btn-dash-reset-streak')?.addEventListener('click', async () => {
    if (!auth.currentUser) return;
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
        studyStreak: 0,
        lastStreakUpdate: Date.now()
    }, { merge: true });
});

document.getElementById('btn-save-quick-date')?.addEventListener('click', async () => {
    if (!auth.currentUser) return;
    const dateVal = document.getElementById('quick-exam-date').value;
    await setDoc(doc(db, 'users', auth.currentUser.uid), { examDate: dateVal }, { merge: true });
});

document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
    if (!auth.currentUser) return;
    const name = document.getElementById('set-name').value.trim() || "Student";
    const status = document.getElementById('set-status').value.trim();
    const examDate = document.getElementById('set-date').value;
    const targetBand = document.getElementById('set-band').value;

    await setDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: name,
        status: status,
        examDate: examDate,
        targetBand: targetBand
    }, { merge: true });

    const suc = document.getElementById('settings-success');
    suc?.classList.remove('hidden');
    setTimeout(() => suc?.classList.add('hidden'), 3000);
});

// Avatar Image Compression (keeps image tiny so Firestore saves it cleanly)
document.getElementById('avatar-upload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !auth.currentUser) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 160, 160);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            await setDoc(doc(db, 'users', auth.currentUser.uid), { photoURL: compressedBase64 }, { merge: true });
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

// --- 5. TIMERS, WORD COUNTER & VOICE RECORDER ---
document.getElementById('btn-calc-listen')?.addEventListener('click', () => {
    const raw = parseInt(document.getElementById('listen-raw').value);
    if (isNaN(raw)) return;
    let band = 5.0;
    if (raw >= 39) band = 9.0;
    else if (raw >= 37) band = 8.5;
    else if (raw >= 35) band = 8.0;
    else if (raw >= 32) band = 7.5;
    else if (raw >= 30) band = 7.0;
    else if (raw >= 26) band = 6.5;
    else if (raw >= 23) band = 6.0;
    else if (raw >= 18) band = 5.5;
    document.getElementById('listen-result').textContent = `Band ${band}`;
});

function startCountdown(elId, seconds) {
    const el = document.getElementById(elId);
    if (!el || el.dataset.active === "true") return;
    el.dataset.active = "true";
    let rem = seconds;
    const timer = setInterval(() => {
        rem--;
        const m = String(Math.floor(rem / 60)).padStart(2, '0');
        const s = String(rem % 60).padStart(2, '0');
        el.textContent = `${m}:${s}`;
        if (rem <= 0) {
            clearInterval(timer);
            el.dataset.active = "false";
        }
    }, 1000);
}

document.getElementById('btn-start-read')?.addEventListener('click', () => startCountdown('reading-timer', 1200));
document.getElementById('btn-start-write')?.addEventListener('click', () => startCountdown('writing-timer', 2400));

const writingArea = document.getElementById('writing-area');
writingArea?.addEventListener('input', () => {
    const words = writingArea.value.trim() ? writingArea.value.trim().split(/\s+/).length : 0;
    document.getElementById('word-count').textContent = `${words} words`;
});

document.getElementById('btn-save-essay')?.addEventListener('click', async () => {
    if (!auth.currentUser || !writingArea.value.trim()) return;
    const btn = document.getElementById('btn-save-essay');
    btn.textContent = "Saving...";
    await addDoc(collection(db, `users/${auth.currentUser.uid}/practiceLogs`), {
        module: "writing",
        essay: writingArea.value,
        timestamp: serverTimestamp()
    });
    btn.textContent = "Saved ✓";
    setTimeout(() => btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up mr-1"></i> Save to Cloud`, 2000);
});

let mediaRec = null;
let audioChunks = [];
document.getElementById('btn-record')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-record');
    const status = document.getElementById('rec-status');
    const player = document.getElementById('audio-playback');

    if (mediaRec && mediaRec.state === "recording") {
        mediaRec.stop();
        btn.innerHTML = `<i class="fa-solid fa-record-vinyl mr-1"></i> Record Voice`;
        status?.classList.add('hide');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRec = new MediaRecorder(stream);
        audioChunks = [];
        mediaRec.ondataavailable = e => audioChunks.push(e.data);
        mediaRec.onstop = () => {
            player.src = URL.createObjectURL(new Blob(audioChunks, { type: 'audio/webm' }));
            player.classList.remove('hide');
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRec.start();
        btn.innerHTML = `<i class="fa-solid fa-stop mr-1"></i> Stop Recording`;
        status?.classList.remove('hide');
    } catch (e) {
        alert("Please allow microphone permission in your browser.");
    }
});
tamp: serverTimestamp()
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
