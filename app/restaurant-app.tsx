"use client";

import QRCode from "qrcode";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Section = "Overview" | "Live orders" | "Menu" | "Tables & QR" | "Reports";
type Status = "Placed" | "Accepted" | "Preparing" | "Ready" | "Served" | "Paid" | "Cancelled";
type Dish = { id: number; name: string; category: string; description: string; price: number; image: string; available: boolean };
type Table = { id: number; name: string; seats: number; active: boolean };
type OrderItem = { dishId: number; name: string; price: number; quantity: number };
type Order = { id: number; table: string; status: Status; items: OrderItem[]; total: number; time: string; customer: string };

const initialDishes: Dish[] = [
  { id: 1, name: "Avocado toast", category: "Breakfast", description: "Sourdough, smashed avocado, chilli flakes", price: 280, image: "🥑", available: true },
  { id: 2, name: "Pancake stack", category: "Breakfast", description: "Fluffy buttermilk pancakes, maple syrup", price: 320, image: "🥞", available: true },
  { id: 3, name: "Truffle mushroom pasta", category: "Mains", description: "Creamy wild mushrooms, parmesan, herbs", price: 490, image: "🍝", available: true },
  { id: 4, name: "Crispy chicken burger", category: "Mains", description: "Buttermilk fried chicken, house slaw", price: 420, image: "🍔", available: true },
  { id: 5, name: "Burrata garden salad", category: "Mains", description: "Heirloom tomatoes, basil, toasted sourdough", price: 390, image: "🥗", available: false },
  { id: 6, name: "Chocolate lava cake", category: "Desserts", description: "Warm dark chocolate cake, vanilla ice cream", price: 260, image: "🍰", available: true },
  { id: 7, name: "Cold brew tonic", category: "Drinks", description: "Slow-steeped coffee, citrus tonic", price: 180, image: "🧋", available: true },
  { id: 8, name: "Mango cooler", category: "Drinks", description: "Fresh mango, lime, sparkling water", price: 160, image: "🥭", available: true },
];
const initialOrders: Order[] = [
  { id: 1048, table: "Table 04", status: "Preparing", items: [{ dishId: 3, name: "Truffle mushroom pasta", price: 490, quantity: 1 }, { dishId: 7, name: "Cold brew tonic", price: 180, quantity: 2 }], total: 850, time: "2 min ago", customer: "Ananya" },
  { id: 1047, table: "Table 02", status: "Placed", items: [{ dishId: 4, name: "Crispy chicken burger", price: 420, quantity: 2 }, { dishId: 8, name: "Mango cooler", price: 160, quantity: 1 }], total: 1000, time: "4 min ago", customer: "Walk-in" },
  { id: 1046, table: "Table 07", status: "Ready", items: [{ dishId: 2, name: "Pancake stack", price: 320, quantity: 1 }], total: 320, time: "8 min ago", customer: "Rohan" },
  { id: 1045, table: "Table 01", status: "Served", items: [{ dishId: 1, name: "Avocado toast", price: 280, quantity: 1 }, { dishId: 7, name: "Cold brew tonic", price: 180, quantity: 1 }], total: 460, time: "18 min ago", customer: "Walk-in" },
];
const initialTables: Table[] = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Table ${String(i + 1).padStart(2, "0")}`, seats: i % 3 === 0 ? 4 : 2, active: true }));
const statusNext: Partial<Record<Status, Status>> = { Placed: "Accepted", Accepted: "Preparing", Preparing: "Ready", Ready: "Served", Served: "Paid" };
const sections: { name: Section; icon: string }[] = [
  { name: "Overview", icon: "◫" }, { name: "Live orders", icon: "▤" }, { name: "Menu", icon: "☷" }, { name: "Tables & QR", icon: "▦" }, { name: "Reports", icon: "▥" },
];
const sectionRoutes: Record<Section, string> = {
  Overview: "/admin",
  "Live orders": "/admin/orders",
  Menu: "/admin/menu",
  "Tables & QR": "/admin/tables",
  Reports: "/admin/reports",
};
const routeSections: Record<string, Section> = Object.fromEntries(
  Object.entries(sectionRoutes).map(([section, route]) => [route, section as Section]),
);
const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export default function RestaurantApp() {
  const pathname = usePathname();
  const router = useRouter();
  const section = routeSections[pathname] ?? "Overview";
  const isCustomer = pathname.startsWith("/r/");
  const [dishes, setDishes] = useState(initialDishes);
  const [orders, setOrders] = useState(initialOrders);
  const [tables, setTables] = useState(initialTables);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [category, setCategory] = useState("All");
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState("");
  const [qr, setQr] = useState<{ table: Table; data: string; url: string; isLocal: boolean } | null>(null);
  const [newDish, setNewDish] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [dishName, setDishName] = useState("");
  const [dishPrice, setDishPrice] = useState("");
  const [dishCategory, setDishCategory] = useState("Mains");
  const [dishDescription, setDishDescription] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("tablefolk-demo");
        if (saved) {
          const data = JSON.parse(saved) as { dishes?: Dish[]; orders?: Order[]; tables?: Table[] };
          if (data.dishes) setDishes(data.dishes);
          if (data.orders) setOrders(data.orders);
          if (data.tables) setTables(data.tables);
        }
      } catch {
        setToast("Saved demo data could not be loaded. Using sample data.");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("tablefolk-demo", JSON.stringify({ dishes, orders, tables }));
  }, [dishes, orders, tables, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(dishes.map((dish) => dish.category)))], [dishes]);
  const todaySales = orders.filter((order) => order.status !== "Cancelled").reduce((total, order) => total + order.total, 0);
  const activeOrders = orders.filter((order) => !["Paid", "Cancelled"].includes(order.status));
  const cartItems = Object.entries(cart).filter(([, quantity]) => quantity > 0);
  const cartTotal = cartItems.reduce((total, [id, quantity]) => total + (dishes.find((dish) => dish.id === Number(id))?.price ?? 0) * quantity, 0);

  function updateStatus(orderId: number, status: Status) {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
    setToast(`Order #${orderId} marked ${status.toLowerCase()}.`);
  }

  function createOrder() {
    const items = cartItems.map(([id, quantity]) => {
      const dish = dishes.find((item) => item.id === Number(id))!;
      return { dishId: dish.id, name: dish.name, price: dish.price, quantity };
    });
    if (!items.length) return;
    const tableName = new URLSearchParams(window.location.search).get("table") || "Table 04";
    const nextOrder: Order = { id: Math.max(1048, ...orders.map((order) => order.id)) + 1, table: tableName.startsWith("Table") ? tableName : `Table ${tableName.padStart(2, "0")}`, status: "Placed", items, total: cartTotal, time: "Just now", customer: "Guest" };
    setOrders((current) => [nextOrder, ...current]);
    setCart({});
    router.push(sectionRoutes["Live orders"]);
    setToast(`Order #${nextOrder.id} placed — the kitchen has been notified.`);
  }

  function addDish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(dishPrice);
    if (!dishName.trim() || !Number.isFinite(price) || price <= 0) {
      setToast("Enter a dish name and a price greater than zero.");
      return;
    }
    if (editingDish) {
      setDishes((current) => current.map((dish) => dish.id === editingDish.id ? { ...dish, name: dishName.trim(), category: dishCategory.trim() || "Mains", description: dishDescription.trim(), price } : dish));
      setToast("Dish updated.");
    } else {
      setDishes((current) => [...current, { id: Date.now(), name: dishName.trim(), category: dishCategory.trim() || "Mains", description: dishDescription.trim(), price, image: "🍽️", available: true }]);
      setToast("Dish added to your menu.");
    }
    setDishName("");
    setDishPrice("");
    setDishCategory("Mains");
    setDishDescription("");
    setEditingDish(null);
    setNewDish(false);
  }

  function editDish(dish: Dish) {
    setEditingDish(dish);
    setDishName(dish.name);
    setDishPrice(String(dish.price));
    setDishCategory(dish.category);
    setDishDescription(dish.description);
    setNewDish(true);
  }

  function deleteDish(dish: Dish) {
    setDishes((current) => current.filter((item) => item.id !== dish.id));
    setEditingDish(null);
    setNewDish(false);
    setToast(`${dish.name} removed from your menu.`);
  }

  async function showQr(table: Table) {
    try {
      const url = `${window.location.origin}/r/the-garden-cafe?table=${encodeURIComponent(table.name.replace("Table ", ""))}`;
      setQr({
        table,
        data: await QRCode.toDataURL(url, { width: 320, margin: 2, color: { dark: "#202a23", light: "#ffffff" } }),
        url,
        isLocal: ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname),
      });
    } catch (error) {
      console.error("QR code generation failed", error);
      setToast("Could not generate QR code. Please try again.");
    }
  }

  function downloadQr() {
    if (!qr) return;
    const link = document.createElement("a");
    link.href = qr.data;
    link.download = `${qr.table.name.toLowerCase().replaceAll(" ", "-")}-qr.png`;
    link.click();
  }

  if (isCustomer) {
    const shownDishes = dishes.filter((dish) => dish.available && (category === "All" || dish.category === category));
    return (
      <main className="customer-shell">
        <div className="customer-top"><button className="back-link" onClick={() => router.push("/admin")}>← Admin demo</button><span>THE GARDEN CAFE</span><button className="cart-top" onClick={() => document.getElementById("cart")?.scrollIntoView({ behavior: "smooth" })}>Bag ({cartItems.reduce((n, [, q]) => n + q, 0)})</button></div>
        <section className="customer-hero"><div className="hero-eyebrow">FRESH, LOCAL, MADE WITH LOVE</div><h1>A little something<br /><i>delicious.</i></h1><p>Good food, good mood. Order from your table and we’ll bring it to you.</p><span className="table-pill">⌖ &nbsp; Dining in · Table {new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("table") || "04"}</span></section>
        <div className="customer-menu"><div className="customer-heading"><div><span className="eyebrow">MADE FRESH DAILY</span><h2>Our menu</h2></div><span className="open-pill"><span /> Open now</span></div>
          <div className="category-row">{categories.map((item) => <button className={`category-chip ${category === item ? "selected" : ""}`} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <div className="customer-dishes">{shownDishes.map((dish) => <article className="customer-dish" key={dish.id}><div className="dish-emoji">{dish.image}</div><div className="dish-details"><div className="dish-category">{dish.category}</div><h3>{dish.name}</h3><p>{dish.description}</p><strong>{money(dish.price)}</strong></div><button className="add-button" aria-label={`Add ${dish.name}`} onClick={() => setCart((current) => ({ ...current, [dish.id]: (current[dish.id] || 0) + 1 }))}>{cart[dish.id] ? `+ ${cart[dish.id]}` : "+"}</button></article>)}</div>
          <section id="cart" className="cart-panel"><div><span className="eyebrow">YOUR ORDER</span><h2>Your bag <span className="muted">({cartItems.reduce((n, [, q]) => n + q, 0)})</span></h2></div>{cartItems.length ? <><div className="cart-lines">{cartItems.map(([id, quantity]) => { const dish = dishes.find((item) => item.id === Number(id))!; return <div className="cart-line" key={id}><span>{dish.name} <span className="muted">× {quantity}</span></span><strong>{money(dish.price * quantity)}</strong></div>; })}</div><div className="cart-total"><span>Total</span><strong>{money(cartTotal)}</strong></div><button className="primary-button full-button" onClick={createOrder}>Place order <span>→</span></button></> : <p className="empty-text">Your bag is empty. Add something lovely from the menu.</p>}</section>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/admin" className="brand"><span className="brand-mark">t.</span><span>tablefolk<small>RESTAURANT OS</small></span></Link>
        <div className="side-label">WORKSPACE</div><nav>{sections.map((item) => <button key={item.name} className={`nav-item ${section === item.name ? "active" : ""}`} onClick={() => router.push(sectionRoutes[item.name])}><span className="nav-icon">{item.icon}</span>{item.name}{item.name === "Live orders" && activeOrders.some((order) => order.status === "Placed") && <i className="nav-dot" />}</button>)}</nav>
        <div className="side-bottom"><div className="help-card"><span className="help-icon">✳</span><strong>Need a hand?</strong><p>Our team is always happy to help.</p><button onClick={() => setToast("Demo support: hello@tablefolk.example")}>Get support <span>↗</span></button></div><button className="profile"><span className="avatar">AS</span><span><strong>Saurabh Kumar</strong><small>Restaurant owner</small></span><span className="more">···</span></button></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> <strong>{section}</strong></div><div className="top-actions"><span className="today-label">Tuesday, 13 October</span><button className="icon-button notify-button" aria-label="Notifications" onClick={() => setToast(activeOrders.length ? `${activeOrders.length} active orders need attention.` : "You're all caught up.")}>♧<i /></button><button className="user-avatar" aria-label="User profile">SK</button></div></header>
        <div className="page-content">
          <div className="page-heading"><div><div className="eyebrow">THE GARDEN CAFE <span className="online-dot" /> OPEN</div><h1>{section === "Overview" ? "Good morning, Arjun" : section}</h1><p>{section === "Overview" ? "Here’s what’s happening at your restaurant today." : section === "Live orders" ? "Stay on top of every order, from kitchen to table." : section === "Menu" ? "Your dishes, your way. Keep your menu fresh." : section === "Tables & QR" ? "Manage your floor and let guests order with a scan." : "A little look at how your restaurant is doing."}</p></div><button className="primary-button" onClick={() => { setCategory("All"); router.push("/r/the-garden-cafe?table=04"); }}><span>↗</span> Preview menu</button></div>
          {section === "Overview" && <Overview orders={orders} dishes={dishes} todaySales={todaySales} setSection={(next) => router.push(sectionRoutes[next])} updateStatus={updateStatus} />}
          {section === "Live orders" && <Orders orders={orders} updateStatus={updateStatus} />}
          {section === "Menu" && <Menu dishes={dishes} setDishes={setDishes} onAdd={() => { setEditingDish(null); setDishName(""); setDishPrice(""); setDishCategory("Mains"); setDishDescription(""); setNewDish(true); }} onEdit={editDish} />}
          {section === "Tables & QR" && <Tables tables={tables} setTables={setTables} showQr={showQr} />}
          {section === "Reports" && <Reports orders={orders} todaySales={todaySales} dishes={dishes} />}
          <footer className="footer">Made for the love of good food <span>·</span> <a href="#" onClick={(event) => { event.preventDefault(); setToast("Tablefolk demo · MVP preview"); }}>Tablefolk © 2026</a></footer>
        </div>
      </main>
      {toast && <div className="toast">{toast}<button aria-label="Dismiss notification" onClick={() => setToast("")}>×</button></div>}
      {newDish && <div className="modal-backdrop" onClick={() => { setNewDish(false); setEditingDish(null); }}><form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={addDish}><button type="button" className="modal-close" onClick={() => { setNewDish(false); setEditingDish(null); }}>×</button><span className="eyebrow">MENU EDITOR</span><h2>{editingDish ? "Edit dish" : "Add a dish"}</h2><p>{editingDish ? "Update this item on your restaurant menu." : "Add a new item to your restaurant menu."}</p><label>Dish name<input autoFocus value={dishName} onChange={(event) => setDishName(event.target.value)} placeholder="e.g. Garden pesto toast" /></label><label>Category<input value={dishCategory} onChange={(event) => setDishCategory(event.target.value)} placeholder="e.g. Mains" /></label><label>Description<input value={dishDescription} onChange={(event) => setDishDescription(event.target.value)} placeholder="A short description" /></label><label>Price (₹)<input type="number" min="1" step="1" value={dishPrice} onChange={(event) => setDishPrice(event.target.value)} placeholder="280" /></label>{editingDish && <button type="button" className="delete-button" onClick={() => deleteDish(editingDish)}>Remove dish</button>}<button className="primary-button full-button" type="submit">{editingDish ? "Save changes" : "Add to menu"} <span>→</span></button></form></div>}
      {qr && <div className="modal-backdrop" onClick={() => setQr(null)}><div className="modal qr-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setQr(null)}>×</button><span className="eyebrow">TABLE QR CODE</span><h2>{qr.table.name}</h2><p>Print this code and place it on the table. Guests can scan it to browse and order.</p><Image className="qr-image" src={qr.data} alt={`QR code for ${qr.table.name}`} width={200} height={200} unoptimized />{qr.isLocal && <div className="qr-warning">This QR uses <code>localhost</code>, which only works on this computer. To scan with a phone, open the app using your computer’s local network IP, or deploy it first.</div>}<div className="qr-url">{qr.url}</div><button className="primary-button full-button" onClick={downloadQr}>Download QR code <span>↓</span></button></div></div>}
    </div>
  );
}

function Overview({ orders, dishes, todaySales, setSection, updateStatus }: { orders: Order[]; dishes: Dish[]; todaySales: number; setSection: (section: Section) => void; updateStatus: (id: number, status: Status) => void }) {
  const recent = orders.slice(0, 4);
  return <><div className="stats-grid"><StatCard icon="↗" label="Today's revenue" value={money(todaySales)} change="+12.8%" foot="vs. yesterday" tone="green" /><StatCard icon="▤" label="Orders today" value={String(orders.length + 24)} change="+8.2%" foot="vs. yesterday" tone="blue" /><StatCard icon="◷" label="Avg. order value" value={money(Math.round(todaySales / Math.max(orders.length, 1)))} change="+4.3%" foot="vs. yesterday" tone="orange" /><StatCard icon="♙" label="Active tables" value="6 / 8" change="75%" foot="of your floor" tone="purple" /></div>
    <div className="dashboard-grid"><section className="panel sales-panel"><div className="panel-heading"><div><h2>Sales overview</h2><p>Your restaurant at a glance</p></div><button className="select-button">This week⌄</button></div><div className="chart-total"><strong>{money(todaySales)}</strong><span className="positive">↗ 12.8%</span></div><div className="chart"><div className="chart-y"><span>₹8k</span><span>₹6k</span><span>₹4k</span><span>₹2k</span><span>₹0</span></div><div className="chart-body"><div className="chart-lines"><i /><i /><i /><i /><i /></div><svg className="chart-svg" viewBox="0 0 600 180" preserveAspectRatio="none" aria-label="Weekly sales chart"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#68856e" stopOpacity=".19" /><stop offset="100%" stopColor="#68856e" stopOpacity="0" /></linearGradient></defs><path d="M0,138 C35,130 45,111 82,119 S135,145 168,104 S220,115 250,84 S300,99 334,65 S382,89 420,59 S475,76 505,39 S565,57 600,20 L600,180 L0,180Z" fill="url(#chartFill)" /><path d="M0,138 C35,130 45,111 82,119 S135,145 168,104 S220,115 250,84 S300,99 334,65 S382,89 420,59 S475,76 505,39 S565,57 600,20" fill="none" stroke="#68856e" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg><div className="chart-x"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div></section>
    <section className="panel popular-panel"><div className="panel-heading"><div><h2>Popular dishes</h2><p>Your guest favourites</p></div><button className="text-button" onClick={() => setSection("Menu")}>View menu →</button></div>{dishes.slice(0, 4).map((dish, index) => <div className="popular-row" key={dish.id}><span className="popular-emoji">{dish.image}</span><span className="popular-name"><strong>{dish.name}</strong><small>{index === 0 ? 48 : index === 1 ? 36 : index === 2 ? 29 : 22} orders</small></span><strong className="popular-price">{money(dish.price)}</strong><span className="trend">↗</span></div>)}</section></div>
    <section className="panel recent-panel"><div className="panel-heading"><div><h2>Recent orders</h2><p>Keep an eye on what’s cooking</p></div><button className="text-button" onClick={() => setSection("Live orders")}>All orders →</button></div><OrderTable orders={recent} updateStatus={updateStatus} /></section>
  </>;
}

function StatCard({ icon, label, value, change, foot, tone }: { icon: string; label: string; value: string; change: string; foot: string; tone: string }) {
  return <article className="stat-card"><div className="stat-top"><span className={`stat-icon ${tone}`}>{icon}</span><span className="stat-change">{change}</span></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-foot">{foot}</span><svg className={`sparkline ${tone}`} viewBox="0 0 90 30" aria-hidden="true"><path d="M1 25 C12 22, 14 10, 25 15 S39 24, 48 13 S62 17, 70 9 S82 11, 89 3" fill="none" stroke="currentColor" strokeWidth="2" /></svg></article>;
}

function Orders({ orders, updateStatus }: { orders: Order[]; updateStatus: (id: number, status: Status) => void }) {
  const [filter, setFilter] = useState("All orders");
  const filters = ["All orders", "New", "In progress", "Ready", "Completed"];
  const visible = orders.filter((order) => filter === "All orders" || (filter === "New" && order.status === "Placed") || (filter === "In progress" && ["Accepted", "Preparing"].includes(order.status)) || (filter === "Ready" && order.status === "Ready") || (filter === "Completed" && ["Served", "Paid", "Cancelled"].includes(order.status)));
  return <section className="panel orders-panel"><div className="orders-toolbar"><div className="tab-filters">{filters.map((item) => <button key={item} className={filter === item ? "chosen" : ""} onClick={() => setFilter(item)}>{item}{item === "New" && orders.some((o) => o.status === "Placed") && <i />}</button>)}</div><button className="select-button">Today ⌄</button></div><OrderTable orders={visible} updateStatus={updateStatus} /></section>;
}

function OrderTable({ orders, updateStatus }: { orders: Order[]; updateStatus: (id: number, status: Status) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>ORDER</th><th>TABLE</th><th>ITEMS</th><th>TIME</th><th>TOTAL</th><th>STATUS</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong className="order-number">#{order.id}</strong><small>{order.customer}</small></td><td>{order.table}</td><td><span className="item-summary">{order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}</span></td><td className="muted">{order.time}</td><td><strong>{money(order.total)}</strong></td><td><span className={`status-badge ${order.status.toLowerCase()}`}><i />{order.status}</span></td><td>{statusNext[order.status] && <button className="next-status" onClick={() => updateStatus(order.id, statusNext[order.status]!)}>{order.status === "Placed" ? "Accept" : statusNext[order.status]} →</button>}</td></tr>)}</tbody></table>{orders.length === 0 && <div className="empty-table">Nothing here just yet.</div>}</div>;
}

function Menu({ dishes, setDishes, onAdd, onEdit }: { dishes: Dish[]; setDishes: (update: (items: Dish[]) => Dish[]) => void; onAdd: () => void; onEdit: (dish: Dish) => void }) {
  return <section className="panel menu-panel"><div className="menu-toolbar"><div className="menu-categories"><span className="selected">All items <b>{dishes.length}</b></span><span>Breakfast <b>{dishes.filter((d) => d.category === "Breakfast").length}</b></span><span>Mains <b>{dishes.filter((d) => d.category === "Mains").length}</b></span><span>Drinks <b>{dishes.filter((d) => d.category === "Drinks").length}</b></span></div><button className="primary-button" onClick={onAdd}>＋ Add a dish</button></div><div className="menu-items">{dishes.map((dish) => <article className="menu-item" key={dish.id}><span className="menu-emoji">{dish.image}</span><span className="menu-name"><strong>{dish.name}</strong><small>{dish.category} · {dish.description}</small></span><strong className="menu-price">{money(dish.price)}</strong><button className={`availability ${dish.available ? "in-stock" : "out-stock"}`} onClick={() => setDishes((current) => current.map((item) => item.id === dish.id ? { ...item, available: !item.available } : item))}><i />{dish.available ? "Available" : "Sold out"}</button><button className="more-button" aria-label={`Edit ${dish.name}`} onClick={() => onEdit(dish)}>···</button></article>)}</div></section>;
}

function Tables({ tables, setTables, showQr }: { tables: Table[]; setTables: (update: (items: Table[]) => Table[]) => void; showQr: (table: Table) => void }) {
  const active = tables.filter((table) => table.active).length;
  return <><div className="table-summary"><div className="summary-item"><span className="summary-icon">▦</span><span><small>TOTAL TABLES</small><strong>{tables.length}</strong></span></div><div className="summary-item"><span className="summary-icon occupied">♙</span><span><small>ACTIVE RIGHT NOW</small><strong>{active} <em>tables open</em></strong></span></div><button className="primary-button" onClick={() => setTables((current) => [...current, { id: Math.max(0, ...current.map((table) => table.id)) + 1, name: `Table ${String(Math.max(0, ...current.map((table) => table.id)) + 1).padStart(2, "0")}`, seats: 2, active: true }])}>＋ Add a table</button></div><section className="panel floor-panel"><div className="panel-heading"><div><h2>Your floor</h2><p>Manage tables and their QR codes</p></div><span className="floor-status"><i /> {active} active</span></div><div className="table-grid">{tables.map((table) => <article className={`table-card ${table.active ? "" : "table-inactive"}`} key={table.id}><div className="table-card-top"><span className="table-icon">▦</span><button className="more-button" aria-label={`${table.name} options`} onClick={() => setTables((current) => current.map((item) => item.id === table.id ? { ...item, active: !item.active } : item))}>···</button></div><strong>{table.name}</strong><span className="seat-count">♙ &nbsp;{table.seats} seats</span><div className="table-card-bottom"><span className="table-state"><i />{table.active ? "Available" : "Disabled"}</span><button className="qr-link" disabled={!table.active} onClick={() => showQr(table)}>View QR ↗</button></div></article>)}</div></section></>;
}

function Reports({ orders, todaySales, dishes }: { orders: Order[]; todaySales: number; dishes: Dish[] }) {
  const completed = orders.filter((order) => ["Served", "Paid"].includes(order.status));
  const average = completed.length ? Math.round(completed.reduce((total, order) => total + order.total, 0) / completed.length) : 0;
  return <><div className="stats-grid"><StatCard icon="↗" label="Gross sales" value={money(todaySales)} change="+12.8%" foot="today" tone="green" /><StatCard icon="▤" label="Total orders" value={String(orders.length)} change="+8.2%" foot="today" tone="blue" /><StatCard icon="◷" label="Average order" value={money(average)} change="+4.3%" foot="completed orders" tone="orange" /><StatCard icon="♙" label="Menu items" value={String(dishes.filter((dish) => dish.available).length)} change={`${dishes.length}`} foot="available / total" tone="purple" /></div><section className="panel report-panel"><div className="panel-heading"><div><h2>Order history</h2><p>A summary of every order today</p></div><span className="select-button">Today ⌄</span></div><OrderTable orders={orders} updateStatus={() => {}} /></section><p className="report-note">Reports are based on demo orders saved in this browser. Connect your database to enable live, multi-device reporting.</p></>;
}
