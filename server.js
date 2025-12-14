const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Swagger definition
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Load Testing API',
            version: '1.0.0',
            description: 'API for stress testing CPU and memory resources in containers',
            contact: {
                name: 'API Support'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            }
        ]
    },
    apis: ['./server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// CPU stress test function
function cpuStress(durationSeconds) {
    const startTime = Date.now();
    const endTime = startTime + (durationSeconds * 1000);

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            // Perform CPU-intensive calculations
            let result = 0;
            for (let i = 0; i < 1000000; i++) {
                result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
            }

            if (Date.now() >= endTime) {
                clearInterval(interval);
                resolve({
                    type: 'CPU',
                    duration: durationSeconds,
                    completed: true,
                    timestamp: new Date().toISOString()
                });
            }
        }, 10);
    });
}

// Memory stress test function
function memoryStress(durationSeconds) {
    const startTime = Date.now();
    const endTime = startTime + (durationSeconds * 1000);
    const arrays = [];

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            // Allocate memory - approximately 10MB per iteration
            const largeArray = new Array(1024 * 1024).fill('X'.repeat(10));
            arrays.push(largeArray);

            if (Date.now() >= endTime) {
                clearInterval(interval);
                // Clear arrays to release memory
                arrays.length = 0;
                resolve({
                    type: 'Memory',
                    duration: durationSeconds,
                    completed: true,
                    peakMemoryMB: process.memoryUsage().heapUsed / 1024 / 1024,
                    timestamp: new Date().toISOString()
                });
            }
        }, 100);
    });
}

// Controlled memory stress test with min/max memory bounds
function controlledMemoryStress(durationSeconds, minMemoryMB, maxMemoryMB) {
    const startTime = Date.now();
    const endTime = startTime + (durationSeconds * 1000);
    const arrays = [];
    let currentMemoryMB = 0;

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            const currentHeapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
            currentMemoryMB = currentHeapUsed;

            // Allocate more memory if below minimum
            if (currentMemoryMB < minMemoryMB) {
                // Allocate approximately 10MB per iteration
                const largeArray = new Array(1024 * 1024).fill('X'.repeat(10));
                arrays.push(largeArray);
            }
            // Release memory if above maximum
            else if (currentMemoryMB > maxMemoryMB && arrays.length > 0) {
                // Remove some arrays to reduce memory
                const removeCount = Math.ceil(arrays.length * 0.2); // Remove 20% of arrays
                arrays.splice(0, removeCount);
                // Force garbage collection hint
                if (global.gc) {
                    global.gc();
                }
            }
            // Maintain memory within range
            else if (currentMemoryMB >= minMemoryMB && currentMemoryMB <= maxMemoryMB) {
                // Occasionally allocate or release to simulate fluctuation
                if (Math.random() > 0.5 && currentMemoryMB < maxMemoryMB * 0.9) {
                    const smallArray = new Array(512 * 1024).fill('Y'.repeat(10));
                    arrays.push(smallArray);
                } else if (arrays.length > 0 && currentMemoryMB > minMemoryMB * 1.1) {
                    arrays.pop();
                }
            }

            if (Date.now() >= endTime) {
                clearInterval(interval);
                const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
                // Clear arrays to release memory
                arrays.length = 0;
                resolve({
                    type: 'Controlled Memory',
                    duration: durationSeconds,
                    minMemoryMB: minMemoryMB,
                    maxMemoryMB: maxMemoryMB,
                    finalMemoryMB: finalMemory,
                    completed: true,
                    timestamp: new Date().toISOString()
                });
            }
        }, 100);
    });
}

// Continuous logging function
function continuousLogging(intervalSeconds, durationSeconds = null) {
    const startTime = Date.now();
    let logCount = 0;
    let previousCpuUsage = process.cpuUsage();

    return new Promise((resolve) => {
        console.log(`[LOGS] Starting continuous logging every ${intervalSeconds} seconds...`);

        const interval = setInterval(() => {
            const currentCpuUsage = process.cpuUsage(previousCpuUsage);
            const memoryUsage = process.memoryUsage();

            // Calculate CPU usage percentage (approximate)
            const cpuPercent = ((currentCpuUsage.user + currentCpuUsage.system) / 1000000 / intervalSeconds * 100).toFixed(2);

            // Memory in MB
            const heapUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const heapTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            const rssMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);
            const externalMB = (memoryUsage.external / 1024 / 1024).toFixed(2);

            logCount++;
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            console.log(`[LOGS-${logCount}] [${elapsed}s] CPU: ${cpuPercent}% | Memory - Heap: ${heapUsedMB}/${heapTotalMB} MB | RSS: ${rssMB} MB | External: ${externalMB} MB | Timestamp: ${new Date().toISOString()}`);

            previousCpuUsage = process.cpuUsage();

            // If duration is specified and reached, stop logging
            if (durationSeconds && (Date.now() - startTime) >= (durationSeconds * 1000)) {
                clearInterval(interval);
                console.log(`[LOGS] Continuous logging completed after ${logCount} log entries`);
                resolve({
                    type: 'Continuous Logging',
                    intervalSeconds: intervalSeconds,
                    totalDuration: elapsed,
                    logCount: logCount,
                    completed: true,
                    timestamp: new Date().toISOString()
                });
            }
        }, intervalSeconds * 1000);

        // Store interval ID for potential cleanup
        interval.unref(); // Allow process to exit even if interval is running
    });
}

