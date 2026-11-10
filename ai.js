// ============================================================================
// SAFE AI ENGINE FOR GITHUB PAGES (NO HARDCODED KEYS — GITHUB CANNOT DELETE IT)
// Supports: 1. Free Keyless Cloud AI  2. Groq AI (gsk_...)  3. Gemini Key
// ============================================================================

// Read key privately from the user's browser (Invisible to GitHub Secret Scanner)
function getSavedKey() {
    return (localStorage.getItem("IELTS_PRIVATE_AI_KEY") || "").trim();
}

// Automatically inject a Key Manager bar into the AI Tutor tab
function setupKeyManagerUI() {
    const chatBox = document.getElementById('ai-chat-box');
    if (!chatBox || document.getElementById('ai-key-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'ai-key-bar';
    bar.className = 'p-3 bg-slate-900 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs';
    
    const updateBarHTML = () => {
        const currentKey = getSavedKey();
        const statusText = currentKey 
            ? `<span class="text-emerald-400 font-semibold">✓ Private AI Key Active (${currentKey.slice(0, 6)}...)</span>`
            : `<span class="text-blue-400 font-semibold">⚡ Running in Keyless Free AI Mode</span>`;

        bar.innerHTML = `
            <div>${statusText}</div>
            <div class="flex gap-1.5 items-center">
                <input type="password" id="private-key-input" placeholder="Paste Groq (gsk_...) or Gemini key" class="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs w-48 focus:outline-none focus:border-purple-500">
                <button type="button" id="btn-save-private-key" class="bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded-lg font-medium">Save Key</button>
                ${currentKey ? `<button type="button" id="btn-clear-private-key" class="bg-slate-700 hover:bg-red-600 text-white px-2 py-1 rounded-lg">Clear</button>` : ''}
            </div>
        `;

        bar.querySelector('#btn-save-private-key')?.addEventListener('click', () => {
            const val = bar.querySelector('#private-key-input').value.trim();
            if (!val) return;
            localStorage.setItem("IELTS_PRIVATE_AI_KEY", val);
            updateBarHTML();
            alert("AI Key saved privately in your browser! GitHub cannot see or delete it.");
        });

        bar.querySelector('#btn-clear-private-key')?.addEventListener('click', () => {
            localStorage.removeItem("IELTS_PRIVATE_AI_KEY");
            updateBarHTML();
        });
    };

    chatBox.parentNode.insertBefore(bar, chatBox);
    updateBarHTML();
}

setupKeyManagerUI();

// --- 1. MULTI-PROVIDER AI ENGINE (GROQ -> GEMINI -> KEYLESS CLOUD -> BUILT-IN) ---
async function askIELTSAI(userPrompt, systemPrompt = "You are a supportive Band 9.0 IELTS Examiner and Tutor in Cambodia. Give clear, practical, well-structured answers.") {
    const apiKey = getSavedKey();

    // ROUTE A: If user saved a Groq API Key (starts with gsk_)
    if (apiKey.startsWith("gsk_")) {
        try {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.6
                })
            });
            if (res.ok) {
                const data = await res.json();
                return data.choices[0].message.content;
            }
        } catch (err) {
            console.warn("Groq request failed, switching to keyless AI:", err);
        }
    }

    // ROUTE B: If user saved a Google Gemini API Key (AIza... or AQ....)
    if (apiKey.startsWith("AIza") || apiKey.startsWith("AQ.")) {
        try {
            const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ parts: [{ text: userPrompt }] }]
                })
            });
            if (res.ok) {
                const data = await res.json();
                const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (reply) return reply;
            }
        } catch (err) {
            console.warn("Gemini request failed, switching to keyless AI:", err);
        }
    }

    // ROUTE C: Keyless Cloud AI (No API Key Required at all!)
    try {
        const res = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                model: "openai"
            })
        });
        if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 5) return text;
        }
    } catch (err) {
        console.warn("Keyless POST route skipped, trying GET route.");
    }

    try {
        const url = `https://text.pollinations.ai/${encodeURIComponent(systemPrompt + "\n\nStudent question: " + userPrompt)}`;
        const res = await fetch(url);
        if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 5) return text;
        }
    } catch (err) {
        console.warn("Using offline built-in IELTS tutor.");
    }

    // ROUTE D: Unbreakable Built-in Offline IELTS Tutor
    return generateOfflineIELTSReply(userPrompt);
}

