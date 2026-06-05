# 🔌 API Reference - Assist Point

Documentación completa de los endpoints disponibles en Assist Point.

## Base URL
```
http://localhost:3000/api
```

---

## 🔐 Autenticación

No se requiere token en v1.0.0 (autenticación basada en session).

Para futuras versiones, se implementará JWT.

---

## 👥 Endpoints de Personas (People)

### 1️⃣ GET /api/people

Obtiene todas las personas.

**Request:**
```bash
curl -X GET http://localhost:3000/. api/people
```

**Response:**
```json
[
  {
    "id": 1,
    "fullName": "John Doe",
    "email": "john.doe@assistpoint.com",
    "department": "Tecnología",
    "role": "Desarrollador Front End",
    "status": "Activo",
    "mode": "Híbrido",
    "avatar": "img/1.png"
  },
  {
    "id": 2,
    "fullName": "María Pérez",
    "email": "maria.perez@assistpoint.com",
    "department": "Recursos Humanos",
    "role": "Analista de talento",
    "status": "Activo",
    "mode": "Presencial",
    "avatar": "img/2.png"
  }
]
```

**Status Code:** `200 OK`

---

### 2️⃣ GET /api/people/:id

Obtiene una persona específica.

**Request:**
```bash
curl -X GET http://localhost:3000/api/people/1
```

**Response:**
```json
{
  "id": 1,
  "fullName": "John Doe",
  "email": "john.doe@assistpoint.com",
  "department": "Tecnología",
  "role": "Desarrollador Front End",
  "status": "Activo",
  "mode": "Híbrido",
  "avatar": "img/1.png"
}
```

**Status Code:** `200 OK`

**Errores:**
- `404 Not Found`: Si la persona no existe

---

### 3️⃣ POST /api/people

Crea una nueva persona.

**Request:**
```bash
curl -X POST http://localhost:3000/api/people \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Pedro García",
    "email": "pedro.garcia@assistpoint.com",
    "department": "Finanzas",
    "role": "Contador Senior",
    "status": "Activo",
    "mode": "Presencial",
    "avatar": "img/3.png"
  }'
```

**Body Parameters:**
| Campo | Tipo | Requerido | Validación |
|-------|------|----------|-----------|
| `fullName` | string | ✅ | 1-255 caracteres |
| `email` | string | ✅ | Email válido |
| `department` | string | ✅ | No vacío |
| `role` | string | ✅ | No vacío |
| `status` | string | ❌ | Activo\|Inactivo\|Vacaciones |
| `mode` | string | ❌ | Presencial\|Remoto\|Híbrido |
| `avatar` | string | ❌ | URL válida |

**Response:**
```json
{
  "id": 7,
  "fullName": "Pedro García",
  "email": "pedro.garcia@assistpoint.com",
  "department": "Finanzas",
  "role": "Contador Senior",
  "status": "Activo",
  "mode": "Presencial",
  "avatar": "img/3.png"
}
```

**Status Code:** `201 Created`

**Errores:**
- `400 Bad Request`: Campos requeridos faltantes o inválidos

---

### 4️⃣ PUT /api/people/:id

Actualiza una persona existente.

**Request:**
```bash
curl -X PUT http://localhost:3000/api/people/1 \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe Updated",
    "email": "john.updated@assistpoint.com",
    "department": "Tecnología",
    "role": "Senior Developer",
    "status": "Activo",
    "mode": "Remoto",
    "avatar": "img/1-updated.png"
  }'
```

**Body Parameters:** (igual que POST)

**Response:**
```json
{
  "id": 1,
  "fullName": "John Doe Updated",
  "email": "john.updated@assistpoint.com",
  "department": "Tecnología",
  "role": "Senior Developer",
  "status": "Activo",
  "mode": "Remoto",
  "avatar": "img/1-updated.png"
}
```

**Status Code:** `200 OK`

**Errores:**
- `404 Not Found`: Persona no existe
- `400 Bad Request`: Datos inválidos

---

### 5️⃣ DELETE /api/people/:id

