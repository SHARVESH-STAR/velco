# Velco Platform 🚀

Velco is a premium, high-performance and delivery platform featuring a universal mobile/web frontend and a fast Node/Bun API backend. The codebase is organized as a monorepo containing the following components:

- **Client**: Universal Expo & React Native mobile and web application.
- **Server**: Fast Express.js API backend running on the Bun runtime.

---

## 📂 Project Structure

```
velco/
├── client/          # Expo & React Native Frontend App
│   ├── src/
│   │   ├── app/     # File-based routing layout & screens
│   │   ├── ui/      # Role-specific dashboard views (Admin, Client, Delivery)
│   │   └── components/
│   └── assets/      # Static media & style assets
└── server/          # Express API Backend (TypeScript + Bun)
    ├── src/
    │   ├── controllers/  # Route controller handlers
    │   ├── models/       # Mongoose (MongoDB) database schemas
    │   ├── routes/       # Express route definitions (/admin, /client, /delivery)
    │   └── middleware/   # Authentication, rate limiting, and uploads
    └── uploads/          # Client uploaded parcel package files
```

---

## 🛠️ Tech Stack

### Frontend (Client)
* **Core**: React Native, Expo SDK
* **Navigation**: Expo Router (File-based Routing)
* **Styling**: Theme-provider styled components with light and dark mode supports
* **Animations**: React Native Reanimated (Elastic transitions, continuous glow loops, custom swipe gestures)

### Backend (Server)
* **Runtime**: [Bun](https://bun.sh/) (Fast all-in-one JavaScript runtime)
* **Framework**: Express.js
* **Database**: MongoDB via Mongoose
* **Authentication**: JSON Web Tokens (JWT) + bcrypt-ts password hashing
* **File Uploads**: Multer middleware storing package images

---

## 🚀 Getting Started

Ensure you have [Bun](https://bun.sh/) installed locally.

### 1. Server Setup
Navigate to the `server/` directory:
```bash
cd server
```

Install the dependencies:
```bash
bun install
```

Configure your environment variables inside a `.env` file matching [config.ts](file:///C:/Users/MundaneMan/Desktop/Projects/velco/server/src/config.ts):
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:8081
```

Start the backend server in development watch mode:
```bash
bun run dev
```

### 2. Client Setup
Navigate to the `client/` directory:
```bash
cd ../client
```

Install the dependencies:
```bash
bun install
```

Start the Expo development server:
```bash
bun start
```

Use the terminal shortcuts to load the application:
* Press `w` to open the web browser preview.
* Press `a` to open in an Android Emulator.
* Press `i` to open in an iOS Simulator.

---

## 🛡️ API Routes Overview

* **`/admin`**: Routes for login (`POST /login`), listing clients (`GET /client`), searching clients (`GET /search`), order retrieval (`GET /orders`), deletion (`DELETE /orders/:id`), and driver assignment (`PUT /orders/:id/assign`).
* **`/client`**: Routes for creating orders with package image uploads (`POST /orders`), listing order histories (`GET /orders`), and direct image uploading (`POST /upload`).
* **`/delivery`**: Routes for viewing assigned delivery tasks (`GET /jobs`) and updating current order delivery states (`PUT /jobs/:id/status`).
