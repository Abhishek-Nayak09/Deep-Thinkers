// script.js

document.addEventListener("DOMContentLoaded", () => {
    // ===== BASIC ELEMENT HOOKS =====
    const views = {
        chatbot: document.getElementById("chatbot-view"),
        grammar: document.getElementById("grammar-view"),
        summarizer: document.getElementById("summarizer-view"),
    };

    const sidebarItems = document.querySelectorAll(".sidebar-item");
    const chatFab = document.getElementById("chatFab");

    // Grammar elements
    const grammarInput = document.getElementById("grammarInput");
    const grammarCharCount = document.getElementById("grammarCharCount");
    const grammarSubmitBtn = document.getElementById("grammarSubmitBtn");
    const grammarPlaceholder = document.getElementById("grammarPlaceholder");
    const grammarResults = document.getElementById("grammarResults");
    const mistakeCountEl = document.getElementById("mistakeCount");
    const correctnessPercentEl = document.getElementById("correctnessPercent");
    const issuesContainer = document.getElementById("issuesContainer");
    const grammarIssuesView = document.getElementById("grammarIssuesView");
    const grammarSuggestionsView = document.getElementById("grammarSuggestionsView");
    const suggestionsContainer = document.getElementById("suggestionsContainer");
    const grammarTabs = document.querySelectorAll(".grammar-tab");

    // NEW: Summarizer elements
    const summarizerInput = document.getElementById("summarizerInput");
    const summarizerPoints = document.getElementById("summarizerPoints");
    const summarizerSubmitBtn = document.getElementById("summarizerSubmitBtn");
    const summarizerPlaceholder = document.getElementById("summarizerPlaceholder");
    const summarizerResults = document.getElementById("summarizerResults");
    const summarizerList = document.getElementById("summarizerList");

    // Chatbot elements
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const chatWindow = document.getElementById("chatWindow");
    const quickChips = document.querySelectorAll("[data-chat-intent]");

    // ===== UTILITIES =====

    function switchView(viewName) {
        // toggle main views
        Object.values(views).forEach((v) => v && v.classList.remove("view-active"));
        if (views[viewName]) {
            views[viewName].classList.add("view-active");
        }
        // sync sidebar state
        sidebarItems.forEach((item) => {
            const target = item.dataset.view;
            if (target === viewName) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });
    }

    function addChatMessage(type, text) {
        const msg = document.createElement("div");
        msg.className = "chat-message " + type;
        msg.innerHTML = "<p>" + text + "</p>";
        chatWindow.appendChild(msg);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function setLoadingState(button, isLoading, fallbackText) {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = "Processing...";
            button.disabled = true;
        } else {
            const original = button.dataset.originalText;
            button.textContent = original || fallbackText || "Submit";
            button.disabled = false;
        }
    }

    const handleCharCount = (inputEl, labelEl) => {
        if (!inputEl || !labelEl) return;
        labelEl.textContent = inputEl.value.length + " characters";
    };

    function computeWordStats(original, corrected) {
        const normalize = (s) =>
            (s || "")
                .toLowerCase()
                .replace(/[^\w\s]/g, " ")
                .replace(/\s+/g, " ")
                .trim();

        const origWords = normalize(original).split(" ").filter(Boolean);
        const corrWords = normalize(corrected).split(" ").filter(Boolean);
        const maxLen = Math.max(origWords.length, corrWords.length);

        if (maxLen === 0) {
            return { mismatches: 0, correctness: 100 };
        }

        let mismatches = 0;
        for (let i = 0; i < maxLen; i++) {
            const ow = origWords[i] || "";
            const cw = corrWords[i] || "";
            if (ow !== cw) {
                mismatches++;
            }
        }

        let correctness = Math.round(100 * (1 - mismatches / maxLen));
        if (correctness < 0) correctness = 0;
        if (correctness > 100) correctness = 100;

        return { mismatches, correctness };
    }

    // ===== SIDEBAR NAV BEHAVIOR =====

    sidebarItems.forEach((item) => {
        item.addEventListener("click", () => {
            const targetView = item.dataset.view;
            switchView(targetView);
        });
    });

    // FAB re-opens chatbot
    if (chatFab) {
        chatFab.addEventListener("click", () => {
            switchView("chatbot");
        });
    }

    // ===== CHARACTER COUNTS =====

    if (grammarInput && grammarCharCount) {
        grammarInput.addEventListener("input", () =>
            handleCharCount(grammarInput, grammarCharCount)
        );
    }

    // ===== BACKEND CALLS =====

    async function callGrammarApi(text) {
        const res = await fetch("/api/grammar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        if (!res.ok) {
            throw new Error("Grammar API failed");
        }
        return await res.json();
    }

    async function callSummarizerApi(text, maxPoints) {
        const res = await fetch("/api/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, max_points: maxPoints }),
        });
        if (!res.ok) {
            throw new Error("Summarizer API failed");
        }
        return await res.json();
    }

    // ===== GLOBAL GRAMMAR TABS (ISSUES / SUGGESTIONS) =====

    if (grammarTabs && grammarTabs.length > 0) {
        grammarTabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                var target = tab.getAttribute("data-grammar-tab");

                grammarTabs.forEach(function (t) {
                    t.classList.remove("active");
                });
                tab.classList.add("active");

                if (target === "issues") {
                    if (grammarIssuesView) {
                        grammarIssuesView.classList.add("active");
                    }
                    if (grammarSuggestionsView) {
                        grammarSuggestionsView.classList.remove("active");
                    }
                } else if (target === "suggestions") {
                    if (grammarIssuesView) {
                        grammarIssuesView.classList.remove("active");
                    }
                    if (grammarSuggestionsView) {
                        grammarSuggestionsView.classList.add("active");
                    }
                }
            });
        });
    }

    // ===== GRAMMAR SUBMIT FLOW =====

    if (grammarSubmitBtn) {
        grammarSubmitBtn.addEventListener("click", async () => {
            const text = grammarInput.value.trim();
            if (!text) {
                alert("Please enter some text to check.");
                return;
            }

            grammarPlaceholder.classList.add("hidden");
            grammarResults.classList.remove("hidden");

            setLoadingState(grammarSubmitBtn, true, "Submit");

            try {
                const data = await callGrammarApi(text);
                renderGrammarResults(data);
            } catch (err) {
                console.error(err);
                alert("Something went wrong while checking grammar.");
            } finally {
                setLoadingState(grammarSubmitBtn, false, "Submit");
            }
        });
    }

    function renderGrammarResults(data) {
        let mistakeCount = 0;
        let correctness = 100;

        if (data && Array.isArray(data.issues) && data.issues.length > 0) {
            const mainIssue = data.issues[0];
            if (mainIssue && mainIssue.sentence && mainIssue.suggestion) {
                const stats = computeWordStats(
                    mainIssue.sentence,
                    mainIssue.suggestion
                );
                mistakeCount = stats.mismatches;
                correctness = stats.correctness;
            } else {
                if (typeof data.mistakeCount === "number") {
                    mistakeCount = data.mistakeCount;
                }
                if (typeof data.correctness === "number") {
                    correctness = data.correctness;
                }
            }
        } else {
            if (data) {
                if (typeof data.mistakeCount === "number") {
                    mistakeCount = data.mistakeCount;
                }
                if (typeof data.correctness === "number") {
                    correctness = data.correctness;
                }
            }
        }

        mistakeCountEl.textContent = mistakeCount;
        correctnessPercentEl.textContent = correctness + "%";

        // Reset containers
        issuesContainer.innerHTML = "";
        if (suggestionsContainer) {
            suggestionsContainer.innerHTML = "";
        }

        // Reset tabs to default: Issues active
        if (grammarIssuesView && grammarSuggestionsView) {
            grammarIssuesView.classList.add("active");
            grammarSuggestionsView.classList.remove("active");
        }
        if (grammarTabs && grammarTabs.length > 0) {
            grammarTabs.forEach(function (t) {
                if (t.getAttribute("data-grammar-tab") === "issues") {
                    t.classList.add("active");
                } else {
                    t.classList.remove("active");
                }
            });
        }

        // Handle ISSUES
        if (!data.issues || data.issues.length === 0) {
            const okCard = document.createElement("div");
            okCard.className = "issue-card";
            okCard.innerHTML =
                "<p><strong>No issues found.</strong> Your text looks good!</p>";
            issuesContainer.appendChild(okCard);

            if (suggestionsContainer) {
                const sItem = document.createElement("div");
                sItem.className = "suggestion-item";
                sItem.innerHTML =
                    '<span class="suggestion-label">Suggestions</span>' +
                    "<p>Your text is already in good shape. You could still simplify long sentences or vary your word choice for style.</p>";
                suggestionsContainer.appendChild(sItem);
            }
            return;
        }

        // There ARE issues
        data.issues.forEach((issue, idx) => {
            const card = document.createElement("div");
            card.className = "issue-card";

            const sentenceText = issue.sentence ? '"' + issue.sentence + '"' : "";

            const whatIsWrong = issue.whatIsWrong || "Description not provided.";
            const whyItsWrong = issue.whyItsWrong || "Explanation not provided.";
            const suggestionHtml = issue.suggestion
                ? "<p><strong>Suggestion:</strong> " +
                issue.suggestion +
                "</p>"
                : "";

            card.innerHTML =
                '<div class="issue-header">' +
                '<span class="issue-label">Issue ' +
                (idx + 1) +
                "</span>" +
                '<span class="issue-sentence">' +
                sentenceText +
                "</span>" +
                "</div>" +
                '<div class="issue-tabs">' +
                '<button class="issue-tab active" data-tab="what">What is wrong</button>' +
                "<button class=\"issue-tab\" data-tab=\"why\">Why it's wrong</button>" +
                "</div>" +
                '<div class="issue-content active" data-content="what">' +
                "<p>" +
                whatIsWrong +
                "</p>" +
                suggestionHtml +
                "</div>" +
                '<div class="issue-content" data-content="why">' +
                "<p>" +
                whyItsWrong +
                "</p>" +
                "</div>";

            issuesContainer.appendChild(card);
        });

        // Build SUGGESTIONS tab content using all issue suggestions
        if (suggestionsContainer) {
            let suggestionIndex = 1;
            data.issues.forEach(function (issue) {
                if (issue.suggestion) {
                    const sItem = document.createElement("div");
                    sItem.className = "suggestion-item";
                    sItem.innerHTML =
                        '<span class="suggestion-label">Suggestion ' +
                        suggestionIndex +
                        "</span>" +
                        "<p>" +
                        issue.suggestion +
                        "</p>";
                    suggestionsContainer.appendChild(sItem);
                    suggestionIndex += 1;
                }
            });

            if (suggestionsContainer.children.length === 0) {
                const sItem = document.createElement("div");
                sItem.className = "suggestion-item";
                sItem.innerHTML =
                    '<span class="suggestion-label">Suggestions</span>' +
                    "<p>No specific suggestions were provided by the model. You can still try simplifying long sentences, fixing tense consistency, and avoiding repeated words.</p>";
                suggestionsContainer.appendChild(sItem);
            }
        }

        // Attach per-issue "What / Why" tab listeners
        const issueCards = issuesContainer.querySelectorAll(".issue-card");
        issueCards.forEach((card) => {
            const tabs = card.querySelectorAll(".issue-tab");
            const contents = card.querySelectorAll(".issue-content");

            tabs.forEach((tab) => {
                tab.addEventListener("click", () => {
                    const target = tab.dataset.tab;
                    tabs.forEach((t) => t.classList.remove("active"));
                    tab.classList.add("active");

                    contents.forEach((c) => {
                        if (c.dataset.content === target) {
                            c.classList.add("active");
                        } else {
                            c.classList.remove("active");
                        }
                    });
                });
            });
        });
    }

    // ===== SUMMARIZER SUBMIT FLOW =====

    function renderSummarizerResults(data) {
        if (!summarizerList) return;
        summarizerList.innerHTML = "";

        if (!data || !Array.isArray(data.bullets) || data.bullets.length === 0) {
            const sItem = document.createElement("div");
            sItem.className = "suggestion-item";
            sItem.innerHTML =
                '<span class="suggestion-label">Summary</span>' +
                "<p>No summary generated. Try providing more detailed input text.</p>";
            summarizerList.appendChild(sItem);
            return;
        }

        data.bullets.forEach((b, idx) => {
            const sItem = document.createElement("div");
            sItem.className = "suggestion-item";
            sItem.innerHTML =
                '<span class="suggestion-label">Point ' +
                (idx + 1) +
                "</span>" +
                "<p>" +
                b +
                "</p>";
            summarizerList.appendChild(sItem);
        });
    }

    if (summarizerSubmitBtn) {
        summarizerSubmitBtn.addEventListener("click", async () => {
            const text = summarizerInput.value.trim();
            if (!text) {
                alert("Please enter some text to summarize.");
                return;
            }

            let maxPoints = parseInt(summarizerPoints.value || "5", 10);
            if (isNaN(maxPoints) || maxPoints <= 0) maxPoints = 5;

            summarizerPlaceholder.classList.add("hidden");
            summarizerResults.classList.remove("hidden");

            setLoadingState(summarizerSubmitBtn, true, "Summarize");

            try {
                const data = await callSummarizerApi(text, maxPoints);
                renderSummarizerResults(data);
            } catch (err) {
                console.error(err);
                alert("Something went wrong while summarizing.");
            } finally {
                setLoadingState(summarizerSubmitBtn, false, "Summarize");
            }
        });
    }

    // ===== CHATBOT INTERACTION =====

    quickChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            const intent = chip.dataset.chatIntent;
            routeFromChatIntent(intent);
        });
    });

    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;

            addChatMessage("user", text);
            chatInput.value = "";

            const lowered = text.toLowerCase();
            let intent = null;
            if (lowered.indexOf("grammar") !== -1) intent = "grammar";

            if (!intent) {
                addChatMessage(
                    "bot",
                    "Right now I only support the <strong>grammar checker</strong>. Type 'grammar' to open it."
                );
            } else {
                routeFromChatIntent(intent);
            }
        });
    }

    function routeFromChatIntent(intent) {
        if (intent === "grammar") {
            addChatMessage("bot", "Great, switching to the Grammar Checker panel.");
            switchView("grammar");
        }
    }

    // ===== INITIAL STATE =====
    switchView("chatbot");
});
