require('dotenv').config();

module.exports = {
    namespace: "bigdreamsystem",
    nodeID: null,

    logger: {
        type: "Console",
        options: {
            level: process.env.LOG_LEVEL || "info",
            colors: true,
            moduleColors: true,
            formatter: "full",
            objectPrinter: null,
            autoPadding: false
        }
    },

    logLevel: process.env.LOG_LEVEL || "info",

    transporter: {
        type: "TCP",
        options: {
            udpDiscovery: false,
            udpPort: 4445,
            udpBindAddress: null,
            udpReuseAddr: true,
        }
    },

    cacher: {
        type: "Memory",
        options: {
            ttl: 30,
            max: 100
        }
    },

    serializer: "JSON",

    requestTimeout: 30 * 1000,
    retryPolicy: {
        enabled: false,
        retries: 5,
        delay: 100,
        maxDelay: 1000,
        factor: 2,
        check: err => err && !!err.retryable
    },

    maxCallLevel: 100,
    heartbeatInterval: 10,
    heartbeatTimeout: 30,

    contextParamsCloning: false,

    tracking: {
        enabled: false,
        shutdownTimeout: 5000,
    },

    disableBalancer: false,

    registry: {
        strategy: "RoundRobin",
        preferLocal: true
    },

    circuitBreaker: {
        enabled: true,
        threshold: 0.5,
        minRequestCount: 20,
        windowTime: 60,
        halfOpenTime: 10 * 1000,
        check: err => err && err.code >= 500
    },

    bulkhead: {
        enabled: false,
        concurrency: 10,
        maxQueueSize: 100,
    },

    validator: true,

    errorHandler: null,

    metrics: {
        enabled: true,
        reporter: {
            type: "Console",
            options: {
                interval: 10,
                logger: null,
                colors: true,
                onlyChanges: false
            }
        }
    },

    tracing: {
        enabled: true,
        exporter: {
            type: "Console",
            options: {
                logger: null,
                colors: true,
                width: 100,
                gaugeWidth: 40
            }
        }
    },

    middlewares: [],

    replCommands: null,

    metadata: {},

    skipProcessEventRegistration: false,

    created(broker) {
        console.log('🚀 Moleculer Broker Created');
    },

    async started(broker) {
        console.log('✅ Moleculer Broker Started');
        console.log(`📡 Namespace: ${broker.namespace}`);
        console.log(`🆔 Node ID: ${broker.nodeID}`);
    },

    async stopped(broker) {
        console.log('🛑 Moleculer Broker Stopped');
    }
};