/**
 * @swagger
 * /cpu:
 *   post:
 *     summary: Execute a CPU stress test
 *     description: Performs CPU-intensive calculations for specified duration
 *     tags:
 *       - CPU Testing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - seconds
 *             properties:
 *               seconds:
 *                 type: number
 *                 description: Duration of the CPU stress test in seconds
 *                 example: 10
 *     responses:
 *       200:
 *         description: CPU stress test completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                 duration:
 *                   type: number
 *                 completed:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: CPU stress test failed
 */
app.post('/cpu', async (req, res) => {
    const { seconds } = req.body;

    // Validate input
    if (!seconds) {
        return res.status(400).json({
            error: 'Missing required parameter: seconds is required'
        });
    }

    if (typeof seconds !== 'number' || seconds <= 0) {
        return res.status(400).json({
            error: 'seconds must be a positive number'
        });
    }

    console.log(`Starting CPU stress test for ${seconds} seconds...`);

    try {
        const result = await cpuStress(seconds);
        console.log('CPU stress test completed');
        res.json(result);
    } catch (error) {
        console.error('Error during CPU stress test:', error);
        res.status(500).json({
            error: 'CPU stress test failed',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /cpu:
 *   get:
 *     summary: Execute a CPU stress test (query params)
 *     description: Performs CPU stress test - starts async and returns immediately
 *     tags:
 *       - CPU Testing
 *     parameters:
 *       - in: query
 *         name: seconds
 *         required: true
 *         schema:
 *           type: integer
 *         description: Duration of the CPU stress test in seconds
 *         example: 10
 *     responses:
 *       200:
 *         description: CPU stress test started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 type:
 *                   type: string
 *                 duration:
 *                   type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input parameters
 */
app.get('/cpu', (req, res) => {
    const { seconds } = req.query;

    // Convert seconds to number
    const secondsNum = parseInt(seconds, 10);

    // Validate input
    if (!seconds) {
        return res.status(400).json({
            error: 'Missing required query parameter: seconds is required',
            example: '/cpu?seconds=10'
        });
    }

    if (isNaN(secondsNum) || secondsNum <= 0) {
        return res.status(400).json({
            error: 'seconds must be a positive number'
        });
    }

    console.log(`Starting CPU stress test for ${secondsNum} seconds...`);

    // Run async but don't wait for response (fire and forget for GET)
    (async () => {
        try {
            await cpuStress(secondsNum);
            console.log('CPU stress test completed');
        } catch (error) {
            console.error('Error during CPU stress test:', error);
        }
    })();

    res.json({
        status: 'started',
        type: 'CPU',
        duration: secondsNum,
        timestamp: new Date().toISOString()
    });
});

/**
 * @swagger
 * /logs:
 *   post:
 *     summary: Start continuous logging
 *     description: Continuously outputs log entries with CPU and memory usage information at specified intervals
 *     tags:
 *       - Logging
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - seconds
 *             properties:
 *               seconds:
 *                 type: number
 *                 description: Interval in seconds between log entries
 *                 example: 5
 *               duration:
 *                 type: number
 *                 description: Optional total duration in seconds (if not specified, logs indefinitely)
 *                 example: 60
 *     responses:
 *       200:
 *         description: Logging started or completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 intervalSeconds:
 *                   type: number
 *                 duration:
 *                   type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Logging failed
 */
app.post('/logs', async (req, res) => {
    const { seconds, duration } = req.body;

    // Validate input
    if (!seconds) {
        return res.status(400).json({
            error: 'Missing required parameter: seconds is required'
        });
    }

    if (typeof seconds !== 'number' || seconds <= 0) {
        return res.status(400).json({
            error: 'seconds must be a positive number'
        });
    }

    if (duration !== undefined && (typeof duration !== 'number' || duration <= 0)) {
        return res.status(400).json({
            error: 'duration must be a positive number if provided'
        });
    }

    console.log(`Starting continuous logging with ${seconds}s intervals${duration ? ` for ${duration}s total` : ' (indefinite)'}...`);

    if (duration) {
        // If duration is specified, wait for completion
        try {
            const result = await continuousLogging(seconds, duration);
            res.json(result);
        } catch (error) {
            console.error('Error during continuous logging:', error);
            res.status(500).json({
                error: 'Logging failed',
                message: error.message
            });
        }
    } else {
        // If no duration, start logging and return immediately
        continuousLogging(seconds);
        res.json({
            status: 'started',
            type: 'Continuous Logging',
            intervalSeconds: seconds,
            mode: 'indefinite',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: Start continuous logging (query params)
 *     description: Continuously outputs log entries - starts async and returns immediately
 *     tags:
 *       - Logging
 *     parameters:
 *       - in: query
 *         name: seconds
 *         required: true
 *         schema:
 *           type: integer
 *         description: Interval in seconds between log entries
 *         example: 5
 *       - in: query
 *         name: duration
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional total duration in seconds
 *         example: 60
 *     responses:
 *       200:
 *         description: Logging started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 type:
 *                   type: string
 *                 intervalSeconds:
 *                   type: number
 *                 duration:
 *                   type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input parameters
 */
app.get('/logs', (req, res) => {
    const { seconds, duration } = req.query;

    // Convert to numbers
    const secondsNum = parseInt(seconds, 10);
    const durationNum = duration ? parseInt(duration, 10) : null;

    // Validate input
    if (!seconds) {
        return res.status(400).json({
            error: 'Missing required query parameter: seconds is required',
            example: '/logs?seconds=5'
        });
    }

    if (isNaN(secondsNum) || secondsNum <= 0) {
        return res.status(400).json({
            error: 'seconds must be a positive number'
        });
    }

    if (duration && (isNaN(durationNum) || durationNum <= 0)) {
        return res.status(400).json({
            error: 'duration must be a positive number if provided'
        });
    }

    console.log(`Starting continuous logging with ${secondsNum}s intervals${durationNum ? ` for ${durationNum}s total` : ' (indefinite)'}...`);

    // Run async but don't wait for response (fire and forget for GET)
    continuousLogging(secondsNum, durationNum);

    res.json({
        status: 'started',
        type: 'Continuous Logging',
        intervalSeconds: secondsNum,
        duration: durationNum,
        mode: durationNum ? 'timed' : 'indefinite',
        timestamp: new Date().toISOString()
    });
});

/**
 * @swagger
 * /memory-test:
 *   post:
 *     summary: Execute a controlled memory test
 *     description: Performs memory stress test maintaining memory usage between min and max thresholds
 *     tags:
 *       - Memory Testing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timePeriod
 *               - minMemory
 *               - maxMemory
 *             properties:
 *               timePeriod:
 *                 type: number
 *                 description: Duration of the test in seconds
 *                 example: 30
 *               minMemory:
 *                 type: number
 *                 description: Minimum memory usage in MB
 *                 example: 100
 *               maxMemory:
 *                 type: number
 *                 description: Maximum memory usage in MB
 *                 example: 300
 *     responses:
 *       200:
 *         description: Memory test completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                 duration:
 *                   type: number
 *                 minMemoryMB:
 *                   type: number
 *                 maxMemoryMB:
 *                   type: number
 *                 finalMemoryMB:
 *                   type: number
 *                 completed:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Memory test failed
 */
app.post('/memory-test', async (req, res) => {
    const { timePeriod, minMemory, maxMemory } = req.body;

    // Validate input
    if (timePeriod === undefined || minMemory === undefined || maxMemory === undefined) {
        return res.status(400).json({
            error: 'Missing required parameters: timePeriod, minMemory, and maxMemory are required',
            example: {
                timePeriod: 30,
                minMemory: 100,
                maxMemory: 300
            }
        });
    }

    if (typeof timePeriod !== 'number' || timePeriod <= 0) {
        return res.status(400).json({
            error: 'timePeriod must be a positive number (seconds)'
        });
    }

    if (typeof minMemory !== 'number' || minMemory <= 0) {
        return res.status(400).json({
            error: 'minMemory must be a positive number (MB)'
        });
    }

    if (typeof maxMemory !== 'number' || maxMemory <= 0) {
        return res.status(400).json({
            error: 'maxMemory must be a positive number (MB)'
        });
    }

    if (minMemory >= maxMemory) {
        return res.status(400).json({
            error: 'minMemory must be less than maxMemory'
        });
    }

    console.log(`Starting controlled memory test for ${timePeriod} seconds (${minMemory}MB - ${maxMemory}MB)...`);

    try {
        const result = await controlledMemoryStress(timePeriod, minMemory, maxMemory);
        console.log('Controlled memory test completed');
        res.json(result);
    } catch (error) {
        console.error('Error during controlled memory test:', error);
        res.status(500).json({
            error: 'Memory test failed',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /memory-test:
 *   get:
 *     summary: Execute a controlled memory test (query params)
 *     description: Performs memory stress test - starts async and returns immediately
 *     tags:
 *       - Memory Testing
 *     parameters:
 *       - in: query
 *         name: timePeriod
 *         required: true
 *         schema:
 *           type: integer
 *         description: Duration of the test in seconds
 *         example: 30
 *       - in: query
 *         name: minMemory
 *         required: true
 *         schema:
 *           type: integer
 *         description: Minimum memory usage in MB
 *         example: 100
 *       - in: query
 *         name: maxMemory
 *         required: true
 *         schema:
 *           type: integer
 *         description: Maximum memory usage in MB
 *         example: 300
 *     responses:
 *       200:
 *         description: Memory test started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 type:
 *                   type: string
 *                 timePeriod:
 *                   type: number
 *                 minMemory:
 *                   type: number
 *                 maxMemory:
 *                   type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input parameters
 */
app.get('/memory-test', (req, res) => {
    const { timePeriod, minMemory, maxMemory } = req.query;

    // Convert to numbers
    const timePeriodNum = parseInt(timePeriod, 10);
    const minMemoryNum = parseInt(minMemory, 10);
    const maxMemoryNum = parseInt(maxMemory, 10);

    // Validate input
    if (!timePeriod || !minMemory || !maxMemory) {
        return res.status(400).json({
            error: 'Missing required query parameters: timePeriod, minMemory, and maxMemory are required',
            example: '/memory-test?timePeriod=30&minMemory=100&maxMemory=300'
        });
    }

    if (isNaN(timePeriodNum) || timePeriodNum <= 0) {
        return res.status(400).json({
            error: 'timePeriod must be a positive number (seconds)'
        });
    }

    if (isNaN(minMemoryNum) || minMemoryNum <= 0) {
        return res.status(400).json({
            error: 'minMemory must be a positive number (MB)'
        });
    }

    if (isNaN(maxMemoryNum) || maxMemoryNum <= 0) {
        return res.status(400).json({
            error: 'maxMemory must be a positive number (MB)'
        });
    }

    if (minMemoryNum >= maxMemoryNum) {
        return res.status(400).json({
            error: 'minMemory must be less than maxMemory'
        });
    }

    console.log(`Starting controlled memory test for ${timePeriodNum} seconds (${minMemoryNum}MB - ${maxMemoryNum}MB)...`);

    // Run async but don't wait for response (fire and forget for GET)
    (async () => {
        try {
            await controlledMemoryStress(timePeriodNum, minMemoryNum, maxMemoryNum);
            console.log('Controlled memory test completed');
        } catch (error) {
            console.error('Error during controlled memory test:', error);
        }
    })();

    res.json({
        status: 'started',
        type: 'Controlled Memory',
        timePeriod: timePeriodNum,
        minMemory: minMemoryNum,
        maxMemory: maxMemoryNum,
        timestamp: new Date().toISOString()
    });
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information
 *     description: Returns information about available API endpoints
 *     tags:
 *       - Information
 *     responses:
 *       200:
 *         description: API endpoint information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                 endpoints:
 *                   type: object
 */
app.get('/', (req, res) => {
    res.json({
        service: 'Load Testing API',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
            health: 'GET /health',
            cpu: 'POST /cpu (body: {seconds: number})',
            cpuGet: 'GET /cpu?seconds=10',
            logs: 'POST /logs (body: {seconds: number, duration?: number})',
            logsGet: 'GET /logs?seconds=5&duration=60',
            memoryTest: 'POST /memory-test (body: {timePeriod: number, minMemory: number, maxMemory: number})',
            memoryTestGet: 'GET /memory-test?timePeriod=30&minMemory=100&maxMemory=300'
        }
    });
});

app.listen(port, () => {
    console.log(`Load testing API listening on port ${port}`);
    console.log(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
});
