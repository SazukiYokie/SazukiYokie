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

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
let unsubscribeLeaderboard = null;

// -- AUTHENTICATION --
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const errEl = document.getElementById('login-error');
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;
    
    try {
        errEl.classList.add('hidden');
        await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value);
    } catch (error) {
        errEl.textContent = error.message.replace('Firebase: ', '');
        errEl.classList.remove('hidden');
        btn.innerHTML = `Secure Login`;
    }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        loginScreen.classList.add('hide');
        mainApp.classList.remove('hide');
        
        // Ensure user doc exists
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.email.split('@')[0],
                targetBand: "7.5",
                lastActive: serverTimestamp()
            });
        } else {
            await setDoc(userRef, { lastActive: serverTimestamp() }, { merge: true });
        }

        // Live user UI updates
        onSnapshot(userRef, (docSnap) => {
            const data = docSnap.data();
            const name = data.displayName || 'Student';
            const band = data.targetBand || '7.5';
            const avatar = data.photoURL || `https://ui-avatars.com/api/?name=${name}&background=0D8ABC&color=fff`;

            document.getElementById('topbar-name').textContent = name;
            document.getElementById('dash-name').textContent = name;
            document.getElementById('topbar-band').textContent = `Target: Band ${band}`;
            document.getElementById('topbar-avatar').src = avatar;
            document.getElementById('set-name').value = name;
            document.getElementById('set-band').value = band;
        });

        // Live Leaderboard
        const q = query(collection(db, "users"), orderBy("targetBand", "desc"));
        unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
            const tbody = document.getElementById('leaderboard-body');
            tbody.innerHTML = '';
            snapshot.forEach((docSnap) => {
                const u = docSnap.data();
                const avatar = u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}&background=0D8ABC&color=fff`;
                const dateStr = u.lastActive ? new Date(u.lastActive.toDate()).toLocaleDateString() : 'Just now';
                tbody.innerHTML += `
                    <tr class="border-b border-slate-700/50">
                        <td class="py-3 flex items-center gap-3">
                            <img src="${avatar}" class="w-8 h-8 rounded-full border border-slate-600">
                            <span class="font-medium text-slate-200">${u.displayName}</span>
                        </td>
                        <td class="py-3 font-bold text-slate-200">${u.targetBand}</td>
                        <td class="py-3 text-slate-500 text-xs">${dateStr}</td>
                    </tr>
                `;
            });
        });

    } else {
        loginScreen.classList.remove('hide');
        mainApp.classList.add('hide');
        if(unsubscribeLeaderboard) unsubscribeLeaderboard();
        document.getElementById('btn-login').innerHTML = `Secure Login`;
    }
});

// -- NAVIGATION --
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('bg-blue-600/10', 'text-blue-400');
            b.classList.add('text-slate-300');
        });
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('bg-blue-600/10', 'text-blue-400');
        targetBtn.classList.remove('text-slate-300');
        
        document.querySelectorAll('.view-section').forEach(v => v.classList.add('hide'));
        document.getElementById(`view-${targetBtn.getAttribute('data-target')}`).classList.remove('hide');
    });
});

// -- PROFILE SETTINGS --
document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('set-name').value;
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: name,
        targetBand: document.getElementById('set-band').value
    }, { merge: true });
    await updateProfile(auth.currentUser, { displayName: name });
    
    const sucEl = document.getElementById('settings-success');
    sucEl.classList.remove('hidden');
    setTimeout(() => sucEl.classList.add('hidden'), 3000);
});

// -- MODULES LOGIC --

// 1. Listening Calculator
document.getElementById('btn-calc-listen').addEventListener('click', () => {
    const raw = parseInt(document.getElementById('listen-raw').value);
    let band = 0;
    if (raw >= 39) band = 9.0;
    else if (raw >= 35) band = 8.0;
    else if (raw >= 30) band = 7.0;
    else if (raw >= 23) band = 6.0;
    else band = "< 6.0";
    document.getElementById('listen-result').textContent = isNaN(raw) ? "" : `Band: ${band}`;
});

// 2. Timers
const runTimer = (elementId, seconds, btnEl) => {
    const el = document.getElementById(elementId);
    if (el.dataset.running) return;
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

document.getElementById('btn-start-read').addEventListener('click', (e) => runTimer('reading-timer', 3600, e.currentTarget));
document.getElementById('btn-start-write').addEventListener('click', (e) => runTimer('writing-timer', 2400, e.currentTarget));

// 3. Writing Text Area
const textArea = document.getElementById('writing-area');
textArea.addEventListener('input', () => {
    const text = textArea.value.trim();
    document.getElementById('word-count').textContent = `${text ? text.split(/\s+/).length : 0} words`;
});

document.getElementById('btn-save-essay').addEventListener('click', async () => {
    if(!textArea.value.trim()) return;
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

// 4. Speaking Recorder
let mediaRec, chunks = [];
document.getElementById('btn-record').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const status = document.getElementById('rec-status');
    const audio = document.getElementById('audio-playback');

    if (mediaRec && mediaRec.state === "recording") {
        mediaRec.stop();
        btn.innerHTML = `<i class="fa-solid fa-record-vinyl mr-2"></i> Record Answer`;
        status.classList.add('hide');
        return;
    }
    
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
});

