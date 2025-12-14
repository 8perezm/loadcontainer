# Load Testing Container

A containerized Node.js Express API for stress testing CPU and memory resources. Perfect for testing Kubernetes cluster autoscaling, resource management, and container performance monitoring.

## Features

- **CPU Stress Testing**: Perform CPU-intensive calculations to simulate high processing loads
- **Controlled Memory Testing**: Maintain memory usage within specified min/max thresholds
- **Continuous Logging**: Monitor real-time CPU and memory usage with customizable intervals
- **Health Monitoring**: Built-in health check endpoint for container orchestration
- **Swagger Documentation**: Interactive API documentation at `/api-docs`
- **Dual Interface**: Support for both GET and POST requests for flexibility in load testing tools
- **Kubernetes Ready**: Pre-configured deployment manifests with HPA and health probes

## Quick Start

### Using Docker Compose (Recommended)
```bash
# Build and run with docker-compose
docker compose up --build

# Run in detached mode
docker compose up -d
```

### Using Docker
```bash
# Build the container
docker build -t loadcontainer:latest .

# Run the container
docker run -p 3000:3000 loadcontainer:latest

# Run with custom memory limit
docker run -p 3000:3000 --memory="14g" loadcontainer:latest
```

### Using Pre-built Image
```bash
# Pull from Docker Hub
docker pull migsperez/loadcontainer:latest

# Run the container
docker run -p 3000:3000 migsperez/loadcontainer:latest
```

## API Endpoints

### 📚 Interactive Documentation
Access the Swagger UI at: **http://localhost:3000/api-docs**

### 🏥 Health Check
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-14T10:30:00.000Z"
}
```

---

### 💻 CPU Stress Test

Performs CPU-intensive calculations for a specified duration.

#### POST Request (Synchronous)
```bash
curl -X POST http://localhost:3000/cpu \
  -H "Content-Type: application/json" \
  -d '{"seconds": 10}'
```

**Response:**
```json
{
  "type": "CPU",
  "duration": 10,
  "completed": true,
  "timestamp": "2025-12-14T10:30:00.000Z"
}
```

#### GET Request (Asynchronous)
```bash
curl "http://localhost:3000/cpu?seconds=10"
```

**Response:**
```json
{
  "status": "started",
  "type": "CPU",
  "duration": 10,
  "timestamp": "2025-12-14T10:30:00.000Z"
}
```

---

### 🧠 Controlled Memory Test

Maintains memory usage between min and max thresholds for a specified duration.

#### POST Request (Synchronous)
```bash
curl -X POST http://localhost:3000/memory-test \
  -H "Content-Type: application/json" \
  -d '{
    "timePeriod": 300,
    "minMemory": 800,
    "maxMemory": 1000
  }'
```

**Response:**
```json
{
  "type": "Controlled Memory",
  "duration": 300,
  "minMemoryMB": 800,
  "maxMemoryMB": 1000,
  "finalMemoryMB": 950.5,
  "completed": true,
  "timestamp": "2025-12-14T10:35:00.000Z"
}
```

#### GET Request (Asynchronous)
```bash
curl "http://localhost:3000/memory-test?timePeriod=300&minMemory=800&maxMemory=1000"
```

**Response:**
```json
{
  "status": "started",
  "type": "Controlled Memory",
  "timePeriod": 300,
  "minMemory": 800,
  "maxMemory": 1000,
  "timestamp": "2025-12-14T10:30:00.000Z"
}
```

---

### 📊 Continuous Logging

Outputs CPU and memory usage metrics at specified intervals.

#### POST Request (Timed Duration)
```bash
curl -X POST http://localhost:3000/logs \
  -H "Content-Type: application/json" \
  -d '{
    "seconds": 5,
    "duration": 60
  }'
```

**Response:**
```json
{
  "type": "Continuous Logging",
  "intervalSeconds": 5,
  "totalDuration": "60.0",
  "logCount": 12,
  "completed": true,
  "timestamp": "2025-12-14T10:31:00.000Z"
}
```

#### POST Request (Indefinite)
```bash
curl -X POST http://localhost:3000/logs \
  -H "Content-Type: application/json" \
  -d '{"seconds": 5}'
