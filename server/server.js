require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// Middleware
app.use(cors());
const crypto = require('crypto');

// Webhook route must use raw body parser for signature verification BEFORE express.json()
app.post('/api/webhooks/payment', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const signatureHeader = req.headers['x-signature'];
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '';

    // Verify signature
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
    const signature = Buffer.from(signatureHeader || '', 'utf8');

    if (digest.length !== signature.length || !crypto.timingSafeEqual(digest, signature)) {
      console.error("❌ Webhook Signature Invalid");
      return res.status(403).send('Invalid signature');
    }

    const payload = JSON.parse(req.body.toString());
    const eventName = payload?.meta?.event_name;

    if (eventName === 'order_created') {
      const order = payload.data.attributes;
      const customerEmail = order.user_email;
      const totalAmount = order.total / 100;
      const orderNumber = order.identifier || 'LS-' + Math.floor(Math.random() * 90000);
      
      console.log(`✅ [WEBHOOK] ទទួលបានការទូទាត់ប្រាក់ពី: ${customerEmail} ចំនួន $${totalAmount}`);
      
      // Save order to Database
      db.run(
        `INSERT INTO orders (orderNumber, totalAmount, paymentMethod, paymentStatus, itemsData, userEmail) VALUES (?, ?, ?, ?, ?, ?)`,
        [orderNumber, totalAmount, 'card', 'success', JSON.stringify([{ product: { name: 'Mockup Item' }, quantity: 1 }]), customerEmail],
        function(err) {
          if (err) console.error("❌ Database Insert Error (Webhook):", err.message);
          else console.log(`✅ Order ${orderNumber} saved via Webhook`);
        }
      );
    }

    res.status(200).send('Webhook received successfully');
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    res.status(500).send('Webhook error');
  }
});

// For all other routes, parse JSON bodies
app.use(express.json());

/**
 * Endpoint to create a checkout session
 * In a real-world scenario, you would call the Bakong / ABA PayWay API here.
 */
app.post('/api/checkout', (req, res) => {
  const { items, total, paymentMethod, userEmail } = req.body;

  console.log(`Processing ${paymentMethod} payment for total: $${total}`);

  try {
    // FAKE PAYMENT GENERATION FOR DEMONSTRATION
    // -----------------------------------------
    // If it's KHQR, you normally get a KHQR string from the Bank API
    // Here we generate a mock string or return a mock QR link
    let responseData = {
      orderId: 'ORD-' + Math.floor(Math.random() * 90000 + 10000),
      totalAmount: total,
      paymentMethod: paymentMethod,
    };

    if (paymentMethod === 'khqr') {
      responseData.khqrString = "00020101021238590010A00000072701270006499999123456... (MOCK KHQR STRING)";
      responseData.paymentStatus = "pending";
    } else {
      // For credit cards, normally you return a payment link or process directly
      responseData.paymentUrl = "https://example-bank.com/pay?hash=mock123";
      responseData.paymentStatus = "success"; // Mocking instant success for cards
    }

    // Simulate network delay and save to DB
    setTimeout(() => {
      // រក្សាទុកការបញ្ជាទិញចូលក្នុង Database
      db.run(
        `INSERT INTO orders (orderNumber, totalAmount, paymentMethod, paymentStatus, itemsData, userEmail) VALUES (?, ?, ?, ?, ?, ?)`,
        [responseData.orderId, total, paymentMethod, responseData.paymentStatus, JSON.stringify(items), userEmail || ''],
        function(err) {
          if (err) {
            console.error("❌ Database Insert Error:", err.message);
          } else {
            console.log(`✅ Order ${responseData.orderId} saved to database with ID ${this.lastID}`);
          }
        }
      );

      res.json({ success: true, data: responseData });
    }, 1500);

  } catch (error) {
    console.error("Payment API Error:", error);
    res.status(500).json({ success: false, message: "Payment creation failed" });
  }
});

/**
 * Endpoint to create a Real Stripe Checkout Session
 */
