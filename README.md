# Indiano Cafe Web Project

This project is a web application for "Indiano Cafe" featuring a menu, about section, and an integrated AI chatbot. It also includes user authentication (signup and login) with a backend powered by Node.js and SQLite.

## Features

- **Responsive Design:** Optimized for various screen sizes.
- **Cafe Sections:** Home, About Us, Menu (Popular Items).
- **Interactive Chatbot:** An AI-powered chatbot for customer inquiries.
- **User Authentication:** Secure signup and login functionality.
- **SQLite Database:** Stores user information securely.

## Technologies Used

- **Frontend:** HTML5, CSS3, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** SQLite
- **Authentication:** `bcryptjs` for password hashing
- **External Libraries:** Font Awesome (for icons)

## Setup and Installation

Follow these steps to set up and run the project locally.

### 1. Clone the Repository

```bash
git clone <repository_url>
cd "Indiano Cafe project"
```

### 2. Backend Setup (Node.js Server)

Navigate to the `Indiano cafe/server` directory and install the Node.js dependencies.

```bash
cd "Indiano cafe/server"
npm install
```

### 3. Start the Backend Server

From the `Indiano cafe/server` directory, start the server:

```bash
node index.js
```
The server will run on `http://localhost:3000`. It will automatically create `database.sqlite` and the `users` table if they don't exist.

### 4. Frontend Setup

The frontend is located in the `Indiano cafe` directory. No specific installation is required, as it uses plain HTML, CSS, and JavaScript.

### 5. Open the Frontend

Open the `Indiano cafe/index.html` file in your web browser.

Alternatively, you can use a local development server (e.g., Live Server VS Code extension) to serve the `Indiano cafe` directory.

## Usage

- **Browse the Cafe:** Navigate through the Home, About, and Menu sections.
- **Chat with AI:** Click the floating chatbot button to open the AI assistant.
- **User Authentication:**
    - Click the "Login" link in the navbar to open the authentication modal.
    - Use the "Sign Up" tab to create a new account.
    - Use the "Login" tab to access your account.

## Project Structure

```
.
├── Indiano cafe/
│   ├── chatbot.js
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   ├── images/
│   └── server/
│       ├── controllers/
│       │   └── authController.js
│       ├── models/
│       │   └── user.js
│       ├── node_modules/ # Node.js dependencies
│       ├── routes/
│       │   └── auth.js
│       ├── database.js
│       └── index.js       # Backend entry point
├── README.md
├── gemini.md (to be created)
└── .gitignore
```
