const express = require('express');
const app = express();
const port = 3000;

let items = [
    {id: 1, title: "Кроссовки", price: 14},
    {id: 2, title: "Табуретка", price: 500},
    {id: 3, title: "Малина", price: 19}
]

// GET — получить все товары
app.get('/items', (req, res) => {
    res.json(items);
});

// GET - получить товар по id
app.get('/items/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const item = items.find(i => i.id === id);

    if (!item) {
        return res.status(404)
    }

    res.json(item)
});


// POST - создать новый товар
app.post('/items', (req, res) => {
    const { title, price } = req.body;
    const newItem = {
        id: Date.now(),
        title,
        price
    };
    items.push(newItem);
    res.status(201).json(newItem);
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});