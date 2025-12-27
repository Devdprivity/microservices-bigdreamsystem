const { Service } = require('moleculer');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

/**
 * HTTP Gateway Service
 * Expone endpoints HTTP para que el widget frontend pueda comunicarse
 */
module.exports = {
    name: "gateway",
    version: 1,

    /**
     * Settings
     */
    settings: {
        port: process.env.GATEWAY_PORT || 3000,
        cors: {
            origin: '*',
            credentials: true
        }
    },

    /**
     * Actions
     */
    actions: {
        /**
         * Health check
         */
        health: {
            rest: "GET /health",
            handler(ctx) {
                return {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    services: {
                        whatsapp: 'online',
                        ai: 'online',
                        api: 'online'
                    }
                };
            }
        },

        /**
         * Widget chat endpoint
         */
        chat: {
            rest: "POST /widget/chat",
            params: {
                sessionId: "string",
                message: "string",
                userId: { type: "number", optional: true }
            },
            async handler(ctx) {
                const { sessionId, message, userId } = ctx.params;

                try {
                    // Call AI service to process message
                    const response = await ctx.call('v1.ai.processWidgetMessage', {
                        sessionId,
                        message,
                        userId
                    });

                    return {
                        success: true,
                        data: response
                    };
                } catch (error) {
                    this.logger.error('Error processing chat', error);
                    return {
                        success: false,
                        error: error.message,
                        message: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.'
                    };
                }
            }
        },

        /**
         * Get session info
         */
        getSession: {
            rest: "GET /widget/session/:sessionId",
            params: {
                sessionId: "string"
            },
            async handler(ctx) {
                try {
                    const session = await ctx.call('v1.ai.getSession', {
                        sessionId: ctx.params.sessionId
                    });

                    return {
                        success: true,
                        data: session
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }
        },

        /**
         * Reset session
         */
        resetSession: {
            rest: "POST /widget/session/:sessionId/reset",
            params: {
                sessionId: "string"
            },
            async handler(ctx) {
                try {
                    await ctx.call('v1.ai.resetSession', {
                        sessionId: ctx.params.sessionId
                    });

                    return {
                        success: true,
                        message: 'Session reset successfully'
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }
        },

        /**
         * WhatsApp - Connect
         */
        whatsappConnect: {
            rest: "POST /connect",
            params: {
                userId: "number"
            },
            async handler(ctx) {
                return await ctx.call('v1.whatsapp.connect', ctx.params);
            }
        },

        /**
         * WhatsApp - Disconnect
         */
        whatsappDisconnect: {
            rest: "POST /disconnect",
            params: {
                userId: "number"
            },
            async handler(ctx) {
                return await ctx.call('v1.whatsapp.disconnect', ctx.params);
            }
        },

        /**
         * WhatsApp - Send Message
         */
        whatsappSendMessage: {
            rest: "POST /send-message",
            params: {
                userId: "number",
                toNumber: "string",
                message: "string"
            },
            async handler(ctx) {
                return await ctx.call('v1.whatsapp.sendMessage', ctx.params);
            }
        },

        /**
         * WhatsApp - Edit Message
         */
        whatsappEditMessage: {
            rest: "POST /edit-message",
            params: {
                userId: "number",
                messageId: "string",
                newContent: "string"
            },
            async handler(ctx) {
                return await ctx.call('v1.whatsapp.editMessage', ctx.params);
            }
        },

        /**
         * WhatsApp - Get QR Code
         */
        whatsappGetQR: {
            rest: "GET /qr/:userId",
            params: {
                userId: "number"
            },
            async handler(ctx) {
                return await ctx.call('v1.whatsapp.getQR', ctx.params);
            }
        },

        /**
         * WhatsApp - Get Status
         */
        whatsappGetStatus: {
            rest: "GET /status/:userId",
            params: {
                userId: "number"
            },
            async handler(ctx) {
                return await ctx.call('v1.whatsapp.getStatus', ctx.params);
            }
        },

        /**
         * WhatsApp - Cleanup Session
         */
        whatsappCleanup: {
            rest: "POST /cleanup",
            params: {
                userId: "number"
            },
            async handler(ctx) {
                return await ctx.call('v1.whatsapp.cleanup', ctx.params);
            }
        }
    },

    /**
     * Methods
     */
    methods: {
        /**
         * Initialize HTTP server
         */
        initServer() {
            const app = express();

            // Middleware
            app.use(cors(this.settings.cors));
            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({ extended: true }));

            // Request logging
            app.use((req, res, next) => {
                this.logger.debug(`${req.method} ${req.path}`, {
                    ip: req.ip,
                    userAgent: req.get('user-agent')
                });
                next();
            });

            // Health endpoint
            app.get('/health', async (req, res) => {
                try {
                    const result = await this.broker.call('v1.gateway.health');
                    res.json(result);
                } catch (error) {
                    res.status(500).json({ error: error.message });
                }
            });

            // Widget chat endpoint
            app.post('/widget/chat', async (req, res) => {
                try {
                    const result = await this.broker.call('v1.gateway.chat', req.body);
                    res.json(result);
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            });

            // Get session
            app.get('/widget/session/:sessionId', async (req, res) => {
                try {
                    const result = await this.broker.call('v1.gateway.getSession', {
                        sessionId: req.params.sessionId
                    });
                    res.json(result);
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            });

            // Reset session
            app.post('/widget/session/:sessionId/reset', async (req, res) => {
                try {
                    const result = await this.broker.call('v1.gateway.resetSession', {
                        sessionId: req.params.sessionId
                    });
                    res.json(result);
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            });

            // WhatsApp - Connect
            app.post('/connect', async (req, res) => {
                try {
                    const result = await this.broker.call('v1.gateway.whatsappConnect', req.body);
                    res.json(result);
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });

            // WhatsApp - Disconnect
            app.post('/disconnect', async (req, res) => {
                try {
                    const result = await this.broker.call('v1.gateway.whatsappDisconnect', req.body);
                    res.json(result);
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });

            // WhatsApp - Send Message
            app.post('/send-message', async (req, res) => {
                try {
                    const result = await this.broker.call('v1.gateway.whatsappSendMessage', req.body);
                    res.json(result);
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });

            // WhatsApp - Edit Message
            app.post('/edit-message', async (req, res) => {
                try {
                    const result = await this.broker.call('v1.gateway.whatsappEditMessage', req.body);
                    res.json(result);
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });

            // WhatsApp - Get QR Code
            app.get('/qr/:userId', async (req, res) => {
                try {
                    const result = await this.broker.call('v1.gateway.whatsappGetQR', {
                        userId: parseInt(req.params.userId)
                    });
                    res.json(result);
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });

            // WhatsApp - Get Status
            app.get('/status/:userId', async (req, res) => {
                try {
                    const result = await this.broker.call('v1.gateway.whatsappGetStatus', {
                        userId: parseInt(req.params.userId)
                    });
                    res.json(result);
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });

            // WhatsApp - Cleanup Session
            app.post('/cleanup', async (req, res) => {
                try {
                    const result = await this.broker.call('v1.gateway.whatsappCleanup', {
                        userId: parseInt(req.body.userId)
                    });
                    res.json(result);
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });

            // Error handler
            app.use((err, req, res, next) => {
                this.logger.error('Express error', err);
                res.status(500).json({
                    success: false,
                    error: err.message
                });
            });

            // Start server
            this.server = app.listen(this.settings.port, () => {
                this.logger.info(`🌐 HTTP Gateway listening on port ${this.settings.port}`);
            });
        }
    },

    /**
     * Service started lifecycle event handler
     */
    async started() {
        this.initServer();
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {
        if (this.server) {
            this.server.close(() => {
                this.logger.info('HTTP Gateway closed');
            });
        }
    }
};
