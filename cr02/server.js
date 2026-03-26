const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const app = express();
app.use(express.json());

const PORT = 3000;

const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

// --- Mock Data ---
const users = [
  {
    id: "mock-user-1",
    email: "user@example.com",
    first_name: "Иван",
    last_name: "Иванов",
    hashedPassword: bcrypt.hashSync("user123", 10),
    role: "user",
    blocked: false,
  },
  {
    id: "mock-admin-1",
    email: "admin@example.com",
    first_name: "Глеб",
    last_name: "Ушаков",
    hashedPassword: bcrypt.hashSync("admin123", 10),
    role: "admin",
    blocked: false,
  },
];

const products = [
  {
    id: "mock-product-1",
    title: "Ноутбук Pro",
    category: "Электроника",
    description: "Мощный ноутбук для работы и учёбы",
    price: 89999,
  },
];

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

const refreshTokens = new Set();

function logger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log({
      time: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.sub || null,
      body: req.body,
    });
  });

  next();
}

app.use(logger);

// --- Middleware ---
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// roleMiddleware принимает один или несколько допустимых ролей
function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}

// --- Auth Routes ---

// POST /api/auth/register — Гость
app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ error: "email, first_name, last_name and password are required" });
  }

  const existing = users.find((u) => u.email === email);
  if (existing) {
    return res.status(409).json({ error: "User with this email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: nanoid(),
    email,
    first_name,
    last_name,
    hashedPassword,
    role: "user",
    blocked: false,
  };
  users.push(user);

  res.status(201).json({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
  });
});

// POST /api/auth/login — Гость
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.blocked) {
    return res.status(403).json({ error: "User is blocked" });
  }

  const isValid = await bcrypt.compare(password, user.hashedPassword);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);

  res.json({ accessToken, refreshToken });
});

// POST /api/auth/refresh — Гость
app.post("/api/auth/refresh", (req, res) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing refresh token" });
  }

  const refreshToken = token;

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    refreshTokens.delete(refreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// GET /api/auth/me — Пользователь
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    blocked: user.blocked,
  });
});

// --- Users Routes (Администратор) ---

// GET /api/users — Администратор
app.get("/api/users", authMiddleware, roleMiddleware("admin"), (req, res) => {
  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      blocked: u.blocked,
    }))
  );
});

// GET /api/users/:id — Администратор
app.get("/api/users/:id", authMiddleware, roleMiddleware("admin"), (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    blocked: user.blocked,
  });
});

// PUT /api/users/:id — Администратор
app.put("/api/users/:id", authMiddleware, roleMiddleware("admin"), (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { first_name, last_name, email, role } = req.body;
  if (first_name !== undefined) user.first_name = first_name;
  if (last_name !== undefined) user.last_name = last_name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;

  res.json({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    blocked: user.blocked,
  });
});

// DELETE /api/users/:id — Администратор (блокировка)
app.delete("/api/users/:id", authMiddleware, roleMiddleware("admin"), (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  user.blocked = true;

  res.json({ message: "User blocked", id: user.id });
});

// --- Products Routes ---

// POST /api/products — Продавец + Администратор
app.post("/api/products", authMiddleware, roleMiddleware("seller", "admin"), (req, res) => {
  const { title, category, description, price } = req.body;

  if (!title || !category || !description || price === undefined) {
    return res.status(400).json({ error: "title, category, description and price are required" });
  }

  const product = {
    id: nanoid(),
    title,
    category,
    description,
    price: Number(price),
  };
  products.push(product);

  res.status(201).json(product);
});

// GET /api/products — Пользователь + Продавец + Администратор
app.get("/api/products", authMiddleware, roleMiddleware("user", "seller", "admin"), (req, res) => {
  res.json(products);
});

// GET /api/products/:id — Пользователь + Продавец + Администратор
app.get("/api/products/:id", authMiddleware, roleMiddleware("user", "seller", "admin"), (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(product);
});

// PUT /api/products/:id — Продавец + Администратор
app.put("/api/products/:id", authMiddleware, roleMiddleware("seller", "admin"), (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const { title, category, description, price } = req.body;
  if (title !== undefined) product.title = title;
  if (category !== undefined) product.category = category;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = Number(price);

  res.json(product);
});

// DELETE /api/products/:id — Администратор
app.delete("/api/products/:id", authMiddleware, roleMiddleware("admin"), (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  products.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});