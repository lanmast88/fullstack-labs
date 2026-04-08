const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const webpush = require("web-push");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const vapidKeys = require("./vapid-keys.json");

webpush.setVapidDetails(
  "mailto:vukivuki164@mail.ru",
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "..")));

let subscriptions = [];
const reminders = new Map();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("Клиент подключён:", socket.id);

  // Обработка события 'newTask' от клиента
  socket.on("newTask", (task) => {
    // Рассылаем событие всем подключённым клиентам, включая отправителя
    io.emit("taskAdded", task);

    // Формируем payload для push-уведомления
    const payload = JSON.stringify({
      title: "Новая задача",
      body: task.text,
    });

    subscriptions.forEach((sub) => {
      webpush
        .sendNotification(sub, payload)
        .catch((err) => console.error("Push error:", err));
    });
  });

  socket.on("newReminder", (reminder) => {
    const { id, text, reminderTime } = reminder;
    const delay = reminderTime - Date.now();
    console.log(`[newReminder] id=${id}, text="${text}", delay=${delay}ms, subscriptions=${subscriptions.length}`);
    if (delay <= 0) {
      console.log("[newReminder] delay <= 0, пропускаем");
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log(`[reminder fired] id=${id}, subscriptions=${subscriptions.length}`);
      const payload = JSON.stringify({
        title: "!!! Напоминание",
        body: text,
        reminderId: id,
      });
      subscriptions.forEach((sub) => {
        webpush
          .sendNotification(sub, payload)
          .then(() => console.log("[push sent] успешно"))
          .catch((err) => console.error("Push error:", err));
      });
      reminders.delete(id);
    }, delay);

    reminders.set(id, { timeoutId, text, reminderTime });
    console.log(`[newReminder] таймер установлен, сработает через ${Math.round(delay/1000)}с`);
  });

  socket.on("disconnect", () => {
    console.log("Клиент отключён:", socket.id);
  });
});

app.post("/subscribe", (req, res) => {
  subscriptions.push(req.body);
  res.status(201).json({ message: "Подписка сохранена" });
});

app.post("/unsubscribe", (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter((sub) => sub.endpoint !== endpoint);
  res.status(200).json({ message: "Подписка удалена" });
});

app.post("/snooze", (req, res) => {
  const reminderId = parseInt(req.query.reminderId, 10);
  if (!reminderId || !reminders.has(reminderId)) {
    return res.status(404).json({ error: "Reminder not found" });
  }

  const reminder = reminders.get(reminderId);
  clearTimeout(reminder.timeoutId);

  const newDelay = 5 * 60 * 1000;
  const newTimeoutId = setTimeout(() => {
    const payload = JSON.stringify({
      title: "Напоминание отложено",
      body: reminder.text,
      reminderId: reminderId,
    });
    subscriptions.forEach((sub) => {
      webpush
        .sendNotification(sub, payload)
        .catch((err) => console.error("Push error:", err));
    });
    reminders.delete(reminderId);
  }, newDelay);

  reminders.set(reminderId, {
    timeoutId: newTimeoutId,
    text: reminder.text,
    reminderTime: Date.now() + newDelay,
  });

  res.status(200).json({ message: "Reminder snoozed for 5 minutes" });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
