document.addEventListener('DOMContentLoaded', () => {
    const inventoryList = document.getElementById('inventoryList');
    const newProductForm = document.getElementById('newProductForm');

    // Función para obtener y mostrar todos los productos
    const fetchProducts = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/productos');
            
            if (!response.ok) {
                // Si el servidor responde con un error (ej. 500), lo muestra en la consola.
                const errorData = await response.json();
                throw new Error(errorData.error || 'No se pudo obtener la lista de productos.');
            }
            
            const products = await response.json();
            
            inventoryList.innerHTML = ''; // Limpia la tabla antes de insertar los nuevos datos
            
            if (products.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="5" style="text-align:center;">No hay productos en el inventario.</td>`;
                inventoryList.appendChild(row);
                return;
            }

            // Recorre el array de productos y crea una fila por cada uno.
            products.forEach(product => {
                const row = document.createElement('tr');
                
                // Accede a las propiedades directamente (ej. product.nombre)
                row.innerHTML = `
                    <td>${product.id}</td>
                    <td>${product.nombre}</td>
                    <td>$${product.precio_venta.toFixed(2)}</td>
                    <td>${product.stock}</td>
                    <td>
                        <button class="edit-btn" data-id="${product.id}">Editar</button>
                        <button class="delete-btn" data-id="${product.id}">Eliminar</button>
                    </td>
                `;
                inventoryList.appendChild(row);
            });
            
        } catch (error) {
            console.error('Error en fetchProducts:', error);
            inventoryList.innerHTML = '';
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5" style="text-align:center; color: red;">Error al cargar el inventario: ${error.message}</td>`;
            inventoryList.appendChild(row);
        }
    };

    // Función para manejar el envío del formulario de nuevo producto
    const handleAddProduct = async (event) => {
        event.preventDefault();

        const newProduct = {
            nombre: document.getElementById('nombre').value,
            codigo_barras: document.getElementById('codigo_barras').value,
            precio_compra: document.getElementById('precio_compra').value,
            precio_venta: document.getElementById('precio_venta').value,
            stock: document.getElementById('stock').value,
            unidad: document.getElementById('unidad').value,
            proveedor_ref: document.getElementById('proveedor_ref').value
        };

        try {
            const response = await fetch('http://localhost:3000/api/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct)
            });

            if (!response.ok) {
                throw new Error('Error al agregar el producto.');
            }

            alert('Producto agregado exitosamente.');
            newProductForm.reset();
            fetchProducts(); // Vuelve a cargar la lista para mostrar el nuevo producto
            
        } catch (error) {
            console.error('Error en handleAddProduct:', error);
            alert(`Hubo un error al agregar el producto: ${error.message}`);
        }
    };

    // Escuchar el evento de envío del formulario
    newProductForm.addEventListener('submit', handleAddProduct);

    // Carga los productos al iniciar la página
    fetchProducts();
});


