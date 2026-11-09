import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

const STORAGE_KEY = "slicehouse-cart-v1";

const CartContext = createContext(null);

function readCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function cartKey({ type, menuSlug, size, ingredients }) {
  if (type === "menu") return `menu:${menuSlug}:${size}`;
  const vegetables = [...(ingredients?.vegetables || [])].sort().join("+");
  return `custom:${size}:${ingredients?.base}:${ingredients?.sauce}:${ingredients?.cheese}:${vegetables}`;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage can be full or blocked — the cart still works in memory */
    }
  }, [items]);

  function add(item) {
    setItems((current) => {
      const index = current.findIndex((entry) => entry.key === item.key);

      if (index === -1) return [...current, item];

      const next = [...current];
      next[index] = {
        ...next[index],
        quantity: Math.min(20, next[index].quantity + (item.quantity || 1))
      };
      return next;
    });
  }

  function remove(key) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  function setQuantity(key, quantity) {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? { ...item, quantity: Math.max(1, Math.min(20, Number(quantity) || 1)) }
          : item
      )
    );
  }

  function clear() {
    setItems([]);
  }

  const count = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0
  );

  const value = useMemo(
    () => ({ items, count, subtotal, add, remove, setQuantity, clear }),
    [items, count, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return context;
}
