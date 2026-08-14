/* ==========================================
   PULSE SURVEY APP
========================================== */

/* ==========================================
   SUPABASE CONFIGURATION
========================================== */
const SUPABASE_URL = "https://ywwdwqanpothrhjfordm.supabase.co";
const SUPABASE_KEY = "sb_publishable_AzyJEz35athnxU9WR3ym1w_AKDXMaqw";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let surveys = [];
let currentSurveyId = null;
const STORAGE_KEY = "pulserv_surveys";


/* ==========================================
   PAGE NAVIGATION
========================================== */

/* ==========================================
   PAGE NAVIGATION WITH SMOOTH TRANSITIONS
========================================== */

function hideAllPages() {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.add("hidden");
        page.classList.remove("fade-in");
    });
}

function showPage(pageId) {
    hideAllPages();
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove("hidden");
        
        // Trigger smooth reflow animation
        void targetPage.offsetWidth; 
        targetPage.classList.add("fade-in");
    }
}

async function showHome() {
    showPage("homePage");
    await renderSurveyList();
}

function showCreate() {
    showPage("createPage");
    document.getElementById("questionsContainer").innerHTML = "";
    addQuestion();
}

/* ==========================================
   CREATE SURVEY
========================================== */

document
    .getElementById("createSurveyBtn")
    .addEventListener("click", showCreate);


document
    .getElementById("addQuestionBtn")
    .addEventListener("click", addQuestion);


function addQuestion() {

    const container =
        document.getElementById("questionsContainer");

    const questionNumber =
        container.children.length + 1;

    const question = document.createElement("div");

    question.className = "question-card";

    question.innerHTML = `

        <div class="question-top">

            <span class="question-number">
                QUESTION ${questionNumber}
            </span>

            <button
                type="button"
                class="delete-question"
                onclick="deleteQuestion(this)"
            >
                Remove
            </button>

        </div>

        <input
            class="question-input"
            type="text"
            placeholder="Enter your question..."
            required
        >

        <div class="toggle-row">
            <label class="toggle-switch">
                <input type="checkbox" class="allow-multiple-toggle">
                <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">Allow selecting more than one option</span>
        </div>

        <div class="options-container">

            <div class="option-row">

                <input
                    type="text"
                    placeholder="Option 1"
                    required
                >

                <button
                    type="button"
                    class="remove-option"
                    onclick="removeOption(this)"
                >
                    ×
                </button>

            </div>

            <div class="option-row">

                <input
                    type="text"
                    placeholder="Option 2"
                    required
                >

                <button
                    type="button"
                    class="remove-option"
                    onclick="removeOption(this)"
                >
                    ×
                </button>

            </div>

        </div>

        <button
            type="button"
            class="add-option"
            onclick="addOption(this)"
        >
            + Add option
        </button>
    `;

    container.appendChild(question);
}


function deleteQuestion(button) {

    button.closest(".question-card").remove();

    renumberQuestions();
}


function renumberQuestions() {

    document
        .querySelectorAll(".question-card")
        .forEach((card, index) => {

            card.querySelector(".question-number")
                .textContent = `QUESTION ${index + 1}`;

        });
}


function addOption(button) {

    const optionsContainer =
        button.parentElement.querySelector(".options-container");

    const optionNumber =
        optionsContainer.children.length + 1;

    const option = document.createElement("div");

    option.className = "option-row";

    option.innerHTML = `

        <input
            type="text"
            placeholder="Option ${optionNumber}"
            required
        >

        <button
            type="button"
            class="remove-option"
            onclick="removeOption(this)"
        >
            ×
        </button>
    `;

    optionsContainer.appendChild(option);
}


function removeOption(button) {

    const options =
        button.closest(".options-container");

    if (options.children.length <= 2) {

        alert("Each question needs at least two options.");

        return;
    }

    button.parentElement.remove();
}


/* ==========================================
   SAVE SURVEY TO SUPABASE
========================================== */

