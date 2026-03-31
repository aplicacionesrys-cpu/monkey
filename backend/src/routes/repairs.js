const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const auth = require('../middleware/auth');

// Configurar almacenamiento de documentos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, safeName);
  }
});

const docFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Solo se permiten PDF e imágenes'), false);
};

const upload = multer({
  storage,
  fileFilter: docFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB máximo
});

// ──────────────────────────────────────────────
// CRUD Reparaciones
// ──────────────────────────────────────────────

// Listar reparaciones de un auto
router.get('/car/:carId', auth, (req, res) => {
  const repairs = db.prepare('SELECT * FROM repairs WHERE car_id = ? ORDER BY date DESC').all(req.params.carId);
  const repairsWithDocs = repairs.map(repair => ({
    ...repair,
    documents: db.prepare('SELECT * FROM repair_documents WHERE repair_id = ?').all(repair.id)
  }));
  res.json(repairsWithDocs);
});

// Crear reparación
router.post('/car/:carId', auth, (req, res) => {
  const car = db.prepare('SELECT id FROM cars WHERE id = ?').get(req.params.carId);
  if (!car) return res.status(404).json({ error: 'Auto no encontrado' });

  const { type, workshop, description, date, cost, notes } = req.body;

  if (!description || !date) {
    return res.status(400).json({ error: 'Descripción y fecha son obligatorias' });
  }

  const result = db.prepare(`
    INSERT INTO repairs (car_id, type, workshop, description, date, cost, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.carId, type || 'otro', workshop || null, description, date, cost || 0, notes || null);

  // Actualizar updated_at del auto
  db.prepare("UPDATE cars SET updated_at=datetime('now') WHERE id=?").run(req.params.carId);

  const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...repair, documents: [] });
});

// Actualizar reparación
router.put('/:id', auth, (req, res) => {
  const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(req.params.id);
  if (!repair) return res.status(404).json({ error: 'Reparación no encontrada' });

  const { type, workshop, description, date, cost, notes } = req.body;

  db.prepare(`
    UPDATE repairs SET type=?, workshop=?, description=?, date=?, cost=?, notes=?
    WHERE id=?
  `).run(type || 'otro', workshop || null, description, date, cost || 0, notes || null, req.params.id);

  const updated = db.prepare('SELECT * FROM repairs WHERE id = ?').get(req.params.id);
  const documents = db.prepare('SELECT * FROM repair_documents WHERE repair_id = ?').all(req.params.id);
  res.json({ ...updated, documents });
});

// Eliminar reparación
router.delete('/:id', auth, (req, res) => {
  const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(req.params.id);
  if (!repair) return res.status(404).json({ error: 'Reparación no encontrada' });

  // Eliminar documentos físicos
  const docs = db.prepare('SELECT filename FROM repair_documents WHERE repair_id = ?').all(req.params.id);
  docs.forEach(d => {
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'documents', d.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  db.prepare('DELETE FROM repairs WHERE id = ?').run(req.params.id);
  res.json({ message: 'Reparación eliminada' });
});

// ──────────────────────────────────────────────
// Documentos de reparación (boletas/facturas)
// ──────────────────────────────────────────────

// Subir documentos a una reparación
router.post('/:repairId/documents', auth, upload.array('documents', 10), (req, res) => {
  const repair = db.prepare('SELECT id FROM repairs WHERE id = ?').get(req.params.repairId);
  if (!repair) return res.status(404).json({ error: 'Reparación no encontrada' });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se recibieron documentos' });
  }

  const { document_type, document_number, provider, amount } = req.body;

  const insertDoc = db.prepare(`
    INSERT INTO repair_documents (repair_id, filename, original_name, document_type, document_number, provider, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((files) => {
    return files.map(f => {
      const result = insertDoc.run(
        repair.id, f.filename, f.originalname,
        document_type || 'otro', document_number || null,
        provider || null, amount || 0
      );
      return db.prepare('SELECT * FROM repair_documents WHERE id = ?').get(result.lastInsertRowid);
    });
  });

  const docs = insertMany(req.files);
  res.status(201).json(docs);
});

// Actualizar metadatos de un documento
router.put('/documents/:docId', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM repair_documents WHERE id = ?').get(req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

  const { document_type, document_number, provider, amount } = req.body;

  db.prepare(`
    UPDATE repair_documents SET document_type=?, document_number=?, provider=?, amount=?
    WHERE id=?
  `).run(document_type || 'otro', document_number || null, provider || null, amount || 0, req.params.docId);

  const updated = db.prepare('SELECT * FROM repair_documents WHERE id = ?').get(req.params.docId);
  res.json(updated);
});

// Eliminar documento
router.delete('/documents/:docId', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM repair_documents WHERE id = ?').get(req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

  const filePath = path.join(__dirname, '..', '..', 'uploads', 'documents', doc.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM repair_documents WHERE id = ?').run(req.params.docId);
  res.json({ message: 'Documento eliminado' });
});

module.exports = router;