```

#### GET Request (Asynchronous)
```bash
# Log every 5 seconds for 60 seconds
curl "http://localhost:3000/logs?seconds=5&duration=60"

# Log every 5 seconds indefinitely
curl "http://localhost:3000/logs?seconds=5"
```

**Log Output Example:**
```
[LOGS-1] [5.0s] CPU: 12.34% | Memory - Heap: 85.23/120.45 MB | RSS: 150.67 MB | External: 2.34 MB | Timestamp: 2025-12-14T10:30:05.000Z
```

---

## Load Testing Scenarios

### Scenario 1: Kubernetes HPA Testing
Test horizontal pod autoscaling by gradually increasing CPU load:

```bash
# Generate high CPU load to trigger HPA scale-up
for i in {1..5}; do
  curl "http://localhost:3000/cpu?seconds=30" &
done

# Monitor with: kubectl get hpa -w
```

### Scenario 2: Memory Pressure Testing
Test memory limits and OOMKill behavior:

```bash
# Push memory to upper limit
curl -X POST http://localhost:3000/memory-test \
  -H "Content-Type: application/json" \
  -d '{
    "timePeriod": 600,
    "minMemory": 10000,
    "maxMemory": 12000
  }'
```

### Scenario 3: Observability Testing
Generate continuous metrics for monitoring systems:

```bash
# Start continuous logging (monitor via logs)
curl "http://localhost:3000/logs?seconds=10" &

# Generate periodic load
while true; do
  curl "http://localhost:3000/cpu?seconds=5"
  sleep 15
done
```

---

## JMeter Configuration

### HTTP Request Sampler Settings

#### CPU Load Test
- **Method**: GET or POST
- **Path**: `/cpu`
- **Parameters** (GET):
  - `seconds`: 10
- **Body Data** (POST):
  ```json
  {"seconds": 10}
  ```

#### Memory Load Test
- **Method**: GET or POST
- **Path**: `/memory-test`
- **Parameters** (GET):
  - `timePeriod`: 30
  - `minMemory`: 100
  - `maxMemory`: 300
- **Body Data** (POST):
  ```json
  {
    "timePeriod": 30,
    "minMemory": 100,
    "maxMemory": 300
  }
  ```

### Example JMeter Test Plan
1. **Thread Group**: Configure concurrent users (e.g., 10 threads, 100 loops)
2. **HTTP Request Sampler**: Add with settings above
3. **Constant Timer**: Control request frequency (e.g., 1000ms delay)
4. **Listeners**: 
   - View Results Tree (debugging)
   - Summary Report (statistics)
   - Graph Results (visualization)

---

## Kubernetes Deployment

### Deploy to Kubernetes
```bash
# Apply deployment, service, and HPA
kubectl apply -f k8s-deployment.yaml

# Check deployment status
kubectl get deployments loadcontainer

# Check pods
kubectl get pods -l app=loadcontainer

# Check HPA status
kubectl get hpa loadcontainer-hpa

# View logs
kubectl logs -l app=loadcontainer -f
```

### Access the Service
```bash
# Get service URL (for LoadBalancer)
kubectl get service loadcontainer-service

# Port forward for local testing
kubectl port-forward svc/loadcontainer-service 3000:80

# Test health endpoint
curl http://localhost:3000/health
```

### Monitor HPA Scaling
```bash
# Watch HPA in real-time
kubectl get hpa -w

# Trigger scale-up with load
for i in {1..10}; do
  curl "http://<service-ip>/cpu?seconds=60" &
