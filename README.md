# Assist Point - Sistema de Carnetización

Sistema profesional fullstack para la administración y carnetización de personas en empresas. Permite crear, actualizar, eliminar y visualizar información de empleados, generando carnets interactivos con códigos QR.

## 🎯 Características

- ✅ **Panel de Administración Intuitivo**: Interfaz moderna y responsive
- ✅ **Gestión de Personas**: CRUD completo (Crear, Leer, Actualizar, Eliminar)
- ✅ **Generación de Carnets**: Información visual de empleados
- ✅ **Códigos QR**: Generación automática de códigos QR para cada carnet
- ✅ **Filtros Avanzados**: Por departamento, estado y búsqueda de texto
- ✅ **Vistas Múltiples**: Vista en lista y grid
- ✅ **Estadísticas**: Panel de métricas de la empresa
- ✅ **Persistencia**: Datos en JSON (extensible a bases de datos)
- ✅ **API RESTful**: Endpoints para integración con otros sistemas

## 🏗️ Arquitectura del Proyecto

```
assist-point/
├── src/
│   ├── server/
│   │   ├── index.js                 # Punto de entrada del servidor
│   │   ├── models/
│   │   │   └── PeopleModel.js       # Modelo de datos
│   │   ├── controllers/
│   │   │   └── PeopleController.js  # Lógica de negocio
│   │   ├── routes/
│   │   │   └── peopleRoutes.js      # Definición de rutas API
│   │   ├── handlers/
│   │   │   └── StaticHandler.js     # Manejo de archivos estáticos
│   │   └── utils/
│   │       ├── logger.js            # Sistema de logging
│   │       ├── fileSystem.js        # Utilidades de archivo
│   │       ├── responseHandler.js   # Respuestas HTTP
│   │       ├── BodyParser.js        # Parser de cuerpo de solicitud
│   │       └── contentTypes.js      # Mapeo de tipos MIME
├── frontend/
│   └── App Angular standalone para login, panel y carnet
├── public/
│   ├── index.html                   # Página de login
│   ├── admin.html                   # Panel de administración
│   ├── card.html                    # Visualización de carnet
│   ├── css/
│   │   ├── global.css              # Estilos globales
│   │   ├── styleguide.css          # Guía de estilos
│   │   └── style.css               # Estilos específicos de la aplicación
│   ├── js/
│   │   ├── login.js                # Lógica de autenticación
│   │   ├── admin.js                # Lógica del panel admin
│   │   └── card.js                 # Lógica del carnet
│   └── img/
│       └── (Imágenes de la aplicación)
├── data/
│   └── people.json                  # Base de datos de personas (JSON)
├── config/
│   └── environment.js               # Configuración centralizada
├── .env.example                     # Ejemplo de variables de entorno
├── .gitignore                       # Archivos a ignorar en Git
├── package.json                     # Dependencias y scripts npm
└── README.md                        # Este archivo
```

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js >= 14.0.0
- npm o yarn

### Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   cd assist-point
   ```

2. **Copiar archivo de configuración**
   ```bash
   cp .env.example .env
   ```

3. **Iniciar el servidor**
   ```bash
   npm start
   ```

4. **Iniciar el frontend Angular**
  ```bash
  cd frontend
  npm install
  npm start
  ```

  O para desarrollo con debug del backend:
   ```bash
   npm run dev
   DEBUG=true npm run dev
   ```

5. **Acceder a la aplicación**
   ```
  http://localhost:4200
   ```

  El frontend Angular consume la API del backend en `http://localhost:3000/api`.



## 📚 Documentación de API

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Obtener todas las personas
```
GET /api/people
```
**Respuesta:**
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
  }
]
```

#### Obtener una persona
```
GET /api/people/:id
```

#### Crear persona
```
POST /api/people
Content-Type: application/json

{
  "fullName": "Jane Smith",
  "email": "jane.smith@assistpoint.com",
  "department": "Recursos Humanos",
  "role": "Gerente de Talento",
  "status": "Activo",
  "mode": "Presencial",
  "avatar": "img/avatar.png"
}
```

#### Actualizar persona
```
PUT /api/people/:id
Content-Type: application/json

