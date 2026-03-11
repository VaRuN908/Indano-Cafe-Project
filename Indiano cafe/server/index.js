const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const db = require('./database');
const authRoutes = require('./routes/auth'); // Import auth routes

app.use('/auth', authRoutes); // Use auth routes

app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
