import { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, User } from "firebase/auth";

type Category = "All" | "Apparel" | "Packaging" | "Devices" | "Print";

interface Product {
  id: string;
  name: string;
  category: Exclude<Category, "All">;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  badgeColor?: string;
  colors: string[];
  rating: number;
  reviews: number;
  description: string;
}

interface CartItem {
  product: Product;
  size: string;
  color: string;
  quantity: number;
}

const PRODUCTS: Product[] = [
  {
    id: "ap1",
    name: "Oversized T-Shirt Mockup",
    category: "Apparel",
    price: 19.99,
    originalPrice: 29.99,
    image: "/images/mockup_1.jpg",
    badge: "SALE",
    badgeColor: "#ff3000",
    colors: ["#ffffff", "#111111", "#cc0000"],
    rating: 4.8,
    reviews: 214,
    description: "Ultra-realistic oversized t-shirt mockup with smart objects. Includes front and back views.",
  },
  {
    id: "ap2",
    name: "Heavyweight Hoodie",
    category: "Apparel",
    price: 24.99,
    image: "/images/mockup_2.jpg",
    badge: "NEW",
    badgeColor: "#ecff00",
    colors: ["#111111", "#888888"],
    rating: 4.6,
    reviews: 89,
    description: "Premium hoodie mockup with customizable drawstrings and fabric texture.",
  },
  {
    id: "pk1",
    name: "Minimalist Box Packaging",
    category: "Packaging",
    price: 14.99,
    image: "/images/mockup_3.jpg",
    colors: ["#ffffff", "#ffd700"],
    rating: 4.9,
    reviews: 131,
    description: "Clean cardboard box packaging mockup. Perfect for e-commerce branding presentations.",
  },
  {
    id: "ap3",
    name: "Oversized T-Shirt Mockup v2",
    category: "Apparel",
    price: 19.99,
    originalPrice: 29.99,
    image: "/images/mockup_1.jpg",
    badge: "SALE",
    badgeColor: "#ff3000",
    colors: ["#ffffff", "#111111", "#cc0000"],
    rating: 4.8,
    reviews: 214,
    description: "Ultra-realistic oversized t-shirt mockup with smart objects. Includes front and back views.",
  },
  {
    id: "ap4",
    name: "Heavyweight Hoodie v2",
    category: "Apparel",
    price: 24.99,
    image: "/images/mockup_2.jpg",
    badge: "NEW",
    badgeColor: "#ecff00",
    colors: ["#111111", "#888888"],
    rating: 4.6,
    reviews: 89,
    description: "Premium hoodie mockup with customizable drawstrings and fabric texture.",
  },
  {
    id: "pk2",
    name: "Minimalist Box Packaging v2",
    category: "Packaging",
    price: 14.99,
    image: "/images/mockup_3.jpg",
    colors: ["#ffffff", "#ffd700"],
    rating: 4.9,
    reviews: 131,
    description: "Clean cardboard box packaging mockup. Perfect for e-commerce branding presentations.",
  }
];

const SIZES = ["PSD"];
const CATEGORIES: Category[] = ["All", "Apparel", "Packaging", "Devices", "Print"];

