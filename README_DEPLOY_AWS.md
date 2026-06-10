# Assist Point - AWS Deployment Guide

## Stack Detectado

- Backend: Node.js 18+ puro, servidor HTTP en `src/server/index.js`.
- Frontend: Angular 17 en `frontend/`.
- Base de datos: MySQL compatible. Recomendado en AWS: Amazon RDS MySQL o Aurora MySQL.
- Auth: JWT + refresh tokens en MySQL.
- Storage local: `public/` para assets estáticos incluidos en el repo.
- Servicios externos directos: generador público de QR `https://api.qrserver.com`.
- Docker: agregado `Dockerfile` multi-stage para compilar Angular y servir todo desde Node.

## Comandos Del Proyecto

```bash
npm install
cd frontend && npm install
npm run frontend:build
npm start
npm run start:prod
npm run init-db
```

Notas:

- `npm test` raíz aún es placeholder y falla con `Error: no test specified`.
- No hay linter configurado actualmente.
- `npm run frontend:build` funciona como validación principal de Angular.

## Recomendación AWS

Opción recomendada inicial: **AWS App Runner con imagen Docker en ECR**.

Ventajas:

- Menos operación que ECS.
- HTTPS gestionado.
- Despliegue directo desde ECR.
- Adecuado para una app web Node + Angular servida por un solo proceso.

Usa **ECS Fargate** si necesitas VPC privada avanzada, autoscaling más granular, sidecars, tareas programadas o control fino de networking.

No recomiendo Lambda para esta versión porque el backend es un servidor HTTP persistente y el frontend se sirve como SPA.

## Arquitectura Recomendada

```text
Usuario
  -> App Runner HTTPS
    -> Contenedor Assist Point
      -> Amazon RDS MySQL
      -> AWS Secrets Manager / SSM Parameter Store
```

## Variables De Entorno En AWS

Configura estas variables en App Runner o ECS. Guarda secretos reales en AWS Secrets Manager o SSM Parameter Store.

```bash
NODE_ENV=production
PORT=3000
SERVE_FRONTEND=true
PUBLIC_APP_URL=https://tu-dominio.com
CORS_ORIGINS=https://tu-dominio.com

JWT_SECRET=<desde Secrets Manager o SSM>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<desde Secrets Manager o SSM>

MYSQL_HOST=<endpoint de RDS>
MYSQL_PORT=3306
MYSQL_USER=<usuario app>
MYSQL_PASSWORD=<desde Secrets Manager o SSM>
MYSQL_DATABASE=assist_point
MYSQL_CONNECTION_LIMIT=10

RATE_LIMIT_WINDOW=900
RATE_LIMIT_MAX=100
USE_HTTPS=false
```

`USE_HTTPS=false` porque AWS termina TLS en App Runner, ALB o CloudFront. La app recibe HTTP interno.

## Preparar RDS MySQL

1. Crea una instancia Amazon RDS MySQL.
2. Crea la base `assist_point` o permite que `db/mysql/schema.sql` la cree.
3. Crea un usuario con privilegios limitados sobre esa base.
4. Permite tráfico desde App Runner/ECS hacia RDS.
5. Importa datos iniciales si aplica:

```bash
mysql -h <RDS_HOST> -u <USER> -p < db/mysql/schema.sql
```

Si importas un dump real de producción, limpia sesiones antiguas:

```sql
TRUNCATE TABLE refresh_tokens;
```

## Build Local Docker

```bash
docker build -t assist-point:local .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e SERVE_FRONTEND=true \
  -e PUBLIC_APP_URL=http://localhost:3000 \
  -e CORS_ORIGINS=http://localhost:3000 \
  -e JWT_SECRET=replace_me \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD=replace_me \
  -e MYSQL_HOST=host.docker.internal \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=assist_point_app \
  -e MYSQL_PASSWORD=replace_me \
  -e MYSQL_DATABASE=assist_point \
  assist-point:local
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## Despliegue Con ECR + App Runner

1. Crear repositorio ECR:

```bash
aws ecr create-repository --repository-name assist-point
```

2. Login a ECR:

```bash
aws ecr get-login-password --region <REGION> \
  | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com
```

3. Build y push:

```bash
docker build -t assist-point:latest .
docker tag assist-point:latest <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/assist-point:latest
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/assist-point:latest
```

4. Crear App Runner:

- Source: ECR image.
- Port: `3000`.
- Health check path: `/api/health`.
- Environment variables: las listadas arriba.
- Secrets: `JWT_SECRET`, `ADMIN_PASSWORD`, `MYSQL_PASSWORD`.

5. Configurar dominio:

- Agrega dominio custom en App Runner.
- Actualiza `PUBLIC_APP_URL` y `CORS_ORIGINS` al dominio final.

## Despliegue Con CodeBuild

El archivo `buildspec.yml` construye y sube la imagen a ECR. Configura en CodeBuild:

- Privileged mode: enabled, requerido para Docker build.
- IAM permissions: ECR push, ECR create/describe repository, STS get caller identity.
- Variable opcional: `IMAGE_REPO_NAME=assist-point`.

## Checklist Antes De Producción

- [ ] `.env` no está commiteado.
- [ ] `frontend/.env.production` no está commiteado.
- [ ] `JWT_SECRET` definido en Secrets Manager/SSM.
- [ ] `ADMIN_PASSWORD` definido en Secrets Manager/SSM.
- [ ] `MYSQL_PASSWORD` definido en Secrets Manager/SSM.
- [ ] `PUBLIC_APP_URL` usa dominio HTTPS final.
- [ ] `CORS_ORIGINS` solo incluye dominios reales autorizados.
- [ ] RDS no está público salvo necesidad explícita.
- [ ] Security group permite solo App Runner/ECS hacia RDS.
- [ ] `refresh_tokens` vaciado tras migrar dumps.
- [ ] Usuario admin tiene contraseña rotada.
- [ ] Backups automáticos de RDS activados.
- [ ] Logs de CloudWatch revisados después del primer deploy.

## Riesgos Operativos

- El sistema actual actualiza el hash del admin al iniciar usando `ADMIN_PASSWORD`; cambiar esa variable rota la contraseña anterior, como se espera.
- `npm test` raíz no ejecuta pruebas reales todavía.
- El generador de QR depende de un servicio externo público. Para máxima resiliencia, conviene reemplazarlo más adelante por generación local de QR.
