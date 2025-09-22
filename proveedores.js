document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const supplierList = document.getElementById('supplierList');
    const newSupplierForm = document.getElementById('newSupplierForm');

    /**
     * Obtiene y muestra todos los proveedores
     */
    const fetchSuppliers = async () => {
        try {
            const response = await fetch('/api/proveedores');
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'No se pudo cargar la lista de proveedores.');
            }
            const suppliers = await response.json();

            supplierList.innerHTML = ''; // Limpiar la tabla
            if (suppliers.length === 0) {
                supplierList.innerHTML = '<tr><td colspan="4">No hay proveedores registrados.</td></tr>';
                return;
            }

            suppliers.forEach(supplier => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${supplier.id}</td>
                    <td>${supplier.nombre}</td>
                    <td>${supplier.contacto}</td>
                    <td>
                        <button class="edit-btn" data-id="${supplier.id}">Editar</button>
                        <button class="delete-btn" data-id="${supplier.id}">Eliminar</button>
                    </td>
                `;
                supplierList.appendChild(row);
            });

        } catch (error) {
            console.error('Error al cargar proveedores:', error);
            supplierList.innerHTML = `<tr><td colspan="4" style="color: red;">${error.message}</td></tr>`;
        }
    };

    /**
     * Maneja el envío del formulario para agregar un nuevo proveedor
     */
    const handleAddSupplier = async (event) => {
        event.preventDefault();

        const nombre = document.getElementById('nombre').value;
        const contacto = document.getElementById('contacto').value;

        try {
            const response = await fetch('/api/proveedores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, contacto })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Error al agregar el proveedor.');
            }
            
            const result = await response.json();
            alert(result.mensaje);
            newSupplierForm.reset();
            fetchSuppliers(); // Recargar la lista

        } catch (error) {
            console.error('Error al agregar proveedor:', error);
            alert(`Hubo un error al agregar el proveedor: ${error.message}`);
        }
    };

    // Asignar el evento al formulario
    newSupplierForm.addEventListener('submit', handleAddSupplier);

    // Carga inicial de datos
    fetchSuppliers();
});
