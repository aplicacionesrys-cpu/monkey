const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const carsRoutes = require('./routes/cars');
const repairsRoutes = require('./routes/repairs');

const app = express();
const PORT = process.env.PORT || 3001;

// Crear directorios de uploads si no existen
const uploadsDir = path.join(__dirname, '..', 'uploads');
const photosDir = path.join(uploadsDir, 'photos');
const documentsDir = path.join(uploadsDir, 'documents');

[uploadsDir, photosDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(cors());
app.use(express.json());

// Servir archivos estáticos (fotos y documentos)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/repairs', repairsRoutes);

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor AutoGestion corriendo en http://localhost:${PORT}`);
});
