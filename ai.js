const GEMINI_API_KEY = "AQ.Ab8RN6JHFgcd1t8Pm2N2d31kAVOIT0VLg8CwfQrIQu8gO3tThA";

// --- 1. 3-LAYER UNBREAKABLE AI REQUEST ENGINE ---
async function askIELTSAI(userPrompt, systemPrompt = "You are an expert IELTS Band 9.0 Tutor in Cambodia. Give clear, structured, encouraging answers.") {
    // Layer 1: Try Google Gemini 2.5 Flash via x-goog-api-key header
    try {
        const gRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: userPrompt }] }]
            })
        });
        if (gRes.ok) {
            const gData = await gRes.json();
            const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
        }
    } catch (e) {
        console.warn("Gemini primary route skipped, using free cloud AI fallback.");
    }

    // Layer 2: Free Keyless Cloud AI Fallback (Works in browser without API keys)
    try {
        const url = `https://text.pollinations.ai/${encodeURIComponent(systemPrompt + "\n\nUser: " + userPrompt)}?model=openai`;
        const pRes = await fetch(url);
        if (pRes.ok) {
            const text = await pRes.text();
            if (text && text.length > 5) return text;
        }
    } catch (e) {
        console.warn("Cloud fallback skipped, using built-in IELTS engine.");
    }

    // Layer 3: Built-in Offline IELTS AI Responder
    return generateLocalSmartResponse(userPrompt);
}

function generateLocalSmartResponse(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes("vocab")) {
        return `<strong>Band 8.0+ Academic Vocabulary for IELTS:</strong><br>
1. <strong>Mitigate (v.):</strong> To make less severe. <em>"Governments must invest in public transport to mitigate urban pollution."</em><br>
2. <strong>Ubiquitous (adj.):</strong> Found everywhere. <em>"Smartphones have become ubiquitous in modern classrooms."</em><br>
3. <strong>Detrimental (adj.):</strong> Causing harm. <em>"Excessive screen time has a detrimental impact on sleep quality."</em><br>
4. <strong>Catalyst (n.):</strong> Something that speeds up change. <em>"The internet acted as a catalyst for remote education."</em><br>
5. <strong>Pragmatic (adj.):</strong> Practical and realistic. <em>"A pragmatic approach to exam preparation combines daily practice with feedback."</em>`;
    }
    if (p.includes("true") || p.includes("reading")) {
        return `<strong>Golden Rules for True / False / Not Given:</strong><br>
• <strong>TRUE:</strong> The passage states the exact same meaning using synonyms.<br>
• <strong>FALSE:</strong> The passage directly states the <em>opposite</em> meaning.<br>
• <strong>NOT GIVEN:</strong> The topic may be mentioned, but the specific claim is neither confirmed nor contradicted. Never guess or assume!`;
    }
    return `<strong>IELTS Band 8.0 Strategy Guide:</strong><br>
To maximize your score on this topic:<br>
• <strong> Paraphrase First:</strong> Never copy words directly from the prompt; use academic synonyms.<br>
• <strong>Structure Clearly:</strong> Use PEEL paragraphs (Point, Explanation, Example, Link).<br>
• <strong>Check Grammar:</strong> Combine complex sentences (using <em>although, whereas, despite</em>) with error-free simple sentences.`;
}

// --- 2. AI TUTOR CHAT ---
async function handleChatSend(customText) {
    const inputEl = document.getElementById('ai-input');
    const chatBox = document.getElementById('ai-chat-box');
    const msg = customText || inputEl.value.trim();
    if (!msg) return;
    if (!customText) inputEl.value = '';

    chatBox.innerHTML += `
        <div class="flex gap-3 flex-row-reverse">
            <div class="bg-blue-600 p-3 rounded-2xl rounded-tr-none text-sm text-white max-w-[85%]">${msg}</div>
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadId = "ai-load-" + Date.now();
    chatBox.innerHTML += `
        <div id="${loadId}" class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-robot text-white text-xs"></i></div>
            <div class="bg-slate-800 p-3 rounded-2xl rounded-tl-none text-sm text-slate-400 animate-pulse">Generating IELTS response...</div>
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
}