{
  "fullName": "Jane Smith Updated",
  "email": "jane.smith@assistpoint.com",
  "department": "Recursos Humanos",
  "role": "Directora de Talento",
  "status": "Activo",
  "mode": "Híbrido",
  "avatar": "img/avatar.png"
}
```

#### Eliminar persona
```
DELETE /api/people/:id
```

## 🎨 Estructura de Datos

### Modelo Person
```javascript
{
  id: number,              // ID único (auto-generado)
  fullName: string,        // Nombre completo (requerido)
  email: string,           // Correo electrónico (requerido)
  department: string,      // Departamento (requerido)
  role: string,            // Puesto/Cargo (requerido)
  status: string,          // Activo | Inactivo | Retirado | Suspendido
  mode: string,            // Presencial | Remoto | Híbrido
  avatar: string           // URL a imagen de perfil
}
```

## 🔧 Configuración

### Variables de Entorno (.env)
```bash
# Servidor
PORT=3000
NODE_ENV=development

# Datos
DATA_DIR=./data

# CORS
CORS_ORIGINS=http://localhost:3000
```

## 📊 Estadísticas Disponibles

El panel muestra métricas en tiempo real:
- Total de personas registradas
- Personas activas
- Número de departamentos
- Personas en oficina
- Personas en modalidad remota

## 🔐 Seguridad

### Consideraciones Actuales
- Autenticación simple con session storage
- Validación de entrada en el servidor
- Prevención de path traversal para archivos estáticos
- CORS habilitado

### Recomendaciones para Producción
- Implementar JWT o sesiones seguras
- Usar HTTPS/TLS
- Agregar rate limiting
- Implementar validación exhaustiva de entrada
- Usar base de datos (PostgreSQL, MongoDB, etc.)
- Agregar autenticación multi-factor
- Implementar logging de auditoría

## 📈 Mejoras Futuras

- [ ] Integración con base de datos relacional
- [ ] Autenticación con OAuth 2.0 / OpenID Connect
- [ ] Exportación de datos a CSV/Excel
- [ ] Generación de reportes PDF
- [ ] Integración con sistemas de gestión de nómina
- [ ] API versioning
- [ ] Testing automatizado
- [ ] Contenedorización (Docker)
- [ ] CI/CD pipeline
- [ ] Soporte para múltiples idiomas

## 🛠️ Desarrollo

### Scripts Disponibles

```bash
# Iniciar servidor en producción
npm start

# Iniciar servidor en desarrollo
npm run dev

# Iniciar con debug habilitado
DEBUG=true npm run dev

# Ejecutar tests (cuando esté disponible)
npm test
```

### Estructura de Código

El proyecto sigue los principios de:
- **Separación de responsabilidades**: Modelos, controladores, routers
- **Modularidad**: Funciones y clases reutilizables
- **Clean Code**: Código legible y bien documentado
- **REST API**: Endpoints semánticos y HTTP correcto

## 📝 Logging

El sistema incluye un logger centralizado que proporciona:
- `logger.info()`: Información general
- `logger.warn()`: Advertencias
- `logger.error()`: Errores
- `logger.debug()`: Debug (solo si DEBUG=true)

## 🚨 Manejo de Errores

El servidor proporciona códigos HTTP estándar:
- **200**: OK
- **201**: Creado
- **400**: Solicitud inválida
- **404**: No encontrado
- **500**: Error del servidor

## 📞 Soporte

Para reportar problemas o sugerencias, contactar al equipo de desarrollo.

## 📄 Licencia

ISC

## 👥 Autores

Assist Point Development Team

---

## 🔐 HTTPS y Gzip (local)

Instrucciones rápidas para habilitar HTTPS local y comprobar compresión gzip.

1. Generar certificados auto-firmados (local):
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 \
  -subj "/CN=localhost"
```

2. Ejecutar el servidor con HTTPS y SQLite (ejemplo):
```bash
USE_HTTPS=true TLS_KEY_PATH=./certs/key.pem TLS_CERT_PATH=./certs/cert.pem DATA_DB=sqlite npm run dev
```

3. Petición de ejemplo con `curl` aceptando gzip (nota: `-k` permite certificados auto-firmados):
```bash
curl -s -H "Accept-Encoding: gzip" -k https://localhost:3000/api/people --output - | gunzip
```

4. Generar petición POST con token (login → usar `accessToken`):
```bash
# login
curl -s -X POST https://localhost:3000/api/auth/login -k \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@assistpoint.co","password":"Admin123"}' | jq

# crear persona (reemplaza <ACCESS_TOKEN>)
curl -s -X POST https://localhost:3000/api/people -k \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"fullName":"Prueba","email":"p@e.com","department":"IT","role":"Dev"}' | jq
```

