const GEMINI_API_KEY = "AQ.Ab8RN6J_hXFh98X_30h_2yNyYDGDwdoK1Yf5Ei6pC7_EyPHi2g"; 

document.getElementById('ai-form')?.addEventListener('submit', async (e) => {
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
            <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-robot text-white"></i></div>
            <div class="bg-slate-800 p-3 rounded-xl rounded-tl-none text-sm text-slate-400 animate-pulse">Thinking...</div>
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // Detect if using an Auth Token (AQ.) or a standard API Key (AIza)
        const isAuthKey = GEMINI_API_KEY.startsWith("AQ.");
        const endpoint = isAuthKey 
            ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
            : `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            
        const headers = { 'Content-Type': 'application/json' };
        if (isAuthKey) headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: "You are an expert AI tutor for a Grade 12 student at វិទ្យាល័យ បឹងត្របែក in Cambodia. Keep answers concise, highly supportive, and focused on helping them score a Band 8.0+ in IELTS." }]
                },
                contents: [{ parts: [{ text: msg }] }]
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
        chatBox.innerHTML += `<div class="text-red-400 text-xs text-center mt-2">API Error: ${error.message}</div>`;
    }
});
