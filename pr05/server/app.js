const express = require('express');
const { nanoid } = require('nanoid');
const cors = require("cors");
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

let products = [
    { id: nanoid(6), name: 'Nike Air Force 1', category: 'Классика', description: 'Классические белые кроссовки с чёрным Swoosh. Кожаный верх, амортизирующая подошва Air.', price: 8990, stock: 25 },
    { id: nanoid(6), name: 'Nike Air Max 90', category: 'Беговые', description: 'Культовые беговые кроссовки с видимой воздушной подушкой Air Max в пятке.', price: 10990, stock: 18 },
    { id: nanoid(6), name: 'Adidas Stan Smith', category: 'Классика', description: 'Минималистичные кожаные кроссовки с зелёной пяткой. Иконический теннисный стиль.', price: 7990, stock: 30 },
    { id: nanoid(6), name: 'Adidas Ultraboost 22', category: 'Беговые', description: 'Технологичные беговые кроссовки с подошвой Boost и адаптивной верхней частью Primeknit.', price: 13990, stock: 12 },
    { id: nanoid(6), name: 'New Balance 574', category: 'Повседневные', description: 'Универсальные кроссовки на каждый день с замшевыми вставками и подошвой ENCAP.', price: 9490, stock: 20 },
    { id: nanoid(6), name: 'Puma Suede Classic', category: 'Классика', description: 'Замшевые кроссовки в ретро-стиле. Оригинальный дизайн, проверенный десятилетиями.', price: 6990, stock: 15 },
    { id: nanoid(6), name: 'Converse Chuck Taylor', category: 'Классика', description: 'Высокие холщовые кеды всех времён. Резиновый мыс и фирменная звёздная нашивка.', price: 5990, stock: 40 },
    { id: nanoid(6), name: 'Vans Old Skool', category: 'Скейтборд', description: 'Классические скейтбордические кеды с фирменной боковой полосой Jazz Stripe.', price: 6490, stock: 22 },
    { id: nanoid(6), name: 'Reebok Classic Leather', category: 'Классика', description: 'Кожаные кроссовки с мягкой подошвой EVA и перфорированным носком для воздухообмена.', price: 8490, stock: 17 },
    { id: nanoid(6), name: 'ASICS Gel-Kayano 29', category: 'Беговые', description: 'Стабилизирующие беговые кроссовки с двойной гелевой амортизацией и технологией FF BLAST+.', price: 15990, stock: 8 },
];

// ─── Swagger Config ───────────────────────────────────────────────────────────

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Products API',
            version: '1.0.0',
            description: 'CRUD API для управления товарами (кроссовки)',
        },
        servers: [{ url: 'http://localhost:3000' }],
        components: {
            schemas: {
                /**
                 * @swagger
                 * components:
                 *   schemas:
                 *     Product:
                 *       type: object
                 *       properties:
                 *         id:
                 *           type: string
                 *           example: "abc123"
                 *           description: Уникальный идентификатор товара (генерируется автоматически)
                 *         name:
                 *           type: string
                 *           example: "Nike Air Force 1"
                 *         category:
                 *           type: string
                 *           example: "Классика"
                 *         description:
                 *           type: string
                 *           example: "Классические белые кроссовки с чёрным Swoosh."
                 *         price:
                 *           type: number
                 *           example: 8990
                 *         stock:
                 *           type: number
                 *           example: 25
                 *     ProductInput:
                 *       type: object
                 *       required:
                 *         - name
                 *         - category
                 *         - description
                 *         - price
                 *         - stock
                 *       properties:
                 *         name:
                 *           type: string
                 *           example: "Nike Air Force 1"
                 *         category:
                 *           type: string
                 *           example: "Классика"
                 *         description:
                 *           type: string
                 *           example: "Классические белые кроссовки."
                 *         price:
                 *           type: number
                 *           example: 8990
                 *         stock:
                 *           type: number
                 *           example: 25
                 *     ProductPatch:
                 *       type: object
                 *       properties:
                 *         name:
                 *           type: string
                 *         category:
                 *           type: string
                 *         description:
                 *           type: string
                 *         price:
                 *           type: number
                 *         stock:
                 *           type: number
                 */
            },
        },
    },
    apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());

app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            console.log('Body:', req.body);
        }
    });
    next();
});

app.use(cors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

function findProductOr404(id, res) {
    const product = products.find(p => p.id == id);
    if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return null;
    }
    return product;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Некорректные данные запроса
 */
app.post('/api/products', (req, res) => {
    const { name, category, description, price, stock } = req.body;
    const newProduct = {
        id: nanoid(6),
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        price: Number(price),
        stock: Number(stock),
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Массив товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => {
    res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Товар найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Product not found
 */
app.get('/api/products/:id', (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (!product) return;
    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Частично обновить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductPatch'
 *     responses:
 *       200:
 *         description: Товар обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Тело запроса пустое
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Nothing to update
 *       404:
 *         description: Товар не найден
 */
app.patch('/api/products/:id', (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (!product) return;

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Nothing to update' });
    }

    const { name, category, description, price, stock } = req.body;
    if (name !== undefined) product.name = name.trim();
    if (category !== undefined) product.category = category.trim();
    if (description !== undefined) product.description = description.trim();
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);

    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар удалён (тело ответа пустое)
 *       404:
 *         description: Товар не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Product not found
 */
app.delete('/api/products/:id', (req, res) => {
    const id = req.params.id;
    const exists = products.some(p => p.id === id);
    if (!exists) return res.status(404).json({ error: 'Product not found' });
    products = products.filter(p => p.id !== id);
    res.status(204).send();
});

// ─── Fallback & Error handlers ────────────────────────────────────────────────

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
    console.log(`Swagger UI доступен на http://localhost:${port}/api-docs`);
});