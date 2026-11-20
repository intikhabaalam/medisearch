# MediTrust

### AI-Powered Prescription & Healthcare Management Platform

MediTrust is a full-stack healthcare platform designed to bring essential healthcare services together in one place. It helps patients manage prescriptions, explore medicines, connect with doctors, access diagnostic services, and get AI-assisted health information through a unified digital experience.

The platform combines modern web technologies with AI integration to simplify healthcare-related activities and improve accessibility.

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [User Roles](#user-roles)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [AI Integration Flow](#ai-integration-flow)
- [Database Design](#database-design)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Future Improvements](#future-improvements)
- [Disclaimer](#disclaimer)

---

## Overview

Healthcare services are often spread across different platforms, making it difficult for patients to manage prescriptions, find medicines, schedule doctor consultations, and access laboratory services.

MediTrust aims to simplify these activities through a centralized healthcare platform.

Users can upload prescriptions, access AI-assisted prescription information, explore available medicines, connect with doctors, and discover diagnostic services without switching between multiple applications.

**Platform Workflow:**

Upload Prescription → Review Medicine Details → Explore Medicines → Book Doctor Appointments → Access Lab Services → Get AI-Assisted Information.

---

## Core Features

### 1. AI-Powered Prescription Processing

- Upload prescription images through the platform.
- Use Google Gemini API for AI-assisted prescription extraction.
- Extract medicine-related information from uploaded images.
- Display extracted information in a structured format.
- Allow users to review AI-generated results.

### 2. Medicine Management

- Browse and search medicines.
- View medicine information and availability.
- Explore alternative medicine brands where supported.
- Manage medicine inventory through the admin panel.
- Manage product information and images.

### 3. Doctor Appointment Management

- Browse registered doctors.
- Explore doctors based on specialization.
- Submit requests to register as a doctor.
- Admin approval and verification workflow.
- Allow doctors to manage their profiles.
- Manage patient appointment requests.

### 4. Pathology & Laboratory Management

- Explore available pathology services.
- Register laboratories on the platform.
- Admin verification of laboratory registrations.
- Manage diagnostic test information.
- Provide access to available laboratory services.

### 5. AI Health Assistant

- AI-assisted health-related conversations.
- Gemini API integration.
- Designed for general informational assistance.
- Provides basic health-related guidance.
- Encourages professional consultation for medical concerns.

### 6. Authentication & Authorization

- User registration and login.
- JWT-based authentication.
- Protected application routes.
- Role-based access control.
- Separate access permissions for different user roles.

### 7. Admin Dashboard

- Manage registered users.
- Manage medicine products.
- Review doctor registration requests.
- Verify pathology registrations.
- Approve or reject verification requests.
- Monitor platform data and activities.

---

## User Roles

| Role | Responsibilities |
|---|---|
| Patient | Upload prescriptions, explore medicines, book appointments and access healthcare services. |
| Doctor | Manage professional profile and handle patient appointments. |
| Pathologist | Manage laboratory information and diagnostic services. |
| Admin | Manage users, products, verification requests and platform operations. |

---

## Technology Stack

### Frontend

- React.js
- Vite
- Redux Toolkit
- TanStack Query
- Tailwind CSS
- Axios
- React Router

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- REST APIs

### AI & Cloud Services

- Google Gemini API
- Cloudinary

### Development Tools

- Git
- GitHub
- Postman
- VS Code

---

## System Architecture

MediTrust follows a client-server architecture where the frontend communicates with the backend through REST APIs. The backend manages business logic, authentication, database operations, and external service integrations.

```text
             ┌──────────────────┐
             │   React Frontend │
             │      (Vite)      │
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │    REST APIs     │
             │  Express Server  │
             └────────┬─────────┘
                      │
          ┌───────────┼────────────┐
          │           │            │
          ▼           ▼            ▼
      MongoDB     Gemini API   Cloudinary
      Database     AI Service  Image Storage
```

### Request Flow

1. Users interact with the React application.
2. Frontend sends API requests using Axios.
3. Express routes handle incoming requests.
4. Middleware manages authentication and authorization.
5. Controllers process application logic.
6. Mongoose communicates with MongoDB.
7. External services handle supported AI and image-processing operations.
8. API responses are returned to the frontend.

---

## AI Integration Flow

MediTrust uses the Google Gemini API to support AI-powered healthcare functionality.

### Prescription Processing

```text
1. User uploads a prescription image
                 |
                 ▼
2. Image is processed by the backend
                 |
                 ▼
3. Prescription data is sent to Gemini API
                 |
                 ▼
4. AI extracts medicine-related information
                 |
                 ▼
5. Structured response is returned
                 |
                 ▼
6. Extracted details are displayed
   for user review
```

### AI Health Assistant

```text
User Message
     |
     ▼
Backend API
     |
     ▼
Gemini API
     |
     ▼
AI Generated Response
     |
     ▼
Frontend Chat Interface
```

**Important:** AI-generated information is intended for general assistance only. It should not replace professional medical advice, diagnosis, or treatment.

---

## Database Design

MediTrust uses MongoDB with Mongoose to manage application data.

Key data entities include:

| Collection / Model | Purpose |
|---|---|
| User | Stores user accounts and authentication information. |
| Doctor | Stores doctor profiles and professional details. |
| Pathologist | Stores laboratory and pathology information. |
| Product | Manages medicine and product information. |
| Order | Stores medicine order details. |
| DoctorAppointment | Manages doctor appointment records. |
| Test | Stores diagnostic test information. |
| Prescription | Manages uploaded prescription information, where implemented. |

The database structure supports relationships between users, doctors, laboratories, products, and healthcare activities.

---

## Project Structure

```text
MediTrust/
│
├── client/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── redux/
│       ├── hooks/
│       ├── services/
│       └── ...
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── ...
│
└── README.md
```

---

## Getting Started

### Prerequisites

Make sure the following tools are installed:

- Node.js
- npm
- MongoDB
- Git

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd MediTrust
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../client
npm install
```

### 4. Configure Environment Variables

Create the required `.env` files in the appropriate directories.

### 5. Start the Backend

```bash
cd server
npm run dev
```

### 6. Start the Frontend

Open another terminal:

```bash
cd client
npm run dev
```

Open the local URL displayed by Vite to access the application.

---

## Environment Variables

### Server Configuration

Create `server/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Client Configuration

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Use the exact variable names configured in the application. Never upload actual API keys, passwords, or secrets to GitHub.

---

## Future Improvements

- Online payment integration.
- Medicine order tracking.
- Enhanced appointment scheduling.
- Improved AI prescription extraction.
- Additional healthcare service integrations.
- Better notification and communication features.
- Improved mobile responsiveness.

---

## Disclaimer

MediTrust is an educational and demonstration project. It is not a certified medical application and should not be used as a replacement for professional medical diagnosis, treatment, or advice.

AI-generated prescription details and health-related responses may contain inaccuracies. Always consult a qualified healthcare professional before making medical decisions.

---

## Project Goal

MediTrust aims to create a connected digital healthcare experience by combining prescription management, medicine discovery, doctor appointments, laboratory services, and AI-assisted support within a single platform.

**MediTrust — Healthcare, Connected.**