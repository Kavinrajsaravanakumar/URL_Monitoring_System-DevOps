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
