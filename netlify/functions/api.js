const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multipart = require('lambda-multipart-parser');
const { v4: uuidv4 } = require('uuid');
const { v2: cloudinary } = require('cloudinary');

const JWT_SECRET = process.env.JWT_SECRET || 'autoGestion_secret_key_2024!';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function getFirebaseApp() {
  if (admin.apps.length) {
    return admin.app();
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : null;

  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON no esta configurada');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function db() {
  return getFirebaseApp().firestore();
}

function getCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Faltan variables de Cloudinary');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return cloudinary;
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(data),
  };
}

function noContent(statusCode = 204) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: '',
  };
}

function getPath(event) {
  const rawPath = event.path || '/';
  const withoutFn = rawPath.replace(/^\/\.netlify\/functions\/api/, '');
  const withoutApi = withoutFn.replace(/^\/api/, '');
  const normalized = (withoutApi || '/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
  return normalized || '/';
}

async function ensureAdminUser() {
  const usersRef = db().collection('users').doc(ADMIN_USERNAME);
  const doc = await usersRef.get();
  if (doc.exists) return;

  const password_hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  await usersRef.set({
    id: 1,
    username: ADMIN_USERNAME,
    password_hash,
    created_at: new Date().toISOString(),
  });
}

async function nextId(counterName) {
  const counterRef = db().collection('counters').doc(counterName);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? Number(snap.data().current || 0) : 0;
    const value = current + 1;
    tx.set(counterRef, { current: value }, { merge: true });
    return value;
  });
}

function verifyToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { status: 401, error: 'Token de autenticacion requerido' };
  }
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw { status: 401, error: 'Token invalido o expirado' };
  }
}

async function parseJsonBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return JSON.parse(raw);
}

