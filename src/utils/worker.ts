const { parentPort } = require('worker_threads');
const { parseDuffelResponse } = require('./flights.ts');

parentPort.on('message', (duffelResponse) => {
    const parsedResponse = parseDuffelResponse(duffelResponse);
    parentPort.postMessage(parsedResponse);
});