document.getElementById("surveyForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const title = document.getElementById("surveyTitle").value.trim();
    const description = document.getElementById("surveyDescription").value.trim();
    const duration = Number(document.getElementById("duration").value);
    const unit = document.getElementById("durationUnit").value;

    const questions = [];

    document.querySelectorAll(".question-card").forEach(card => {
        const questionText = card.querySelector(".question-input").value.trim();
        const options = [];

        card.querySelectorAll(".option-row input").forEach(input => {
            options.push({ text: input.value.trim(), votes: 0 });
        });

        const allowMultiple = card.querySelector(".allow-multiple-toggle").checked;

        questions.push({
            id: generateId(),
            text: questionText,
            options: options,
            allowMultiple: allowMultiple
        });
    });

    const durationMilliseconds = unit === "minutes" ? duration * 60 * 1000 : duration * 60 * 60 * 1000;

    const newSurvey = {
        id: generateId(),
        title,
        description,
        questions,
        created_at: Date.now(),
        expires_at: Date.now() + durationMilliseconds,
        active: true,
        responses: 0
    };

    const { error } = await supabaseClient.from("surveys").insert([newSurvey]);

    if (error) {
        alert("Failed to create survey: " + error.message);
        return;
    }

    currentSurveyId = newSurvey.id;
    
    // Map snake_case to match frontend naming expectations
    const formattedSurvey = {
        ...newSurvey,
        createdAt: newSurvey.created_at,
        expiresAt: newSurvey.expires_at
    };

    showCreatedSurvey(formattedSurvey);
});


/* ==========================================
   CREATED SURVEY / SHARE MODAL
========================================== */

function showCreatedSurvey(survey) {
    hideAllPages();

    const surveyPage = document.getElementById("surveyPage");
    surveyPage.classList.remove("hidden");

    renderSurvey(survey);

    // Append mode=respond so shared links open in participant mode on external devices
    const url = `${window.location.origin}${window.location.pathname}?survey=${survey.id}&mode=respond`;
    history.pushState({}, "", url);

    openShareModal(url);
}

function openShareModal(url) {
    const modal = document.getElementById("shareModal");
    const input = document.getElementById("shareUrlInput");
    const copyBtn = document.getElementById("copyUrlBtn");

    input.value = url;
    copyBtn.textContent = "Copy";
    modal.classList.remove("hidden");
}

function closeShareModal() {
    document.getElementById("shareModal").classList.add("hidden");
}

function copyShareUrl() {
    const input = document.getElementById("shareUrlInput");
    const copyBtn = document.getElementById("copyUrlBtn");

    input.select();
    input.setSelectionRange(0, 99999); // Mobile devices

    navigator.clipboard.writeText(input.value).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
            copyBtn.textContent = "Copy";
        }, 2000);
    });
}


/* ==========================================
   RENDER SURVEY
========================================== */

function renderSurvey(survey) {
    const header = document.getElementById("surveyHeader");
    const questions = document.getElementById("surveyQuestions");
    const submitBtn = document.getElementById("submitResponseBtn");

    header.innerHTML = `
        <div class="survey-header">
            <span class="eyebrow">SURVEY</span>
            <h2>${escapeHtml(survey.title)}</h2>
            <p>${escapeHtml(survey.description || "")}</p>
            <div id="timer" class="timer">Loading timer...</div>
        </div>
    `;

    questions.innerHTML = "";

    survey.questions.forEach((question, index) => {
        const questionDiv = document.createElement("div");
        questionDiv.className = "question-display";

        let optionsHTML = "";
        const inputType = question.allowMultiple ? "checkbox" : "radio";

        question.options.forEach((option, optionIndex) => {
            optionsHTML += `
                <label class="option-label">
                    <input type="${inputType}" name="question-${question.id}" value="${optionIndex}">
                    <span>${escapeHtml(option.text)}</span>
                </label>
            `;
        });

        questionDiv.innerHTML = `
            <h3>
                ${index + 1}. ${escapeHtml(question.text)}
                ${question.allowMultiple ? '<span class="multi-hint">Select all that apply</span>' : ""}
            </h3>
            ${optionsHTML}
        `;

        questions.appendChild(questionDiv);
    });

    submitBtn.onclick = () => submitResponse(survey.id);
    submitBtn.classList.remove("hidden");
    submitBtn.disabled = false;

    // Reset message visibility first
    document.getElementById("responseMessage").classList.add("hidden");
    document.getElementById("anotherResponseBtn").classList.add("hidden");

    // Display status banner for link respondents
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "respond") {
        const message = document.getElementById("responseMessage");
        message.classList.remove("hidden");
        message.innerHTML = `
            <strong>Session Active</strong><br>
            <small style="display:block; margin-top:4px;">Results will appear automatically when the session ends.</small>
        `;
    }

    startTimer(survey);
}