Notas:
- HSTS solo se aplica cuando `USE_HTTPS=true`.
- Gzip se aplica automáticamente si el cliente envía `Accept-Encoding: gzip`.
- Para producción usa certificados válidos (Let's Encrypt) y un proxy (Nginx) o CDN.

## Carnetización digital

El sistema separa persona y carnet. Cada persona puede tener varios carnets, pero el backend mantiene un carnet `Vigente` activo por persona; al generar uno nuevo, el anterior pasa a `Reemplazado`.

Variables relevantes:
- `PUBLIC_APP_URL`, `FRONTEND_URL` o `APP_URL`: base pública usada para construir el QR seguro (`/validar-carnet/:token`).
- `DATA_DB`: `json`, `sqlite` o `mysql`.

Endpoints principales:
- `GET /api/catalogs`: catálogos de áreas, cargos, sedes, modalidades, tipos y estados.
- `POST /api/catalogs/areas`, `/api/catalogs/cargos`, `/api/catalogs/sedes`: crea nuevos catálogos administrables (requiere token).
- `GET /api/people/export`: exporta personas y carnet vigente en CSV (requiere token).
- `POST /api/people/import`: importa personas en lote y genera carnets automáticamente (requiere token).
- `POST /api/people/:id/carnets`: genera un nuevo carnet vigente (requiere token).
- `POST /api/people/:id/carnets/deliver`: marca el carnet vigente como entregado digitalmente (requiere token).
- `GET /api/carnets/validate/:token`: validación pública del QR.

La validación pública no expone el documento completo; muestra documento enmascarado y valida tanto `estado_persona` como `estado_carnet`.

Desde el panel administrativo puedes agregar áreas, cargos y sedes con los botones de catálogo. Al abrir el formulario de persona, los selects consultan `/api/catalogs`, así que los nuevos valores aparecen automáticamente.

La gestión de catálogos permite listar, agregar, editar y eliminar áreas, cargos y sedes. El backend evita duplicados y bloquea eliminación cuando el elemento está asociado a personas existentes.

Para carga masiva desde Excel, exporta la hoja como CSV y súbela desde el botón de importación. Formato requerido:

```text
EMPLEADO ID | NOMBRE | DOCUMENTO | FECHA. INGRESO | AREA | CARGO | CELULAR | EMAIL | SEDE | ESTADO
```

Notas de importación:
- Se toleran espacios extra y diferencias de mayúsculas/minúsculas en encabezados.
- `EMPLEADO ID` se guarda como `employeeCode`.
- `ACTIVO`, `Activo` y `activo` se normalizan a `Activo`; `INACTIVO`, `Inactivo` e `inactivo` se normalizan a `Inactivo`.
- Si área, cargo o sede no existen, se crean automáticamente.
- Si ya existe una persona por `EMPLEADO ID` o `DOCUMENTO`, se actualiza en lugar de duplicarse.
- El resumen muestra creados, actualizados y registros con error.

Descarga de carnets:
- El panel permite seleccionar empleados activos y descargar solo los seleccionados.
- También permite descargar todos los activos que coinciden con filtros de sede y área.
- La descarga se genera como HTML empresarial autocontenido con estilos inline, pensado para abrirse/guardarse de forma estable en navegadores modernos.
- El código de empleado se muestra como metadata debajo del carnet, no dentro del diseño principal.

Seguridad reforzada:
- Rutas administrativas requieren token y rol `admin` cuando el token lo declara.
- La importación valida tipo y tamaño de archivo en frontend.
- Backend valida email, fecha, celular, estados, modalidad, tipo de persona y campos obligatorios.
- Los catálogos usan consultas parametrizadas en MySQL/SQLite y evitan eliminación insegura.

Para MySQL, el esquema base actualizado está en `db/mysql/schema.sql`. El modelo MySQL también intenta crear/ajustar columnas y tablas necesarias al iniciar, pero en producción conviene ejecutar el SQL con control de cambios y revisar duplicados antes de crear índices únicos por `documentNumber`, `email` y `employeeCode`.


**Versión**: 1.0.0  
**Última actualización**: Mayo 2026
# assistpointcarnet
# assistpoint_carnet