function generateOfflineIELTSReply(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes("vocab")) {
        return `<strong>Band 8.0+ Academic Vocabulary:</strong><br>
1. <strong>Mitigate (v.):</strong> Reduce the severity of something. <em>"Governments must mitigate the effects of climate change."</em><br>
2. <strong>Ubiquitous (adj.):</strong> Existing everywhere. <em>"Smartphones have become ubiquitous among high school students."</em><br>
3. <strong>Detrimental (adj.):</strong> Causing harm. <em>"Lack of sleep is detrimental to academic performance."</em><br>
4. <strong>Catalyst (n.):</strong> Something that triggers rapid change. <em>"Online platforms are a catalyst for self-directed learning."</em><br>
5. <strong>Pragmatic (adj.):</strong> Practical and realistic. <em>"We need a pragmatic solution to urban traffic congestion."</em>`;
    }
    if (p.includes("essay") || p.includes("writing") || p.includes("task 2")) {
        return `<strong>Band 8.5 Writing Task 2 Structure (250+ Words):</strong><br>
• <strong>1. Introduction (40–50 words):</strong> Paraphrase the prompt + state your clear thesis/opinion.<br>
• <strong>2. Body Paragraph 1 (90–100 words):</strong> Topic sentence + explanation + concrete real-world example.<br>
• <strong>3. Body Paragraph 2 (90–100 words):</strong> Second main view/argument + explanation + example.<br>
• <strong>4. Conclusion (30–40 words):</strong> Summarize main points and restate your final position without adding new ideas.`;
    }
    return `<strong>IELTS Band 8.0+ Study Guide:</strong><br>
• <strong>Reading:</strong> Skim for main ideas first, then scan for keywords and synonyms. Remember that <em>Not Given</em> means there is no proof in the text.<br>
• <strong>Writing:</strong> Always plan for 5 minutes before typing. Use linking words naturally (<em>Furthermore, Consequently, On the other hand</em>).<br>
• <strong>Speaking:</strong> Extend every answer with a reason and a personal example instead of stopping at one sentence.`;
}

// --- 2. UNIVERSAL CHAT HANDLER (Works with both old & new index.html) ---
let isSendingChat = false;

