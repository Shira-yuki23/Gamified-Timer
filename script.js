let timerInterval = null;
let totalSeconds = 25 * 60;
let remainingSeconds = totalSeconds;
let isRunning = false;
let isBreak = false;
let sessionCount = 1;
let endTime = null;
let breakDecisionInterval = null;
let breakDecisionDeadline = null;

/* ===============================
   Elements
================================ */
const timerDisplay =document.getElementById("timer");
const startBtn =document.getElementById("startBtn");
const pauseBtn =document.getElementById("pauseBtn");
const resetBtn =document.getElementById("resetBtn");
const focusInput =document.getElementById("focusMinutes");
const breakInput =document.getElementById("breakMinutes");
const modeLabel =document.getElementById("modeLabel");
const sessionLabel =document.getElementById("sessionCount");
const progressCircle =document.getElementById("progressCircle");
const currentTime = document.getElementById("currentTime");
/* ===============================
   SVG Circle Setup
================================ */
const circleRadius = 110;
const circumference =
    2 * Math.PI * circleRadius;
progressCircle.style.strokeDasharray =
    circumference;
/* ===============================
   Update Timer Text
================================ */
function updateTimerDisplay(){
    let minutes =
        Math.floor(remainingSeconds / 60);
    let seconds =
        remainingSeconds % 60;
    timerDisplay.textContent =
        `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}
/* ===============================
   Update Circle Progress
================================ */
function updateProgress(){
    let progress =
        remainingSeconds / totalSeconds;
    let offset =
        circumference -
        (progress * circumference);
    progressCircle.style.strokeDashoffset =
        offset;
}
/* ===============================
   Start Timer
================================ */
/* ===============================
   Completion Sounds
================================ */
const completionSounds = {};
const unlockedSounds = new WeakSet();

function prepareCompletionSounds() {
    // Unlock both files during a Start click/key press for browser autoplay rules.
    for (const [name, file] of Object.entries({done: "done.wav", back: "back.wav"})) {
        try {
            const sound = completionSounds[name] ||
                (completionSounds[name] = new Audio("./Assets/Music/" + file));
            if (unlockedSounds.has(sound)) continue;
            sound.muted = true;
            sound.play().then(() => {
                sound.pause();
                sound.currentTime = 0;
                sound.muted = false;
                unlockedSounds.add(sound);
            }).catch(() => { sound.muted = false; });
        } catch (_) {
            // A missing audio device or unsupported file must not stop the timer.
        }
    }
}

function playCompletionSound(name) {
    try {
        for (const sound of Object.values(completionSounds)) {
            sound.pause();
            sound.currentTime = 0;
        }
        const sound = completionSounds[name];
        if (!sound) return;
        sound.muted = false;
        sound.play().catch(() => {});
    } catch (_) {
        // Keep the completion popup and timer transition working without audio.
    }
}

function startTimer() {

    if (isRunning)
        return;

    if (breakDecisionDeadline !== null) {
        startNextFocus();
        return;
    }

    prepareCompletionSounds();

    isRunning = true;

    // Calculate when the timer should finish
    endTime = Date.now() + (remainingSeconds * 1000);

    timerInterval = setInterval(() => {

        remainingSeconds = Math.max(
            0,
            Math.ceil((endTime - Date.now()) / 1000)
        );

        updateTimerDisplay();
        updateProgress();

        if (remainingSeconds <= 0) {

            stopTimer();

            timerFinished();

        }

    }, 250);

}
/* ===============================
   Pause Timer
================================ */
function pauseTimer() {

    closeBreakDecision();
    if (!isRunning) return;

    clearInterval(timerInterval);

    isRunning = false;

    // Save the remaining time
    remainingSeconds = Math.max(
        0,
        Math.ceil((endTime - Date.now()) / 1000)
    );

}
/* ===============================
   Reset Timer
================================ */
function resetTimer() {

    closeBreakDecision();

    stopTimer();

    if (isBreak) {

        totalSeconds =
            Number(breakInput.value) * 60;

    }

    else {

        totalSeconds =
            Number(focusInput.value) * 60;

    }

    remainingSeconds =
        totalSeconds;

    endTime = null;

    updateTimerDisplay();

    updateProgress();

}
/* ===============================
   Stop Timer Helper
================================ */
function stopTimer() {

    clearInterval(timerInterval);

    timerInterval = null;

    isRunning = false;

    endTime = null;

}
/* ===============================
   Timer Finished
================================ */
function timerFinished(){
    playCompletionSound(isBreak ? "back" : "done");
    if(!isBreak){
        sessionCount++;
        sessionLabel.textContent =
            "#" + sessionCount;

        showNotification(
            "🌸 MeloFocus",
            "Focus session complete! Time for a break."
        );

        saveData();
        showBreakPopup();
    }
    else{
        isBreak = false;
        modeLabel.textContent =
            "FOCUS MODE 🌸";
    
        showNotification(
            "☕ MeloFocus",
            "Break is over! Let's get back to focusing."
        );
        isBreak = false;
        modeLabel.textContent =
            "FOCUS MODE 🌸";

        startNextFocus();
    }
}
/* ===============================
   Change Mode
================================ */
function changeToBreak(){
    isBreak = true;
    modeLabel.textContent =
        "BREAK MODE ☕";
    totalSeconds =
        Number(breakInput.value) * 60;
    remainingSeconds =
        totalSeconds;
    updateTimerDisplay();
    updateProgress();
}
/* ===============================
   Live Clock
================================ */
function updateClock(){
    let now =new Date();
    currentTime.textContent =now.toLocaleTimeString();
}
setInterval(updateClock,1000);
updateClock();
/* ===============================
   Button Events
================================ */
startBtn.addEventListener(
    "click",
    startTimer
);
pauseBtn.addEventListener(
    "click",
    pauseTimer
);
resetBtn.addEventListener(
    "click",
    resetTimer
);
/* ===============================
   Initial Load
================================ */
updateTimerDisplay();
updateProgress();


/* ===============================
   Task Variables
================================ */
let tasks = [];
let breakBankMinutes = 0;
let selectedTaskIndex = -1;
/* ===============================
   Task Elements
================================ */
const taskInput =
    document.getElementById("taskInput");
const rewardInput =
    document.getElementById("rewardInput");
const taskList =
    document.getElementById("taskList");
const addTaskBtn =
    document.getElementById("addTaskBtn");
const deleteTaskBtn =
    document.getElementById("deleteTaskBtn");
const breakBankDisplay =
    document.getElementById("breakBank");
/* ===============================
   Task Object
================================ */
class Task{
    constructor(name,reward){
        this.name = name;
        this.reward = reward;
        this.completed = false;
    }
}
/* ===============================
   Add Task
================================ */
function addTask(){
    let name =
        taskInput.value.trim();
    let reward =
        Number(rewardInput.value);
    if(name === "")
        return;
    if (!Number.isFinite(reward) || reward < 0 || reward > 10000) reward = 0;
    if (name.length > 300 || tasks.length >= 500) {
        alert("Use a task name under 301 characters and up to 500 tasks.");
        return;
    }
    let newTask =
        new Task(
            name,
            reward
        );
    tasks.push(newTask);
    saveData();
    renderTasks();
    taskInput.value = "";
    rewardInput.value = "";
}
/* ===============================
   Render Tasks
=============================== */
function renderTasks() {

    taskList.innerHTML = "";

    tasks.forEach((task, index) => {

        let li = document.createElement("li");

        li.className = "task-item";

        if (index === selectedTaskIndex) {
            li.classList.add("selected");
        }

        li.innerHTML = `
            <input
                type="checkbox"
                ${task.completed ? "checked" : ""}
            >

            <span class="task-name"></span>

            <span class="reward">
                +${task.reward} min
            </span>
        `;

        li.querySelector(".task-name").textContent = task.name;

        // Select task when clicked
        li.addEventListener("click", (e) => {

            if (e.target.tagName !== "INPUT") {

                selectedTaskIndex = index;

                renderTasks();

            }

        });

        let checkbox = li.querySelector("input");

        checkbox.addEventListener("change", () => {

            if (checkbox.checked && !task.completed) {

                task.completed = true;

                breakBankMinutes += task.reward;

            }

            else if (!checkbox.checked && task.completed) {

                task.completed = false;

                breakBankMinutes -= task.reward;

            }

            updateBreakBank();

            saveData();

        });

        taskList.appendChild(li);

    });

}
/* ===============================
   Delete Task
================================ */
function deleteTask() {

    if (selectedTaskIndex === -1)
        return;

    if (tasks[selectedTaskIndex].completed) {

        breakBankMinutes -=
            tasks[selectedTaskIndex].reward;

    }

    tasks.splice(selectedTaskIndex, 1);

    selectedTaskIndex = -1;

    updateBreakBank();

    saveData();

    renderTasks();

}
/* ===============================
   Update Break Bank
================================ */
function updateBreakBank(){
    if(breakBankMinutes < 0){
        breakBankDisplay.textContent =
            `${breakBankMinutes} min ⚠`;
        breakBankDisplay.style.color =
            "red";
    }
    else{
        breakBankDisplay.textContent =
            `${breakBankMinutes} min`;
        breakBankDisplay.style.color =
            "#333";
    }
}
/* ===============================
   Local Storage
================================ */
function saveData(){
    let data;
    try { data = currentProgress(); }
    catch { return; }
    if (window.meloSync?.save(data)) return;
    try {
        localStorage.setItem("melofocusGuestProgress", JSON.stringify(data));
        localStorage.setItem("melofocusTasks", JSON.stringify(data.tasks));
        localStorage.setItem("melofocusBreakBank", data.breakBankMinutes);
    } catch { /* Timer remains usable if browser storage is unavailable. */ }
}
function loadData(){
    const data = guestProgress();
    tasks = data.tasks;
    breakBankMinutes = data.breakBankMinutes;
    sessionCount = data.sessionCount;
    focusInput.value = data.focusMinutes;
    breakInput.value = data.breakMinutes;
    sessionLabel.textContent = "#" + sessionCount;
    totalSeconds = data.focusMinutes * 60;
    remainingSeconds = totalSeconds;
    renderTasks(); updateBreakBank(); updateTimerDisplay(); updateProgress();
}
/* ===============================
   Button Events
================================ */
addTaskBtn.addEventListener(
    "click",
    addTask
);
deleteTaskBtn.addEventListener(
    "click",
    deleteTask
);
/* ===============================
   Start Saved Data
================================ */
loadData();
/* ===============================
   Popup Elements
================================ */
const popupOverlay = document.getElementById("popupOverlay");
const redeemOverlay = document.getElementById("redeemOverlay");
const takeBreakBtn =document.getElementById("takeBreak");
const skipBreakBtn = document.getElementById("skipBreak");
const redeemBtn =document.getElementById("redeemBtn");
const confirmRedeemBtn = document.getElementById("confirmRedeem");
const cancelRedeemBtn =document.getElementById("cancelRedeem");
const redeemMinutesInput =document.getElementById("redeemMinutes");
/* ===============================
   Show Break Decision Popup
================================ */
function closeBreakDecision() {
    clearInterval(breakDecisionInterval);
    breakDecisionInterval = null;
    breakDecisionDeadline = null;
    popupOverlay.classList.add("hidden");
}

function startNextFocus() {
    closeBreakDecision();
    isBreak = false;
    modeLabel.textContent = "FOCUS MODE 🌸";
    resetTimer();
    startTimer();
}

function showBreakPopup(){
    closeBreakDecision();
    popupOverlay.classList.remove("hidden");
    breakDecisionDeadline = Date.now() + 20000;
    const updateDecision = () => {
        const seconds = Math.max(0, Math.ceil((breakDecisionDeadline - Date.now()) / 1000));
        document.getElementById("breakDecisionCountdown").textContent =
            "Focus starts automatically in " + seconds + " seconds.";
        if (seconds === 0) startNextFocus();
    };
    updateDecision();
    breakDecisionInterval = setInterval(updateDecision, 250);
}
/* ===============================
   Take Normal Break
================================ */
takeBreakBtn.addEventListener(
    "click",
    () => {

        closeBreakDecision();

        let minutes = Number(
            prompt("How many minutes would you like your break to be?")
        );

        if (!Number.isFinite(minutes) || minutes <= 0) {
            startNextFocus();
            return;
        }

        isBreak = true;

        modeLabel.textContent =
            "BREAK MODE ☕";

        totalSeconds = minutes * 60;

        remainingSeconds = totalSeconds;

        updateTimerDisplay();

        updateProgress();

        startTimer();

    }
);
/* ===============================
   Skip Break
   Earn Break Minutes
================================ */
skipBreakBtn.addEventListener(
    "click",
    ()=>{
        closeBreakDecision();
        let earned =Number(breakInput.value);
        breakBankMinutes += earned;
        updateBreakBank();
        saveData();
        isBreak = false;
        modeLabel.textContent ="FOCUS MODE 🌸";
        startNextFocus();
    }
);
/* ===============================
   Open Redeem Popup
================================ */
redeemBtn.addEventListener(
    "click",
    ()=>{
        redeemOverlay.classList.remove("hidden");
    }
);
/* ===============================
   Cancel Redeem
================================ */
cancelRedeemBtn.addEventListener(
    "click",
    ()=>{
        redeemOverlay.classList.add("hidden");
    }
);

/* ===============================
   Redeem Break
================================ */
confirmRedeemBtn.addEventListener(
    "click",
    ()=>{
        let requested =Number(redeemMinutesInput.value);
        if (!Number.isFinite(requested) || requested <= 0) return;
        closeBreakDecision();
        stopTimer();
        breakBankMinutes -= requested;
        updateBreakBank();
        saveData();
        redeemOverlay.classList.add("hidden");
        isBreak = true;
        modeLabel.textContent = "BREAK MODE ☕";
        totalSeconds = requested * 60;
        remainingSeconds = totalSeconds;
        updateTimerDisplay();
        updateProgress();
        startTimer();
    }
);

/* ===============================
   Close Popups By Clicking Outside
================================ */
popupOverlay.addEventListener(
    "click",
    (e)=>{
        if(e.target === popupOverlay){
            return;
        }
    }
);
redeemOverlay.addEventListener(
    "click",
    (e)=>{
        if(e.target === redeemOverlay){
            redeemOverlay.classList.add("hidden");
        }
    }
);

/* ===============================
   Keyboard Shortcut
================================ */

document.addEventListener(
    "keydown",
    (e)=>{
        if (window.meloAccountBusy || e.target?.closest?.("input, textarea, select, button, [contenteditable]")) return;
        if(e.code === "Space"){
            e.preventDefault();
            if(isRunning){pauseTimer(); }
            else{startTimer();}
        }
    }
);
/* ===============================
   Notification Permission
================================ */

if ("Notification" in window) {

    if (Notification.permission !== "granted") {

        Notification.requestPermission();

    }

}
function showNotification(title, message) {

    if (!("Notification" in window))
        return;

    if (Notification.permission === "granted") {

        new Notification(title, {
            body: message,
            icon: "icon64.png" // Optional
        });

    }

}
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js");
    });
}

/* ===============================
   Account progress bridge
================================ */
function defaultProgress() {
    return {tasks: [], breakBankMinutes: 0, sessionCount: 1, focusMinutes: 25, breakMinutes: 5};
}
function validateProgress(data) {
    const finite = (n, min, max, integer = false) => typeof n === "number" && Number.isFinite(n) &&
        n >= min && n <= max && (!integer || Number.isSafeInteger(n));
    if (!data || !Array.isArray(data.tasks) || data.tasks.length > 500 ||
        !finite(data.breakBankMinutes, -1000000, 1000000) || !finite(data.sessionCount, 1, 10000000, true) ||
        !finite(data.focusMinutes, 1, 300, true) || !finite(data.breakMinutes, 1, 120, true)) {
        throw new Error("Invalid saved progress");
    }
    const cleanTasks = data.tasks.map(task => {
        if (!task || typeof task.name !== "string" || !task.name.trim() || task.name.length > 300 ||
            typeof task.completed !== "boolean" || !finite(task.reward, 0, 10000)) throw new Error("Invalid saved task");
        return {name: task.name, reward: task.reward, completed: task.completed};
    });
    return {tasks: cleanTasks, breakBankMinutes: data.breakBankMinutes, sessionCount: data.sessionCount,
        focusMinutes: data.focusMinutes, breakMinutes: data.breakMinutes};
}
function currentProgress() {
    return validateProgress({tasks, breakBankMinutes, sessionCount,
        focusMinutes: Number(focusInput.value), breakMinutes: Number(breakInput.value)});
}
function guestProgress() {
    try {
        const saved = localStorage.getItem("melofocusGuestProgress");
        if (saved) return validateProgress(JSON.parse(saved));
        return validateProgress({...defaultProgress(),
            tasks: JSON.parse(localStorage.getItem("melofocusTasks") || "[]"),
            breakBankMinutes: Number(localStorage.getItem("melofocusBreakBank") || 0)});
    } catch { return defaultProgress(); }
}
function applyProgress(data, restart) {
    const clean = validateProgress(data);
    if (restart) {
        stopTimer();
        closeBreakDecision();
        redeemOverlay.classList.add("hidden");
        isBreak = false;
        modeLabel.textContent = "FOCUS MODE 🌸";
    }
    tasks = clean.tasks;
    breakBankMinutes = clean.breakBankMinutes;
    sessionCount = clean.sessionCount;
    focusInput.value = clean.focusMinutes;
    breakInput.value = clean.breakMinutes;
    selectedTaskIndex = -1;
    sessionLabel.textContent = "#" + sessionCount;
    renderTasks(); updateBreakBank();
    if (restart) resetTimer();
}
window.meloProgress = {
    defaults: defaultProgress, validate: validateProgress, guest: guestProgress,
    apply: applyProgress, snapshot: currentProgress,
    loadGuest: () => applyProgress(guestProgress(), true),
    stop: () => { pauseTimer(); closeBreakDecision(); redeemOverlay.classList.add("hidden"); }
};
for (const input of [focusInput, breakInput]) {
    input.addEventListener("change", () => {
        const fallback = input === focusInput ? 25 : 5;
        const maximum = input === focusInput ? 300 : 120;
        const value = Number(input.value);
        input.value = Number.isFinite(value) ? Math.max(1, Math.min(maximum, Math.round(value))) : fallback;
        saveData();
    });
}