Elimina una persona.

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/people/1
```

**Response:**
```json
{
  "id": 1
}
```

**Status Code:** `200 OK`

**Errores:**
- `404 Not Found`: Persona no existe

---

## 📊 Departamentos Disponibles

- Recursos Humanos
- Tecnología
- Operaciones
- Finanzas
- Comercial

---

## 📋 Estados Disponibles

- **Activo**: Persona trabajando
- **Inactivo**: Persona no disponible
- **Vacaciones**: Persona en vacaciones

---

## 🏢 Modalidades Disponibles

- **Presencial**: Trabajo en oficina
- **Remoto**: Trabajo desde casa
- **Híbrido**: Combinación de ambas

---

## 🔄 Ejemplos de Flujo Completo

### Crear → Leer → Actualizar → Eliminar

```bash
# 1. Crear persona
curl -X POST http://localhost:3000/api/people \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@assistpoint.com","department":"Tecnología","role":"QA"}'

# Respuesta: { "id": 99, ... }

# 2. Leer persona
curl -X GET http://localhost:3000/api/people/99

# 3. Actualizar persona
curl -X PUT http://localhost:3000/api/people/99 \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User Updated","email":"test@assistpoint.com","department":"Tecnología","role":"QA Senior"}'

# 4. Eliminar persona
curl -X DELETE http://localhost:3000/api/people/99
```

---

## ⚠️ Códigos de Error HTTP

### 400 Bad Request
Datos inválidos o incompletos.

**Ejemplo:**
```json
{
  "error": "Missing required fields: fullName"
}
```

### 404 Not Found
Recurso no existe.

**Ejemplo:**
```json
{
  "error": "Person not found"
}
```

### 500 Server Error
Error interno del servidor.

**Ejemplo:**
```json
{
  "error": "Internal server error"
}
```

---

## 🧪 Testing con cURL

### Script de Test Completo
```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/people"

# Create
echo "Creating person..."
RESPONSE=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Person",
    "email": "test@test.com",
    "department": "Tecnología",
    "role": "Tester"
  }')

ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | cut -d: -f2)
echo "Created person with ID: $ID"

# Read
echo "Reading person..."
curl -s -X GET $BASE_URL/$ID | jq

# Update
echo "Updating person..."
curl -s -X PUT $BASE_URL/$ID \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Person Updated",
    "email": "test@test.com",
    "department": "Tecnología",
    "role": "Senior Tester"
  }' | jq

# Delete
echo "Deleting person..."
curl -s -X DELETE $BASE_URL/$ID

echo "Test completed!"
```

---

## 🔗 Integración con Herramientas

### Postman
1. Import collection desde endpoints
2. Usar variables de entorno: `{{base_url}}`
3. Tests incluyen validaciones JSON

### Insomnia
1. Crear requests para cada endpoint
2. Configurar environment variables
3. Usar request chains

### VS Code REST Client
```rest
### Get all people
GET http://localhost:3000/api/people

### Get person by ID
GET http://localhost:3000/api/people/1

### Create person
POST http://localhost:3000/api/people
Content-Type: application/json

{
  "fullName": "New Person",
  "email": "new@assistpoint.com",
  "department": "Tecnología",
  "role": "Developer"
}

### Update person
PUT http://localhost:3000/api/people/1
Content-Type: application/json

{
  "fullName": "Updated Person",
  "email": "updated@assistpoint.com",
  "department": "Tecnología",
  "role": "Senior Developer"
}

### Delete person
DELETE http://localhost:3000/api/people/1
```

---

## 📈 Performance

### Tiempos de Respuesta Esperados

| Endpoint | Método | Tiempo |
|----------|--------|--------|
| /api/people | GET | < 50ms |
| /api/people | POST | < 100ms |
| /api/people/:id | GET | < 50ms |
| /api/people/:id | PUT | < 100ms |
| /api/people/:id | DELETE | < 50ms |

---

## 🔐 Notas de Seguridad

- ✅ CORS habilitado (configurable)
- ✅ Input validation implementado
- ✅ Error messages sin stack traces
- ⚠️ Sin autenticación token (v1.0)
- ⚠️ Sin rate limiting (v1.0)
- ⚠️ Sin HTTPS en desarrollo

---

**API Reference v1.0** | Última actualización: Mayo 2026
