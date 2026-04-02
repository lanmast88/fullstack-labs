const form = document.getElementById("note-form");
const input = document.getElementById("note-input");
const list = document.getElementById("notes-list");
const banner = document.getElementById("offline-banner");

function escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function deleteNote(index) {
  const notes = JSON.parse(localStorage.getItem("notes") || "[]");
  notes.splice(index, 1);
  localStorage.setItem("notes", JSON.stringify(notes));
  loadNotes();
}

function loadNotes() {
  const notes = JSON.parse(localStorage.getItem("notes") || "[]");
  list.innerHTML = notes
    .map(
      (note, i) =>
        `<li>${escapeHtml(note)}<button onclick="deleteNote(${i})">Удалить</button></li>`
    )
    .join("");
}

function addNote(text) {
  const notes = JSON.parse(localStorage.getItem("notes") || "[]");
  notes.push(text);
  localStorage.setItem("notes", JSON.stringify(notes));
  loadNotes();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text) {
    addNote(text);
    input.value = "";
  }
});

function updateOnlineStatus() {
  banner.style.display = navigator.onLine ? "none" : "block";
}
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

loadNotes();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("sw.js");
      console.log("ServiceWorker зарегистрирован:", registration.scope);
    } catch (err) {
      console.error("Ошибка регистрации ServiceWorker:", err);
    }
  });
}
