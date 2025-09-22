document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const productListContainer = document.querySelector('.product-list');
    const cartItemsList = document.getElementById('cartItems');
    const totalAmountSpan = document.getElementById('totalAmount');
    const checkoutBtn = document.querySelector('.checkout-btn');
    const cancelBtn = document.querySelector('.cancel-btn');
    const searchInput = document.getElementById('searchInput');

    let cart = []; // Array para mantener el estado del carrito
    let allProducts = []; // Array para mantener todos los productos y facilitar la búsqueda

    /**
     * Renderiza la lista de productos en la interfaz
     * @param {Array} products - La lista de productos a mostrar
     */
    const renderProducts = (products) => {
        productListContainer.innerHTML = ''; // Limpiar la lista
        if (products.length === 0) {
            productListContainer.innerHTML = '<p>No se encontraron productos.</p>';
            return;
        }
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="https://placehold.co/100x100/e2e8f0/e2e8f0?text=Producto" alt="${product.nombre}">
                <div class="product-info">
                    <h4>${product.nombre}</h4>
                    <p>$${product.precio_venta.toFixed(2)}</p>
                    <small>Stock: ${product.stock}</small>
                </div>
            `;
            // Añadir evento para agregar al carrito
            card.addEventListener('click', () => addToCart(product));
            productListContainer.appendChild(card);
        });
    };

    /**
     * Renderiza los items del carrito en la interfaz y actualiza el total
     */
    const renderCart = () => {
        cartItemsList.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartItemsList.innerHTML = '<li>El carrito está vacío.</li>';
            totalAmountSpan.textContent = '$0.00';
            return;
        }

        cart.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.nombre} (x${item.quantity})</span>
                <span>$${(item.precio_venta * item.quantity).toFixed(2)}</span>
            `;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '–';
            removeBtn.className = 'remove-item-btn';
            removeBtn.onclick = () => removeFromCart(item.id);
            li.prepend(removeBtn);
            
            cartItemsList.appendChild(li);
            total += item.precio_venta * item.quantity;
        });

        totalAmountSpan.textContent = `$${total.toFixed(2)}`;
    };
    
    /**
     * Añade un producto al carrito o incrementa su cantidad si ya existe
     * @param {Object} product - El producto a añadir
     */
    const addToCart = (product) => {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                existingItem.quantity++;
            } else {
                alert('No hay más stock disponible para este producto.');
            }
        } else {
             if (product.stock > 0) {
                cart.push({ ...product, quantity: 1 });
             } else {
                alert('Este producto está agotado.');
             }
        }
        renderCart();
    };

    /**
     * Reduce la cantidad de un producto en el carrito o lo elimina
     * @param {string} productId - El ID del producto a remover
     */
    const removeFromCart = (productId) => {
        const itemIndex = cart.findIndex(item => item.id === productId);
        if (itemIndex > -1) {
            if (cart[itemIndex].quantity > 1) {
                cart[itemIndex].quantity--;
            } else {
                cart.splice(itemIndex, 1);
            }
        }
        renderCart();
    };

    /**
     * Procesa el pago, enviando la venta al backend
     */
    const handleCheckout = async () => {
        if (cart.length === 0) {
            alert('El carrito está vacío.');
            return;
        }

        try {
            const response = await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Error al procesar la venta.');
            }

            const result = await response.json();
            alert(result.mensaje);
            cart = [];
            renderCart();
            fetchProducts();
        } catch (error) {
            console.error('Error al realizar la venta:', error);
            alert(`Hubo un error al procesar la venta: ${error.message}`);
        }
    };

    /**
     * Filtra los productos mostrados según el texto de búsqueda
     */
    const handleSearch = () => {
        const query = searchInput.value.toLowerCase();
        const filteredProducts = allProducts.filter(product => 
            product.nombre.toLowerCase().includes(query)
        );
        renderProducts(filteredProducts);
    };

    /**
     * Obtiene la lista de productos del servidor
     */
    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/productos');
            if (!response.ok) {
                throw new Error('No se pudo cargar la lista de productos.');
            }
            allProducts = await response.json();
            renderProducts(allProducts);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            productListContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    };
    
    // Asignar eventos
    checkoutBtn.addEventListener('click', handleCheckout);
    cancelBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas cancelar la venta?')) {
            cart = [];
            renderCart();
        }
    });
    searchInput.addEventListener('input', handleSearch);

    // Carga inicial
    fetchProducts();
    renderCart();
});