/* ==========================================
   TIMER
========================================== */

let timerInterval = null;

function startTimer(survey) {

    clearInterval(timerInterval);

    const timer =
        document.getElementById("timer");

    function updateTimer() {

        const remaining =
            survey.expiresAt - Date.now();

        if (remaining <= 0) {

            clearInterval(timerInterval);

            endSurvey(survey.id);

            timer.textContent =
                "This survey has ended.";

            submitResponseBtn.disabled = true;

            showResults(survey.id);

            return;
        }


        const totalSeconds =
            Math.floor(remaining / 1000);

        const hours =
            Math.floor(totalSeconds / 3600);

        const minutes =
            Math.floor(
                (totalSeconds % 3600) / 60
            );

        const seconds =
            totalSeconds % 60;


        if (hours > 0) {

            timer.textContent =
                `⏱ ${hours}h ${minutes}m ${seconds}s remaining`;

        } else {

            timer.textContent =
                `⏱ ${minutes}m ${seconds}s remaining`;
        }
    }


    updateTimer();

    timerInterval =
        setInterval(updateTimer, 1000);
}


/* ==========================================
   SUBMIT RESPONSE
========================================== */

/* ==========================================
   SUBMIT RESPONSE & END SESSION
========================================== */

async function submitResponse(surveyId) {
    const params = new URLSearchParams(window.location.search);
    const isRespondent = params.get("mode") === "respond";

    const { data: survey, error } = await supabaseClient
        .from("surveys")
        .select("*")
        .eq("id", surveyId)
        .single();

    if (error || !survey || !survey.active || Date.now() >= survey.expires_at) {
        endSurvey(surveyId);
        showResults(surveyId);
        return;
    }

    const answers = [];
    for (const question of survey.questions) {
        const selected = document.querySelectorAll(`input[name="question-${question.id}"]:checked`);
        if (selected.length === 0) {
            alert("Please answer all questions before submitting.");
            return;
        }
        selected.forEach(input => {
            answers.push({
                questionId: question.id,
                optionIndex: Number(input.value)
            });
        });
    }

    answers.forEach(answer => {
        const q = survey.questions.find(q => q.id === answer.questionId);
        if (q) q.options[answer.optionIndex].votes++;
    });

    const updatedResponses = survey.responses + 1;

    const { error: updateError } = await supabaseClient
        .from("surveys")
        .update({
            questions: survey.questions,
            responses: updatedResponses
        })
        .eq("id", surveyId);

    if (updateError) {
        alert("Could not submit vote: " + updateError.message);
        return;
    }

    if (isRespondent) {
        // Participant flow: clear inputs & maintain session
        document.querySelectorAll(`#surveyQuestions input:checked`).forEach(input => {
            input.checked = false;
        });

        const message = document.getElementById("responseMessage");
        message.classList.remove("hidden");
        message.innerHTML = `
            <strong>Response submitted!</strong> You can submit another response while the session is active.<br>
            <small style="display:block; margin-top:6px; opacity:0.85;">Results will appear automatically when the session ends.</small>
        `;

        document.getElementById("surveyQuestions").scrollIntoView({ behavior: "smooth" });
    } else {
        // Host flow: hide submit, show success message & enable another response button
        const submitBtn = document.getElementById("submitResponseBtn");
        const message = document.getElementById("responseMessage");
        const anotherBtn = document.getElementById("anotherResponseBtn");

        submitBtn.classList.add("hidden");
        message.classList.remove("hidden");
        message.innerHTML = `<strong>Response submitted!</strong><br>Thank you for participating.`;
        anotherBtn.classList.remove("hidden");

        anotherBtn.onclick = () => {
            // Uncheck inputs
            document.querySelectorAll(`#surveyQuestions input:checked`).forEach(input => {
                input.checked = false;
            });

            // Restore form layout
            message.classList.add("hidden");
            anotherBtn.classList.add("hidden");
            submitBtn.classList.remove("hidden");

            document.getElementById("surveyQuestions").scrollIntoView({ behavior: "smooth" });
        };
    }
}

