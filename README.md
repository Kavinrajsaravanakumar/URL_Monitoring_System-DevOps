# 🌐 URL Monitoring Dashboard

A production-ready, Dockerized URL monitoring system built with **Node.js**, **Express**, **MongoDB**, and **Bootstrap 5**.

Monitor website availability in real-time with a beautiful, auto-refreshing dashboard.

![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)

---

## ✨ Features

- **Real-time monitoring** — Checks all URLs every 1 minute
- **Professional dashboard** — Bootstrap 5 with glassmorphism dark theme
- **Auto-refresh** — Dashboard updates every 30 seconds
- **Status tracking** — ONLINE/OFFLINE with color-coded badges
- **Response times** — Measures and displays latency in milliseconds
- **Check history** — View the last 50 checks for any website
- **Search & filter** — Instantly filter websites by name or URL
- **REST API** — Full CRUD API for programmatic access
- **Dockerized** — One command to start everything
- **Logging** — Console logging with emoji indicators

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) & Docker Compose installed

### Run with Docker

```bash
# Clone the repository
git clone <your-repo-url>
cd URLMS

# Start the application
docker-compose up -d

# View logs
docker-compose logs -f app
```

The dashboard will be available at **http://localhost:3000**

### Stop the Application

```bash
docker-compose down
```

### Stop and remove data

```bash
docker-compose down -v
```

---

## 🛠️ Run Locally (without Docker)

### Prerequisites

- Node.js 18+
- MongoDB running locally

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start the application
npm start
```

---

## 📡 API Endpoints

| Method   | Endpoint                      | Description                    |
| -------- | ----------------------------- | ------------------------------ |
| `GET`    | `/api/websites`               | Get all monitored websites     |
| `POST`   | `/api/websites`               | Add a new website              |
| `DELETE` | `/api/websites/:id`           | Remove a website               |
| `GET`    | `/api/websites/:id/history`   | Get check history (last 50)    |
| `GET`    | `/api/stats`                  | Get dashboard statistics       |
| `GET`    | `/health`                     | Health check endpoint          |

### Example: Add a Website

```bash
curl -X POST http://localhost:3000/api/websites \
  -H "Content-Type: application/json" \
  -d '{"name": "Google", "url": "https://google.com"}'
```

### Example: Get All Websites

```bash
curl http://localhost:3000/api/websites
```

---

## 📁 Project Structure

```
URLMS/
├── config/
│   └── db.js              # MongoDB connection
├── models/
│   ├── Website.js          # Website schema
│   └── CheckHistory.js     # Check history schema
├── routes/
│   └── api.js              # REST API routes
├── services/
│   └── monitor.js          # URL checking & cron scheduler
├── public/
│   ├── index.html          # Dashboard page
│   ├── css/style.css       # Custom styles
│   └── js/app.js           # Frontend JavaScript
├── server.js               # Express entry point
├── package.json
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## ⚙️ Environment Variables

| Variable        | Default                               | Description                     |
| --------------- | ------------------------------------- | ------------------------------- |
| `PORT`          | `3000`                                | Server port                     |
| `MONGO_URI`     | `mongodb://localhost:27017/urlmonitor` | MongoDB connection string       |
| `CRON_SCHEDULE` | `* * * * *`                           | Cron schedule (every 1 minute)  |
| `CHECK_TIMEOUT` | `10000`                               | Axios timeout in milliseconds   |

---

## 🧰 Tech Stack

| Technology   | Purpose                |
| ------------ | ---------------------- |
| Node.js      | Runtime                |
| Express      | Web framework          |
| MongoDB      | Database               |
| Mongoose     | ODM for MongoDB        |
| Axios        | HTTP client for checks |
| node-cron    | Task scheduler         |
| Bootstrap 5  | UI framework           |
| Docker       | Containerization       |

---

## 📝 License

MIT

# URL Monitoring System with Cloud & DevOps Integration

## Project Overview

The URL Monitoring System is a web application that continuously monitors website availability and performance. Users can add URLs through a dashboard, and the system periodically checks their status, response time, and uptime information.

## Technologies Used

### Application Layer

* Node.js
* Express.js
* MongoDB Atlas
* HTML/CSS/JavaScript

### DevOps & Cloud

* GitHub (Source Control)
* Docker (Containerization)
* Jenkins (CI/CD Automation)
* Docker Hub (Container Registry)
* Kubernetes K3s (Container Orchestration)
* AWS EC2 (Cloud Infrastructure)

## Architecture

GitHub → Jenkins → Docker Build → Docker Hub → Kubernetes (K3s) → MongoDB Atlas

## Implementation

### Phase 1: Application Development

* Developed a URL monitoring dashboard.
* Implemented periodic URL health checks.
* Stored monitoring data in MongoDB Atlas.

### Phase 2: Containerization

* Created a Dockerfile for the application.
* Built and tested Docker images locally.
* Connected the containerized application to MongoDB Atlas.

### Phase 3: Cloud Deployment

* Provisioned an AWS EC2 instance.
* Deployed the Dockerized application on EC2.
* Configured networking and security groups.

### Phase 4: CI/CD Pipeline

* Installed and configured Jenkins.
* Connected Jenkins with GitHub repository.
* Configured GitHub Webhooks for automatic build triggering.

### Phase 5: Container Registry Integration

* Pushed Docker images to Docker Hub.
* Maintained versioned application images for deployment.

### Phase 6: Kubernetes Deployment

* Installed K3s Kubernetes cluster on EC2.
* Created Kubernetes manifests:

  * Deployment
  * Service
  * ConfigMap
  * Secret
* Deployed multiple application replicas.
* Exposed the application through a NodePort service.

## Key Features

* Automated website monitoring.
* Cloud-hosted MongoDB database.
* Docker-based deployment.
* Automated CI/CD pipeline using Jenkins.
* Kubernetes orchestration with multiple replicas.
* Cloud deployment on AWS EC2.
* Scalable and production-oriented architecture.

## Outcome

Successfully implemented a complete Cloud and DevOps workflow where code changes pushed to GitHub trigger Jenkins pipelines, build Docker images, and support deployment through Kubernetes while using MongoDB Atlas as the cloud database.
