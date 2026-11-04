
const API_BASE_URL = "";

const $ = (id) => document.getElementById(id);

const form = $("researchForm");
const queryInput = $("queryInput");
const searchBtn = $("searchBtn");

const welcomeSection = $("welcomeSection");
const resultsSection = $("resultsSection");
const historySection = $("historySection");
const loadingState = $("loadingState");
const errorBox = $("errorBox");

let conversations = [];

// Display errors
function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function clearError() {
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
}

// Safely read API responses
async function readApiResponse(response) {
    const raw = await response.text();

    if (!raw.trim()) {
        throw new Error(
            `API returned an empty response (HTTP ${response.status}).`
        );
    }

    try {
        return JSON.parse(raw);
    } catch {
        throw new Error(
            `API returned invalid JSON (HTTP ${response.status}). ` +
            `Response: ${raw.slice(0, 200)}`
        );
    }
}

// Loading state
function setLoading(active) {
    loadingState.classList.toggle("hidden", !active);
    searchBtn.disabled = active;
    searchBtn.textContent = active ? "Searching..." : "⌕ Research";
}

// Screen navigation
function showScreen(screen) {
    welcomeSection.classList.toggle("hidden", screen !== "welcome");
    resultsSection.classList.toggle("hidden", screen !== "results");
    historySection.classList.toggle("hidden", screen !== "history");

    clearError();

    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.classList.toggle(
            "active",
            (screen === "welcome" && btn.id !== "historyNav") ||
            (screen === "history" && btn.id === "historyNav")
        );
    });
}

// Date formatting
function safeDate(value) {
    if (!value) return "Date unavailable";

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return "Date unavailable";
    }

    return parsed.toLocaleString();
}

// Render research sources
function renderSources(sources = []) {
    const container = $("sourcesList");
    container.replaceChildren();

    if (!sources.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No research sources found.";
        container.appendChild(empty);
        return;
    }

    sources.forEach((source, index) => {
        const card = document.createElement("article");
        card.className = "source-card";

        const top = document.createElement("div");
        top.className = "source-top";

        const rank = document.createElement("span");
        rank.className = "rank";
        rank.textContent = source.result_rank || index + 1;

        const title = document.createElement("h4");
        title.textContent = source.title || "Untitled source";

        top.append(rank, title);

        const snippet = document.createElement("p");
        snippet.textContent =
            source.snippet || "No description available.";

        const meta = document.createElement("div");
        meta.className = "source-meta";

        const link = document.createElement("a");
        link.textContent = "Open original source ↗";

        try {
            const url = new URL(source.url);

            if (["http:", "https:"].includes(url.protocol)) {
                link.href = url.href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
            } else {
                link.textContent = "Invalid source URL";
            }
        } catch {
            link.textContent = "Invalid source URL";
        }

        const date = document.createElement("span");

        date.textContent = source.source_date
            ? `Published: ${source.source_date}`
            : source.last_updated
                ? `Updated: ${source.last_updated}`
                : "Date not available";

        meta.append(link, date);
        card.append(top, snippet, meta);

        container.appendChild(card);
    });
}

