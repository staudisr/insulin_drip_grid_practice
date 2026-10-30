let currentScenarios = [];
let currentScenarioIndex = 0;
let answeredCorrectly = false;
let pendingClicks = [];
let lastPlayed = { easy: -1, medium: -1, hard: -1, impossible: 0 };

const questionText = document.getElementById("question-text");
const progressTracker = document.getElementById("progress-tracker");
const feedbackBox = document.getElementById("feedback-box");
const nextBtn = document.getElementById("next-btn");
const menuBtn = document.getElementById("menu-btn");
const appInterface = document.getElementById("app-interface");
const mainMenu = document.getElementById("main-menu");
const gridContainer = document.getElementById("grid-container");

// Build Table
const headerRow = document.getElementById("table-headers");
for (let i = 1; i <= 16; i++) {
    const th = document.createElement("th");
    th.innerHTML = `Col ${i}`;
    headerRow.appendChild(th);
}

const tbody = document.querySelector("#drip-table tbody");
gridData.forEach((row, index) => {
    const tr = document.createElement("tr");
    
    // Apply special row highlighting for Target and Danger zones
    if (row[0] === "163-180" || row[0] === "141-162") {
        tr.classList.add("target-zone");
    } else if (row[0] === "<110") {
        tr.classList.add("danger-zone");
    }
    
    tr.innerHTML += `<td class="bg-row">${row[0]}</td>`;
    for(let i = 1; i <= 16; i++) {
        tr.innerHTML += `<td><button class="cell-btn" data-rindex="${index}" data-col="${i}" data-val="${row[i]}" data-row="${row[0]}">${row[i]}</button></td>`;
    }
    tbody.appendChild(tr);
});

function startQuiz(difficulty) {
    if (difficulty === 'impossible') {
        const confirmed = confirm("WARNING: Enter if you dare...\n\nHave you passed all other difficulty levels with no mistakes?\n\nI highly recommend using a pen and paper to write down your progress\n\n(Click OK to proceed, Cancel to return to main menu)");
        if (!confirmed) return;
    }

    const scenarioBanks = allScenarios[difficulty];
    let randomBankIndex = Math.floor(Math.random() * scenarioBanks.length);
    while (randomBankIndex === lastPlayed[difficulty] && scenarioBanks.length > 1) {
        randomBankIndex = Math.floor(Math.random() * scenarioBanks.length);
    }
    lastPlayed[difficulty] = randomBankIndex; 
    
    currentScenarios = scenarioBanks[randomBankIndex];
    currentScenarioIndex = 0;
    pendingClicks = [];
    
    mainMenu.style.display = "none";
    appInterface.style.display = "block";
    gridContainer.style.display = "block";
    menuBtn.style.display = "none";
    
    document.getElementById("difficulty-title").innerText = `Insulin Titration Trainer - ${difficulty.toUpperCase()}`;
    
    loadScenario();
}

function loadScenario() {
    const scenario = currentScenarios[currentScenarioIndex];
    let rawText = scenario.question || scenario.q;
    
    // Dynamically strip out the "(Difficulty) Hour X:" prefixes and format the rechecks
    let formattedText = rawText
        .replace(/^(\(.*?\)\s*)?Hour\s*\d+(\.\d+)?\s*\((30m|30\s*Min\s*Recheck)\):\s*/i, "30m recheck: ")
        .replace(/^(\(.*?\)\s*)?Hour\s*\d+(\.\d+)?\s*\((1hr|1\s*Hr\s*Recheck)\):\s*/i, "Returning to 1hr: ")
        .replace(/^(\(.*?\)\s*)?Hour\s*\d+(\.\d+)?:\s*/i, "");
        
    questionText.innerText = formattedText;
    
    if (document.getElementById("difficulty-title").innerText.includes("IMPOSSIBLE")) {
        progressTracker.innerText = `Survival Tracker: Hour ${currentScenarioIndex + 1} / 100`;
    } else {
        progressTracker.innerText = "";
    }

    feedbackBox.className = "feedback"; 
    feedbackBox.style.display = "none";
    nextBtn.style.display = "none";
    nextBtn.innerText = "Next Hour";
    nextBtn.classList.remove("btn-death");
    answeredCorrectly = false;
    pendingClicks = [];

    const isImpossible = document.getElementById("difficulty-title").innerText.includes("IMPOSSIBLE");

    // Reset all buttons first
    document.querySelectorAll(".cell-btn").forEach(btn => {
        btn.className = "cell-btn"; 
    });

    // Highlight the previous answer if it's past Hour 1 AND not on Impossible difficulty
    if (currentScenarioIndex > 0 && !isImpossible) {
        const prevScenario = currentScenarios[currentScenarioIndex - 1];
        const prevCols = prevScenario.targetCol.split(',');

        document.querySelectorAll(".cell-btn").forEach(btn => {
            if (prevCols.includes(btn.getAttribute("data-col")) && btn.getAttribute("data-row") === prevScenario.targetRow) {
                btn.classList.add("previous-cell");
            }
        });
    }
}

