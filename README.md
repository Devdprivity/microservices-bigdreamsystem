# BigDreamSystem Microservices

Arquitectura de microservicios con Moleculer para BigDreamSystem.

## 🏗️ Arquitectura

```
┌──────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Laravel API     │◄────►│ API Service      │◄────►│ WhatsApp        │
│  (HTTP/REST)     │      │  (Moleculer)     │      │ Service         │
└──────────────────┘      └──────────────────┘      └─────────────────┘
                                   │
                                   │ Moleculer Broker
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼─────────┐      ┌─────────▼────────┐      ┌─────────▼────────┐
│ HTTP Gateway    │      │   AI Service     │      │  Otros Servicios │
│ (Express)       │      │ (Conversational) │      │                  │
└─────────────────┘      └──────────────────┘      └──────────────────┘
        │
        │ HTTP REST
        │
┌───────▼──────────┐
│ Widget Frontend  │
│ (React)          │
└──────────────────┘
```

## 📦 Servicios

### 1. **Gateway Service** (Puerto 3000)
- Expone API HTTP REST para el widget
- Endpoints:
  - `POST /widget/chat` - Enviar mensaje del chat
  - `GET /widget/session/:id` - Obtener sesión
  - `POST /widget/session/:id/reset` - Resetear sesión
  - `GET /health` - Health check

### 2. **AI Service**
- Agente conversacional con IA
- **Flujo**:
  1. Mínimo 3 interacciones antes de escalar
  2. Determina intención (proyecto nuevo, bug, consulta)
  3. Clasifica urgencia (urgente / no urgente)
  4. Escala a WhatsApp si es urgente
  5. Ofrece agendar reunión si no es urgente
- Integración con OpenAI GPT-4 o Google Gemini

### 3. **WhatsApp Service** (Puerto 3001)
- Maneja conexiones de WhatsApp Web
- Multi-usuario (múltiples cuentas simultáneas)
- Eventos:
  - Generación de QR
  - Mensajes entrantes
  - Estado de conexión
- Integra con WhatsApp real (no simula)

### 4. **API Service**
- Puente entre Moleculer y Laravel
- Sincroniza estados, mensajes y sesiones
- Endpoints Laravel necesarios:
  - `POST /api/whatsapp/sync` - Sincronizar estado
  - `POST /api/whatsapp/messages/store` - Guardar mensaje
  - `POST /api/widget/sessions` - Guardar sesión de widget
  - `POST /api/whatsapp/notify` - Notificar admin

## 🚀 Instalación

### 1. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
# Laravel API
LARAVEL_API_URL=http://127.0.0.1:8000
LARAVEL_API_TOKEN=your-token-here

# Puertos
GATEWAY_PORT=3000
WHATSAPP_SERVICE_PORT=3001

# IA (al menos una)
OPENAI_API_KEY=sk-...
# o
GEMINI_API_KEY=...

# WhatsApp
SUPPORT_WHATSAPP_NUMBER=56937871331

# Google Calendar (opcional)
GOOGLE_CALENDAR_ID=your-calendar-id
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar servicios

**Opción A: Todos los servicios juntos**
```bash
npm run dev
```

**Opción B: Servicios individuales (desarrollo)**
```bash
npm run whatsapp  # Solo WhatsApp
npm run ai        # Solo IA
npm run api       # Solo API
```

## 📱 Uso del Widget

### Frontend (React)

Actualizar `WhatsAppWidget.tsx`:

```tsx
const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;

    const userMessage: Message = {
        id: `msg-${Date.now()}`,
        content: message.trim(),
        role: 'user',
        timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsSending(true);

    try {
        // Llamar al microservicio en lugar de simular
        const response = await fetch('http://127.0.0.1:3000/widget/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: getSessionId(),
                message: userMessage.content,
                userId: null // o el ID del usuario si está logueado
            })
        });

        const data = await response.json();

        if (data.success) {
            const botMessage: Message = {
                id: `msg-${Date.now()}`,
                content: data.data.message,
                role: 'assistant',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);

            // Si hay acción (WhatsApp o Calendar)
            if (data.data.action === 'whatsapp') {
                // Mostrar botón de WhatsApp
                handleWhatsAppRedirect();
            } else if (data.data.action === 'calendar' && data.data.metadata?.calendarUrl) {
                // Mostrar link de calendario
                window.open(data.data.metadata.calendarUrl, '_blank');
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage: Message = {
            id: `msg-${Date.now()}`,
            content: 'Lo siento, hubo un error. Por favor intenta de nuevo.',
            role: 'assistant',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsSending(false);
    }
};
```

## 🔄 Flujo Conversacional Completo

### Ejemplo de conversación:

**Interacción 1:**
- **Usuario:** "Hola"
- **IA:** "¡Hola! 👋 Soy el asistente de BigDreamSystem. ¿En qué puedo ayudarte hoy? ¿Tienes un proyecto en mente, necesitas soporte técnico, o tienes alguna consulta?"

**Interacción 2:**
- **Usuario:** "Necesito una aplicación web"
- **IA:** "Perfecto, me encantaría ayudarte con tu aplicación web. ¿Podrías contarme un poco más? ¿Es un proyecto completamente nuevo o es una mejora/refactorización de algo existente?"

**Interacción 3:**
- **Usuario:** "Es nuevo, para gestión de inventario"
- **IA:** "Excelente, una aplicación de gestión de inventario. ¿Qué tan urgente es iniciar este proyecto? ¿Necesitas comenzar de inmediato o podemos agendar una reunión para discutir los detalles?"

**Interacción 4 (escala):**

**Si dice "urgente":**
- **IA:** "Entiendo que es urgente. Te voy a conectar directamente con nuestro equipo por WhatsApp para que puedan atenderte de inmediato. [Botón: Continuar en WhatsApp]"
- Se notifica al admin por WhatsApp con el contexto completo

**Si dice "no urgente":**
- **IA:** "Perfecto, te sugiero agendar una videollamada para discutir tu proyecto en detalle. He preparado un link de Google Calendar donde puedes elegir el horario que mejor te convenga: [Link de Calendar]"

## 🧪 Testing

### Test de health check:
```bash
curl http://127.0.0.1:3000/health
```

### Test de chat:
```bash
curl -X POST http://127.0.0.1:3000/widget/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "message": "Hola, necesito ayuda"
  }'
```

### Test de sesión:
```bash
curl http://127.0.0.1:3000/widget/session/test-session-123
```

## 📊 Monitoreo

Moleculer incluye REPL para debugging en tiempo real:

```bash
# En la consola del broker
services        # Ver todos los servicios
call ai.processWidgetMessage --sessionId test --message "Hola"
events          # Ver eventos activos
nodes           # Ver nodos conectados
```

## 🛠️ Desarrollo

### Agregar nuevo servicio:

```javascript
// services/myservice.service.js
module.exports = {
    name: "myservice",
    version: 1,

    actions: {
        hello: {
            handler(ctx) {
                return "Hello World!";
            }
        }
    }
};
```

### Comunicación entre servicios:

```javascript
// Desde cualquier servicio
const result = await ctx.call('v1.ai.processWidgetMessage', {
    sessionId: 'test',
    message: 'Hola'
});
```

### Emitir eventos:

```javascript
// Emitir
this.broker.emit("user.created", { userId: 123 });

// Escuchar
events: {
    "user.created"(ctx) {
        console.log("User created:", ctx.params);
    }
}
```

## 📝 Endpoints Laravel Requeridos

Crear estos endpoints en Laravel:

```php
// routes/api.php

// WhatsApp sync
Route::post('/whatsapp/sync', [WhatsAppController::class, 'sync']);

// Guardar mensaje
Route::post('/whatsapp/messages/store', [WhatsAppMessageController::class, 'storeFromMicroservice']);

// Guardar sesión de widget
Route::post('/widget/sessions', [WidgetController::class, 'storeSession']);

// Notificar admin por WhatsApp
Route::post('/whatsapp/notify', [WhatsAppController::class, 'notifyAdmin']);

// Health check
Route::get('/health', function() {
    return ['status' => 'ok'];
});
```

## 🔒 Seguridad

- Usar `LARAVEL_API_TOKEN` en producción
- Configurar CORS apropiadamente
- Validar inputs en todos los endpoints
- Rate limiting en el gateway
- Sanitizar datos antes de enviar a IA

## 📦 Producción

### Con PM2:

```bash
npm install -g pm2
pm2 start broker.js --name bigdream-microservices
pm2 save
pm2 startup
```

### Con Docker:

```dockerfile
# Próximamente
```

## 🐛 Troubleshooting

### Error: "No active connection"
- Verificar que el servicio WhatsApp esté iniciado
- Revisar logs: `tail -f storage/logs/*.log`

### Error: "Cannot connect to Laravel API"
- Verificar `LARAVEL_API_URL` en `.env`
- Asegurar que Laravel esté corriendo
- Verificar rutas API en Laravel

### Widget no responde:
- Verificar que el gateway esté en puerto 3000
- Revisar CORS en gateway service
- Verificar network tab en DevTools

## 📚 Recursos

- [Moleculer Docs](https://moleculer.services/)
- [WhatsApp Web.js](https://wwebjs.dev/)
- [OpenAI API](https://platform.openai.com/docs)
- [Google Gemini](https://ai.google.dev/)

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch
3. Commit cambios
4. Push a branch
5. Crear Pull Request

## 📄 Licencia

MIT
#   m i c r o s e r v i c e s - b i g d r e a m s y s t e m  
 