// Run new research
async function runResearch(query, maxResults) {
    clearError();
    showScreen("welcome");
    setLoading(true);
    resultsSection.classList.add("hidden");

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/v1/research/chat`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    query,
                    max_results: maxResults
                })
            }
        );

        const payload = await readApiResponse(response);

        if (!response.ok) {
            throw new Error(
                payload.detail || `Server error ${response.status}`
            );
        }

        if (!payload.success || !payload.data) {
            throw new Error(
                "Unexpected response from research API."
            );
        }

        const data = payload.data;

        $("resultTitle").textContent = query;

        $("resultDescription").textContent =
            data.assistant_message || "Research completed.";

        $("sourceCount").textContent = data.total_sources ?? 0;

        renderSources(data.sources || []);

        showScreen("results");

        await loadHistory();

    } catch (error) {
        console.error("Research failed:", error);
        showError(error.message || "Research request failed.");
    } finally {
        setLoading(false);
    }
}

// Render research history
function renderHistory(items) {
    const sidebar = $("historyList");
    const cards = $("historyCards");

    sidebar.replaceChildren();
    cards.replaceChildren();

    if (!items.length) {
        const message = document.createElement("p");

        message.className = "muted small";
        message.textContent = "No research history yet.";

        sidebar.appendChild(message);

        $("historyEmpty").classList.remove("hidden");
        return;
    }

    $("historyEmpty").classList.add("hidden");

    items.forEach(conversation => {
        // Sidebar history entry
        const sideButton = document.createElement("button");

        sideButton.className = "history-item";
        sideButton.textContent =
            conversation.title || "Untitled research";

        sideButton.title = conversation.title || "";

        sideButton.addEventListener("click", () => {
            loadConversation(conversation.id);
        });

        sidebar.appendChild(sideButton);

        // Main history card
        const card = document.createElement("article");
        card.className = "history-card";

        const heading = document.createElement("h3");

        heading.textContent =
            conversation.title || "Untitled research";

        const date = document.createElement("p");

        date.textContent =
            `Created: ${safeDate(conversation.created_at)}`;

        const openButton = document.createElement("button");

        openButton.className = "history-open-btn";
        openButton.textContent = "Open research →";

        openButton.addEventListener("click", () => {
            loadConversation(conversation.id);
        });

        card.append(heading, date, openButton);
        cards.appendChild(card);
    });
}

// Load all history
async function loadHistory() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/v1/research/conversations`,
            {
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        const payload = await readApiResponse(response);

        if (!response.ok) {
            throw new Error(
                payload.detail || `History API returned ${response.status}`
            );
        }

        if (
            !payload.success ||
            !Array.isArray(payload.conversations)
        ) {
            throw new Error("Invalid history response.");
        }

        conversations = payload.conversations;

        renderHistory(conversations);

    } catch (error) {
        console.error("History loading failed:", error);

        conversations = [];

        $("historyList").textContent =
            "Could not load history.";

        $("historyCards").textContent = "";

        $("historyEmpty").classList.remove("hidden");
    }
}

// Load an individual conversation
async function loadConversation(id) {
    clearError();
    setLoading(true);
    showScreen("results");

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/v1/research/conversations/${encodeURIComponent(id)}`,
            {
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        const payload = await readApiResponse(response);

        if (!response.ok) {
            throw new Error(
                payload.detail || "Could not load conversation."
            );
        }

        if (!payload.success || !payload.conversation) {
            throw new Error("Invalid conversation response.");
        }

        const assistant = (payload.messages || []).find(
            message => message.role === "assistant"
        );

        $("resultTitle").textContent =
            payload.conversation.title || "Untitled research";

        $("resultDescription").textContent =
            assistant?.content || "Previous research conversation.";

        $("sourceCount").textContent =
            (payload.sources || []).length;

        renderSources(payload.sources || []);

        showScreen("results");

    } catch (error) {
        console.error("Conversation loading failed:", error);
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

// Research form submission
form.addEventListener("submit", async event => {
    event.preventDefault();

    const query = queryInput.value.trim();

    if (query.length < 3) {
        showError("Please enter at least 3 characters.");
        return;
    }

    await runResearch(
        query,
        Number($("resultCount").value)
    );
});

// Navigation
$("newChatBtn").addEventListener("click", () => {
    showScreen("welcome");
    queryInput.focus();
});

$("newResearchBtn").addEventListener("click", () => {
    showScreen("welcome");
    queryInput.focus();
});

$("historyNav").addEventListener("click", async () => {
    showScreen("history");
    await loadHistory();
});

$("historyNewResearchBtn").addEventListener("click", () => {
    showScreen("welcome");
    queryInput.focus();
});

$("refreshHistoryBtn").addEventListener("click", loadHistory);

// History search
$("historySearch").addEventListener("input", event => {
    const term = event.target.value.toLowerCase().trim();

    const filtered = conversations.filter(item =>
        (item.title || "").toLowerCase().includes(term)
    );

    renderHistory(filtered);
});

// Suggested queries
document.querySelectorAll(".suggestion").forEach(button => {
    button.addEventListener("click", () => {
        queryInput.value = button.textContent.trim();
        queryInput.focus();
    });
});

// Initial history load
loadHistory();
