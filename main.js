
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const tags = document.querySelectorAll('.tag');

// User profile state
let userProfile = {
    age: null,
    income: null,
    goal: null
};

// Finance Keywords for Gatekeeping
const FINANCE_KEYWORDS = [
    'money', 'finance', 'invest', 'save', 'budget', 'stock', 'share', 'market', 'nifty', 'sensex', 
    'bank', 'upi', 'sip', 'mutual', 'fund', 'fd', 'rd', 'tax', 'gst', 'income', 'credit', 'loan', 
    'score', 'insurance', 'crypto', 'bitcoin', 'scholarship', 'student', 'salary', 'wealth', 
    'rupee', 'profit', 'loss', 'portfolio', 'trading', 'broker', 'sebi', 'rbi', 'bank', 'card'
];

const OFF_TOPIC_REPLY = "I'm Rizer AI, your personal finance coach! I can only help with money and finance topics. Ask me anything about saving, investing, or managing money! 💰";

// Handle Send
function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Append User Message
    appendMessage(text, 'user');
    userInput.value = '';

    // Process Bot Response
    setTimeout(() => {
        const response = generateAIResponse(text.toLowerCase());
        appendMessage(response, 'bot');
    }, 600);
}

function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = sender === 'bot' ? '🤖' : '👤';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = text.replace(/\n/g, '<br>');

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    chatWindow.appendChild(msgDiv);
    
    // Scroll to bottom
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function generateAIResponse(input) {
    // 1. Check for off-topic (Gatekeeping)
    const isFinance = FINANCE_KEYWORDS.some(kw => input.includes(kw));
    
    // Special check for intro/greetings
    const GREETINGS = ['hi', 'hello', 'namaste', 'hey', 'rizz', 'rizer'];
    const isGreeting = GREETINGS.some(g => input.startsWith(g) || input === g);

    if (!isFinance && !isGreeting) {
        return OFF_TOPIC_REPLY;
    }

    // 2. Profile tracking (Simple regex/checks)
    if (input.includes('age') || input.match(/\d{2}/)) {
        const ageMatch = input.match(/\d{2}/);
        if (ageMatch) {
            const age = parseInt(ageMatch[0]);
            if (age >= 13 && age <= 28) {
                userProfile.age = age;
                return `Got it! You're ${age}. Since you're in the 13-28 bracket, we can plan your finances early. Are you a student or starting your first job?`;
            }
        }
    }

    if (input.includes('income') || input.includes('earn') || input.includes('salary')) {
        return "That's good to know! Knowing your income helps me suggest better budgeting splits (like the 50/30/20 rule). What's your main financial goal? Buying a gadget, higher education, or just long-term wealth?";
    }

    // 3. Finance Queries (Simple logic for demo)
    if (input.includes('sip')) {
        return "Systematic Investment Plan (SIP) is like a subscription to wealth! 📈 Even ₹500/month in an Index Fund can grow significantly over 10 years thanks to compounding. Want to see how much you could make?";
    }

    if (input.includes('stock') || input.includes('market')) {
        return "The Indian Stock Market (NSE/BSE) is where you buy parts of companies. For beginners, I recommend Nifty 50 Index Funds—they are less risky than picking individual stocks. Remember, I don't give specific stock tips! 🚫📈";
    }

    if (input.includes('tax')) {
        return "Income Tax in India has two regimes now: Old and New. If you're a student or early earner, you likely won't pay much, but it's good to track your Form 16! 🧾";
    }

    if (input.includes('budget') || input.includes('save')) {
        return "Budgeting is key! 🏦 Try the **50-30-20 rule**: 50% for Needs, 30% for Wants, and 20% for Savings/Investments. Want me to help you split a specific amount?";
    }

    if (isGreeting) {
        return "Namaste! I'm Rizer AI. I'm here to help you navigate the world of Indian finance. What's on your mind? (SIPs, Taxes, Savings, or even your first Credit Card?)";
    }

    // Fallback finance response
    return "That sounds like a great finance topic! As your older sibling in finance, I'd say the best time to start is now. Could you tell me more about what you're looking for?";
}

// Market ticker "Dynamicness"
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
    if (e.key === 'Enter') sendMessage();
});

tags.forEach(tag => {
    tag.addEventListener('click', () => {
        userInput.value = tag.textContent.replace(/[📈🏦🧾]/g, '').trim();
        sendMessage();
    });
});

setInterval(updateTicker, 3000);
console.log('Rizer AI initialized 🚀');
