const contentDiv = document.getElementById("app-content");
const homeBtn = document.getElementById("home-btn");
const aboutBtn = document.getElementById("about-btn");

const socket = io("http://localhost:3001");

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function setActiveButton(activeId) {
  [homeBtn, aboutBtn].forEach((btn) => btn.classList.remove("active"));
  document.getElementById(activeId).classList.add("active");
}

async function loadContent(page) {
  try {
    const response = await fetch(`/content/${page}.html`);
    const html = await response.text();
    contentDiv.innerHTML = html;

    // Если загружена главная страница, инициализируем функционал заметок
    if (page === "home") {
      initNotes();
    }
  } catch (err) {
    contentDiv.innerHTML = `<p class="is-center text-error">Ошибка загрузки страницы.</p>`;
    console.error(err);
  }
}

homeBtn.addEventListener("click", () => {
  setActiveButton("home-btn");
  loadContent("home");
});

aboutBtn.addEventListener("click", () => {
  setActiveButton("about-btn");
  loadContent("about");
});

// Загружаем главную страницу при старте
loadContent("home");

// Функционал заметок (localStorage)
function initNotes() {
  const form = document.getElementById("note-form");
  const input = document.getElementById("note-input");
  const reminderForm = document.getElementById("reminder-form");
  const reminderText = document.getElementById("reminder-text");
  const reminderTime = document.getElementById("reminder-time");
  const list = document.getElementById("notes-list");

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  function loadNotes() {
    const notes = JSON.parse(localStorage.getItem("notes") || "[]");
    list.innerHTML = notes
      .map(
        (note, i) => {
          let reminderInfo = "";
          if (note.reminder) {
            const date = new Date(note.reminder);
            reminderInfo = `<br><small style="color:#6b7280;">Напоминание: ${date.toLocaleString()}</small>`;
          }
          return `<li style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;margin-bottom:0.5rem;border:1px solid #e5e7eb;border-radius:8px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
            <span style="flex:1;margin-right:1rem;font-size:16px;word-break:break-word;color:#111827;">${escapeHtml(note.text)}${reminderInfo}</span>
            <button onclick="deleteNote(${i})" style="flex-shrink:0;padding:0.4rem 0.9rem;border:1px solid #e5e7eb;border-radius:5px;background:#f9fafb;cursor:pointer;font-size:16px;color:#6b7280;">Удалить</button>
          </li>`;
        }
      )
      .join("");
  }

  function addNote(text, reminderTimestamp = null) {
    const notes = JSON.parse(localStorage.getItem("notes") || "[]");
    const newNote = { id: Date.now(), text, reminder: reminderTimestamp };
    notes.push(newNote);
    localStorage.setItem("notes", JSON.stringify(notes));
    loadNotes();

    if (reminderTimestamp) {
      socket.emit("newReminder", {
        id: newNote.id,
        text: text,
        reminderTime: reminderTimestamp,
      });
    } else {
      socket.emit("newTask", { text, timestamp: Date.now() });
    }
  }

  window.deleteNote = function (index) {
    const notes = JSON.parse(localStorage.getItem("notes") || "[]");
    notes.splice(index, 1);
    localStorage.setItem("notes", JSON.stringify(notes));
    loadNotes();
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
      addNote(text);
      input.value = "";
    }
  });

  reminderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = reminderText.value.trim();
    const datetime = reminderTime.value;
    if (text && datetime) {
      const timestamp = new Date(datetime).getTime();
      if (timestamp > Date.now()) {
        addNote(text, timestamp);
        reminderText.value = "";
        reminderTime.value = "";
      } else {
        alert("Дата напоминания должна быть в будущем");
      }
    }
  });

  loadNotes();
}

// Регистрация Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      console.log("SW registered");

      const enableBtn = document.getElementById("enable-push");
      const disableBtn = document.getElementById("disable-push");

      if (enableBtn && disableBtn) {
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          enableBtn.style.display = "none";
          disableBtn.style.display = "inline-block";
        }

        enableBtn.addEventListener("click", async () => {
          if (Notification.permission === "denied") {
            alert("Уведомления запрещены. Разрешите их в настройках браузера.");
            return;
          }
          if (Notification.permission === "default") {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
              alert("Необходимо разрешить уведомления.");
              return;
            }
          }
          await subscribeToPush();
          enableBtn.style.display = "none";
          disableBtn.style.display = "inline-block";
        });

        disableBtn.addEventListener("click", async () => {
          await unsubscribeFromPush();
          disableBtn.style.display = "none";
          enableBtn.style.display = "inline-block";
        });
      }
    } catch (err) {
      console.log("SW registration failed:", err);
    }
  });
}

async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        "BJFO7v2lvOyrZFg4Y5v8iRdxNAKNwhCzneS3yUG9llN2LBBOQhBWbPLnQV0_ArOl1B77M0E_hNeM1d9dbtp_YDA",
      ),
    });
    await fetch("http://localhost:3001/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    console.log("Подписка на push отправлена");
  } catch (err) {
    console.error("Ошибка подписки на push:", err);
  }
}
async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await fetch("http://localhost:3001/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
    console.log("Отписка выполнена");
  }
}

socket.on("taskAdded", (task) => {
  console.log("Задача от другого клиента:", task);
  const notification = document.createElement("div");
  notification.innerHTML = `
    <img src="/icons/favicon-48x48.png" style="width:24px;height:24px;margin-right:0.5rem;flex-shrink:0;" />
    <span><strong>Новая заметка</strong><br><span style="font-size:0.9rem;opacity:0.9;">${task.text}</span></span>
  `;
  notification.style.cssText = `
    position: fixed; top: 16px; right: 16px;
    display: flex; align-items: center; gap: 0.25rem;
    background: #1e293b; color: #fff;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    max-width: 280px;
    animation: fadeIn 0.2s ease;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
});
