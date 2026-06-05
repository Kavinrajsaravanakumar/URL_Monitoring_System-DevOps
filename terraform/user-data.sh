#!/bin/bash
set -e

# URLMS EC2 Initialization Script
# Installs Docker, K3s, and deploys the Node.js Express application
# Authentication: EC2 IAM Instance Profile (no static credentials)

LOG_FILE="/var/log/urlms-init.log"
exec > >(tee -a $LOG_FILE)
exec 2>&1

echo "========================================"
echo "URLMS EC2 Initialization Started"
echo "========================================"

# System variables (injected by Terraform templatefile)
ENVIRONMENT="${environment}"
AWS_REGION="${region}"
DYNAMODB_URLS_TABLE="${dynamodb_urls_table}"
DYNAMODB_RESULTS_TABLE="${dynamodb_results_table}"
SNS_TOPIC_ARN="${sns_topic_arn}"
DOCKER_IMAGE="${docker_image}"
REPO_URL="${repo_url}"

# Update system
echo "[1/7] Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required tools (no invalid packages)
echo "[2/7] Installing system dependencies..."
apt-get install -y \
  curl \
  wget \
  git \
  jq \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release \
  awscli

# Install Docker
echo "[3/7] Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu
rm get-docker.sh

# Install K3s (Lightweight Kubernetes)
echo "[4/7] Installing K3s..."
curl -sfL https://get.k3s.io | sh -

# Wait for K3s to be fully ready (proper readiness check)
echo "Waiting for K3s to be ready..."
RETRIES=30
until kubectl get nodes --no-headers 2>/dev/null | grep -q " Ready"; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo "ERROR: K3s did not become ready in time"
    exit 1
  fi
  echo "  K3s not ready yet, retrying in 5s... ($RETRIES retries left)"
  sleep 5
done
echo "K3s is ready."

# Copy kubeconfig for ubuntu user
mkdir -p /home/ubuntu/.kube
cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
chown -R ubuntu:ubuntu /home/ubuntu/.kube
chmod 600 /home/ubuntu/.kube/config

# Clone URLMS repository
echo "[5/7] Cloning URLMS repository..."
cd /opt
git clone "$REPO_URL" URLMS || echo "Warning: Clone failed or repo already exists"
cd URLMS

# Pull Docker image from registry (no local builds)
echo "[6/7] Pulling Docker image..."
docker pull "$DOCKER_IMAGE"

# Create Kubernetes namespace
kubectl create namespace urlms || true

# Create ConfigMap (all configuration — no secrets needed with IAM role auth)
kubectl create configmap urlms-config \
  --from-literal=DYNAMODB_TABLE_URLS="$DYNAMODB_URLS_TABLE" \
  --from-literal=DYNAMODB_TABLE_RESULTS="$DYNAMODB_RESULTS_TABLE" \
  --from-literal=AWS_REGION="$AWS_REGION" \
  --from-literal=SNS_TOPIC_ARN="$SNS_TOPIC_ARN" \
  --from-literal=PORT=3000 \
  --from-literal=CRON_SCHEDULE="* * * * *" \
  --from-literal=CHECK_TIMEOUT=10000 \
  -n urlms || true

# Deploy to K3s
echo "[7/7] Deploying application to K3s..."
cat > /tmp/urlms-deployment.yaml << YAML_EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: urlms-app
  namespace: urlms
  labels:
    app: urlms
spec:
  replicas: 1
  selector:
    matchLabels:
      app: urlms
  template:
    metadata:
      labels:
        app: urlms
    spec:
      containers:
      - name: urlms
        image: $DOCKER_IMAGE
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: AWS_REGION
          valueFrom:
            configMapKeyRef:
              name: urlms-config
              key: AWS_REGION
        - name: DYNAMODB_TABLE_URLS
          valueFrom:
            configMapKeyRef:
              name: urlms-config
              key: DYNAMODB_TABLE_URLS
        - name: DYNAMODB_TABLE_RESULTS
          valueFrom:
            configMapKeyRef:
              name: urlms-config
              key: DYNAMODB_TABLE_RESULTS
        - name: SNS_TOPIC_ARN
          valueFrom:
            configMapKeyRef:
              name: urlms-config
              key: SNS_TOPIC_ARN
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: urlms-config
              key: PORT
        - name: CRON_SCHEDULE
          valueFrom:
            configMapKeyRef:
              name: urlms-config
              key: CRON_SCHEDULE
        - name: CHECK_TIMEOUT
          valueFrom:
            configMapKeyRef:
              name: urlms-config
              key: CHECK_TIMEOUT
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: urlms-service
  namespace: urlms
  labels:
    app: urlms
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    nodePort: 30080
  selector:
    app: urlms
YAML_EOF

# Apply Kubernetes manifests
kubectl apply -f /tmp/urlms-deployment.yaml

# Wait for pod to be ready (proper readiness check)
echo "Waiting for application pod to be ready..."
kubectl wait --for=condition=ready pod -l app=urlms -n urlms --timeout=120s || echo "Warning: Pod readiness timeout"

# Send completion notification via IAM role (no explicit credentials)
aws sns publish \
  --topic-arn "$SNS_TOPIC_ARN" \
  --subject "URLMS EC2 Initialization Complete" \
  --message "Your URLMS application has been successfully deployed on EC2 in $ENVIRONMENT environment." \
  --region "$AWS_REGION" || echo "Warning: SNS notification failed"

# Log completion
echo "========================================"
echo "URLMS EC2 Initialization Completed"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Docker Image: $DOCKER_IMAGE"
echo "DynamoDB Tables: $DYNAMODB_URLS_TABLE, $DYNAMODB_RESULTS_TABLE"
echo "SNS Topic: $SNS_TOPIC_ARN"
echo "Application: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):30080"
echo "========================================"
