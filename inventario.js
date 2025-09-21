document.addEventListener('DOMContentLoaded', () => {
    const inventoryList = document.getElementById('inventoryList');
    const newProductForm = document.getElementById('newProductForm');

    // Función para obtener y mostrar todos los productos
    const fetchProducts = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/productos');
            if (!response.ok) {
                throw new Error('No se pudo obtener la lista de productos.');
            }
            const data = await response.json();
            
            // Limpia la tabla antes de insertar los nuevos datos
            inventoryList.innerHTML = '';
            
            // Recorre los productos y los inserta en la tabla
            data.elements[0].elements.forEach(producto => {
                const row = document.createElement('tr');
                const id = producto.attributes.id;
                
                row.innerHTML = `
                    <td>${id}</td>
                    <td>${producto.elements.find(el => el.name === 'nombre').elements[0].text}</td>
                    <td>$${producto.elements.find(el => el.name === 'precio_venta').elements[0].text}</td>
                    <td>${producto.elements.find(el => el.name === 'stock').elements[0].text}</td>
                    <td>
                        <button class="edit-btn" data-id="${id}">Editar</button>
                        <button class="delete-btn" data-id="${id}">Eliminar</button>
                    </td>
                `;
                inventoryList.appendChild(row);
            });
            
        } catch (error) {
            console.error('Error:', error);
            alert('Hubo un error al cargar el inventario.');
        }
    };

    // Función para manejar el envío del formulario
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newProduct)
            });

            if (!response.ok) {
                throw new Error('Error al agregar el producto.');
            }

            alert('Producto agregado exitosamente.');
            newProductForm.reset();
            fetchProducts(); // Vuelve a cargar la lista para mostrar el nuevo producto
            
        } catch (error) {
            console.error('Error:', error);
            alert('Hubo un error al agregar el producto.');
        }
    };

    // Escuchar el evento de envío del formulario
    newProductForm.addEventListener('submit', handleAddProduct);

    // Carga los productos al iniciar la página
    fetchProducts();
});