document.querySelector("tbody").addEventListener("click", function(e) {
    if (e.target && e.target.nodeName === "BUTTON") {
        if (answeredCorrectly) return; 
        
        const selectedCol = e.target.getAttribute("data-col");
        const selectedRow = e.target.getAttribute("data-row");
        const currentScenario = currentScenarios[currentScenarioIndex];
        const isImpossible = document.getElementById("difficulty-title").innerText.includes("IMPOSSIBLE");
        
        const targetCols = currentScenario.targetCol.split(',');

        // Row check must be correct first
        if (selectedRow !== currentScenario.targetRow) {
            triggerFail(e.target, currentScenario, isImpossible, targetCols);
            return;
        }

        if (targetCols.length > 1) {
            // Multi-click active
            if (pendingClicks.includes(selectedCol)) {
                // They clicked the exact same cell twice
                triggerFail(e.target, currentScenario, isImpossible, targetCols, "Incorrect. You clicked the same column twice. To select a rate beyond Column 16, you must click the square for Column 16 AND the square of whatever column adds up to the column you should be in (e.g., 16 + 1 = 17).");
                return;
            }

            if (!targetCols.includes(selectedCol)) {
                // They clicked a completely wrong column
                triggerFail(e.target, currentScenario, isImpossible, targetCols);
                return;
            }

            // Valid partial click
            pendingClicks.push(selectedCol);
            e.target.classList.add("pending");

            if (pendingClicks.length === targetCols.length) {
                triggerSuccess(currentScenario, isImpossible, targetCols);
                pendingClicks = [];
            }
        } else {
            // Normal single click
            if (selectedCol === currentScenario.targetCol) {
                triggerSuccess(currentScenario, isImpossible, targetCols);
            } else {
                triggerFail(e.target, currentScenario, isImpossible, targetCols);
            }
        }
    }
});

function triggerSuccess(scenario, isImpossible, targetCols) {
    answeredCorrectly = true;
    document.querySelectorAll(".pending").forEach(btn => btn.classList.replace("pending", "correct"));
    
    if (targetCols.length === 1) {
        document.querySelectorAll(".cell-btn").forEach(btn => {
            if (btn.getAttribute("data-col") === targetCols[0] && btn.getAttribute("data-row") === scenario.targetRow) {
                btn.classList.add("correct");
            }
        });
    }

    feedbackBox.innerText = scenario.successMsg ? scenario.successMsg : "Correct! Proceed to the next check.";
    feedbackBox.className = "feedback success";
    feedbackBox.style.display = "block"; 
    showNextOrMenuBtn(isImpossible);
}

function triggerFail(clickedTarget, scenario, isImpossible, targetCols, customMsg = null) {
    answeredCorrectly = true;
    document.querySelectorAll(".pending").forEach(btn => btn.classList.remove("pending"));
    clickedTarget.classList.add("incorrect");
    
    // Highlight the correct answer(s)
    document.querySelectorAll(".cell-btn").forEach(btn => {
        if (targetCols.includes(btn.getAttribute("data-col")) && btn.getAttribute("data-row") === scenario.targetRow) {
            btn.classList.add("correct");
        }
    });

    const failReason = customMsg ? customMsg : scenario.explanation;

    if (isImpossible) {
        feedbackBox.innerHTML = `FATAL ERROR.<br><br>Why you failed: ${failReason}<br><br>You killed the patient.`;
        feedbackBox.className = "feedback error";
        feedbackBox.style.display = "block"; 
        nextBtn.innerText = "Restart from Hour 1";
        nextBtn.classList.add("btn-death");
        nextBtn.style.display = "block";
    } else {
        feedbackBox.innerText = failReason;
        feedbackBox.className = "feedback error";
        feedbackBox.style.display = "block"; 
        showNextOrMenuBtn(isImpossible);
    }
}

function showNextOrMenuBtn(isImpossible) {
    if (currentScenarioIndex < currentScenarios.length - 1) {
        nextBtn.style.display = "block";
    } else {
        menuBtn.style.display = "block";
        if (isImpossible) {
            feedbackBox.innerHTML += "<br><br><strong>CONGRATULATIONS. Write down the final Blood sugar Column and Rate and give it to Shane do not share with anyone. One of the finishers will win a prize Good Luck!</strong>";
        } else {
            feedbackBox.innerText += " (End of this difficulty level.)";
        }
    }
}

function nextQuestion() {
    if (nextBtn.innerText === "Restart from Hour 1") {
        currentScenarioIndex = 0;
        loadScenario();
        return;
    }
    currentScenarioIndex++;
    loadScenario();
}

function returnToMenu() {
    appInterface.style.display = "none";
    mainMenu.style.display = "block";
}
