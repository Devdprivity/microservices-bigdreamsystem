const { Service } = require('moleculer');
const axios = require('axios');

/**
 * API Gateway Service
 * Maneja comunicación con Laravel API
 */
module.exports = {
    name: "api",
    version: 1,

    /**
     * Settings
     */
    settings: {
        laravelApiUrl: process.env.LARAVEL_API_URL || 'http://127.0.0.1:8000',
        apiToken: process.env.LARAVEL_API_TOKEN || '',
    },

    /**
     * Actions
     */
    actions: {
        /**
         * Update WhatsApp status in Laravel
         */
        updateWhatsAppStatus: {
            params: {
                userId: "number",
                status: "string",
                qrCode: { type: "string", optional: true }
            },
            async handler(ctx) {
                const { userId, status, qrCode } = ctx.params;

                try {
                    const response = await this.makeRequest('POST', '/api/whatsapp/sync', {
                        user_id: userId,
                        status,
                        qr_code: qrCode,
                        timestamp: new Date().toISOString()
                    });

                    return response.data;
                } catch (error) {
                    this.logger.error('Error updating WhatsApp status', {
                        userId,
                        error: error.message
                    });
                    throw error;
                }
            }
        },

        /**
         * Save WhatsApp message to Laravel
         */
        saveMessage: {
            params: {
                user_id: "number",
                message_id: "string",
                from_number: "string",
                from_name: "string",
                body: "string",
                type: "string",
                timestamp: "number"
            },
            async handler(ctx) {
                try {
                    const response = await this.makeRequest('POST', '/api/whatsapp/messages/store', ctx.params);
                    return response.data;
                } catch (error) {
                    this.logger.error('Error saving message', {
                        error: error.message
                    });
                    throw error;
                }
            }
        },

        /**
         * Save widget session to Laravel
         */
        saveWidgetSession: {
            params: {
                sessionId: "string",
                userId: { type: "number", optional: true },
                data: "object"
            },
            async handler(ctx) {
                try {
                    const response = await this.makeRequest('POST', '/api/widget/sessions', {
                        session_id: ctx.params.sessionId,
                        user_id: ctx.params.userId,
                        data: JSON.stringify(ctx.params.data),
                        timestamp: new Date().toISOString()
                    });

                    return response.data;
                } catch (error) {
                    this.logger.error('Error saving widget session', {
                        sessionId: ctx.params.sessionId,
                        error: error.message
                    });
                    // Don't throw, just log
                    return { success: false, error: error.message };
                }
            }
        },

        /**
         * Send WhatsApp notification to admin
         */
        sendWhatsAppNotification: {
            params: {
                message: "string",
                metadata: { type: "object", optional: true }
            },
            async handler(ctx) {
                try {
                    const response = await this.makeRequest('POST', '/api/whatsapp/notify', {
                        message: ctx.params.message,
                        metadata: ctx.params.metadata,
                        timestamp: new Date().toISOString()
                    });

                    return response.data;
                } catch (error) {
                    this.logger.error('Error sending WhatsApp notification', {
                        error: error.message
                    });
                    throw error;
                }
            }
        }
    },

    /**
     * Events
     */
    events: {
        /**
         * Escalate to WhatsApp
         */
        "ai.escalate.whatsapp"(ctx) {
            this.logger.info('Escalating conversation to WhatsApp', ctx.params);

            const { sessionId, intent, category, messages } = ctx.params;

            // Build notification message
            const lastUserMessages = messages
                .filter(m => m.role === 'user')
                .slice(-3)
                .map(m => m.content)
                .join('\n');

            const notification = `🔔 *Nueva consulta del widget*

*Tipo:* ${intent}
*Categoría:* ${category}
*Sesión:* ${sessionId}

*Últimos mensajes:*
${lastUserMessages}

Por favor contacta al usuario lo antes posible.`;

            // Send to Laravel to notify admin
            this.actions.sendWhatsAppNotification.handler.call(this, {
                params: {
                    message: notification,
                    metadata: ctx.params
                }
            });
        }
    },

    /**
     * Methods
     */
    methods: {
        /**
         * Make HTTP request to Laravel API
         */
        async makeRequest(method, endpoint, data = null) {
            const url = `${this.settings.laravelApiUrl}${endpoint}`;

            const config = {
                method,
                url,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            if (this.settings.apiToken) {
                config.headers['Authorization'] = `Bearer ${this.settings.apiToken}`;
            }

            if (data) {
                if (method === 'GET') {
                    config.params = data;
                } else {
                    config.data = data;
                }
            }

            try {
                const response = await axios(config);
                return response;
            } catch (error) {
                if (error.response) {
                    this.logger.error('Laravel API error', {
                        status: error.response.status,
                        data: error.response.data,
                        endpoint
                    });
                }
                throw error;
            }
        }
    },

    /**
     * Service created lifecycle event handler
     */
    created() {
        this.logger.info('API service created');
    },

    /**
     * Service started lifecycle event handler
     */
    async started() {
        this.logger.info('API service started');

        // Test connection to Laravel
        try {
            await this.makeRequest('GET', '/api/health');
            this.logger.info('Successfully connected to Laravel API');
        } catch (error) {
            this.logger.warn('Could not connect to Laravel API. Will retry on requests.');
        }
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {
        this.logger.info('API service stopped');
    }
};
