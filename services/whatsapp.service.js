const { Service } = require('moleculer');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');

/**
 * WhatsApp Service
 * Maneja conexiones de WhatsApp Web usando whatsapp-web.js
 */
module.exports = {
    name: "whatsapp",
    version: 1,

    /**
     * Settings
     */
    settings: {
        port: process.env.WHATSAPP_SERVICE_PORT || 3001,
        sessionPath: process.env.WHATSAPP_SESSION_PATH || './storage/sessions',
        qrPath: './storage/qr',
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
         * Connect WhatsApp for a user
         */
        connect: {
            params: {
                userId: "number"
            },
            async handler(ctx) {
                const { userId } = ctx.params;

                try {
                    // Check if already connected
                    let connection = this.connections.get(userId);
                    if (connection && connection.isConnected) {
                        return {
                            success: true,
                            status: 'already_connected',
                            message: 'WhatsApp already connected'
                        };
                    }

                    // Create new connection
                    connection = await this.createConnection(userId);
                    this.connections.set(userId, connection);

                    return {
                        success: true,
                        status: 'connecting',
                        message: 'Connection initiated'
                    };
                } catch (error) {
                    this.logger.error('Error connecting WhatsApp', { userId, error: error.message });
                    throw error;
                }
            }
        },

        /**
         * Disconnect WhatsApp
         */
        disconnect: {
            params: {
                userId: "number"
            },
            async handler(ctx) {
                const { userId } = ctx.params;
                const connection = this.connections.get(userId);

                if (!connection) {
                    return {
                        success: false,
                        message: 'No active connection found'
                    };
                }

                await connection.client.destroy();
                this.connections.delete(userId);

                // Notify Laravel
                await ctx.call('v1.api.updateWhatsAppStatus', {
                    userId,
                    status: 'disconnected'
                });

                return {
                    success: true,
                    message: 'Disconnected successfully'
                };
            }
        },

        /**
         * Send message
         */
        sendMessage: {
            params: {
                userId: "number",
                toNumber: "string",
                message: "string"
            },
            async handler(ctx) {
                const { userId, toNumber, message } = ctx.params;
                const connection = this.connections.get(userId);

                if (!connection || !connection.isConnected) {
                    throw new Error('WhatsApp not connected');
                }

                const formattedNumber = toNumber.includes('@') ? toNumber : `${toNumber}@c.us`;
                const sentMessage = await connection.client.sendMessage(formattedNumber, message);

                this.logger.info('Message sent', { userId, to: toNumber });

                return {
                    success: true,
                    messageId: sentMessage.id._serialized
                };
            }
        },

        /**
         * Edit message
         */
        editMessage: {
            params: {
                userId: "number",
                messageId: "string",
                newContent: "string"
            },
            async handler(ctx) {
                const { userId, messageId, newContent } = ctx.params;
                const connection = this.connections.get(userId);

                if (!connection || !connection.isConnected) {
                    throw new Error('WhatsApp not connected');
                }

                const message = await connection.client.getMessageById(messageId);
                if (!message) {
                    throw new Error('Message not found');
                }

                await message.edit(newContent);

                this.logger.info('Message edited', { userId, messageId });

                return {
                    success: true,
                    message: 'Message edited successfully'
                };
            }
        },

        /**
         * Get status
         */
        getStatus: {
            params: {
                userId: "number"
            },
            handler(ctx) {
                const { userId } = ctx.params;
                const connection = this.connections.get(userId);

                if (!connection) {
                    return { status: 'disconnected' };
                }

                return {
                    status: connection.status,
                    isConnected: connection.isConnected,
                    qrCode: connection.qrCode,
                    userId
                };
            }
        },

        /**
         * Cleanup dead/corrupted sessions
         * Elimina sesiones que no están conectadas o están en estado inválido
         */
        cleanup: {
            params: {
                userId: "number"
            },
            async handler(ctx) {
                const { userId } = ctx.params;

                this.logger.info('Cleaning up session', { userId });

                // Eliminar conexión en memoria
                const connection = this.connections.get(userId);
                if (connection) {
                    try {
                        if (connection.client) {
                            await connection.client.destroy();
                        }
                    } catch (error) {
                        this.logger.warn('Error destroying client during cleanup', {
                            userId,
                            error: error.message
                        });
                    }
                    this.connections.delete(userId);
                }

                // Limpiar archivos de sesión
                try {
                    const sessionPath = path.join(this.settings.sessionPath, `user-${userId}`);
                    const qrPath = path.join(this.settings.qrPath, `user-${userId}.png`);

                    // Eliminar carpeta de sesión completa
                    await fs.rm(sessionPath, { recursive: true, force: true });

                    // Eliminar archivo QR
                    await fs.unlink(qrPath).catch(() => {});

                    this.logger.info('Session files cleaned', { userId });
                } catch (error) {
                    this.logger.warn('Error cleaning session files', {
                        userId,
                        error: error.message
                    });
                }

                // Notificar a Laravel
                try {
                    await ctx.call('v1.api.updateWhatsAppStatus', {
                        userId,
                        status: 'disconnected',
                        qrCode: null
                    });
                } catch (error) {
                    this.logger.warn('Error notifying Laravel during cleanup', {
                        userId,
                        error: error.message
                    });
                }

                return {
                    success: true,
                    message: 'Session cleaned successfully'
                };
            }
        }
    },

    /**
     * Events
     */
    events: {
        /**
         * Widget message received - forward to AI
         */
        "widget.message.received"(ctx) {
            this.logger.info('Widget message received, forwarding to AI', ctx.params);

            // Forward to AI service
            this.broker.emit("ai.process.widget.message", ctx.params);
        }
    },

    /**
     * Methods
     */
    methods: {
        /**
         * Create WhatsApp connection for user
         */
        async createConnection(userId) {
            const sessionPath = path.join(this.settings.sessionPath, `user-${userId}`);
            const qrPath = path.join(this.settings.qrPath, `user-${userId}.png`);

            const client = new Client({
                authStrategy: new LocalAuth({
                    clientId: `user-${userId}`,
                    dataPath: this.settings.sessionPath
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--disable-web-security',
                        '--disable-features=IsolateOrigins,site-per-process'
                    ],
                    executablePath: process.env.CHROME_PATH || undefined
                },
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
                }
            });

            const connection = {
                userId,
                client,
                status: 'initializing',
                isConnected: false,
                qrCode: null
            };

            // QR Code event
            client.on('qr', async (qr) => {
                this.logger.info('QR Code generated', { userId });
                connection.status = 'qr_ready';
                connection.qrCode = await qrcode.toDataURL(qr);

                // Save QR to file
                await qrcode.toFile(qrPath, qr);

                // Notify Laravel
                await this.broker.call('v1.api.updateWhatsAppStatus', {
                    userId,
                    status: 'qr_ready',
                    qrCode: connection.qrCode
                });
            });

            // Ready event
            client.on('ready', async () => {
                this.logger.info('WhatsApp ready', { userId });
                connection.status = 'connected';
                connection.isConnected = true;

                // Notify Laravel
                await this.broker.call('v1.api.updateWhatsAppStatus', {
                    userId,
                    status: 'connected'
                });
            });

            // Message event
            client.on('message', async (msg) => {
                if (msg.fromMe) return;

                this.logger.info('Message received', { userId, from: msg.from });

                const messageData = {
                    user_id: userId,
                    message_id: msg.id._serialized,
                    from_number: msg.from.replace('@c.us', ''),
                    from_name: msg._data.notifyName || 'Desconocido',
                    body: msg.body,
                    type: msg.type === 'chat' ? 'text' : msg.type,
                    timestamp: msg.timestamp,
                    metadata: {
                        hasMedia: msg.hasMedia,
                        deviceType: msg.deviceType,
                        isForwarded: msg.isForwarded,
                    }
                };

                // Save to Laravel
                await this.broker.call('v1.api.saveMessage', messageData);

                // Emit event for AI processing (if needed)
                this.broker.emit("whatsapp.message.received", messageData);
            });

            // Disconnected event
            client.on('disconnected', async (reason) => {
                this.logger.warn('WhatsApp disconnected', { userId, reason });
                connection.status = 'disconnected';
                connection.isConnected = false;

                await this.broker.call('v1.api.updateWhatsAppStatus', {
                    userId,
                    status: 'disconnected'
                });
            });

            // Auth failure event
            client.on('auth_failure', async (msg) => {
                this.logger.error('Auth failure', { userId, msg });
                connection.status = 'auth_failure';
                connection.isConnected = false;

                await this.broker.call('v1.api.updateWhatsAppStatus', {
                    userId,
                    status: 'auth_failure'
                });
            });

            // Loading screen event
            client.on('loading_screen', (percent, message) => {
                this.logger.info('Loading screen', { userId, percent, message });
            });

            // Initialize client
            try {
                this.logger.info('Initializing WhatsApp client', { userId });
                await client.initialize();
            } catch (error) {
                this.logger.error('Error initializing WhatsApp client', {
                    userId,
                    error: error.message,
                    stack: error.stack
                });
                throw error;
            }

            return connection;
        }
    },

    /**
     * Service created lifecycle event handler
     */
    created() {
        this.connections = new Map();
        this.logger.info('WhatsApp service created');
    },

    /**
     * Service started lifecycle event handler
     */
    async started() {
        this.logger.info('WhatsApp service started');

        // Create storage directories
        const dirs = [this.settings.sessionPath, this.settings.qrPath];
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {
        this.logger.info('WhatsApp service stopping...');

        // Disconnect all connections
        for (const [userId, connection] of this.connections) {
            try {
                await connection.client.destroy();
            } catch (error) {
                this.logger.error('Error destroying connection', { userId, error: error.message });
            }
        }

        this.connections.clear();
        this.logger.info('WhatsApp service stopped');
    }
};
