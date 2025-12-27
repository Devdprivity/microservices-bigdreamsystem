# BigDreamSystem Microservices

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Moleculer](https://img.shields.io/badge/Moleculer-0.14-blue.svg)](https://moleculer.services/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Arquitectura de microservicios distribuida construida con **Moleculer.js** para BigDreamSystem, proporcionando una plataforma escalable para gestión de conversaciones, integración con WhatsApp y procesamiento de IA conversacional.

## 📋 Tabla de Contenidos

- [Visión General](#-visión-general)
- [Arquitectura](#-arquitectura)
- [Stack Tecnológico](#-stack-tecnológico)
- [Servicios](#-servicios)
- [Instalación y Configuración](#-instalación-y-configuración)
- [API Documentation](#-api-documentation)
- [Desarrollo](#-desarrollo)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Monitoreo y Observabilidad](#-monitoreo-y-observabilidad)
- [Seguridad](#-seguridad)
- [Performance y Escalabilidad](#-performance-y-escalabilidad)
- [Troubleshooting](#-troubleshooting)
- [Contribución](#-contribución)

---

## 🎯 Visión General

BigDreamSystem Microservices es una plataforma de microservicios que orquesta la comunicación entre múltiples sistemas:

- **Widget Conversacional**: Interfaz React que permite a los usuarios interactuar con un asistente de IA
- **Procesamiento de IA**: Sistema inteligente que analiza intenciones y determina el mejor canal de atención
- **Integración WhatsApp**: Gestión multi-usuario de conexiones WhatsApp Web para atención al cliente
- **Sincronización Laravel**: Puente de datos entre los microservicios y la aplicación Laravel principal

### Características Principales

- ✅ Arquitectura de microservicios distribuida con Moleculer
- ✅ Circuit breaker y retry policies para alta disponibilidad
- ✅ Multi-tenancy para soporte de múltiples usuarios simultáneos
- ✅ Integración con OpenAI GPT-4 y Google Gemini
- ✅ Gestión de sesiones conversacionales con estado persistente
- ✅ Escalamiento inteligente a WhatsApp o Google Calendar
- ✅ Health checks y métricas en tiempo real
- ✅ Logging estructurado con Winston
- ✅ Tracing distribuido para debugging

---

## 🏗️ Arquitectura

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  ┌──────────────────┐              ┌──────────────────────────┐ │
│  │  React Widget    │              │   Laravel Application     │ │
│  │  (Browser)       │              │   (Admin Panel)           │ │
│  └────────┬─────────┘              └────────────┬─────────────┘ │
│           │                                      │               │
└───────────┼──────────────────────────────────────┼───────────────┘
            │ HTTP/REST                            │ HTTP/REST
            │                                      │
┌───────────▼──────────────────────────────────────▼───────────────┐
│                      Gateway Service (Express)                    │
│                      Port: 3000                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  • Rate Limiting                                         │   │
│  │  • CORS Management                                       │   │
│  │  • Request Validation                                    │   │
│  │  • Error Handling                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────┬──────────────────────────────────────────────────────┘
            │
            │ Moleculer Service Calls
            │
┌───────────▼───────────────────────────────────────────────────────┐
│                    Moleculer Service Broker                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  • Service Discovery (TCP Transporter)                    │  │
│  │  • Load Balancing (RoundRobin)                            │  │
│  │  • Circuit Breaker                                        │  │
│  │  • Caching (Memory/Redis)                                 │  │
│  │  • Metrics & Tracing                                      │  │
│  └────────────────────────────────────────────────────────────┘  │
└───┬──────────────┬──────────────┬──────────────┬─────────────────┘
    │              │              │              │
    │              │              │              │
┌───▼──────┐  ┌───▼──────┐  ┌───▼──────┐  ┌───▼──────────┐
│   AI     │  │ WhatsApp │  │   API    │  │  Gateway     │
│ Service  │  │ Service  │  │ Service  │  │  Service     │
│          │  │          │  │          │  │              │
│ • GPT-4  │  │ • Multi- │  │ • Laravel│  │ • HTTP REST  │
│ • Gemini │  │   User   │  │   Sync   │  │ • Endpoints  │
│ • Intent │  │ • QR Gen │  │ • State  │  │ • Health     │
│ • Escala │  │ • Events │  │   Mgmt   │  │   Checks     │
└──────────┘  └──────────┘  └──────────┘  └──────────────┘
     │              │              │
     │              │              │
     └──────────────┼──────────────┘
                    │
        ┌───────────▼───────────┐
        │   External Services   │
        │                       │
        │ • OpenAI API          │
        │ • Google Gemini API   │
        │ • WhatsApp Web        │
        │ • Google Calendar     │
        │ • Laravel API         │
        └───────────────────────┘
```

### Flujo de Datos

#### 1. Flujo de Conversación Widget

```
User Input → Gateway → AI Service → Intent Analysis → Response Generation
                                                          │
                                                          ├─→ Escalate to WhatsApp (Urgent)
                                                          └─→ Offer Calendar (Non-urgent)
```

#### 2. Flujo de Escalamiento

```
AI Service determines urgency
    │
    ├─→ URGENT → WhatsApp Service → Notify Admin → User redirected
    │
    └─→ NON-URGENT → Generate Calendar Link → User schedules meeting
```

#### 3. Flujo de Sincronización

```
WhatsApp Event → WhatsApp Service → API Service → Laravel API → Database
```

---

## 💻 Stack Tecnológico

### Core Framework
- **Moleculer.js** `0.14.35` - Framework de microservicios
- **Node.js** `18+` - Runtime de JavaScript

### Servicios y Librerías
- **Express** `5.2.1` - HTTP Gateway
- **whatsapp-web.js** `1.34.2` - Integración WhatsApp Web
- **OpenAI** `6.15.0` - GPT-4 API
- **@google/generative-ai** `0.24.1` - Google Gemini API
- **Axios** `1.13.2` - Cliente HTTP
- **Winston** `3.19.0` - Logging estructurado

### Herramientas de Desarrollo
- **moleculer-repl** `0.7.4` - REPL para debugging
- **dotenv** `17.2.3` - Gestión de variables de entorno

### Infraestructura (Opcional)
- **Redis** - Caché distribuido
- **PM2** - Process manager
- **Docker** - Containerización
- **Kubernetes** - Orquestación (futuro)

---

## 📦 Servicios

### 1. Gateway Service

**Puerto:** `3000` (configurable via `GATEWAY_PORT`)

**Responsabilidades:**
- Exponer API HTTP REST para clientes externos
- Manejo de CORS y seguridad
- Rate limiting y validación de requests
- Health checks y métricas

**Endpoints Principales:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Health check del sistema |
| `POST` | `/widget/chat` | Procesar mensaje del widget |
| `GET` | `/widget/session/:id` | Obtener información de sesión |
| `POST` | `/widget/session/:id/reset` | Resetear sesión conversacional |
| `POST` | `/connect` | Conectar WhatsApp para usuario |
| `POST` | `/disconnect` | Desconectar WhatsApp |
| `POST` | `/send-message` | Enviar mensaje por WhatsApp |
| `GET` | `/qr/:userId` | Obtener QR code de WhatsApp |
| `GET` | `/status/:userId` | Estado de conexión WhatsApp |

### 2. AI Service

**Responsabilidades:**
- Procesamiento de mensajes conversacionales
- Análisis de intención y urgencia
- Generación de respuestas con IA
- Gestión de sesiones conversacionales
- Decisión de escalamiento (WhatsApp/Calendar)

**Flujo de Procesamiento:**

1. **Recepción de Mensaje** → Validación y almacenamiento
2. **Análisis de Contexto** → Evaluación de intención (mínimo 3 interacciones)
3. **Clasificación** → Proyecto nuevo / Bug / Consulta
4. **Evaluación de Urgencia** → Urgente / No urgente
5. **Generación de Respuesta** → GPT-4 o Gemini
6. **Decisión de Escalamiento** → WhatsApp (urgente) o Calendar (no urgente)

**Configuración:**
- `OPENAI_API_KEY` - Clave API de OpenAI
- `GEMINI_API_KEY` - Clave API de Google Gemini
- `minInteractions: 3` - Mínimo de interacciones antes de escalar
- `defaultModel: 'gpt-4'` - Modelo de IA por defecto

### 3. WhatsApp Service

**Puerto:** `3001` (configurable via `WHATSAPP_SERVICE_PORT`)

**Responsabilidades:**
- Gestión de múltiples conexiones WhatsApp simultáneas
- Generación y almacenamiento de QR codes
- Manejo de eventos de WhatsApp (mensajes, estado, etc.)
- Sincronización con Laravel API

**Características:**
- **Multi-usuario**: Soporte para múltiples cuentas simultáneas
- **Persistencia**: Sesiones almacenadas en `storage/sessions/`
- **Eventos**: Emisión de eventos para integración con otros servicios
- **QR Management**: Generación y almacenamiento de QR codes

**Eventos Emitidos:**
- `whatsapp.qr` - QR code generado
- `whatsapp.ready` - Conexión establecida
- `whatsapp.message` - Mensaje recibido
- `whatsapp.disconnected` - Desconexión

### 4. API Service

**Responsabilidades:**
- Puente de comunicación con Laravel API
- Sincronización de estados y mensajes
- Gestión de sesiones de widget
- Notificaciones a administradores

**Endpoints Laravel Requeridos:**
- `POST /api/whatsapp/sync` - Sincronizar estado
- `POST /api/whatsapp/messages/store` - Guardar mensaje
- `POST /api/widget/sessions` - Guardar sesión de widget
- `POST /api/whatsapp/notify` - Notificar administrador

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- Node.js `18.x` o superior
- npm `9.x` o superior
- Acceso a API de OpenAI o Google Gemini
- Cuenta de WhatsApp (para testing)
- Laravel API funcionando (opcional para desarrollo local)

### Instalación

#### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd microservices-bigdreamsystem
```

#### 2. Instalar Dependencias

```bash
npm install
```

#### 3. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# ============================================
# Laravel API Configuration
# ============================================
LARAVEL_API_URL=http://127.0.0.1:8000
LARAVEL_API_TOKEN=your-secure-token-here

# ============================================
# Service Ports
# ============================================
GATEWAY_PORT=3000
WHATSAPP_SERVICE_PORT=3001

# ============================================
# AI Configuration (at least one required)
# ============================================
OPENAI_API_KEY=sk-your-openai-key-here
# OR
GEMINI_API_KEY=your-gemini-key-here

# Default AI model (gpt-4, gpt-3.5-turbo, gemini-pro)
DEFAULT_AI_MODEL=gpt-4

# Minimum interactions before escalation
MIN_INTERACTIONS=3

# ============================================
# WhatsApp Configuration
# ============================================
SUPPORT_WHATSAPP_NUMBER=56937871331

# ============================================
# Google Calendar (Optional)
# ============================================
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_CALENDAR_API_KEY=your-google-api-key

# ============================================
# Logging
# ============================================
LOG_LEVEL=info  # debug, info, warn, error

# ============================================
# Moleculer Configuration
# ============================================
NAMESPACE=bigdreamsystem
TRANSPORTER_TYPE=TCP
CACHER_TYPE=Memory  # Memory or Redis

# ============================================
# Redis (Optional, if using Redis cacher)
# ============================================
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# ============================================
# Security
# ============================================
CORS_ORIGIN=*  # Configure appropriately for production
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 4. Iniciar Servicios

**Desarrollo (todos los servicios):**
```bash
npm run dev
# o
npm start
```

**Desarrollo (servicios individuales):**
```bash
npm run whatsapp  # Solo WhatsApp Service
npm run ai        # Solo AI Service
npm run api       # Solo API Service
```

**Producción:**
```bash
# Ver sección de Deployment
```

---

## 📚 API Documentation

### Base URL

```
Development: http://localhost:3000
Production: https://api.bigdreamsystem.com
```

### Autenticación

Para endpoints protegidos, incluir header:
```
Authorization: Bearer {LARAVEL_API_TOKEN}
```

### Endpoints

#### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "whatsapp": "online",
    "ai": "online",
    "api": "online"
  }
}
```

#### Widget Chat

```http
POST /widget/chat
Content-Type: application/json

{
  "sessionId": "session-123",
  "message": "Hola, necesito ayuda",
  "userId": 1  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "¡Hola! ¿En qué puedo ayudarte?",
    "sessionId": "session-123",
    "interactionCount": 1,
    "intent": null,
    "urgency": null,
    "action": null,
    "metadata": {}
  }
}
```

**Response con Escalamiento:**
```json
{
  "success": true,
  "data": {
    "message": "Te voy a conectar con nuestro equipo...",
    "sessionId": "session-123",
    "interactionCount": 4,
    "intent": "nuevo_proyecto",
    "urgency": "urgente",
    "action": "whatsapp",
    "metadata": {
      "whatsappNumber": "56937871331",
      "context": "Usuario necesita aplicación web para gestión de inventario"
    }
  }
}
```

#### Obtener Sesión

```http
GET /widget/session/:sessionId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "session-123",
    "userId": 1,
    "interactionCount": 5,
    "intent": "nuevo_proyecto",
    "urgency": "urgente",
    "category": "proyecto",
    "messages": [
      {
        "role": "user",
        "content": "Hola",
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

#### Resetear Sesión

```http
POST /widget/session/:sessionId/reset
```

**Response:**
```json
{
  "success": true,
  "message": "Session reset successfully"
}
```

#### WhatsApp - Conectar

```http
POST /connect
Content-Type: application/json

{
  "userId": 1
}
```

#### WhatsApp - Obtener QR

```http
GET /qr/:userId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qr": "data:image/png;base64,iVBORw0KG...",
    "userId": 1
  }
}
```

#### WhatsApp - Estado

```http
GET /status/:userId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "status": "CONNECTED",  // CONNECTED, DISCONNECTED, CONNECTING
    "isReady": true
  }
}
```

---

## 🛠️ Desarrollo

### Estructura del Proyecto

```
microservices-bigdreamsystem/
├── broker.js                 # Entry point del broker
├── moleculer.config.js       # Configuración de Moleculer
├── package.json
├── .env                      # Variables de entorno
├── services/                 # Microservicios
│   ├── gateway.service.js    # HTTP Gateway
│   ├── ai.service.js         # AI Conversational
│   ├── whatsapp.service.js   # WhatsApp Integration
│   └── api.service.js        # Laravel API Bridge
├── storage/
│   ├── logs/                 # Logs de aplicación
│   ├── qr/                   # QR codes generados
│   └── sessions/             # Sesiones de WhatsApp
└── utils/                    # Utilidades compartidas
```

### Crear un Nuevo Servicio

```javascript
// services/myservice.service.js
const { Service } = require('moleculer');

module.exports = {
    name: "myservice",
    version: 1,

    settings: {
        // Configuración del servicio
    },

    dependencies: [
        "v1.ai",  // Dependencias de otros servicios
    ],

    actions: {
        // Definir acciones
        hello: {
            params: {
                name: "string"
            },
            async handler(ctx) {
                const { name } = ctx.params;
                return `Hello ${name}!`;
            }
        }
    },

    events: {
        // Escuchar eventos
        "user.created"(ctx) {
            this.logger.info("User created:", ctx.params);
        }
    },

    methods: {
        // Métodos internos
        myMethod() {
            // ...
        }
    },

    async started() {
        // Inicialización del servicio
    },

    async stopped() {
        // Cleanup
    }
};
```

### Comunicación Entre Servicios

#### Llamar a otro Servicio

```javascript
// Desde cualquier servicio
const result = await ctx.call('v1.ai.processWidgetMessage', {
    sessionId: 'session-123',
    message: 'Hola'
}, {
    timeout: 5000,  // Timeout opcional
    retries: 3,     // Reintentos opcionales
    fallbackResponse: { message: 'Error' }  // Fallback opcional
});
```

#### Emitir Eventos

```javascript
// Emitir evento
this.broker.emit('user.created', { userId: 123 });

// Emitir evento local (solo en el nodo actual)
this.broker.emitLocal('user.created', { userId: 123 });

// Broadcast (todos los nodos)
this.broker.broadcast('user.created', { userId: 123 });
```

#### Escuchar Eventos

```javascript
module.exports = {
    // ...
    events: {
        "user.created": {
            handler(ctx) {
                this.logger.info("User created:", ctx.params);
            }
        },
        
        // Múltiples handlers
        "message.received": [
            {
                handler(ctx) {
                    // Handler 1
                }
            },
            {
                handler(ctx) {
                    // Handler 2
                }
            }
        ]
    }
};
```

### REPL (Read-Eval-Print Loop)

Moleculer incluye un REPL interactivo para debugging:

```bash
# El REPL se inicia automáticamente con npm run dev
# Comandos disponibles:

services                    # Listar todos los servicios
nodes                       # Ver nodos conectados
actions                     # Listar todas las acciones
events                      # Ver eventos activos
call v1.ai.processWidgetMessage --sessionId test --message "Hola"
emit user.created --userId 123
```

### Logging

```javascript
// En cualquier servicio
this.logger.debug('Debug message', { data: 'value' });
this.logger.info('Info message', { data: 'value' });
this.logger.warn('Warning message', { data: 'value' });
this.logger.error('Error message', error);
```

Los logs se almacenan en `storage/logs/` con formato estructurado.

---

## 🧪 Testing

### Health Check

```bash
curl http://localhost:3000/health
```

### Test de Chat

```bash
curl -X POST http://localhost:3000/widget/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "message": "Hola, necesito ayuda"
  }'
```

### Test de Sesión

```bash
# Obtener sesión
curl http://localhost:3000/widget/session/test-session-123

# Resetear sesión
curl -X POST http://localhost:3000/widget/session/test-session-123/reset
```

### Test de WhatsApp

```bash
# Conectar
curl -X POST http://localhost:3000/connect \
  -H "Content-Type: application/json" \
  -d '{"userId": 1}'

# Obtener QR
curl http://localhost:3000/qr/1

# Estado
curl http://localhost:3000/status/1
```

### Testing con Postman

Importar la colección de Postman (si está disponible) o crear requests manualmente usando los ejemplos de arriba.

---

## 🚢 Deployment

### Opción 1: PM2 (Recomendado para Producción)

#### Instalación

```bash
npm install -g pm2
```

#### Configuración

Crear `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'bigdream-microservices',
    script: './broker.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    error_file: './storage/logs/pm2-error.log',
    out_file: './storage/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

#### Comandos PM2

```bash
# Iniciar
pm2 start ecosystem.config.js

# Ver estado
pm2 status

# Ver logs
pm2 logs bigdream-microservices

# Reiniciar
pm2 restart bigdream-microservices

# Detener
pm2 stop bigdream-microservices

# Guardar configuración
pm2 save

# Configurar inicio automático
pm2 startup
pm2 save
```

### Opción 2: Docker

#### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p storage/logs storage/qr storage/sessions

# Exponer puertos
EXPOSE 3000 3001

# Variables de entorno
ENV NODE_ENV=production

# Iniciar aplicación
CMD ["node", "broker.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  microservices:
    build: .
    container_name: bigdream-microservices
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - LARAVEL_API_URL=${LARAVEL_API_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./storage:/app/storage
      - ./.env:/app/.env
    restart: unless-stopped
    networks:
      - bigdream-network

  redis:
    image: redis:7-alpine
    container_name: bigdream-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - bigdream-network

volumes:
  redis-data:

networks:
  bigdream-network:
    driver: bridge
```

#### Comandos Docker

```bash
# Construir
docker-compose build

# Iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

### Opción 3: Kubernetes (Futuro)

Configuración de Kubernetes disponible en `k8s/` (cuando esté implementado).

---

## 📊 Monitoreo y Observabilidad

### Métricas de Moleculer

Moleculer expone métricas automáticamente:

- **Request Rate**: Requests por segundo
- **Error Rate**: Errores por segundo
- **Response Time**: Tiempo de respuesta promedio
- **Active Requests**: Requests activos

Ver métricas en consola o configurar exportador personalizado.

### Health Checks

```bash
# Health check básico
curl http://localhost:3000/health

# Health check extendido (si está implementado)
curl http://localhost:3000/health/detailed
```

### Logging

Los logs se almacenan en `storage/logs/` con formato estructurado:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "gateway",
  "action": "chat",
  "message": "Processing chat message",
  "sessionId": "session-123"
}
```

### Tracing Distribuido

Moleculer incluye tracing distribuido. Habilitar en `moleculer.config.js`:

```javascript
tracing: {
    enabled: true,
    exporter: {
        type: "Console",  // o "Jaeger", "Zipkin", etc.
        options: {
            logger: null,
            colors: true,
            width: 100,
            gaugeWidth: 40
        }
    }
}
```

### Monitoreo con Prometheus (Opcional)

Configurar exportador de Prometheus para métricas avanzadas.

---

## 🔒 Seguridad

### Variables de Entorno

- **Nunca** commitear archivos `.env` al repositorio
- Usar secretos gestionados (AWS Secrets Manager, HashiCorp Vault, etc.) en producción
- Rotar tokens regularmente

### CORS

Configurar CORS apropiadamente en producción:

```javascript
// gateway.service.js
cors: {
    origin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}
```

### Rate Limiting

Implementar rate limiting en el Gateway:

```javascript
// Usar express-rate-limit
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por ventana
});

app.use('/widget/', limiter);
```

### Validación de Inputs

Todos los endpoints deben validar inputs:

```javascript
params: {
    sessionId: {
        type: "string",
        min: 1,
        max: 100,
        pattern: /^[a-zA-Z0-9-_]+$/
    },
    message: {
        type: "string",
        min: 1,
        max: 1000,
        trim: true
    }
}
```

### Sanitización

Sanitizar datos antes de enviar a APIs externas:

```javascript
const sanitize = (text) => {
    return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .trim();
};
```

### Autenticación

Implementar autenticación JWT o API tokens para endpoints protegidos.

---

## ⚡ Performance y Escalabilidad

### Caching

Moleculer incluye sistema de caché. Configurar Redis para caché distribuido:

```javascript
// moleculer.config.js
cacher: {
    type: "Redis",
    options: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        ttl: 30
    }
}
```

### Load Balancing

Moleculer usa RoundRobin por defecto. Configurar estrategia en `moleculer.config.js`:

```javascript
registry: {
    strategy: "RoundRobin",  // o "Random", "CpuUsage", "Shard"
    preferLocal: true
}
```

### Circuit Breaker

El circuit breaker está habilitado por defecto. Configurar umbrales:

```javascript
circuitBreaker: {
    enabled: true,
    threshold: 0.5,        // 50% de errores
    minRequestCount: 20,   // Mínimo de requests
    windowTime: 60,        // Ventana de tiempo (segundos)
    halfOpenTime: 10000    // Tiempo antes de intentar de nuevo
}
```

### Escalado Horizontal

Para escalar horizontalmente:

1. Ejecutar múltiples instancias del broker
2. Configurar transporter compartido (Redis, NATS, etc.)
3. Usar load balancer (nginx, HAProxy) para el Gateway

### Optimizaciones

- **Connection Pooling**: Reutilizar conexiones HTTP
- **Batch Processing**: Procesar múltiples mensajes en batch
- **Async Operations**: Usar async/await apropiadamente
- **Memory Management**: Limpiar sesiones antiguas regularmente

---

## 🐛 Troubleshooting

### Error: "No active connection" (WhatsApp)

**Causa:** El servicio WhatsApp no está iniciado o la sesión expiró.

**Solución:**
```bash
# Verificar que el servicio esté corriendo
pm2 status

# Revisar logs
tail -f storage/logs/*.log

# Reconectar WhatsApp
curl -X POST http://localhost:3000/connect -d '{"userId": 1}'
```

### Error: "Cannot connect to Laravel API"

**Causa:** Laravel API no está disponible o URL incorrecta.

**Solución:**
```bash
# Verificar URL en .env
echo $LARAVEL_API_URL

# Test de conectividad
curl $LARAVEL_API_URL/api/health

# Verificar token
curl -H "Authorization: Bearer $LARAVEL_API_TOKEN" $LARAVEL_API_URL/api/test
```

### Widget no responde

**Causa:** Gateway no está corriendo o CORS mal configurado.

**Solución:**
```bash
# Verificar puerto
netstat -an | grep 3000

# Verificar CORS en gateway.service.js
# Revisar network tab en DevTools del navegador
```

### Error: "AI Service timeout"

**Causa:** API de IA no responde o rate limit alcanzado.

**Solución:**
- Verificar API keys
- Revisar rate limits de OpenAI/Gemini
- Aumentar timeout en configuración
- Implementar retry logic

### Sesiones no se persisten

**Causa:** Permisos de escritura o directorio no existe.

**Solución:**
```bash
# Crear directorios
mkdir -p storage/sessions storage/qr storage/logs

# Verificar permisos
chmod -R 755 storage/
```

### Memory Leaks

**Causa:** Sesiones no se limpian o eventos no se eliminan.

**Solución:**
- Implementar limpieza periódica de sesiones antiguas
- Remover listeners de eventos apropiadamente
- Usar herramientas de profiling (clinic.js, node --inspect)

---

## 🤝 Contribución

### Proceso de Contribución

1. **Fork** el repositorio
2. **Crear** una rama de feature (`git checkout -b feature/amazing-feature`)
3. **Commit** cambios (`git commit -m 'Add amazing feature'`)
4. **Push** a la rama (`git push origin feature/amazing-feature`)
5. **Abrir** un Pull Request

### Estándares de Código

- Seguir convenciones de JavaScript (ESLint)
- Documentar funciones y métodos
- Escribir tests para nuevas funcionalidades
- Mantener cobertura de tests > 80%

### Estructura de Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new endpoint for user management
fix: resolve WhatsApp connection timeout
docs: update API documentation
refactor: improve error handling in AI service
test: add unit tests for gateway service
```

### Code Review

- Todos los PRs requieren al menos una aprobación
- Los tests deben pasar antes de merge
- El código debe seguir los estándares del proyecto

---

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 📚 Recursos Adicionales

- [Documentación de Moleculer](https://moleculer.services/docs/)
- [WhatsApp Web.js Documentation](https://wwebjs.dev/)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

## 👥 Autores

**BigDreamSystem Team**

---

## 🙏 Agradecimientos

- Moleculer.js por el excelente framework de microservicios
- WhatsApp Web.js por la integración con WhatsApp
- OpenAI y Google por las APIs de IA

---

**Última actualización:** Enero 2024
