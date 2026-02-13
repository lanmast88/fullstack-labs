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
    const item = item.find(i => i.id === id);

    if (!item) {
        return res.status(404)
    }

    res.json(item)
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});