/* ==========================================
   END SURVEY
========================================== */

function endSurvey(surveyId) {

    const survey =
        surveys.find(s => s.id === surveyId);

    if (!survey) return;

    survey.active = false;

    saveSurveys();
}


/* ==========================================
   RESULTS
========================================== */

function showResults(surveyId) {
    const survey = surveys.find(s => s.id === surveyId);
    if (!survey) return;

    clearInterval(timerInterval);
    showPage("resultsPage");

    document
        .getElementById("resultsPage")
        .classList.remove("hidden");


    document
        .getElementById("resultsTitle")
        .textContent = survey.title;


    document
        .getElementById("resultsDescription")
        .textContent = survey.description || "";


    document
        .getElementById("totalResponses")
        .textContent = survey.responses;


    document
        .getElementById("resultsStatus")
        .textContent =
            survey.active ? "Open" : "Ended";


    const resultsContent =
        document.getElementById("resultsContent");

    resultsContent.innerHTML = "";


    survey.questions.forEach((question, index) => {

        const questionDiv =
            document.createElement("div");

        questionDiv.className =
            "result-question";


        const totalVotes =
            question.options.reduce(
                (sum, option) => sum + option.votes,
                0
            );


        let optionsHTML = "";


        question.options.forEach(option => {

            const percentage =
                totalVotes === 0
                    ? 0
                    : Math.round(
                        (option.votes / totalVotes) * 100
                    );


            optionsHTML += `

                <div class="result-option">

                    <div class="result-option-header">

                        <span>
                            ${escapeHtml(option.text)}
                        </span>

                        <strong>
                            ${percentage}%
                            (${option.votes})
                        </strong>

                    </div>

                    <div class="result-bar">

                        <div
                            style="width:${percentage}%"
                        ></div>

                    </div>

                </div>
            `;

        });


        questionDiv.innerHTML = `

            <h3>
                ${index + 1}. ${escapeHtml(question.text)}
            </h3>

            ${optionsHTML}
        `;


        resultsContent.appendChild(questionDiv);

    });
}


/* ==========================================
   HOME SURVEY LIST
========================================== */

/* ==========================================
   FETCH & RENDER SURVEYS
========================================== */

/* ==========================================
   FETCH & RENDER SURVEYS
========================================== */

async function fetchSurveys() {
    const { data, error } = await supabaseClient
        .from("surveys")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching surveys:", error);
        surveys = [];
        return [];
    }

    // Standardize object properties for frontend consumption
    surveys = (data || []).map(survey => ({
        ...survey,
        createdAt: survey.created_at,
        expiresAt: survey.expires_at
    }));

    return surveys;
}

async function renderSurveyList() {
    const list = document.getElementById("surveyList");
    list.innerHTML = "<p>Loading surveys...</p>";

    await fetchSurveys();

    list.innerHTML = "";

    // Empty state check
    if (!surveys || surveys.length === 0) {
        list.innerHTML = `
            <div class="survey-card empty-state">
                <h4>No surveys yet</h4>
                <p>Create your first survey to get started.</p>
            </div>
        `;
        return;
    }

    surveys.forEach(survey => {
        if (survey.active && Date.now() >= survey.expiresAt) {
            survey.active = false;
        }

        const card = document.createElement("div");
        card.className = "survey-card";

        card.innerHTML = `
            <span class="status ${survey.active ? "open" : "ended"}">
                ${survey.active ? "OPEN" : "ENDED"}
            </span>
            <h4>${escapeHtml(survey.title)}</h4>
            <p>${escapeHtml(survey.description || "No description")}</p>
            <p style="margin-top:10px">${survey.responses} response(s)</p>
            <div class="card-actions">
                <button class="secondary-btn" onclick="openSurvey('${survey.id}')">
                    Open
                </button>
                <button class="secondary-btn" onclick="showResults('${survey.id}')">
                    Results
                </button>
            </div>
        `;

        list.appendChild(card);
    });
}


/* ==========================================
   OPEN SURVEY
========================================== */

