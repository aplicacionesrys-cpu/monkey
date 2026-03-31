const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const auth = require('../middleware/auth');

// Configurar almacenamiento de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'photos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, safeName);
  }
});

const photoFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'), false);
};

const upload = multer({
  storage,
  fileFilter: photoFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB máximo
});

// ──────────────────────────────────────────────
// CRUD Autos
// ──────────────────────────────────────────────

// Listar todos los autos
router.get('/', auth, (req, res) => {
  const cars = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM car_photos WHERE car_id = c.id) AS photo_count,
      (SELECT COUNT(*) FROM repairs WHERE car_id = c.id) AS repair_count,
      (SELECT COALESCE(SUM(cost),0) FROM repairs WHERE car_id = c.id) AS total_repair_cost
    FROM cars c
    ORDER BY c.created_at DESC
  `).all();
  res.json(cars);
});

// Obtener un auto por ID con toda su info
router.get('/:id', auth, (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Auto no encontrado' });

  const photos = db.prepare('SELECT * FROM car_photos WHERE car_id = ? ORDER BY created_at').all(car.id);
  const repairs = db.prepare('SELECT * FROM repairs WHERE car_id = ? ORDER BY date DESC').all(car.id);

  // Para cada reparación, traer sus documentos
  const repairsWithDocs = repairs.map(repair => ({
    ...repair,
    documents: db.prepare('SELECT * FROM repair_documents WHERE repair_id = ? ORDER BY created_at').all(repair.id)
  }));

  const totalRepairCost = repairs.reduce((sum, r) => sum + (r.cost || 0), 0);

  res.json({ ...car, photos, repairs: repairsWithDocs, totalRepairCost });
});

// Crear auto
router.post('/', auth, (req, res) => {
  const { brand, model, year, color, plate, vin, km, arrival_date, purchase_price, status, notes } = req.body;

  if (!brand || !model) {
    return res.status(400).json({ error: 'Marca y modelo son obligatorios' });
  }

  const result = db.prepare(`
    INSERT INTO cars (brand, model, year, color, plate, vin, km, arrival_date, purchase_price, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(brand, model, year || null, color || null, plate || null, vin || null,
         km || null, arrival_date || null, purchase_price || 0,
         status || 'disponible', notes || null);

  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(car);
});

// Actualizar auto
router.put('/:id', auth, (req, res) => {
  const car = db.prepare('SELECT id FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Auto no encontrado' });

  const { brand, model, year, color, plate, vin, km, arrival_date, purchase_price, status, notes } = req.body;

  db.prepare(`
    UPDATE cars SET brand=?, model=?, year=?, color=?, plate=?, vin=?, km=?,
    arrival_date=?, purchase_price=?, status=?, notes=?, updated_at=datetime('now')
    WHERE id=?
  `).run(brand, model, year || null, color || null, plate || null, vin || null,
         km || null, arrival_date || null, purchase_price || 0,
         status || 'disponible', notes || null, req.params.id);

  const updated = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Eliminar auto
router.delete('/:id', auth, (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Auto no encontrado' });

  // Eliminar archivos físicos de fotos
  const photos = db.prepare('SELECT filename FROM car_photos WHERE car_id = ?').all(req.params.id);
  photos.forEach(p => {
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'photos', p.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  // Eliminar documentos de reparaciones
  const repairs = db.prepare('SELECT id FROM repairs WHERE car_id = ?').all(req.params.id);
  repairs.forEach(r => {
    const docs = db.prepare('SELECT filename FROM repair_documents WHERE repair_id = ?').all(r.id);
    docs.forEach(d => {
      const filePath = path.join(__dirname, '..', '..', 'uploads', 'documents', d.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  });

  db.prepare('DELETE FROM cars WHERE id = ?').run(req.params.id);
  res.json({ message: 'Auto eliminado correctamente' });
});

// ──────────────────────────────────────────────
// Fotos
// ──────────────────────────────────────────────

// Subir fotos
router.post('/:id/photos', auth, upload.array('photos', 20), (req, res) => {
  const car = db.prepare('SELECT id FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Auto no encontrado' });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se recibieron fotos' });
  }

  const insertPhoto = db.prepare(
    'INSERT INTO car_photos (car_id, filename, original_name) VALUES (?, ?, ?)'
  );

  const insertMany = db.transaction((files) => {
    return files.map(f => {
      const result = insertPhoto.run(car.id, f.filename, f.originalname);
      return db.prepare('SELECT * FROM car_photos WHERE id = ?').get(result.lastInsertRowid);
    });
  });

  const photos = insertMany(req.files);
  res.status(201).json(photos);
});

// Eliminar foto
router.delete('/:carId/photos/:photoId', auth, (req, res) => {
  const photo = db.prepare('SELECT * FROM car_photos WHERE id = ? AND car_id = ?')
    .get(req.params.photoId, req.params.carId);
  if (!photo) return res.status(404).json({ error: 'Foto no encontrada' });

  const filePath = path.join(__dirname, '..', '..', 'uploads', 'photos', photo.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM car_photos WHERE id = ?').run(photo.id);
  res.json({ message: 'Foto eliminada' });
});

// ──────────────────────────────────────────────
// Estadísticas / Gráficos
// ──────────────────────────────────────────────
router.get('/:id/stats', auth, (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Auto no encontrado' });

  const repairs = db.prepare('SELECT * FROM repairs WHERE car_id = ? ORDER BY date').all(car.id);

  // Costo por tipo de reparación
  const byType = db.prepare(`
    SELECT type, COALESCE(SUM(cost),0) as total, COUNT(*) as count
    FROM repairs WHERE car_id = ? GROUP BY type
  `).all(car.id);

  // Costo acumulado por mes
  const byMonth = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(cost),0) as total
    FROM repairs WHERE car_id = ? GROUP BY month ORDER BY month
  `).all(car.id);

  const totalRepairs = repairs.reduce((s, r) => s + (r.cost || 0), 0);
  const totalInvestment = (car.purchase_price || 0) + totalRepairs;

  res.json({
    purchase_price: car.purchase_price || 0,
    total_repairs: totalRepairs,
    total_investment: totalInvestment,
    by_type: byType,
    by_month: byMonth,
    repairs_list: repairs
  });
});

module.exports = router;
