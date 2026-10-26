from cart import cart_total, apply_discount

def test_basic():
    assert cart_total([(1000, 2)]) == 2399

def test_free_shipping_boundary():
    # spending exactly the threshold earns free shipping
    assert cart_total([(2500, 2)]) == 5000

def test_discount_rounding():
    # 15% off 999 = 149.85 -> discount 150 -> 849
    assert apply_discount(999, 15) == 849

def test_discount_then_shipping():
    assert cart_total([(3000, 2)], discount_percent=20) == 4800 + 399