const H = "font-heading";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={`w-3 h-3 ${n <= Math.round(rating) ? "fill-accent" : "fill-[#2a2a2a]"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function App() {
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "rating">("default");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"shipping" | "payment" | "confirmation" | null>(null);
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [qvSize, setQvSize] = useState("M");
  const [qvColor, setQvColor] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [finalTotal, setFinalTotal] = useState(0);
  const [shipping, setShipping] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    zip: "",
  });
  const [payment, setPayment] = useState({ card: "", expiry: "", cvv: "", name: "" });
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [purchasedItems, setPurchasedItems] = useState<CartItem[]>([]);
  const [orderNumber] = useState(() => Math.floor(Math.random() * 90000) + 10000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [isLightMode, setIsLightMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [isLightMode]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u: User | null) => {
      setUser(u);
      if (u) setShowLoginModal(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % Math.min(3, PRODUCTS.length));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (quickView) {
      setQvColor(quickView.colors[0]);
      setQvSize("M");
    }
  }, [quickView]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success") === "true") {
      setCheckoutStep("confirmation");
      // Restore cart data from localStorage if available
      const savedCart = localStorage.getItem("temp_cart");
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setPurchasedItems(parsedCart);
        const total = parsedCart.reduce((s: number, i: any) => s + i.product.price * i.quantity, 0);
        setFinalTotal(total);
        localStorage.removeItem("temp_cart");
      }
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (urlParams.get("canceled") === "true") {
      alert("Payment was canceled.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const isOpen = cartOpen || !!checkoutStep || !!quickView;
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, checkoutStep, quickView]);

  const filtered = (activeCategory === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory)).sort(
    (a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0;
    }
  );

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  const addToCart = (product: Product, size: string, color: string) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.product.id === product.id && i.size === size && i.color === color);
      if (ex) {
        return prev.map((i) =>
          i.product.id === product.id && i.size === size && i.color === color
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, size, color, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string, size: string, color: string) => {
    setCart((prev) => prev.filter((i) => !(i.product.id === id && i.size === size && i.color === color)));
  };

  const updateQuantity = (id: string, size: string, color: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === id && i.size === size && i.color === color
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, qvSize, qvColor || product.colors[0]);
    setQuickView(null);
    setCartOpen(true);
  };

  const startCheckout = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setCartOpen(false);
    setCheckoutStep("payment");
  };

  const fetchOrderHistory = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`http://localhost:3004/api/orders?email=${user.email}`);
      const data = await res.json();
      if (data.success) setOrderHistory(data.orders);
    } catch (e) {
      console.error(e);
    }
  };

  const placeOrder = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setIsProcessing(true);
    try {
      if (paymentMethod === "card") {
        // Lemon Squeezy flow (Dynamic via Backend)
        const response = await fetch("/api/checkout-lemon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart,
            total: cartTotal,
            userEmail: user?.email
          })
        });
        const result = await response.json();
        
        if (!result.success) {
          alert("បរាជ័យក្នុងការបង្កើត Link ទូទាត់ប្រាក់៖ " + (result.message || "Unknown Error"));
          setIsProcessing(false);
          return;
        }

        const checkoutUrl = result.url;

        // Ensure Lemon Squeezy is initialized
        // @ts-ignore
        if (window.createLemonSqueezy) {
          // @ts-ignore
          window.createLemonSqueezy();
        }
        
        // @ts-ignore
        if (window.LemonSqueezy) {
          // @ts-ignore
          window.LemonSqueezy.Setup({
            eventHandler: (event: any) => {
              console.log("Lemon Squeezy Event:", event);
              if (event.event === 'Checkout.Success') {
                // Payment was successful!
                setCart([]);
                setCartOpen(false);
                setCheckoutStep(null);
                fetchOrderHistory();
                setShowOrderHistory(true);
              }
            }
          });
          // @ts-ignore
          window.LemonSqueezy.Url.Open(checkoutUrl);
        } else {
          // Fallback if script hasn't loaded properly
          window.location.href = checkoutUrl;
        }
        setIsProcessing(false);
        return;
      } else {
        // KHQR flow
        const response = await fetch("http://localhost:3004/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart,
            total: cartTotal,
            paymentMethod: paymentMethod,
            userEmail: user?.email
          })
        });
        const result = await response.json();
        
        if (result.success) {
        setFinalTotal(cartTotal);
        setPurchasedItems(cart);
        setCheckoutStep("confirmation");
        setCart([]);
      } else {
        alert("Payment failed: " + result.message);
      }
    } // End of if (paymentMethod === "card") else block
    } catch (error) {
      console.error(error);
      alert("⚠️ Backend server (Port 3004) is not running! Falling back to demo checkout...");
      setFinalTotal(cartTotal);
      setPurchasedItems(cart);
      setCheckoutStep("confirmation");
      setCart([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const scrollToProducts = (cat?: Category) => {
    if (cat) setActiveCategory(cat);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  const inputClass =
    "w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white px-3 py-2.5 text-sm focus:border-primary transition-colors placeholder-[#444]";

  const labelClass = `text-xs uppercase tracking-wider text-[#666] mb-1.5 block ${H}`;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ─── NAVIGATION ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          navScrolled ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-lg" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`text-[1.6rem] font-black tracking-[0.08em] text-foreground hover:opacity-80 transition-opacity cursor-pointer ${H}`}>
              MOCKUP<span className="text-primary">STORE</span>
            </a>

          </div>

          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-muted transition-colors mr-2"
              title="Toggle Theme"
            >
              {isLightMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <button onClick={() => { fetchOrderHistory(); setShowOrderHistory(true); }} className={`bg-card hover:bg-primary border border-border text-foreground hover:text-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-colors flex items-center gap-2 shadow-sm ${H}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  Orders
                </button>
                <div className="flex items-center gap-3 border border-border bg-card pl-2 pr-4 py-1">
                  <img src={user.photoURL || ""} alt={user.displayName || "User"} className="w-7 h-7 object-cover rounded-sm" />
                  <button onClick={handleLogout} className={`text-[10px] text-muted-foreground hover:text-primary uppercase tracking-[0.15em] font-black transition-colors ${H}`}>Logout</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className={`bg-card hover:bg-primary border border-border text-foreground hover:text-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-colors shadow-sm ${H}`}
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => setCartOpen(true)}
              className={`relative flex items-center gap-2 px-4 py-2 text-sm font-black uppercase tracking-widest transition-all hover:bg-[#e02800] ${H} bg-primary text-white`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs font-black w-5 h-5 rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex lg:hidden items-center gap-4">
            <button
              onClick={() => setCartOpen(true)}
              className={`relative flex items-center gap-2 px-3 py-1.5 text-sm font-black uppercase tracking-widest transition-all hover:bg-[#e02800] ${H} bg-primary text-white`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-foreground">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── MOBILE MENU ─── */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed top-16 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border z-40 p-6 flex flex-col gap-6 shadow-xl animate-[fadeIn_0.2s_ease-out]">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <span className={`${H} uppercase font-bold text-sm text-muted-foreground`}>Theme</span>
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-muted transition-colors"
            >
              {isLightMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
          
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 bg-card border border-border p-3 rounded-lg">
                <img src={user.photoURL || ""} alt={user.displayName || "User"} className="w-10 h-10 object-cover rounded-md" />
                <div className="flex flex-col">
                  <span className="font-bold text-sm">{user.displayName}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
              <button onClick={() => { setIsMobileMenuOpen(false); fetchOrderHistory(); setShowOrderHistory(true); }} className={`bg-card hover:bg-primary border border-border text-foreground hover:text-white p-4 text-xs font-black uppercase tracking-[0.15em] transition-colors flex justify-center items-center gap-2 rounded-lg shadow-sm ${H}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                Order History
              </button>
              <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} className={`text-xs text-primary bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white p-4 uppercase tracking-[0.15em] font-black transition-colors rounded-lg ${H}`}>
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setIsMobileMenuOpen(false); setShowLoginModal(true); }}
              className={`bg-primary text-white hover:bg-[#e02800] p-4 text-xs font-black uppercase tracking-[0.15em] transition-colors shadow-sm rounded-lg ${H}`}
            >
              Sign In
            </button>
          )}
        </div>
      )}

      {/* ─── PRODUCTS ─── */}
      <section id="products" className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <h2
              className={`${H} font-black uppercase leading-none text-foreground`}
              style={{ fontSize: "clamp(40px, 7vw, 84px)" }}
            >
              THE COLLECTION
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#444] text-xs">{filtered.length} styles</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className={`${H} bg-[#111] border border-[#2a2a2a] text-[#888] text-xs px-3 py-2 uppercase tracking-wider focus:border-primary transition-colors cursor-pointer`}
            >
              <option value="default">Sort: Default</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {filtered.map((product) => (
            <div key={product.id} className="group cursor-pointer" onClick={() => setQuickView(product)}>
              <div className="relative overflow-hidden bg-card mb-3" style={{ aspectRatio: "3/4" }}>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {product.badge && (
                  <div
                    className={`${H} absolute top-3 left-3 px-2 py-1 text-xs font-black uppercase tracking-widest`}
                    style={{
                      backgroundColor: product.badgeColor ?? "#ff3000",
                      color: product.badgeColor === "#ecff00" ? "#080808" : "#fff",
                    }}
                  >
                    {product.badge}
                  </div>
                )}
                <div className="absolute inset-0 bg-accent-foreground/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                  <span className={`${H} bg-primary text-white px-6 py-2.5 text-sm font-black uppercase tracking-[0.12em]`}>
                    View
                  </span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground leading-tight mb-1 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center gap-1.5 mb-2">
                  <StarRating rating={product.rating} />
                  <span className="text-muted-foreground text-[11px]">({product.reviews})</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-foreground">${product.price.toFixed(2)}</span>
                  {product.originalPrice && (
                    <span className="text-muted-foreground text-sm line-through">${product.originalPrice.toFixed(2)}</span>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TRUST BAR (SCROLLING TEXT) ─── */}
      <div className="overflow-hidden py-4 bg-muted border-y border-border">
        <div className="flex w-max animate-[marquee_15s_linear_infinite]">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-6">
              <span className="text-primary text-[10px]">✦</span>
              <span className="text-xs text-[#888] font-medium uppercase tracking-wider">Jersey Mockup</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-background">
          <img
            key={`bg-${heroImageIndex}`}
            src={PRODUCTS[heroImageIndex]?.image}
            alt="Hero background"
            className="w-full h-full object-cover opacity-[0.15] animate-[fadeIn_1s_ease-in-out] mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-linear-to-r from-background via-background/75 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
          <div>
            <div className="inline-flex items-center gap-2.5 border border-primary/60 px-3 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              <span className={`text-primary text-xs font-bold uppercase tracking-[0.25em] ${H}`}>
                2024 Drop — Now Live
              </span>
            </div>

            <h1
              className={`${H} font-black uppercase leading-[0.88] text-foreground mb-6`}
              style={{ fontSize: "clamp(72px, 13vw, 148px)", letterSpacing: "-0.02em" }}
            >
              MOCKUP<br />
              <span className="text-primary">JERSEY</span>
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md">
              Premium custom jerseys for every sport. Design-ready mockups, performance fabrics, fast delivery.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => scrollToProducts("All")}
                className={`${H} bg-primary hover:bg-[#e02800] text-white px-8 py-4 font-black uppercase tracking-[0.15em] text-lg transition-all hover:scale-[1.02]`}
              >
                Shop Collection
              </button>

            </div>
          </div>

          <div className="hidden md:flex justify-end">
            <div className="relative max-w-sm w-full">
              <div className="absolute -inset-3 border border-primary/20" />
              <div className="absolute -inset-6 border border-primary/08" />
              <div className="bg-card overflow-hidden" style={{ aspectRatio: "3/4" }}>
                <img
                  key={`hero-${heroImageIndex}`}
                  src={PRODUCTS[heroImageIndex]?.image}
                  alt="Featured jersey lineup"
                  className="w-full h-full object-cover animate-[fadeIn_1s_ease-in-out]"
                />
              </div>
              <div className="absolute bottom-4 left-4 bg-accent px-4 py-2.5">
                <div className={`${H} text-accent-foreground text-[0.6rem] uppercase font-bold tracking-[0.2em]`}>Starting at</div>
                <div className={`${H} text-accent-foreground text-3xl font-black leading-none`}>$64.99</div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-[10px] text-[#666] uppercase tracking-[0.3em]">Scroll</span>
          <svg className="w-4 h-4 text-[#666] animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>





      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-card py-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className={`${H} text-2xl font-black text-foreground tracking-[0.08em] block mb-4`}>
            MOCKUP<span className="text-primary">STORE</span>
          </span>
          <p className="text-muted-foreground text-sm mb-6">
            The home of premium digital mockup files for designers and creative agencies.
          </p>
          <div className="flex items-center justify-center gap-8 text-[#888] font-medium text-sm">
            <a href="#" className="flex items-center gap-2 hover:text-[#1877F2] transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
              Facebook
            </a>
            <a href="#" className="flex items-center gap-2 hover:text-[#229ED9] transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
              Telegram
            </a>
            <a href="#" className="flex items-center gap-2 hover:text-black transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.68a6.34 6.34 0 0 0 6.27 6.36 6.34 6.34 0 0 0 6.27-6.36v-6.36a8.21 8.21 0 0 0 5.46 2.05v-3.46a4.84 4.84 0 0 1-3.41-1.22z"/>
              </svg>
              TikTok
            </a>
          </div>
          <div className="mt-10 pt-6 border-t border-gray-200 text-[#777] text-xs">
            © 2026 MOCKUPSTORE
          </div>
        </div>
      </footer>

      {/* ─── CART DRAWER ─── */}
      {cartOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={() => setCartOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0b0b0b] border-l border-[#1e1e1e] z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e]">
              <h2 className={`${H} text-xl font-black uppercase tracking-widest text-white`}>
                Cart{cartCount > 0 ? ` (${cartCount})` : ""}
              </h2>
              <button onClick={() => setCartOpen(false)} className="text-[#555] hover:text-white transition-colors">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-14 h-14 border-2 border-[#222] flex items-center justify-center mx-auto mb-5">
                    <svg className="w-7 h-7 text-[#333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-[#555] text-sm mb-4">Your cart is empty</p>
                  <button
                    onClick={() => setCartOpen(false)}
                    className={`${H} text-primary text-sm font-bold uppercase tracking-wider hover:underline`}
                  >
                    Browse Collection
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.size}-${item.color}`}
                    className="flex gap-3 p-3 bg-[#111] border border-[#1e1e1e]"
                  >
                    <div className="w-18 h-22 bg-[#1a1a1a] shrink-0 overflow-hidden" style={{ width: 72, height: 90 }}>
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-white leading-tight truncate">{item.product.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#555]">
                        <span>File: {item.size}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center border border-[#2a2a2a]">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.size, item.color, -1)}
                            className="px-2.5 py-1 text-[#666] hover:text-white transition-colors text-base leading-none"
                          >
                            −
                          </button>
                          <span className="px-2.5 text-sm font-bold text-white min-w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.size, item.color, 1)}
                            className="px-2.5 py-1 text-[#666] hover:text-white transition-colors text-base leading-none"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white text-sm">
                            ${(item.product.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                            className="text-[#333] hover:text-primary transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-6 py-5 border-t border-[#1e1e1e] bg-accent-foreground">
                <div className="flex justify-between text-sm text-[#777] mb-1">
                  <span>Subtotal</span>
                  <span className="text-white font-bold">${cartTotal.toFixed(2)}</span>
                </div>
                <p className="text-[#444] text-xs mb-5">Shipping calculated at checkout</p>
                <button
                  onClick={startCheckout}
                  className={`${H} w-full bg-primary hover:bg-[#e02800] text-white py-4 font-black uppercase tracking-[0.15em] text-base transition-colors`}
                >
                  Proceed to Checkout →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── CHECKOUT MODAL ─── */}
      {checkoutStep && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0b0b] border border-[#1e1e1e] w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#1e1e1e]">
              <div>
                <p className={`${H} text-[#555] text-[10px] uppercase tracking-[0.25em] mb-1`}>Secure Checkout</p>
                <h2 className={`${H} text-2xl font-black uppercase text-white`}>
                  {checkoutStep === "payment"
                    ? "Payment"
                    : "Order Confirmed!"}
                </h2>
              </div>
              <button
                onClick={() => setCheckoutStep(null)}
                className="text-[#444] hover:text-white transition-colors mt-1"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>



            <div className="p-6">
              {/* PAYMENT */}
              {checkoutStep === "payment" && (
                <div className="space-y-4">
                  <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-4 mb-2">
                    <p className={`${H} text-[#555] text-[10px] uppercase tracking-[0.2em] mb-3`}>Order Summary</p>
                    {cart.map((item) => (
                      <div
                        key={`${item.product.id}-${item.size}`}
                        className="flex justify-between text-sm py-1 text-[#888]"
                      >
                        <span className="truncate mr-4">
                          {item.product.name} × {item.quantity}
                        </span>
                        <span className="shrink-0">${(item.product.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold text-white mt-3 pt-3 border-t border-[#1e1e1e]">
                      <span>Total</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border transition-colors ${paymentMethod === "card" ? "bg-primary border-primary text-white" : "border-[#333] text-[#888] hover:border-[#666]"}`}
                    >
                      Credit Card
                    </button>
                    <button
                      onClick={() => setPaymentMethod("khqr")}
                      className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border transition-colors flex items-center justify-center gap-2 ${paymentMethod === "khqr" ? "bg-primary border-primary text-white" : "border-[#333] text-[#888] hover:border-[#666]"}`}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 4h6v6H4zM6 6v2h2V6zM14 4h6v6h-6zM16 6v2h2V6zM4 14h6v6H4zM6 16v2h2v-2zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM16 16h2v2h-2z" />
                      </svg>
                      KHQR
                    </button>
                  </div>

                  {paymentMethod === "card" ? (
                    <div className="border border-[#1e1e1e] bg-[#0d0d0d] p-6 flex flex-col items-center justify-center text-center">
                      <svg className="w-8 h-8 text-[#555] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <p className="text-[#888] text-sm leading-relaxed">
                        Securely pay via <strong className="text-white">Lemon Squeezy</strong>.<br/>
                        Click below to enter your card details.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-[#1e1e1e] bg-accent-foreground p-6 flex flex-col items-center justify-center">
                      <div className="w-48 h-48 bg-white p-3 mb-4 rounded flex items-center justify-center">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" alt="KHQR Code" className="w-full h-full opacity-90" />
                      </div>
                      <p className="text-[#888] text-sm text-center">
                        Scan this KHQR code with your mobile banking app to complete the payment.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[#444] text-xs pt-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    256-bit SSL encrypted · Your information is protected
                  </div>

                  <button
                    onClick={placeOrder}
                    disabled={isProcessing}
                    className={`${H} w-full bg-primary hover:bg-[#e02800] text-white py-4 font-black uppercase tracking-[0.15em] text-base transition-colors ${isProcessing ? "opacity-75 cursor-not-allowed" : ""}`}
                  >
                    {isProcessing ? "Processing Payment..." : `Place Order — $${cartTotal.toFixed(2)} →`}
                  </button>

                </div>
              )}

              {/* CONFIRMATION */}
              {checkoutStep === "confirmation" && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-accent flex items-center justify-center mx-auto mb-6">
                    <CheckIcon className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <h3 className={`${H} text-4xl font-black uppercase text-white mb-2`}>Payment Successful!</h3>
                  <p className="text-[#555] text-sm mb-1">Order #{orderNumber}</p>
                  <p className="text-[#666] text-sm mb-8 max-w-xs mx-auto">
                    Your payment of <strong className="text-white">${finalTotal.toFixed(2)}</strong> has been processed. You can now download your files below.
                  </p>

                  <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-4 mb-6 text-left">
                    <p className={`${H} text-[#555] text-[10px] uppercase tracking-[0.2em] mb-3`}>Your Downloads</p>
                    {purchasedItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-[#161616] last:border-0">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{item.product.name}</span>
                          <span className="text-xs text-[#666]">Format: {item.size}</span>
                        </div>
                        <a
                          href="https://drive.google.com/file/d/1U-RcJjKxnwzPv9B6aJWGasimUu856zxU/view?usp=sharing"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${H} shrink-0 border border-primary hover:bg-primary text-white px-4 py-2 text-xs font-bold uppercase transition-colors flex items-center gap-2`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setCheckoutStep(null)}
                    className={`${H} w-full text-[#666] hover:text-white py-4 font-black uppercase tracking-[0.15em] text-sm transition-colors border border-[#1e1e1e]`}
                  >
                    Close & Return to Store
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── LOGIN MODAL ─── */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-70 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 shadow-2xl p-10 max-w-sm w-full relative flex flex-col items-center rounded-lg">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors">
              <CloseIcon className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            </div>
            <h2 className={`${H} text-2xl font-black uppercase text-[#111] mb-2`}>Welcome Back</h2>
            <p className="text-gray-500 text-sm text-center mb-8">Sign in to complete your purchase and view your past orders.</p>
            <button 
              onClick={handleGoogleLogin} 
              className={`${H} flex items-center justify-center gap-3 bg-[#111] hover:bg-primary text-white w-full py-4 text-sm font-bold uppercase transition-all shadow-lg rounded-sm`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      )}

      {/* ─── ORDER HISTORY MODAL ─── */}
      {showOrderHistory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-70 flex items-center justify-center p-4 transition-all">
          <div className="bg-card border border-border shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-2xl max-h-[92vh] overflow-y-auto relative rounded-xl animate-[fadeIn_0.3s_ease-out]">
            <button onClick={() => setShowOrderHistory(false)} className="absolute top-4 right-4 md:top-5 md:right-5 text-muted-foreground hover:text-foreground bg-card hover:bg-muted border border-border rounded-full p-2 transition-all z-10 shadow-lg">
              <CloseIcon className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div className="px-5 pt-6 pb-4 md:px-8 md:pt-8 md:pb-6 border-b border-border bg-background/50 backdrop-blur">
              <p className={`${H} text-primary text-[10px] uppercase tracking-[0.25em] mb-1 font-bold`}>Account</p>
              <h2 className={`${H} text-xl md:text-3xl font-black uppercase text-foreground pr-10`}>Order History</h2>
            </div>
            <div className="p-4 md:p-8">
              {orderHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg className="w-16 h-16 text-border mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  <p className="text-muted-foreground font-medium text-lg">No past orders found.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {orderHistory.map((order, idx) => {
                    const parsedItems = JSON.parse(order.itemsData || "[]");
                    return (
                      <div key={idx} className="bg-background border border-border shadow-sm rounded-xl overflow-hidden transition-all hover:border-primary/50 group">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-0 bg-card/80 px-4 md:px-6 py-4 md:py-5 border-b border-border">
                          <div className="flex items-center flex-wrap gap-2 md:gap-4">
                            <span className="text-xs text-muted-foreground font-mono bg-background px-2 py-1 rounded border border-border">#{order.orderNumber}</span>
                            <span className="text-foreground font-black text-lg md:text-xl">${order.totalAmount}</span>
                            {order.createdAt && (
                              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50 hidden sm:inline-block">
                                {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                          <span className={`self-start sm:self-auto text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 ${order.paymentStatus === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${order.paymentStatus === 'success' ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></div>
                            {order.paymentStatus}
                          </span>
                        </div>
                        <div className="p-4 md:p-6 space-y-4">
                          {parsedItems.map((item: any, i: number) => (
                            <div key={i} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-sm bg-card p-3 border border-border rounded-lg shadow-sm transition-colors hover:border-[#333]">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-16 h-16 bg-background shrink-0 rounded-md overflow-hidden border border-border">
                                  <img src={item.product?.image || "/images/mockup_1.jpg"} alt={item.product?.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-foreground font-bold text-sm md:text-base line-clamp-1">{item.product?.name || "Product"}</span>
                                  <span className="text-xs text-muted-foreground mt-1">Format: <span className="text-foreground/70 font-medium">{item.size}</span> <span className="mx-1 md:mx-2 text-border">|</span> Qty: <span className="text-foreground/70 font-medium">{item.quantity}</span></span>
                                </div>
                              </div>
                              <a
                                href="https://drive.google.com/file/d/1U-RcJjKxnwzPv9B6aJWGasimUu856zxU/view?usp=sharing"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full sm:w-auto bg-primary hover:bg-[#e02800] text-white px-4 md:px-5 py-2 md:py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all flex justify-center items-center gap-2 rounded-lg sm:rounded-full shadow-lg ${H} hover:-translate-y-0.5`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => setShowOrderHistory(false)}
                className={`${H} w-full mt-8 text-[#888] hover:text-white py-4 font-black uppercase tracking-[0.15em] text-sm transition-colors border border-border rounded-lg bg-background hover:bg-border/50`}
              >
                Close & Return to Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QUICK VIEW MODAL ─── */}
      {quickView && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickView(null);
          }}
        >
          <div className="bg-card border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl relative">
            <button
              onClick={() => setQuickView(null)}
              className="absolute top-4 right-4 z-10 text-white hover:text-white bg-black/40 hover:bg-black/60 transition-colors p-1.5 rounded-full backdrop-blur-md"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <div className="grid md:grid-cols-2">
              {/* Image side */}
              <div className="relative bg-muted h-52 md:h-auto min-h-52 md:min-h-80">
                <img
                  src={quickView.image}
                  alt={quickView.name}
                  className="w-full h-full object-cover"
                />
                {quickView.badge && (
                  <div
                    className={`${H} absolute top-3 left-3 px-2 py-1 text-xs font-black uppercase tracking-widest`}
                    style={{
                      backgroundColor: quickView.badgeColor ?? "#ff3000",
                      color: quickView.badgeColor === "#ecff00" ? "#080808" : "#fff",
                    }}
                  >
                    {quickView.badge}
                  </div>
                )}
              </div>

              {/* Detail side */}
              <div className="p-4 md:p-6 flex flex-col">

                <p className={`${H} text-primary text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold mb-1 pr-8`}>
                  {quickView.category}
                </p>
                <h2 className={`${H} text-xl md:text-2xl font-black text-foreground mb-2 pr-8`}>{quickView.name}</h2>

                <div className="flex items-center gap-2 mb-2">
                  <StarRating rating={quickView.rating} />
                  <span className="text-muted-foreground text-xs">({quickView.reviews} reviews)</span>
                </div>

                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed mb-3 line-clamp-2 md:line-clamp-none">{quickView.description}</p>

                <div className="flex items-center gap-3 mb-4">
                  <span className={`${H} text-2xl md:text-3xl font-black text-foreground`}>${quickView.price.toFixed(2)}</span>
                  {quickView.originalPrice && (
                    <>
                      <span className="text-muted-foreground line-through text-xs md:text-sm">${quickView.originalPrice.toFixed(2)}</span>
                      <span
                        className={`${H} bg-primary text-white text-[10px] md:text-xs px-2 py-0.5 font-bold uppercase`}
                      >
                        Save ${(quickView.originalPrice - quickView.price).toFixed(2)}
                      </span>
                    </>
                  )}
                </div>

                <div className="mb-4">
                  <p className={`${H} text-[#555] text-[10px] uppercase tracking-[0.2em] mb-2`}>File</p>
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => setQvSize(size)}
                        className={`${H} px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold uppercase border tracking-wider transition-all ${
                          qvSize === size
                            ? "bg-primary border-primary text-white"
                            : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleAddToCart(quickView);
                    setQuickView(null);
                    startCheckout();
                  }}
                  className={`${H} mt-auto w-full bg-primary hover:bg-[#e02800] text-white py-3 md:py-4 font-black uppercase tracking-[0.15em] text-sm md:text-base transition-colors flex items-center justify-center gap-2`}
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Checkout to Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
