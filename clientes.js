document.addEventListener('DOMContentLoaded', () => {
    const clientList = document.getElementById('clientList');
    const newClientForm = document.getElementById('newClientForm');

    // Función para obtener y mostrar todos los clientes
    const fetchClients = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/clientes');
            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            const clients = await response.json();
            
            clientList.innerHTML = ''; // Limpiar la tabla

            if (clients.length === 0) {
                clientList.innerHTML = '<tr><td colspan="5">No hay clientes registrados.</td></tr>';
                return;
            }

            clients.forEach(client => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${client.id}</td>
                    <td>${client.nombre}</td>
                    <td>${client.telefono}</td>
                    <td>$${parseFloat(client.deuda || 0).toFixed(2)}</td>
                    <td>
                        <button class="edit-btn" data-id="${client.id}">Editar</button>
                        <button class="delete-btn" data-id="${client.id}">Eliminar</button>
                    </td>
                `;
                clientList.appendChild(row);
            });

        } catch (error) {
            console.error('Error al obtener clientes:', error);
            clientList.innerHTML = '<tr><td colspan="5">Error al cargar los clientes.</td></tr>';
        }
    };

    // Función para manejar el envío del formulario de nuevo cliente
    const handleAddClient = async (event) => {
        event.preventDefault();

        const newClient = {
            nombre: document.getElementById('nombre').value,
            telefono: document.getElementById('telefono').value,
            deuda: document.getElementById('deuda').value || '0'
        };

        try {
            const response = await fetch('http://localhost:3000/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newClient)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error desconocido al agregar cliente.');
            }

            alert('Cliente agregado exitosamente.');
            newClientForm.reset();
            fetchClients(); // Recargar la lista de clientes

        } catch (error) {
            console.error('Error al agregar cliente:', error);
            alert(`Hubo un error al agregar el cliente: ${error.message}`);
        }
    };

    // Asignar el evento al formulario
    newClientForm.addEventListener('submit', handleAddClient);

    // Cargar los clientes al iniciar la página
    fetchClients();
});