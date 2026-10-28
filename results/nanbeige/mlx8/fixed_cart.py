"""Tiny shopping-cart module with the bugs fixed."""

def line_total(price_pence: int, qty: int) -> int:
    return price_pence * qty

def apply_discount(total_pence: int, percent: int) -> int:
    """Percent off, rounded to the nearest penny (half rounds up)."""
    discount = (total_pence * percent + 50) // 100
    return total_pence - discount

def cart_total(items, discount_percent=0, free_shipping_over=5000, shipping=399):
    subtotal = sum(line_total(p, q) for p, q in items)
    total = apply_discount(subtotal, discount_percent)
    if total >= free_shipping_over:
        return total
    return total + shipping