async function processUserChat(customText) {
    if (isSendingChat) return;
    const inputEl = document.getElementById('ai-input');
    const chatBox = document.getElementById('ai-chat-box');
    if (!chatBox) return;

    const msg = customText || (inputEl ? inputEl.value.trim() : "");
    if (!msg) return;
    if (!customText && inputEl) inputEl.value = '';

    isSendingChat = true;

    chatBox.innerHTML += `
        <div class="flex gap-3 flex-row-reverse">
            <div class="bg-blue-600 p-3 rounded-2xl rounded-tr-none text-sm text-white max-w-[85%]">${msg}</div>
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadId = "load-" + Date.now();
    chatBox.innerHTML += `
        <div id="${loadId}" class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-robot text-white text-xs"></i></div>
            <div class="bg-slate-800 p-3 rounded-2xl rounded-tl-none text-sm text-slate-400 animate-pulse">Thinking...</div>
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    const reply = await askIELTSAI(msg);
    document.getElementById(loadId)?.remove();

    const formatted = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    chatBox.innerHTML += `
        <div class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-robot text-white text-xs"></i></div>
            <div class="bg-slate-800 p-3.5 rounded-2xl rounded-tl-none text-sm text-slate-200 leading-relaxed max-w-[88%]">${formatted}</div>
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;
    isSendingChat = false;
}

// Attach to form submit OR button click so any HTML version works
document.getElementById('ai-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    processUserChat();
});
document.getElementById('ai-send-btn')?.addEventListener('click', () => processUserChat());
document.getElementById('ai-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        processUserChat();
    }
});
document.querySelectorAll('.ai-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => processUserChat(btn.getAttribute('data-prompt')));
});

// --- 3. READING, LISTENING, WRITING & SPEAKING BUILT-IN GENERATORS ---
const readingBank = [
    {
        title: "The Rise of Vertical Farming in Urban Centers",
        passage: `<p>As global urbanization accelerates, traditional agriculture faces unprecedented pressure from land scarcity and climate variability. Vertical farming—the practice of growing crops in vertically stacked layers indoors—has emerged as a promising solution. By utilizing controlled-environment agriculture (CEA) technology, these facilities regulate light, humidity, and nutrients with pinpoint accuracy.</p>
        <p>Proponents highlight that vertical farms use up to 95% less water than conventional fields because transpired water is captured and recycled. Furthermore, because farms can be located inside abandoned warehouses in city centers, food miles are drastically reduced. However, critics point out that the high energy cost required to power artificial LED lighting remains a major economic barrier, limiting production primarily to fast-growing leafy greens rather than staple crops like wheat or rice.</p>`,
        questions: [
            { q: "1. Vertical farming uses up to 95% less water than traditional outdoor farming.", options: ["True", "False", "Not Given"], ans: "True" },
            { q: "2. Vertical farms are currently more profitable for growing wheat than leafy greens.", options: ["True", "False", "Not Given"], ans: "False" },
            { q: "3. Every major city in Southeast Asia has built a government-funded vertical farm.", options: ["True", "False", "Not Given"], ans: "Not Given" }
        ]
    },
    {
        title: "The Neuroscience of Bilingualism and Cognitive Reserve",
        passage: `<p>For decades, neuroscientists have investigated how speaking more than one language shapes the human brain. Recent neuroimaging studies reveal that bilingual individuals constantly activate both languages in their minds, requiring the prefrontal cortex to select the appropriate language while inhibiting the other. This continuous mental workout strengthens executive control networks.</p>
        <p>Longitudinal studies suggest that lifelong bilingualism builds 'cognitive reserve,' which can delay the onset of age-related cognitive decline by up to four years compared to monolinguals. Interestingly, these structural benefits are observed even when a second language is acquired during adolescence or adulthood, provided the speaker uses it actively in daily life.</p>`,
        questions: [
            { q: "1. Only people who learn a second language before age five gain cognitive benefits.", options: ["True", "False", "Not Given"], ans: "False" },
            { q: "2. Lifelong bilingualism can delay symptoms of cognitive decline by up to four years.", options: ["True", "False", "Not Given"], ans: "True" },
            { q: "3. Bilinguals have a larger hippocampus than professional musicians.", options: ["True", "False", "Not Given"], ans: "Not Given" }
        ]
    }
];

let currentReadingIndex = 0;
function renderReadingTest(testObj) {
    const titleEl = document.getElementById('reading-passage-title');
    const bodyEl = document.getElementById('reading-passage-body');
    const qBox = document.getElementById('reading-questions-box');
    if (!titleEl || !bodyEl || !qBox) return;

    titleEl.textContent = testObj.title;
    bodyEl.innerHTML = testObj.passage;
    document.getElementById('reading-score-box').textContent = "";
    qBox.innerHTML = "";
    testObj.questions.forEach((item, idx) => {
        qBox.innerHTML += `
            <div class="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700">
                <p class="text-sm font-medium mb-2">${item.q}</p>
                <div class="flex gap-3 text-xs">
                    ${item.options.map(opt => `
                        <label class="flex items-center gap-1.5 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
                            <input type="radio" name="read-q-${idx}" value="${opt}"> ${opt}
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });
}
renderReadingTest(readingBank[0]);

document.getElementById('btn-ai-reading')?.addEventListener('click', () => {
    currentReadingIndex = (currentReadingIndex + 1) % readingBank.length;
    renderReadingTest(readingBank[currentReadingIndex]);
});

document.getElementById('btn-submit-reading')?.addEventListener('click', () => {
    const testObj = readingBank[currentReadingIndex];
    let score = 0;
    testObj.questions.forEach((item, idx) => {
        const selected = document.querySelector(`input[name="read-q-${idx}"]:checked`);
        if (selected && selected.value === item.ans) score++;
    });
    const bandEst = score === 3 ? "8.5" : score === 2 ? "7.0" : score === 1 ? "5.5" : "4.5";
    document.getElementById('reading-score-box').textContent = `Score: ${score}/${testObj.questions.length} (Est. Band ${bandEst})`;
});

const listeningBank = [
    {
        title: "Section 1: University Library Orientation",
        script: "Welcome to the University Central Library orientation. From Monday to Friday, the main reading hall opens at 8 AM and closes at 10 PM. On weekends, we close earlier at 6 PM. Undergraduate students may borrow up to 12 books at a time for three weeks. Group discussions are strictly restricted to the third floor.",
        questions: [
            { q: "1. What time does the library close on weekdays?", options: ["6:00 PM", "8:00 PM", "10:00 PM"], ans: "10:00 PM" },
            { q: "2. How many books can an undergraduate borrow at once?", options: ["6 books", "12 books", "15 books"], ans: "12 books" },
            { q: "3. Which floor is designated for group discussions?", options: ["First floor", "Second floor", "Third floor"], ans: "Third floor" }
        ]
    },
    {
        title: "Section 2: Eco-Tourism Resort Briefing",
        script: "Good morning everyone, and welcome to Koh Rong Eco-Resort. Breakfast is served daily in the Bamboo Pavilion between 6:30 AM and 9:30 AM. Today's guided mangrove kayaking tour departs from the north pier at 2:00 PM sharp. Single-use plastics are prohibited on the island.",
        questions: [
            { q: "1. Where is breakfast served each morning?", options: ["North Pier", "Bamboo Pavilion", "Boat House"], ans: "Bamboo Pavilion" },
            { q: "2. What time does the kayaking tour depart?", options: ["9:30 AM", "2:00 PM", "4:00 PM"], ans: "2:00 PM" },
            { q: "3. What item is prohibited on the island?", options: ["Single-use plastics", "Kayaks", "Cameras"], ans: "Single-use plastics" }
        ]
    }
];

let currentListeningIndex = 0;
function renderListeningTest(testObj) {
    const titleEl = document.getElementById('listening-title');
    const qBox = document.getElementById('listening-questions-box');
    if (!titleEl || !qBox) return;
    titleEl.textContent = testObj.title;
    document.getElementById('listening-score-box').textContent = "";
    qBox.innerHTML = "";
    testObj.questions.forEach((item, idx) => {
        qBox.innerHTML += `
            <div class="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700">
                <p class="text-sm font-medium mb-2">${item.q}</p>
                <div class="flex flex-wrap gap-3 text-xs">
                    ${item.options.map(opt => `
                        <label class="flex items-center gap-1.5 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
                            <input type="radio" name="listen-q-${idx}" value="${opt}"> ${opt}
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });
}
renderListeningTest(listeningBank[0]);

document.getElementById('btn-ai-listening')?.addEventListener('click', () => {
    window.speechSynthesis?.cancel();
    currentListeningIndex = (currentListeningIndex + 1) % listeningBank.length;
    renderListeningTest(listeningBank[currentListeningIndex]);
});

document.getElementById('btn-play-listening')?.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) return alert("Audio synthesis not supported on this browser.");
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(listeningBank[currentListeningIndex].script);
    utter.lang = "en-GB";
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
});

document.getElementById('btn-stop-listening')?.addEventListener('click', () => window.speechSynthesis?.cancel());

document.getElementById('btn-submit-listening')?.addEventListener('click', () => {
    const testObj = listeningBank[currentListeningIndex];
    let score = 0;
    testObj.questions.forEach((item, idx) => {
        const selected = document.querySelector(`input[name="listen-q-${idx}"]:checked`);
        if (selected && selected.value === item.ans) score++;
    });
    const bandEst = score === 3 ? "8.5" : score === 2 ? "7.0" : score === 1 ? "5.5" : "4.5";
    document.getElementById('listening-score-box').textContent = `Score: ${score}/${testObj.questions.length} (Est. Band ${bandEst})`;
});

document.getElementById('btn-ai-grade-essay')?.addEventListener('click', async () => {
    const essay = document.getElementById('writing-area')?.value.trim();
    const fbBox = document.getElementById('writing-feedback-box');
    if (!fbBox) return;
    if (!essay) {
        fbBox.classList.remove('hide');
        fbBox.innerHTML = `<span class="text-amber-400">Please write your essay first before clicking grade.</span>`;
        return;
    }
    fbBox.classList.remove('hide');
    fbBox.innerHTML = `<span class="text-purple-400 animate-pulse">✨ Evaluating your essay across the 4 IELTS criteria...</span>`;
    const words = essay.split(/\s+/).length;
    const reply = await askIELTSAI(`Grade this IELTS essay (${words} words). Give an estimated Band Score (0-9) for Task Response, Coherence, Lexical Resource, and Grammar, plus 3 specific improvements:\n\n${essay}`);
    fbBox.innerHTML = `<div class="leading-relaxed">${reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>`;
});
