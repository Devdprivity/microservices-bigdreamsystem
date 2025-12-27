/**
 * Moleculer ServiceBroker
 *
 * Inicia el broker principal y todos los servicios
 */

require('dotenv').config();
const { ServiceBroker } = require('moleculer');
const path = require('path');

// Create broker
const broker = new ServiceBroker(require('./moleculer.config'));

// Load services
broker.loadServices(path.join(__dirname, 'services'), '**/*.service.js');

// Start broker
broker.start()
    .then(() => {
        broker.repl(); // Start REPL for debugging
    })
    .catch(err => {
        console.error('Error starting broker', err);
        process.exit(1);
    });

// Handle shutdown gracefully
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await broker.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await broker.stop();
    process.exit(0);
});