app.post('/api/create-stripe-session', async (req, res) => {
  try {
    const { items, paymentMethod, userEmail } = req.body;
    
    // Map cart items to Stripe line items
    const lineItems = items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product.name,
          description: `Format: ${item.size}`,
        },
        unit_amount: Math.round(item.product.price * 100), // Stripe uses cents
      },
      quantity: item.quantity,
    }));

    const orderId = 'ORD-' + Math.floor(Math.random() * 90000 + 10000);
    const totalAmount = lineItems.reduce((acc, item) => acc + (item.price_data.unit_amount * item.quantity), 0) / 100;

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `http://localhost:8443/?success=true&order_id=${orderId}`,
      cancel_url: 'http://localhost:8443/?canceled=true',
    });

    // Save preliminary order to DB
    db.run(
      `INSERT INTO orders (orderNumber, totalAmount, paymentMethod, paymentStatus, itemsData, userEmail) VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, totalAmount, paymentMethod, 'success', JSON.stringify(items), userEmail || ''],
      function(err) {
        if (err) console.error("❌ Database Insert Error (Stripe):", err.message);
      }
    );

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Endpoint to fetch Order History by email
 */
app.get('/api/orders', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, message: "Email required" });

  db.all(`SELECT * FROM orders WHERE userEmail = ? ORDER BY createdAt DESC`, [email], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "DB Error" });
    }
    res.json({ success: true, orders: rows });
  });
});

// Old webhook block removed because it's moved above express.json()

/**
 * Endpoint ឧទាហរណ៍ សម្រាប់បង្កើត Session/Transaction ជាមួយ Lemon Squeezy តាមរយៈ Backend (API Route)
 * បើអ្នកចង់បង្កើត Checkout Link Dynamic
 */
app.post('/api/checkout-lemon', async (req, res) => {
  try {
    const { items, userEmail } = req.body;
    const API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
    // Note: Store ID and Variant ID must be provided via env vars in Vercel
    const STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;
    const VARIANT_ID = process.env.LEMON_SQUEEZY_VARIANT_ID;

    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: userEmail,
              custom: { userEmail } // ផ្ញើ Data ទៅ Webhook វិញ
            }
          },
          relationships: {
            store: { data: { type: "stores", id: STORE_ID } },
            variant: { data: { type: "variants", id: VARIANT_ID } }
          }
        }
      })
    });

    const result = await response.json();
    if (result.data) {
      res.json({ success: true, url: result.data.attributes.url });
    } else {
      res.status(400).json({ success: false, message: "បរាជ័យក្នុងការបង្កើត Checkout" });
    }
  } catch (error) {
    console.error("API Checkout Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Cookie Auth Middleware for Admin Panel
 */
function requireAuth(req, res, next) {
  // Allow login route to bypass auth
  if (req.path === '/login') return next();
  
  const cookie = req.headers.cookie || '';
  if (cookie.includes('admin_auth=true')) {
    return next();
  }
  res.redirect('/admin/login');
}

app.use('/admin', requireAuth);

app.get('/admin/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Login - MockupStore</title>
      <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style type="text/tailwindcss">
        @theme {
          --color-primary: #ff3000;
          --color-accent: #ecff00;
        }
      </style>
      <style>
        body { 
          font-family: 'Outfit', sans-serif; 
          background: #000;
          color: white;
          overflow: hidden;
        }
        
        /* Animated Background Gradients */
        .orb-1, .orb-2 {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          animation: float 20s infinite ease-in-out alternate;
          z-index: -1;
        }
        .orb-1 {
          background: #ff3000;
          width: 50vw; height: 50vw;
          top: -25vw; left: -25vw;
        }
        .orb-2 {
          background: #ecff00;
          width: 40vw; height: 40vw;
          bottom: -20vw; right: -20vw;
          animation-delay: -10s;
        }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(10%, 15%) scale(1.1); }
          100% { transform: translate(-10%, -10%) scale(0.9); }
        }

        /* Premium Glass Container */
        .glass-panel {
          background: rgba(15, 15, 15, 0.4);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        /* Custom Inputs */
        .input-group { position: relative; }
        .input-field {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .input-field:focus {
          border-color: #ff3000;
          box-shadow: 0 0 0 4px rgba(255, 48, 0, 0.15);
          outline: none;
          background: rgba(0, 0, 0, 0.8);
        }
        .input-label {
          position: absolute;
          left: 1rem; top: 1rem;
          color: #666;
          transition: all 0.2s;
          pointer-events: none;
          font-weight: 500;
          font-size: 1rem;
        }
        .input-field:focus ~ .input-label,
        .input-field:not(:placeholder-shown) ~ .input-label {
          transform: translateY(-0.65rem) scale(0.75);
          transform-origin: left top;
          color: #ff3000;
        }

        /* Magic Button */
        .magic-btn {
          position: relative;
          background: #ff3000;
          color: #fff;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid transparent;
        }
        .magic-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }
        .magic-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(255, 48, 0, 0.3);
          background: #ff451a;
        }
        .magic-btn:hover::before { left: 100%; }
        
        .magic-btn:active { transform: translateY(0); }
      </style>
    </head>
    <body class="min-h-screen flex items-center justify-center p-4">
      
      <!-- Ambient Orbs -->
      <div class="orb-1"></div>
      <div class="orb-2"></div>
      
      <!-- Main Container -->
      <div class="glass-panel p-10 md:p-14 rounded-4xl w-full max-w-md mx-auto relative z-10 animate-[fadeIn_0.6s_ease-out]">
        
        <!-- Header -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-[#991b00] mb-6 shadow-[0_0_30px_rgba(255,48,0,0.4)]">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
          </div>
          <h1 class="text-4xl font-black uppercase tracking-tight text-white mb-2">
            Admin <span class="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">Portal</span>
          </h1>
          <p class="text-gray-400 text-sm font-medium">Authenticate to access MockupStore HQ</p>
        </div>

        <!-- Form -->
        <form id="loginForm" class="space-y-6">
          <div class="input-group">
            <input type="text" id="username" class="input-field w-full px-4 pt-6 pb-2 rounded-xl text-lg" placeholder=" " required>
            <label class="input-label">Username</label>
          </div>
          
          <div class="input-group">
            <input type="password" id="password" class="input-field w-full px-4 pt-6 pb-2 rounded-xl text-lg" placeholder=" " required>
            <label class="input-label">Password</label>
          </div>
          
          <div id="errorMsg" class="hidden text-primary text-sm font-semibold text-center bg-primary/10 py-3 rounded-xl border border-primary/20 backdrop-blur-md"></div>

          <button type="submit" class="magic-btn w-full mt-2 font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3">
            <span>Authorize Access</span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </form>

        <div class="mt-8 text-center">
          <p class="text-[#666] text-xs uppercase tracking-widest font-semibold">Secure Connection • 256-Bit</p>
        </div>
      </div>

      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const u = document.getElementById('username').value;
          const p = document.getElementById('password').value;
          const err = document.getElementById('errorMsg');
          const btn = document.querySelector('.magic-btn span');
          
          btn.textContent = 'Authenticating...';
          
          try {
            const res = await fetch('/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            
            if (data.success) {
              btn.textContent = 'Access Granted!';
              document.querySelector('.magic-btn').style.background = '#ecff00';
              document.querySelector('.magic-btn').style.color = '#000';
              setTimeout(() => { window.location.href = '/admin'; }, 600);
            } else {
              err.textContent = data.message;
              err.classList.remove('hidden');
              btn.textContent = 'Authorize Access';
            }
          } catch (e) {
            err.textContent = 'Connection error';
            err.classList.remove('hidden');
            btn.textContent = 'Authorize Access';
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '123') {
    res.setHeader('Set-Cookie', 'admin_auth=true; Path=/admin; HttpOnly');
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials. Try admin / 123' });
  }
});

/**
 * Admin Panel to view orders easily
 */
app.get('/admin', (req, res) => {
  db.all(`SELECT * FROM orders ORDER BY id DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).send("Database Error");
    }
    
    const ordersHtml = rows.map((row, index) => {
      let items = [];
      try { items = JSON.parse(row.itemsData); } catch(e){}
      const itemsList = items.map(i => `
        <div class="flex items-center gap-2 mb-1 last:mb-0">
          <div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>
          <span class="text-gray-300 font-medium">${i.product?.name || 'Item'}</span>
          <span class="text-gray-500 text-xs px-2 bg-white/5 rounded">${i.size || '-'}</span>
          <span class="text-gray-500 text-xs">x${i.quantity || 1}</span>
        </div>
      `).join('');
      
      return `
        <tr class="hover:bg-white/2 transition-colors" style="animation: fadeIn 0.5s ease-out ${index * 0.05}s forwards; opacity: 0;">
          <td class="p-6">
            <div class="flex flex-col">
              <span class="font-bold text-white text-lg">${row.orderNumber}</span>
              <span class="text-gray-600 text-xs font-mono">ID: ${row.id}</span>
            </div>
          </td>
          <td class="p-6 font-black text-xl text-green-400">$${row.totalAmount.toFixed(2)}</td>
          <td class="p-6">
            <span class="px-3 py-1 text-xs font-bold tracking-wider rounded-full bg-white/10 text-gray-300 border border-white/5 uppercase">
              ${row.paymentMethod}
            </span>
          </td>
          <td class="p-6">
            <span class="px-3 py-1 text-xs font-bold tracking-wider rounded-full flex items-center gap-2 w-max ${
              row.paymentStatus === 'success' 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            }">
              <div class="w-1.5 h-1.5 rounded-full ${row.paymentStatus === 'success' ? 'bg-green-400' : 'bg-orange-400 animate-pulse'}"></div>
              ${row.paymentStatus.toUpperCase()}
            </span>
          </td>
          <td class="p-6 text-sm">${itemsList}</td>
          <td class="p-6 text-right text-xs font-medium text-gray-500 whitespace-nowrap">
            ${new Date(row.createdAt + 'Z').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin - MockupStore Hub</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; background: #050505; }
          .glass {
            background: rgba(20, 20, 20, 0.6);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        </style>
      </head>
      <body class="text-white min-h-screen p-6 md:p-12 relative overflow-x-hidden">
        <!-- Background glows -->
        <div class="fixed top-[-20%] left-[-10%] w-125 h-125 rounded-full bg-red-600/20 blur-[120px] pointer-events-none z-[-1]"></div>
        <div class="fixed bottom-[-20%] right-[-10%] w-150 h-150 rounded-full bg-orange-600/10 blur-[150px] pointer-events-none z-[-1]"></div>
        
        <div class="max-w-7xl mx-auto animate-fade-in">
          <!-- Header -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <h1 class="text-4xl md:text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-red-500 to-orange-400 mb-2">
                Order Dashboard
              </h1>
              <p class="text-gray-500 font-medium tracking-wide text-sm uppercase">MockupStore Central Management</p>
            </div>
            <button onclick="window.location.reload()" class="group relative px-6 py-3 font-bold text-white rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all overflow-hidden flex items-center gap-2">
              <svg class="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Refresh Data
            </button>
          </div>
          
          <!-- Stats row -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div class="glass rounded-2xl p-6">
              <p class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Orders</p>
              <h3 class="text-4xl font-black text-white">${rows.length}</h3>
            </div>
            <div class="glass rounded-2xl p-6">
              <p class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Revenue</p>
              <h3 class="text-4xl font-black text-green-400">$${rows.reduce((sum, r) => sum + r.totalAmount, 0).toFixed(2)}</h3>
            </div>
            <div class="glass rounded-2xl p-6">
              <p class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Success Rate</p>
              <h3 class="text-4xl font-black text-blue-400">${rows.length > 0 ? Math.round((rows.filter(r => r.paymentStatus === 'success').length / rows.length) * 100) : 0}%</h3>
            </div>
          </div>

          <!-- Table -->
          <div class="glass rounded-3xl overflow-hidden shadow-2xl">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse min-w-200">
                <thead>
                  <tr class="bg-black/40 text-gray-400 text-xs font-bold uppercase tracking-widest border-b border-white/5">
                    <th class="p-6 font-medium">Order ID</th>
                    <th class="p-6 font-medium">Amount</th>
                    <th class="p-6 font-medium">Method</th>
                    <th class="p-6 font-medium">Status</th>
                    <th class="p-6 font-medium">Items Purchased</th>
                    <th class="p-6 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  ${ordersHtml || '<tr><td colspan="6" class="p-12 text-center text-gray-500 font-medium">No orders found yet. Waiting for customers!</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    res.send(html);
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3004;
  app.listen(PORT, () => {
    console.log(`✅ Backend Payment API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