function sanitizeFilename(prefix, originalname) {
  const ext = (originalname || '').toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
  return `${prefix}_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
}

async function uploadFileToStorage({ folder, filename, contentType, contentBuffer }) {
  const client = getCloudinary();
  const resourceType = folder === 'documents' ? 'auto' : 'image';

  const result = await new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder: `autogestion/${folder}`,
        public_id: filename.replace(/\.[^.]+$/, ''),
        resource_type: resourceType,
      },
      (error, uploadResult) => {
        if (error) reject(error);
        else resolve(uploadResult);
      }
    );

    stream.end(contentBuffer);
  });

  return {
    public_id: result.public_id,
    url: result.secure_url,
    resource_type: result.resource_type,
  };
}

function fileBuffer(file) {
  if (Buffer.isBuffer(file.content)) return file.content;
  if (typeof file.content === 'string') return Buffer.from(file.content, 'binary');
  return Buffer.from([]);
}

async function deleteStoragePath(fileData) {
  if (!fileData || !fileData.public_id) return;
  try {
    const client = getCloudinary();
    await client.uploader.destroy(fileData.public_id, {
      resource_type: fileData.resource_type || 'image',
      invalidate: true,
    });
  } catch (err) {
    // Si falla el borrado del archivo no bloqueamos la operacion principal.
  }
}

function resolveDocId(doc) {
  const data = doc.data() || {};
  const dataIdNumber = Number(data.id);
  if (Number.isFinite(dataIdNumber)) return dataIdNumber;

  const docIdNumber = Number(doc.id);
  if (Number.isFinite(docIdNumber)) return docIdNumber;

  if (typeof data.id === 'string' && data.id.trim()) return data.id;
  return String(doc.id);
}

function mapCarDoc(doc) {
  const data = doc.data() || {};
  return { ...data, id: resolveDocId(doc) };
}

function mapRepairDoc(doc) {
  const data = doc.data() || {};
  return { ...data, id: resolveDocId(doc) };
}

function mapPhotoDoc(doc) {
  const data = doc.data() || {};
  return { ...data, id: resolveDocId(doc) };
}

function mapRepairDocumentDoc(doc) {
  const data = doc.data() || {};
  return { ...data, id: resolveDocId(doc) };
}

function compareAscBy(field) {
  return (left, right) => {
    const leftValue = left?.[field] || '';
    const rightValue = right?.[field] || '';
    return String(leftValue).localeCompare(String(rightValue));
  };
}

function compareDescBy(field) {
  return (left, right) => compareAscBy(field)(right, left);
}

async function handleLogin(event) {
  await ensureAdminUser();
  const body = await parseJsonBody(event);
  const { username, password } = body;

  if (!username || !password) {
    return json(400, { error: 'Usuario y contraseña son requeridos' });
  }

  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 50 || password.length > 100) {
    return json(400, { error: 'Datos invalidos' });
  }

  const userSnap = await db().collection('users').doc(username).get();
  if (!userSnap.exists) {
    return json(401, { error: 'Credenciales invalidas' });
  }

  const user = userSnap.data();
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return json(401, { error: 'Credenciales invalidas' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  return json(200, { token, username: user.username });
}

async function listCars() {
  const carsSnap = await db().collection('cars').orderBy('created_at', 'desc').get();
  const cars = [];

  for (const carDoc of carsSnap.docs) {
    const car = mapCarDoc(carDoc);
    const photosSnap = await db().collection('car_photos').where('car_id', '==', car.id).get();
    const repairsSnap = await db().collection('repairs').where('car_id', '==', car.id).get();
    let totalRepairCost = 0;
    repairsSnap.docs.forEach((r) => {
      totalRepairCost += Number(r.data().cost || 0);
    });

    cars.push({
      ...car,
      photo_count: photosSnap.size,
      repair_count: repairsSnap.size,
      total_repair_cost: totalRepairCost,
    });
  }

  return json(200, cars);
}

async function getCarById(carId) {
  const carSnap = await db().collection('cars').doc(String(carId)).get();
  if (!carSnap.exists) return json(404, { error: 'Auto no encontrado' });

  const car = mapCarDoc(carSnap);

  const photosSnap = await db().collection('car_photos').where('car_id', '==', car.id).get();
  const photos = photosSnap.docs.map(mapPhotoDoc).sort(compareAscBy('created_at'));

  const repairsSnap = await db().collection('repairs').where('car_id', '==', car.id).get();
  const repairs = [];

  for (const repairDoc of repairsSnap.docs.map(mapRepairDoc).sort(compareDescBy('date'))) {
    const repair = repairDoc;
    const docsSnap = await db().collection('repair_documents').where('repair_id', '==', repair.id).get();
    repairs.push({
      ...repair,
      documents: docsSnap.docs.map(mapRepairDocumentDoc).sort(compareAscBy('created_at')),
    });
  }

  const totalRepairCost = repairs.reduce((sum, r) => sum + Number(r.cost || 0), 0);
  return json(200, { ...car, photos, repairs, totalRepairCost });
}

async function createCar(event) {
  const body = await parseJsonBody(event);
  const { brand, model, year, color, plate, vin, km, arrival_date, purchase_price, status, notes } = body;

  if (!brand || !model) {
    return json(400, { error: 'Marca y modelo son obligatorios' });
  }

  const id = await nextId('cars');
  const now = new Date().toISOString();

  const car = {
    brand,
    model,
    year: year || null,
    color: color || null,
    plate: plate || null,
    vin: vin || null,
    km: km || null,
    arrival_date: arrival_date || null,
    purchase_price: Number(purchase_price || 0),
    status: status || 'disponible',
    notes: notes || null,
    created_at: now,
    updated_at: now,
  };

  await db().collection('cars').doc(String(id)).set(car);
  return json(201, { id, ...car });
}

async function updateCar(event, carId) {
  const ref = db().collection('cars').doc(String(carId));
  const snap = await ref.get();
  if (!snap.exists) return json(404, { error: 'Auto no encontrado' });

  const body = await parseJsonBody(event);
  const { brand, model, year, color, plate, vin, km, arrival_date, purchase_price, status, notes } = body;

  const payload = {
    brand,
    model,
    year: year || null,
    color: color || null,
    plate: plate || null,
    vin: vin || null,
    km: km || null,
    arrival_date: arrival_date || null,
    purchase_price: Number(purchase_price || 0),
    status: status || 'disponible',
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };

  await ref.set(payload, { merge: true });
  const updated = await ref.get();
  return json(200, { id: Number(updated.id), ...updated.data() });
}

async function deleteCar(carId) {
  const carRef = db().collection('cars').doc(String(carId));
  const carSnap = await carRef.get();
  if (!carSnap.exists) return json(404, { error: 'Auto no encontrado' });

  const photosSnap = await db().collection('car_photos').where('car_id', '==', Number(carId)).get();
  for (const p of photosSnap.docs) {
    const photo = p.data();
    await deleteStoragePath(photo);
    await p.ref.delete();
  }

  const repairsSnap = await db().collection('repairs').where('car_id', '==', Number(carId)).get();
  for (const r of repairsSnap.docs) {
    const repairId = Number(r.id);
    const docsSnap = await db().collection('repair_documents').where('repair_id', '==', repairId).get();
    for (const d of docsSnap.docs) {
      await deleteStoragePath(d.data());
      await d.ref.delete();
    }
    await r.ref.delete();
  }

  await carRef.delete();
  return json(200, { message: 'Auto eliminado correctamente' });
}

async function uploadPhotos(event, carId) {
  const carSnap = await db().collection('cars').doc(String(carId)).get();
  if (!carSnap.exists) return json(404, { error: 'Auto no encontrado' });

  const parsed = await multipart.parse(event);
  const files = (parsed.files || []).filter((f) => f.fieldname === 'photos');

  if (!files.length) {
    return json(400, { error: 'No se recibieron fotos' });
  }

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const created = [];

  for (const file of files) {
    if (!allowed.has(file.contentType)) {
      return json(400, { error: 'Solo se permiten imagenes (jpg, png, webp, gif)' });
    }

    const filename = sanitizeFilename('photo', file.filename || 'photo');
    const upload = await uploadFileToStorage({
      folder: 'photos',
      filename,
      contentType: file.contentType,
      contentBuffer: fileBuffer(file),
    });

    const id = await nextId('car_photos');
    const row = {
      car_id: Number(carId),
      filename,
      original_name: file.filename || null,
      url: upload.url,
      public_id: upload.public_id,
      resource_type: upload.resource_type,
      created_at: new Date().toISOString(),
    };

    await db().collection('car_photos').doc(String(id)).set(row);
    created.push({ id, ...row });
  }

  return json(201, created);
}

async function deletePhoto(carId, photoId) {
  const ref = db().collection('car_photos').doc(String(photoId));
  const snap = await ref.get();
  if (!snap.exists || Number(snap.data().car_id) !== Number(carId)) {
    return json(404, { error: 'Foto no encontrada' });
  }

  await deleteStoragePath(snap.data());
  await ref.delete();
  return json(200, { message: 'Foto eliminada' });
}

async function carStats(carId) {
  const carSnap = await db().collection('cars').doc(String(carId)).get();
  if (!carSnap.exists) return json(404, { error: 'Auto no encontrado' });
  const car = carSnap.data();

  const repairsSnap = await db().collection('repairs').where('car_id', '==', Number(carId)).get();
  const repairs = repairsSnap.docs.map(mapRepairDoc).sort(compareAscBy('date'));

  const byTypeMap = {};
  const byMonthMap = {};
  let totalRepairs = 0;

  repairs.forEach((r) => {
    const type = r.type || 'otro';
    const cost = Number(r.cost || 0);
    totalRepairs += cost;

    if (!byTypeMap[type]) byTypeMap[type] = { type, total: 0, count: 0 };
    byTypeMap[type].total += cost;
    byTypeMap[type].count += 1;

    if (r.date) {
      const month = String(r.date).slice(0, 7);
      if (month.length === 7) {
        byMonthMap[month] = (byMonthMap[month] || 0) + cost;
      }
    }
  });

  const by_type = Object.values(byTypeMap);
  const by_month = Object.keys(byMonthMap)
    .sort()
    .map((month) => ({ month, total: byMonthMap[month] }));

  const purchasePrice = Number(car.purchase_price || 0);

  return json(200, {
    purchase_price: purchasePrice,
    total_repairs: totalRepairs,
    total_investment: purchasePrice + totalRepairs,
    by_type,
    by_month,
    repairs_list: repairs,
  });
}

async function listRepairsByCar(carId) {
  const repairsSnap = await db().collection('repairs').where('car_id', '==', Number(carId)).get();
  const output = [];

  for (const repair of repairsSnap.docs.map(mapRepairDoc).sort(compareDescBy('date'))) {
    const docsSnap = await db().collection('repair_documents').where('repair_id', '==', repair.id).get();
    output.push({
      ...repair,
      documents: docsSnap.docs.map(mapRepairDocumentDoc).sort(compareAscBy('created_at')),
    });
  }

  return json(200, output);
}

async function createRepair(event, carId) {
  const carSnap = await db().collection('cars').doc(String(carId)).get();
  if (!carSnap.exists) return json(404, { error: 'Auto no encontrado' });

  const body = await parseJsonBody(event);
  const { type, workshop, description, date, cost, notes } = body;

  if (!description || !date) {
    return json(400, { error: 'Descripcion y fecha son obligatorias' });
  }

  const id = await nextId('repairs');
  const row = {
    car_id: Number(carId),
    type: type || 'otro',
    workshop: workshop || null,
    description,
    date,
    cost: Number(cost || 0),
    notes: notes || null,
    created_at: new Date().toISOString(),
  };

  await db().collection('repairs').doc(String(id)).set(row);
  await db().collection('cars').doc(String(carId)).set({ updated_at: new Date().toISOString() }, { merge: true });

  return json(201, { id, ...row, documents: [] });
}

async function updateRepair(event, repairId) {
  const ref = db().collection('repairs').doc(String(repairId));
  const snap = await ref.get();
  if (!snap.exists) return json(404, { error: 'Reparacion no encontrada' });

  const body = await parseJsonBody(event);
  const { type, workshop, description, date, cost, notes } = body;

  const payload = {
    type: type || 'otro',
    workshop: workshop || null,
    description,
    date,
    cost: Number(cost || 0),
    notes: notes || null,
  };

  await ref.set(payload, { merge: true });
  const docsSnap = await db().collection('repair_documents').where('repair_id', '==', Number(repairId)).get();
  return json(200, { id: Number(repairId), ...snap.data(), ...payload, documents: docsSnap.docs.map(mapRepairDocumentDoc) });
}

async function deleteRepair(repairId) {
  const ref = db().collection('repairs').doc(String(repairId));
  const snap = await ref.get();
  if (!snap.exists) return json(404, { error: 'Reparacion no encontrada' });

  const docsSnap = await db().collection('repair_documents').where('repair_id', '==', Number(repairId)).get();
  for (const d of docsSnap.docs) {
    await deleteStoragePath(d.data());
    await d.ref.delete();
  }

  await ref.delete();
  return json(200, { message: 'Reparacion eliminada' });
}

async function uploadRepairDocuments(event, repairId) {
  const repairSnap = await db().collection('repairs').doc(String(repairId)).get();
  if (!repairSnap.exists) return json(404, { error: 'Reparacion no encontrada' });

  const parsed = await multipart.parse(event);
  const files = (parsed.files || []).filter((f) => f.fieldname === 'documents');

  if (!files.length) {
    return json(400, { error: 'No se recibieron documentos' });
  }

  const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
  const document_type = parsed.document_type || 'otro';
  const document_number = parsed.document_number || null;
  const provider = parsed.provider || null;
  const amount = Number(parsed.amount || 0);

  const created = [];

  for (const file of files) {
    if (!allowed.has(file.contentType)) {
      return json(400, { error: 'Solo se permiten PDF e imagenes' });
    }

    const filename = sanitizeFilename('doc', file.filename || 'document');
    const upload = await uploadFileToStorage({
      folder: 'documents',
      filename,
      contentType: file.contentType,
      contentBuffer: fileBuffer(file),
    });

    const id = await nextId('repair_documents');
    const row = {
      repair_id: Number(repairId),
      filename,
      original_name: file.filename || null,
      document_type,
      document_number,
      provider,
      amount,
      url: upload.url,
      public_id: upload.public_id,
      resource_type: upload.resource_type,
      created_at: new Date().toISOString(),
    };

    await db().collection('repair_documents').doc(String(id)).set(row);
    created.push({ id, ...row });
  }

  return json(201, created);
}

async function updateDocument(event, docId) {
  const ref = db().collection('repair_documents').doc(String(docId));
  const snap = await ref.get();
  if (!snap.exists) return json(404, { error: 'Documento no encontrado' });

  const body = await parseJsonBody(event);
  const payload = {
    document_type: body.document_type || 'otro',
    document_number: body.document_number || null,
    provider: body.provider || null,
    amount: Number(body.amount || 0),
  };

  await ref.set(payload, { merge: true });
  const updated = await ref.get();
  return json(200, { id: Number(updated.id), ...updated.data() });
}

async function deleteDocument(docId) {
  const ref = db().collection('repair_documents').doc(String(docId));
  const snap = await ref.get();
  if (!snap.exists) return json(404, { error: 'Documento no encontrado' });

  await deleteStoragePath(snap.data());
  await ref.delete();
  return json(200, { message: 'Documento eliminado' });
}

async function redirectUpload(pathname) {
  const match = pathname.match(/^\/uploads\/(photos|documents)\/([^/]+)$/);
  if (!match) return json(404, { error: 'Archivo no encontrado' });

  const [, folder, filename] = match;
  const collection = folder === 'photos' ? 'car_photos' : 'repair_documents';
  const snap = await db().collection(collection).where('filename', '==', filename).limit(1).get();
  if (snap.empty) return json(404, { error: 'Archivo no encontrado' });

  const url = snap.docs[0].data().url;

  return {
    statusCode: 302,
    headers: {
      ...DEFAULT_HEADERS,
      Location: url,
    },
    body: '',
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return noContent();
    }

    const path = getPath(event);

    if (event.httpMethod === 'POST' && path === '/auth/login') {
      return await handleLogin(event);
    }

    if (event.httpMethod === 'GET' && /^\/uploads\/(photos|documents)\/.+/.test(path)) {
      return await redirectUpload(path);
    }

    verifyToken(event);

    const carDetailMatch = path.match(/^\/cars\/([^/]+)$/);
    const carUpdateMatch = path.match(/^\/cars\/([^/]+)$/);
    const carDeleteMatch = path.match(/^\/cars\/([^/]+)$/);
    const carPhotosMatch = path.match(/^\/cars\/([^/]+)\/photos$/);
    const carPhotoDeleteMatch = path.match(/^\/cars\/([^/]+)\/photos\/([^/]+)$/);
    const carStatsMatch = path.match(/^\/cars\/([^/]+)\/stats$/);
    const repairsByCarMatch = path.match(/^\/repairs\/car\/([^/]+)$/);
    const repairUpdateMatch = path.match(/^\/repairs\/([^/]+)$/);
    const repairDeleteMatch = path.match(/^\/repairs\/([^/]+)$/);
    const repairDocumentsMatch = path.match(/^\/repairs\/([^/]+)\/documents$/);
    const repairDocumentUpdateMatch = path.match(/^\/repairs\/documents\/([^/]+)$/);
    const repairDocumentDeleteMatch = path.match(/^\/repairs\/documents\/([^/]+)$/);

    if (event.httpMethod === 'GET' && path === '/cars') return await listCars();
    if (event.httpMethod === 'GET' && carDetailMatch) return await getCarById(carDetailMatch[1]);
    if (event.httpMethod === 'POST' && path === '/cars') return await createCar(event);
    if (event.httpMethod === 'PUT' && carUpdateMatch) return await updateCar(event, carUpdateMatch[1]);
    if (event.httpMethod === 'DELETE' && carDeleteMatch) return await deleteCar(carDeleteMatch[1]);

    if (event.httpMethod === 'POST' && carPhotosMatch) return await uploadPhotos(event, carPhotosMatch[1]);
    if (event.httpMethod === 'DELETE' && carPhotoDeleteMatch) {
      return await deletePhoto(carPhotoDeleteMatch[1], carPhotoDeleteMatch[2]);
    }

    if (event.httpMethod === 'GET' && carStatsMatch) return await carStats(carStatsMatch[1]);

    if (event.httpMethod === 'GET' && repairsByCarMatch) return await listRepairsByCar(repairsByCarMatch[1]);
    if (event.httpMethod === 'POST' && repairsByCarMatch) return await createRepair(event, repairsByCarMatch[1]);
    if (event.httpMethod === 'PUT' && repairUpdateMatch) return await updateRepair(event, repairUpdateMatch[1]);
    if (event.httpMethod === 'DELETE' && repairDeleteMatch) return await deleteRepair(repairDeleteMatch[1]);

    if (event.httpMethod === 'POST' && repairDocumentsMatch) return await uploadRepairDocuments(event, repairDocumentsMatch[1]);
    if (event.httpMethod === 'PUT' && repairDocumentUpdateMatch) return await updateDocument(event, repairDocumentUpdateMatch[1]);
    if (event.httpMethod === 'DELETE' && repairDocumentDeleteMatch) return await deleteDocument(repairDocumentDeleteMatch[1]);

    return json(404, { error: 'Ruta no encontrada' });
  } catch (err) {
    if (err && err.status && err.error) {
      return json(err.status, { error: err.error });
    }

    return json(500, { error: err.message || 'Error interno del servidor' });
  }
};