done
```

### Configuration Details

The included [k8s-deployment.yaml](k8s-deployment.yaml) includes:

- **Deployment**: 
  - Resource requests: 128Mi memory, 100m CPU
  - Resource limits: 512Mi memory, 500m CPU
  - Liveness and readiness probes on `/health`
  
- **Service**: 
  - Type: LoadBalancer
  - Exposes port 80 → container port 3000
  
- **HorizontalPodAutoscaler**:
  - Min replicas: 1, Max replicas: 10
  - CPU target: 50% utilization
  - Memory target: 70% utilization
  - Aggressive scale-up, gradual scale-down
  selector:
    app: loadcontainer
  ports:
---

## Docker Configuration

### Memory Limits
The container is configured with generous memory limits for high-capacity testing:
- **Docker Compose**: 14GB limit, 1GB reservation
- **Dockerfile**: Node.js max-old-space-size set to 12GB

### Health Checks
Docker Compose includes automatic health monitoring:
- Endpoint: `GET /health`
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3 attempts

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `production` | Node.js environment |

---

## Resource Requirements

### Docker
- **Minimum**: 128MB RAM, 0.1 CPU
- **Recommended**: 14GB RAM (for extensive memory testing)

### Kubernetes
- **Requests**: 128Mi memory, 100m CPU
- **Limits**: 512Mi memory, 500m CPU (adjust based on use case)

---

## Architecture

### Technology Stack
- **Runtime**: Node.js 18 (Alpine Linux)
- **Framework**: Express.js
- **Documentation**: Swagger/OpenAPI 3.0
- **Container**: Docker, Docker Compose

### Components
- **server.js**: Main application with Express routes
- **Dockerfile**: Multi-stage container build with Alpine base
- **docker-compose.yml**: Local development and testing setup
- **k8s-deployment.yaml**: Production Kubernetes manifests
- **package.json**: Node.js dependencies and scripts

---

## Monitoring and Observability

### Metrics Available
The `/logs` endpoint provides real-time metrics:
- **CPU Usage**: Percentage of CPU utilization
- **Heap Memory**: Used/Total heap memory in MB
- **RSS Memory**: Resident Set Size in MB
- **External Memory**: External memory usage in MB
- **Timestamps**: ISO 8601 formatted timestamps

### Integration with Monitoring Tools
- **Prometheus**: Parse log output or extend with metrics endpoint
- **Grafana**: Visualize resource usage over time
- **Kubernetes Metrics Server**: Monitors pod-level metrics
- **Application Performance Monitoring**: Integrate via log aggregation

---

## Troubleshooting

### Container Exits with OOM (Out of Memory)
```bash
# Increase memory limit in docker-compose.yml
mem_limit: 16g

# Or in Dockerfile
CMD ["node", "--max-old-space-size=16384", "server.js"]
```

### HPA Not Scaling
```bash
# Verify metrics-server is installed
kubectl get deployment metrics-server -n kube-system

# Check current metrics
kubectl top pods -l app=loadcontainer

# Verify HPA status
kubectl describe hpa loadcontainer-hpa
```

### Health Check Failing
```bash
# Check container logs
docker logs loadcontainer

# Or in Kubernetes
kubectl logs -l app=loadcontainer

# Test health endpoint manually
curl http://localhost:3000/health
```

### Port Already in Use
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"

# Or use Docker run with different port
docker run -p 3001:3000 loadcontainer:latest
```

---

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The server will start on http://localhost:3000
```

### Build and Push to Registry
```bash
# Build image
docker build -t migsperez/loadcontainer:latest .

# Tag with version
docker tag migsperez/loadcontainer:latest migsperez/loadcontainer:v1.0.0

# Push to Docker Hub
docker push migsperez/loadcontainer:latest
docker push migsperez/loadcontainer:v1.0.0
```

---

## API Response Types

### POST vs GET Methods
- **POST**: Synchronous - waits for test completion before responding
- **GET**: Asynchronous - starts test in background and returns immediately

Choose based on your use case:
- Use **POST** for controlled testing with result validation
- Use **GET** for high-throughput load generation with JMeter/artillery

---

## Contributing

Contributions are welcome! Please ensure:
1. Code follows existing style and structure
2. API endpoints include Swagger documentation
3. Dockerfile and k8s manifests are updated if needed
4. README is updated with new features

---

## License

ISC

---

## Author

Platform Operations Team

---

## Version History

- **v1.0.0**: Initial release with CPU, memory testing, and continuous logging
