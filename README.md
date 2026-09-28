# MockupStore

MockupStore is a premium digital mockup platform for designers and creative agencies. It offers a visually striking experience for purchasing mockup jerseys, featuring intuitive navigation and a streamlined checkout process.

## Features

- **Modern Design:** Built with React and styled with Tailwind CSS for a highly responsive, premium feel.
- **Product Showcase:** View different categories of digital mockups (Apparel, Packaging, Devices, Print).
- **Shopping Cart:** Add items, view your cart, and proceed to checkout.
- **Payment Integration:** 
  - Integrated Lemon Squeezy for secure card payments.
  - Custom mock KHQR payment handling logic.
- **Backend API:** Built-in Express.js and SQLite backend to process and store orders.
- **User Authentication:** Sign in with Google (Firebase Auth) to track your order history.
- **Dark & Light Mode:** Toggle themes for a better viewing experience.

## Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript

### Backend
- **Framework:** Express.js (Node.js)
- **Database:** SQLite
- **Payments:** Lemon Squeezy & Stripe

## Running Locally

### Prerequisites
- Node.js (v18 or higher recommended)
- `npm` or `pnpm`

### 1. Install Dependencies
In the root directory, install the frontend dependencies:
```bash
npm install
```
Then, install the backend dependencies:
```bash
cd server
npm install
```

### 2. Configure Environment Variables
Inside the `server/` directory, create a `.env` file and add your secrets:
```env
LEMON_SQUEEZY_API_KEY=your_api_key
LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### 3. Start the Application
You can run both the frontend and backend servers.

**Start the Backend Server (Port 3004):**
```bash
cd server
node server.js
```

**Start the Frontend Server:**
```bash
npm run dev
```

Your app will be available at [http://localhost:8443](http://localhost:8443) (or the port specified in your console).

## Deployment

This project is configured for deployment on **Vercel**. 
When deploying, make sure to add the Environment Variables in the Vercel project settings:
- `LEMON_SQUEEZY_API_KEY`
- `LEMON_SQUEEZY_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`

Enjoy building your digital mockup store!
