
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const tags = document.querySelectorAll('.tag');

// Finance Keywords for Gatekeeping
const FINANCE_KEYWORDS = [
    'money', 'finance', 'invest', 'save', 'budget', 'stock', 'share', 'market', 'nifty', 'sensex',
    'bank', 'upi', 'sip', 'mutual', 'fund', 'fd', 'rd', 'tax', 'gst', 'income', 'credit', 'loan',
    'score', 'insurance', 'crypto', 'bitcoin', 'scholarship', 'student', 'salary', 'wealth',
    'rupee', 'profit', 'loss', 'portfolio', 'trading', 'broker', 'sebi', 'rbi', 'card', 'emi',
    'nps', 'ppf', 'elss', 'sensex', 'gold', 'bond', 'dividend', 'return', 'riskcard'
];

const OFF_TOPIC_REPLY = "I'm Rizer AI, your personal finance coach! I can only help with money and finance topics. Ask me anything about saving, investing, or managing money! 💰";

const BASE_URL = "https://rohith2006345-rizer-rohith.hf.space";

// ========================
// Gradio 5 API — two-step
// ========================
async function callRizerAPI(question) {
    // Step 1: POST to submit the job → get event_id
    const submitRes = await fetch(`${BASE_URL}/gradio_api/call/ask_rizer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [question] })
    });

    if (!submitRes.ok) {
        throw new Error(`Submit failed: ${submitRes.status}`);
    }

    const submitJson = await submitRes.json();
    const eventId = submitJson.event_id;

    if (!eventId) throw new Error("No event_id in response");

    // Step 2: GET result via Server-Sent Events stream
    return new Promise((resolve, reject) => {
        const eventSource = new EventSource(
            `${BASE_URL}/gradio_api/call/ask_rizer/${eventId}`
        );

        let timeout = setTimeout(() => {
            eventSource.close();
            reject(new Error("Timeout waiting for response"));
        }, 300000); // 5-minute timeout (model may need to warm up on first call)

        eventSource.addEventListener("complete", (event) => {
            clearTimeout(timeout);
            eventSource.close();
            try {
                const data = JSON.parse(event.data);
                // data is an array, first element is the answer
                resolve(data[0]);
            } catch {
                reject(new Error("Failed to parse response"));
            }
        });

        eventSource.addEventListener("error", (event) => {
            clearTimeout(timeout);
            eventSource.close();
            // If the stream throws but event.data has our answer, try parsing
            if (event.data) {
                try {
                    const data = JSON.parse(event.data);
                    if (data && data[0]) { resolve(data[0]); return; }
                } catch { }
            }
            reject(new Error("Stream error"));
        });

        // Some Gradio versions send 'generating' then 'complete'
        eventSource.onmessage = (event) => {
            if (!event.data || event.data === "null") return;
            // ignore heartbeat/generating events unless they look like final answers
        };
    });
}

// ========================
//    UI Logic
// ========================

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    userInput.value = '';

    // Disable input while waiting
    userInput.disabled = true;
    sendBtn.disabled = true;

    // Show thinking indicator with live elapsed-time counter
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message fade-in';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="bubble typing-bubble">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            &nbsp; <span id="thinking-text">Connecting to Rizer AI...</span>
        </div>
    `;
    chatWindow.appendChild(typingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Live countdown text to reassure user
    let elapsed = 0;
    const thinkingInterval = setInterval(() => {
        elapsed++;
        const el = document.getElementById('thinking-text');
        if (!el) { clearInterval(thinkingInterval); return; }
        if (elapsed < 5) el.textContent = "Connecting to Rizer AI...";
        else if (elapsed < 15) el.textContent = `Rizer AI is thinking... (${elapsed}s)`;
        else el.textContent = `Model warming up, please wait... (${elapsed}s)`;
    }, 1000);

    try {
        const response = await generateAIResponse(text);
        clearInterval(thinkingInterval);
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
        appendMessage(response, 'bot');
    } catch (error) {
        clearInterval(thinkingInterval);
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
        appendMessage("I'm sorry, I'm having trouble connecting right now. Please try again in a moment! 🌐", 'bot');
        console.error("API Error:", error);
    } finally {
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message fade-in`;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = sender === 'bot' ? '🤖' : '👤';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    // Render markdown-style: **bold**, *italic*, numbered lists, bullet points
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n(\d+\.\s)/g, '<br><strong>$1</strong>')
        .replace(/\n[-•]\s/g, '<br>• ')
        .replace(/\n/g, '<br>');

    bubble.innerHTML = formatted;

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function generateAIResponse(input) {
    const lowerInput = input.toLowerCase();

    // Gatekeeping
    const isFinance = FINANCE_KEYWORDS.some(kw => lowerInput.includes(kw));
    const GREETINGS = ['hi', 'hello', 'namaste', 'hey', 'rizz', 'rizer', 'good morning', 'good evening'];
    const isGreeting = GREETINGS.some(g => lowerInput.startsWith(g) || lowerInput === g);

    if (!isFinance && !isGreeting) {
        return OFF_TOPIC_REPLY;
    }

    if (isGreeting) {
        return "Namaste! 🙏 I'm Rizer AI — your personal finance coach for the Indian youth. Ask me anything about SIPs, mutual funds, budgeting, taxes, or the stock market!";
    }

    // Call the real API using Gradio 5 two-step pattern
    return await callRizerAPI(input);
}

// Market ticker animation
function updateTicker() {
    const items = document.querySelectorAll('.ticker-item');
    items.forEach(item => {
        const trend = item.querySelector('span');
        if (Math.random() > 0.8) {
            const up = Math.random() > 0.5;
            const change = (Math.random() * 0.5).toFixed(2);
            trend.className = up ? 'trend-up' : 'trend-down';
            trend.textContent = `${up ? '▲' : '▼'} ${change}%`;
        }
    });
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) sendMessage();
});

tags.forEach(tag => {
    tag.addEventListener('click', () => {
        userInput.value = tag.textContent.replace(/[📈🏦🧾]/g, '').trim();
        sendMessage();
    });
});

setInterval(updateTicker, 3000);
console.log('Rizer AI initialized 🚀 — Connected to HF Space API');