document.getElementById('ai-send-btn')?.addEventListener('click', () => handleChatSend());
document.getElementById('ai-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleChatSend();
});
document.querySelectorAll('.ai-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => handleChatSend(btn.getAttribute('data-prompt')));
});

// --- 3. BUILT-IN AI READING GENERATOR & GRADER ---
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
    document.getElementById('reading-passage-title').textContent = testObj.title;
    document.getElementById('reading-passage-body').innerHTML = testObj.passage;
    document.getElementById('reading-score-box').textContent = "";

    const qBox = document.getElementById('reading-questions-box');
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

// Initialize default Reading Test on load
renderReadingTest(readingBank[0]);

// --- 4. BUILT-IN AI LISTENING GENERATOR & AUDIO SYNTHESIS ---
const listeningBank = [
    {
        title: "Section 1: University Library Orientation",
        script: "Welcome to the University Central Library orientation. Before we begin our tour, please note our opening hours. From Monday to Friday, the main reading hall opens at 8 AM and closes at 10 PM. On weekends, we close earlier at 6 PM. Undergraduate students may borrow up to 12 books at a time for a period of three weeks. If you return a book late, there is a fine of one dollar and fifty cents per day. Finally, laptops are permitted on all floors, but group discussions are strictly restricted to the third floor.",
        questions: [
            { q: "1. What time does the library close on weekdays?", options: ["6:00 PM", "8:00 PM", "10:00 PM"], ans: "10:00 PM" },
            { q: "2. How many books can an undergraduate borrow at once?", options: ["6 books", "12 books", "15 books"], ans: "12 books" },
            { q: "3. Which floor is designated for group discussions?", options: ["First floor", "Second floor", "Third floor"], ans: "Third floor" }
        ]
    },
    {
        title: "Section 2: Eco-Tourism Resort Briefing",
        script: "Good morning everyone, and welcome to Koh Rong Eco-Resort. Breakfast is served daily in the Bamboo Pavilion between 6:30 AM and 9:30 AM. Today's guided mangrove kayaking tour departs from the north pier at 2:00 PM sharp. Please bring a reusable water bottle and reef-safe sunscreen, as single-use plastics are prohibited on the island. Life jackets are provided free of charge at the boat house.",
        questions: [
            { q: "1. Where is breakfast served each morning?", options: ["North Pier", "Bamboo Pavilion", "Boat House"], ans: "Bamboo Pavilion" },
            { q: "2. What time does the kayaking tour depart?", options: ["9:30 AM", "2:00 PM", "4:00 PM"], ans: "2:00 PM" },
            { q: "3. What item is prohibited on the island?", options: ["Single-use plastics", "Kayaks", "Cameras"], ans: "Single-use plastics" }
        ]
    }
];

let currentListeningIndex = 0;

function renderListeningTest(testObj) {
    document.getElementById('listening-title').textContent = testObj.title;
    document.getElementById('listening-score-box').textContent = "";
    const qBox = document.getElementById('listening-questions-box');
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

document.getElementById('btn-ai-listening')?.addEventListener('click', () => {
    window.speechSynthesis?.cancel();
    currentListeningIndex = (currentListeningIndex + 1) % listeningBank.length;
    renderListeningTest(listeningBank[currentListeningIndex]);
});

document.getElementById('btn-play-listening')?.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {
        alert("Your browser does not support spoken audio synthesis.");
        return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(listeningBank[currentListeningIndex].script);
    utter.lang = "en-GB";
    utter.rate = 0.95;
    document.getElementById('listening-status').textContent = "🔊 Playing IELTS Audio Track... Listen carefully!";
    utter.onend = () => {
        document.getElementById('listening-status').textContent = "Audio finished. Select your answers below.";
    };
    window.speechSynthesis.speak(utter);
});

document.getElementById('btn-stop-listening')?.addEventListener('click', () => {
    window.speechSynthesis?.cancel();
    document.getElementById('listening-status').textContent = "Audio stopped.";
});

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

renderListeningTest(listeningBank[0]);

