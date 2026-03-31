# AutoGestión - Compraventa de Vehículos

Sistema web completo para gestión de inventario de autos: ficha técnica, galería de fotos, historial de reparaciones con boletas/facturas y gráficos de inversión.

## Despliegue en Netlify + Firestore + Cloudinary

Este repositorio ya incluye una API serverless para Netlify en [netlify/functions/api.js](netlify/functions/api.js) conectada a Firestore para datos y Cloudinary para fotos/documentos.

### 1. Crear proyecto en Firebase

1. Entra con la cuenta aplicacionesrys@gmail.com en Firebase Console.
2. Crea un proyecto nuevo.
3. Activa Firestore Database en modo producción.
4. No necesitas Firebase Storage para esta variante gratis.
5. En Project Settings > Service accounts, genera una clave privada (JSON).

### 2. Crear cuenta gratis en Cloudinary

1. Entra a https://cloudinary.com con el mismo correo o el que prefieras.
2. Crea una cuenta gratis.
3. Copia estos datos del dashboard:
    1. Cloud name
    2. API Key
    3. API Secret

### 3. Configurar variables en Netlify

En Netlify (Site settings > Environment variables), agrega:

1. FIREBASE_SERVICE_ACCOUNT_JSON: contenido completo del JSON en una sola línea.
2. CLOUDINARY_CLOUD_NAME: nombre de cloud de Cloudinary.
3. CLOUDINARY_API_KEY: API Key de Cloudinary.
4. CLOUDINARY_API_SECRET: API Secret de Cloudinary.
5. JWT_SECRET: un secreto largo y único.
6. ADMIN_USERNAME: admin (o el usuario que quieras).
7. ADMIN_PASSWORD: admin123 (o la clave que quieras).

Referencia de formato en [.env.example](.env.example).

### 4. Conectar repositorio a Netlify

1. New site from Git.
2. Selecciona este repo.
3. Netlify detectará [netlify.toml](netlify.toml), que ya contiene:
    1. build command
    2. carpeta publish
    3. functions
    4. redirects para /api y /uploads
4. Deploy site.

### 5. Validar login inicial

El usuario admin se crea automáticamente en Firestore al primer login usando ADMIN_USERNAME y ADMIN_PASSWORD.

### 6. Importante sobre funcionamiento local

El backend local de [backend/src/index.js](backend/src/index.js) sigue existiendo para desarrollo tradicional (Express + SQLite), pero el despliegue en Netlify usa la API serverless con Firestore + Cloudinary.

## Requisitos Previos

- [Node.js](https://nodejs.org/) versión 18 o superior

---

## Instalación y Arranque

### 1. Instalar dependencias del Backend

Abre una terminal en la carpeta `monkey` y ejecuta:

```bash
cd backend
npm install
```

### 2. Instalar dependencias del Frontend

Abre **otra** terminal en la carpeta `monkey` y ejecuta:

```bash
cd frontend
npm install
```

### 3. Iniciar el Backend

En la terminal del backend:

```bash
npm run dev
```

El servidor corre en `http://localhost:3001`

### 4. Iniciar el Frontend

En la terminal del frontend:

```bash
npm run dev
```

Abre tu navegador en `http://localhost:5173`

---

## Credenciales de Acceso

| Usuario | Contraseña |
|---------|-----------|
| admin   | admin123  |

---

## Funcionalidades

### Ficha del Vehículo
- Marca, modelo, año, color, patente, VIN/chasis
- Kilometraje, fecha de llegada, precio de compra
- Estado: Disponible / En Reparación / Reservado / Vendido
- Notas internas

### Galería de Fotos
- Subir múltiples fotos por auto (JPG, PNG, WebP)
- Visualización en grilla con zoom
- Eliminar fotos individuales

### Historial de Reparaciones
- Registrar cada arreglo con: descripción, tipo, taller, fecha, costo
- Tipos: Mecánica, Chaperíay Pintura, Electricidad, Tapizado, Neumáticos, etc.
- Expandir cada reparación para ver sus documentos

### Boletas y Facturas
- Adjuntar PDF o imagen a cada reparación
- Ingresar tipo (boleta/factura/presupuesto), N° de documento, proveedor y monto
- Ver o descargar el documento original

### Gráficos de Inversión
- Torta: distribución compra vs. reparaciones
- Barras: costo por tipo de reparación
- Línea: evolución de gastos por mes
- Tabla resumen de todas las reparaciones

---

## Estructura de Carpetas

```
monkey/
├── backend/
│   ├── src/
│   │   ├── index.js          # Servidor Express
│   │   ├── database.js       # SQLite con esquema
│   │   ├── middleware/
│   │   │   └── auth.js       # Verificación JWT
│   │   └── routes/
│   │       ├── auth.js       # Login
│   │       ├── cars.js       # CRUD autos + fotos + stats
│   │       └── repairs.js    # CRUD reparaciones + documentos
│   ├── data/                 # Base de datos SQLite (auto-generada)
│   ├── uploads/              # Archivos subidos (auto-generada)
│   │   ├── photos/
│   │   └── documents/
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── api.ts            # Cliente Axios
    │   ├── types.ts          # Tipos TypeScript
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── CarsList.tsx
    │   │   ├── CarForm.tsx
    │   │   └── CarDetail.tsx
    │   └── components/
    │       ├── Navbar.tsx
    │       ├── CarCharts.tsx
    │       ├── RepairModal.tsx
    │       └── DocumentModal.tsx
    └── package.json
```