function openSurvey(id) {
    const survey = surveys.find(s => s.id === id);
    if (!survey) return;

    currentSurveyId = id;

    if (!survey.active || Date.now() >= survey.expiresAt) {
        endSurvey(id);
        showResults(id);
        return;
    }

    showPage("surveyPage");
    
    // Preserve mode parameter if present in the current URL
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode") ? `&mode=${params.get("mode")}` : "";
    const url = `${window.location.origin}${window.location.pathname}?survey=${id}${modeParam}`;
    history.pushState({}, "", url);

    renderSurvey(survey);
}


/* ==========================================
   ADMIN
========================================== */

document
    .getElementById("adminBtn")
    .addEventListener("click", openAdminModal);


function openAdminModal() {

    const modal =
        document.getElementById("adminModal");

    modal.classList.remove("hidden");

    renderAdminSessions();
}


function closeAdminModal() {

    document
        .getElementById("adminModal")
        .classList.add("hidden");
}


function renderAdminSessions() {

    const container =
        document.getElementById("adminSessions");

    container.innerHTML = "";


    if (surveys.length === 0) {

        container.innerHTML =
            "<p>No sessions have been created yet.</p>";

        return;
    }


    surveys
        .slice()
        .reverse()
        .forEach(survey => {

            const div =
                document.createElement("div");

            div.className =
                "admin-session";


            div.innerHTML = `

                <h4>
                    ${escapeHtml(survey.title)}
                </h4>

                <small>
                    ${survey.responses} response(s)
                </small>

                ${
                    survey.active
                        ? `
                            <button
                                class="end-session"
                                onclick="adminEndSession('${survey.id}')"
                            >
                                End Session
                            </button>
                          `
                        : `
                            <button
                                class="view-results"
                                onclick="closeAdminModal(); showResults('${survey.id}')"
                            >
                                View Results
                            </button>
                          `
                }

            `;


            container.appendChild(div);

        });
}


function adminEndSession(id) {

    const confirmed =
        confirm(
            "Are you sure you want to end this session? Respondents will no longer be able to submit responses."
        );


    if (!confirmed) return;


    endSurvey(id);

    renderAdminSessions();

    renderSurveyList();
}


/* ==========================================
   LOCAL STORAGE
========================================== */

function saveSurveys() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(surveys)
    );
}


/* ==========================================
   HELPERS
========================================== */

function generateId() {

    return (
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 9)
    );
}


function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}





/*
   Keep timers / session status accurate
   when the browser remains open.
*/

setInterval(() => {

    surveys.forEach(survey => {

        if (
            survey.active &&
            Date.now() >= survey.expiresAt
        ) {

            survey.active = false;
        }

    });

    saveSurveys();

}, 5000);

function goToHome() {

    clearInterval(timerInterval);

    history.pushState(
        {},
        "",
        window.location.pathname
    );

    showHome();
}

async function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const surveyId = params.get("survey");
    const mode = params.get("mode");

    if (!surveyId) {
        await showHome();
        return;
    }

    const { data: survey, error } = await supabaseClient
        .from("surveys")
        .select("*")
        .eq("id", surveyId)
        .single();

    if (error || !survey) {
        alert("Survey not found.");
        await showHome();
        return;
    }

    survey.createdAt = survey.created_at;
    survey.expiresAt = survey.expires_at;
    currentSurveyId = surveyId;

    await fetchSurveys();

    // Link Respondent Flow
    if (mode === "respond") {
        // Hide Admin and Back controls for participants
        const backBtn = document.querySelector("#surveyPage .back-btn");
        const adminBtn = document.getElementById("adminBtn");
        if (backBtn) backBtn.classList.add("hidden");
        if (adminBtn) adminBtn.classList.add("hidden");

        if (!survey.active || Date.now() >= survey.expiresAt) {
            endSurvey(surveyId);
            showResults(surveyId);
            return;
        }

        openSurvey(surveyId);
        return;
    }

    // Default Host / Admin Flow
    if (!survey.active || Date.now() >= survey.expiresAt) {
        endSurvey(surveyId);
        showResults(surveyId);
        return;
    }

    openSurvey(surveyId);
}

/* ==========================================
   INITIALIZE APP
========================================== */

loadFromUrl();