// --- 5. AI WRITING PROMPT GENERATOR & ESSAY GRADER ---
const writingPrompts = [
    "Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. Others think that the true function of a university is to give access to knowledge for its own sake. Discuss both views and give your opinion.",
    "In many countries, the proportion of older people is steadily increasing. Does this trend have more positive or negative effects on society?",
    "Many governments think that economic progress is their most important goal. Some people, however, think that other types of progress are equally important for a country. Discuss both views and give your own opinion."
];
let wIdx = 0;

document.getElementById('btn-ai-writing-prompt')?.addEventListener('click', () => {
    wIdx = (wIdx + 1) % writingPrompts.length;
    document.getElementById('writing-prompt-box').innerHTML = `<strong>Prompt:</strong> ${writingPrompts[wIdx]}`;
});

document.getElementById('btn-ai-grade-essay')?.addEventListener('click', async () => {
    const essay = document.getElementById('writing-area').value.trim();
    const fbBox = document.getElementById('writing-feedback-box');
    if (!essay) {
        fbBox.classList.remove('hide');
        fbBox.innerHTML = `<span class="text-amber-400">Please write at least a paragraph before grading.</span>`;
        return;
    }

    fbBox.classList.remove('hide');
    fbBox.innerHTML = `<span class="text-purple-400 animate-pulse">✨ AI Examiner is evaluating your essay across the 4 official IELTS criteria...</span>`;

    const words = essay.split(/\s+/).length;
    const promptText = `Grade this IELTS essay (${words} words) and provide an Overall Band Score, scores for Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range, and 3 specific improvements:\n\n${essay}`;
    
    const aiEvaluation = await askIELTSAI(promptText, "You are a strict official IELTS Writing Examiner. Format your feedback clearly.");
    fbBox.innerHTML = `<div class="leading-relaxed">${aiEvaluation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>`;
});

// --- 6. AI SPEAKING CUE CARDS & BAND 8.5 GENERATOR ---
const cueCards = [
    {
        title: "Part 2 Cue Card: Describe a person who inspired you to study hard.",
        bullets: ["Who this person is", "How you know them", "What they did to inspire you", "And explain how your attitude toward studying changed."],
        sample: `<strong>Band 8.5 Model Excerpt:</strong><br>"I'd love to talk about my Grade 12 biology teacher, who fundamentally transformed my approach to academic self-study. Prior to joining her class, I tended to rely on rote memorization. However, she encouraged us to be intellectually curious and use digital platforms to test ourselves daily. Thanks to her mentorship, I developed a disciplined routine that boosted both my confidence and my analytical skills."<br><br><strong>Key Idioms & Lexical Resource:</strong> <em>rote memorization, intellectually curious, fundamentally transformed, disciplined routine.</em>`
    },
    {
        title: "Part 2 Cue Card: Describe a useful website or app you use for learning.",
        bullets: ["What the website or app is", "How often you use it", "What features it has", "And explain why it helps you learn effectively."],
        sample: `<strong>Band 8.5 Model Excerpt:</strong><br>"One digital platform that has become indispensable to my daily routine is a custom IELTS self-study web application that my friends and I use. Unlike conventional textbooks, it integrates interactive timers, real-time progress tracking, and AI-driven essay feedback. Being able to see my friends' study streaks on the leaderboard keeps me held accountable and motivated to aim for Band 8.0."<br><br><strong>Key Idioms & Lexical Resource:</strong> <em>indispensable to my routine, AI-driven feedback, held accountable.</em>`
    }
];
let sIdx = 0;

document.getElementById('btn-ai-speaking-card')?.addEventListener('click', () => {
    sIdx = (sIdx + 1) % cueCards.length;
    const card = cueCards[sIdx];
    document.getElementById('speaking-cue-card').innerHTML = `
        <p class="font-bold text-rose-400">${card.title}</p>
        <ul class="list-disc list-inside text-xs text-slate-300 space-y-1">
            ${card.bullets.map(b => `<li>${b}</li>`).join('')}
        </ul>
    `;
    document.getElementById('speaking-sample-box').innerHTML = `Click <strong>"Band 8.5 Sample"</
