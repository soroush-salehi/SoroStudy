"use strict";
const $ = selector => document.querySelector(selector);
const STORE = "sorostudy.data.v3";
const DEFAULT_SECONDS = 25 * 60;
let data = { tasks: [], totalSeconds: 0, sessions: 0, daily: {} };
let remaining = DEFAULT_SECONDS;
let running = false;
let interval = null;
let lastTick = 0;
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
    data = { ...data, ...saved, tasks: Array.isArray(saved.tasks) ? saved.tasks : [], daily: saved.daily || {} };
  } catch { /* use clean defaults */ }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(data)); }
  catch (error) { $("#state").textContent = "Storage is full; export or remove old tasks."; }
}
function format(seconds) {
  return String(Math.floor(seconds / 60)).padStart(2,"0") + ":" + String(seconds % 60).padStart(2,"0");
}
function todayKey() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth()+1).padStart(2,"0"), String(now.getDate()).padStart(2,"0")].join("-");
}
function render() {
  $("#clock").textContent = format(remaining);
  $("#total").textContent = Math.floor(data.totalSeconds / 60) + " min";
  const today = data.daily[todayKey()] || 0;
  $("#state").dataset.today = Math.floor(today / 60) + " min studied today";
  $("#list").replaceChildren();
  data.tasks.forEach((task, index) => {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox"; checkbox.checked = !!task.done; checkbox.dataset.index = index;
    const span = document.createElement("span");
    span.textContent = task.text; if (task.done) span.className = "done";
    label.append(checkbox, span);
    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "remove"; remove.textContent = "×"; remove.dataset.remove = index;
    li.append(label, remove); $("#list").append(li);
  });
  $("#sessionCount")?.replaceChildren(document.createTextNode(String(data.sessions)));
  save();
}
function stopTimer() {
  running = false;
  if (interval) clearInterval(interval);
  interval = null;
  $("#start").textContent = "Start focus";
}
function tick() {
  const now = Date.now();
  const elapsed = Math.max(0, Math.floor((now - lastTick) / 1000));
  lastTick += elapsed * 1000;
  if (!elapsed) return;
  const counted = Math.min(elapsed, remaining);
  data.totalSeconds += counted;
  const key = todayKey();
  data.daily[key] = (data.daily[key] || 0) + counted;
  remaining = Math.max(0, remaining - elapsed);
  if (remaining === 0) {
    stopTimer();
    data.sessions += 1;
    $("#state").textContent = "Session complete. Take a short break.";
  }
  render();
}
$("#start").addEventListener("click", () => {
  if (running) {
    tick(); stopTimer(); $("#state").textContent = "Paused. Resume when ready."; render(); return;
  }
  if (remaining === 0) remaining = DEFAULT_SECONDS;
  running = true; lastTick = Date.now();
  $("#start").textContent = "Pause";
  $("#state").textContent = "Focus session running.";
  interval = setInterval(tick, 250);
});
$("#reset").addEventListener("click", () => {
  stopTimer(); remaining = DEFAULT_SECONDS;
  $("#state").textContent = "Timer reset."; render();
});
$("#taskform").addEventListener("submit", event => {
  event.preventDefault();
  const input = $("#task"), text = input.value.trim();
  if (!text) return;
  data.tasks.unshift({ id: crypto.randomUUID?.() || String(Date.now()), text, done: false });
  input.value = ""; render(); input.focus();
});
$("#list").addEventListener("change", event => {
  const index = Number(event.target.dataset.index);
  if (Number.isInteger(index) && data.tasks[index]) { data.tasks[index].done = event.target.checked; render(); }
});
$("#list").addEventListener("click", event => {
  const index = Number(event.target.dataset.remove);
  if (Number.isInteger(index) && data.tasks[index]) { data.tasks.splice(index,1); render(); }
});
document.addEventListener("visibilitychange", () => { if (running) { tick(); lastTick = Date.now(); } });
load(); render();