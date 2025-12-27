const { Service } = require('moleculer');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * AI Conversational Service
 * Maneja el flujo conversacional del widget:
 * 1. Determina qué quiere el usuario (mínimo 3 interacciones)
 * 2. Califica si necesita contacto directo
 * 3. Decide entre WhatsApp urgente o agendar reunión
 * 4. Genera URL de Google Calendar si es no urgente
 */
module.exports = {
    name: "ai",
    version: 1,

    /**
     * Settings
     */
    settings: {
        openaiKey: process.env.OPENAI_API_KEY,
        geminiKey: process.env.GEMINI_API_KEY,
        defaultModel: 'gpt-4', // or 'gemini-pro'
        minInteractions: 3,
        supportWhatsApp: process.env.SUPPORT_WHATSAPP_NUMBER || '56937871331',
        googleCalendarId: process.env.GOOGLE_CALENDAR_ID,
    },

    /**
     * Dependencies
     */
    dependencies: [],

    /**
     * Actions
     */
    actions: {
        /**
         * Process widget message
         */
        processWidgetMessage: {
            params: {
                sessionId: "string",
                message: "string",
                userId: { type: "number", optional: true }
            },
            async handler(ctx) {
                const { sessionId, message, userId } = ctx.params;

                // Get or create conversation session
                let session = this.sessions.get(sessionId);
                if (!session) {
                    session = this.createSession(sessionId, userId);
                    this.sessions.set(sessionId, session);
                }

                // Add user message
                session.messages.push({
                    role: 'user',
                    content: message,
                    timestamp: new Date()
                });

                session.interactionCount++;

                // Generate AI response based on conversation state
                const response = await this.generateResponse(session);

                // Add assistant message
                session.messages.push({
                    role: 'assistant',
                    content: response.message,
                    timestamp: new Date()
                });

                // Update session state
                if (response.intent) session.intent = response.intent;
                if (response.urgency) session.urgency = response.urgency;
                if (response.category) session.category = response.category;
                if (response.needsDetails !== undefined) session.needsDetails = response.needsDetails;

                // Save session
                await this.saveSession(session);

                // Check if we should escalate to WhatsApp or Calendar
                if (response.action) {
                    await this.handleAction(session, response.action);
                }

                return {
                    message: response.message,
                    sessionId: session.id,
                    interactionCount: session.interactionCount,
                    intent: session.intent,
                    urgency: session.urgency,
                    action: response.action,
                    metadata: response.metadata
                };
            }
        },

        /**
         * Get session info
         */
        getSession: {
            params: {
                sessionId: "string"
            },
            handler(ctx) {
                const { sessionId } = ctx.params;
                return this.sessions.get(sessionId) || null;
            }
        },

        /**
         * Reset session
         */
        resetSession: {
            params: {
                sessionId: "string"
            },
            handler(ctx) {
                const { sessionId } = ctx.params;
                this.sessions.delete(sessionId);
                return { success: true };
            }
        }
    },

    /**
     * Events
     */
    events: {
        "ai.process.widget.message"(ctx) {
            this.logger.info('Processing widget message via event', ctx.params);
            return this.actions.processWidgetMessage.handler.call(this, ctx);
        }
    },

    /**
     * Methods
     */
    methods: {
        /**
         * Create new conversation session
         */
        createSession(sessionId, userId = null) {
            return {
                id: sessionId,
                userId,
                messages: [],
                interactionCount: 0,
                intent: null, // 'new_project', 'fix', 'bug', 'question', 'other'
                category: null, // 'web', 'mobile', 'ai', 'integration', 'other'
                urgency: null, // 'urgent', 'not_urgent'
                needsDetails: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        },

        /**
         * Generate AI response based on conversation state
         */
        async generateResponse(session) {
            const systemPrompt = this.buildSystemPrompt(session);
            const userMessage = session.messages[session.messages.length - 1].content;

            try {
                // Use OpenAI or Gemini based on configuration
                let aiResponse;
                if (this.settings.defaultModel.startsWith('gpt')) {
                    aiResponse = await this.callOpenAI(systemPrompt, session.messages);
                } else {
                    aiResponse = await this.callGemini(systemPrompt, session.messages);
                }

                // Parse response and determine next action
                return this.parseAIResponse(aiResponse, session);
            } catch (error) {
                this.logger.error('Error generating AI response', error);
                return {
                    message: 'Disculpa, hubo un error. ¿Podrías repetir tu consulta?',
                    intent: session.intent,
                    urgency: session.urgency
                };
            }
        },

        /**
         * Build system prompt based on conversation state
         */
        buildSystemPrompt(session) {
            let prompt = `Eres un asistente virtual de BigDreamSystem, una empresa de desarrollo de software.

TU OBJETIVO:
1. Determinar QUÉ necesita el cliente (proyecto nuevo, arreglo, bug, consulta)
2. Hacer MÍNIMO 3 INTERACCIONES antes de escalar
3. Clasificar URGENCIA (urgente o no urgente)
4. Ofrecer contacto directo por WhatsApp si es urgente
5. Ofrecer agendar reunión si no es urgente

SERVICIOS DE BIGDREAMSYSTEM:
- Desarrollo web (React, Laravel, Node.js)
- Desarrollo móvil (iOS, Android, React Native)
- Inteligencia Artificial y ML
- Integraciones (APIs, WhatsApp, Google Calendar)
- Consultoría técnica

FLUJO DE CONVERSACIÓN:
`;

            if (session.interactionCount === 0) {
                prompt += `
- Estás en la PRIMERA interacción
- Saluda cordialmente
- Pregunta cómo puedes ayudar
- Sé breve y amigable`;
            } else if (session.interactionCount < this.settings.minInteractions) {
                prompt += `
- Estás en la interacción ${session.interactionCount + 1} de mínimo ${this.settings.minInteractions}
- Necesitas más detalles antes de escalar
- Pregunta específicamente sobre:
  * Tipo de proyecto (${session.intent ? 'YA IDENTIFICADO: ' + session.intent : 'aún no identificado'})
  * Alcance y complejidad
  * Urgencia (${session.urgency ? 'YA IDENTIFICADO: ' + session.urgency : 'aún no identificada'})
- NO ofrezcas aún contacto directo o agenda`;
            } else {
                prompt += `
- Has completado ${session.interactionCount} interacciones
- Ya tienes suficiente información
- DEBES ofrecer:
  * Si es URGENTE → Contacto directo por WhatsApp
  * Si NO es urgente → Agendar reunión con Google Calendar`;
            }

            if (session.intent) {
                prompt += `\n\nINTENTO IDENTIFICADO: ${session.intent}`;
            }
            if (session.urgency) {
                prompt += `\nURGENCIA IDENTIFICADA: ${session.urgency}`;
            }

            prompt += `\n\nRESPONDE EN FORMATO JSON:
{
  "message": "tu respuesta al usuario",
  "intent": "new_project|fix|bug|question|other",
  "category": "web|mobile|ai|integration|other",
  "urgency": "urgent|not_urgent",
  "needsDetails": true|false,
  "action": null|"whatsapp"|"calendar"
}`;

            return prompt;
        },

        /**
         * Call OpenAI API
         */
        async callOpenAI(systemPrompt, messages) {
            const openai = new OpenAI({
                apiKey: this.settings.openaiKey
            });

            const completion = await openai.chat.completions.create({
                model: this.settings.defaultModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            return completion.choices[0].message.content;
        },

        /**
         * Call Gemini API
         */
        async callGemini(systemPrompt, messages) {
            const genAI = new GoogleGenerativeAI(this.settings.geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const chatHistory = messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            const chat = model.startChat({
                history: chatHistory,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500,
                }
            });

            const result = await chat.sendMessage(systemPrompt);
            return result.response.text();
        },

        /**
         * Parse AI response
         */
        parseAIResponse(aiResponse, session) {
            try {
                // Try to parse as JSON
                const parsed = JSON.parse(aiResponse);
                return {
                    message: parsed.message,
                    intent: parsed.intent || session.intent,
                    category: parsed.category || session.category,
                    urgency: parsed.urgency || session.urgency,
                    needsDetails: parsed.needsDetails,
                    action: parsed.action,
                    metadata: {}
                };
            } catch (error) {
                // If not JSON, return as plain text
                return {
                    message: aiResponse,
                    intent: session.intent,
                    urgency: session.urgency
                };
            }
        },

        /**
         * Handle action (WhatsApp or Calendar)
         */
        async handleAction(session, action) {
            if (action === 'whatsapp') {
                // Generate WhatsApp notification
                await this.broker.emit("ai.escalate.whatsapp", {
                    sessionId: session.id,
                    userId: session.userId,
                    intent: session.intent,
                    category: session.category,
                    urgency: session.urgency,
                    messages: session.messages,
                    timestamp: new Date()
                });

                this.logger.info('Escalated to WhatsApp', { sessionId: session.id });
            } else if (action === 'calendar') {
                // Generate Google Calendar URL
                const calendarUrl = this.generateCalendarUrl(session);
                session.calendarUrl = calendarUrl;

                this.logger.info('Generated calendar URL', { sessionId: session.id, url: calendarUrl });
            }
        },

        /**
         * Generate Google Calendar URL
         */
        generateCalendarUrl(session) {
            const summary = `Reunión BigDreamSystem - ${session.category || 'Consulta'}`;
            const description = `Sesión: ${session.id}\nIntento: ${session.intent}\nCategoría: ${session.category}`;

            // Set meeting for next business day at 10:00 AM
            const date = new Date();
            date.setDate(date.getDate() + 1);
            date.setHours(10, 0, 0, 0);

            const startDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            date.setHours(11, 0, 0, 0);
            const endDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

            const params = new URLSearchParams({
                action: 'TEMPLATE',
                text: summary,
                details: description,
                dates: `${startDate}/${endDate}`,
                sf: 'true',
                output: 'xml'
            });

            return `https://calendar.google.com/calendar/render?${params.toString()}`;
        },

        /**
         * Save session to storage
         */
        async saveSession(session) {
            session.updatedAt = new Date();

            // Save to Laravel API
            try {
                await this.broker.call('v1.api.saveWidgetSession', {
                    sessionId: session.id,
                    userId: session.userId,
                    data: session
                });
            } catch (error) {
                this.logger.error('Error saving session to API', error);
            }
        }
    },

    /**
     * Service created lifecycle event handler
     */
    created() {
        this.sessions = new Map();
        this.logger.info('AI service created');
    },

    /**
     * Service started lifecycle event handler
     */
    async started() {
        this.logger.info('AI service started');

        if (!this.settings.openaiKey && !this.settings.geminiKey) {
            this.logger.warn('No AI API keys configured. Service will not work properly.');
        }
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {
        this.logger.info('AI service stopped');
    }
};
