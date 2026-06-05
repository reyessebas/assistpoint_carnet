# Guía de Despliegue - Assist Point Sistema de Carnetización

## ✅ Cambios Realizados

### Fase 1: Rediseño Dashboard
- Header gradiente profesional (#0b1620 → #1a2f47)
- Stats cards responsivas (4 col desktop, 2 tablet, 1 mobile)
- Tabla con espacios mejores y hover effects
- FAB button mejorado
- Paleta Assist Point consistente

### Fase 2: Carnet Vertical
- Cambio: horizontal (720px) → vertical (280×440px)
- Dimensiones reales de DNI/Passport
- Print media query para CR-80 (85.6mm × 54mm)

### Fase 3: Login Limpio
- Removido "¿Olvidaste tu contraseña?"

### Fase 4: Configuración Producción
- `.env.production` con variables
- Compatible con cualquier servidor
- Build optimizado

## Ejecución Local

### Instalar & Correr
```bash
cd frontend
npm install
npm start
```

Disponible en: **http://localhost:4200**

### Credenciales
- Email: `admin@assistpoint.co`
- Password: `5f2a8e9c1d7b4a63`

## Build Producción

```bash
cd frontend
npm run build
```

Output: `frontend/dist/frontend/browser/`

## Deployment Opciones

### AWS Amplify (Recomendado)
```bash
amplify init
amplify add hosting
amplify publish
```

### VPS/Servidor
```bash
scp -r frontend/dist/frontend/browser/* user@server:/var/www/app/
```

### S3 + CloudFront
```bash
aws s3 sync frontend/dist/frontend/browser/ s3://bucket-name/
```

## Variables Ambiente

### .env.production
```
NG_APP_API_URL=https://api.tudominio.com/api
NG_APP_ENV=production
```

## Estado: ✅ Listo para Producción

El sistema está 100% funcional, profesional y listo para deployar.

