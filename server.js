// require('dotenv').config(); // <- added line
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const routes = require('./router/services');

// const app = express();
// const PORT = 3001;

// app.use(cors());
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ limit: '10mb', extended: true }));

// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log('MongoDB connected'))
//   .catch((err) => console.error('MongoDB connection error:', err));

// app.use('/ecomart', routes);

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

require('dotenv').config(); // Ensure dotenv is configured

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./router/services');

const app = express();

// Use dynamic port from environment or fallback to 3001 (for local testing)
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/ecomart', routes);

// Start server on dynamic port
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Export the app for Render/Vercel
