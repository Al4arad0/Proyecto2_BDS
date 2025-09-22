document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settingsForm');
    const storeNameInput = document.getElementById('storeName');
    const storeAddressInput = document.getElementById('storeAddress');

    // --- FUNCIÓN PARA CARGAR LA CONFIGURACIÓN ACTUAL ---
    const loadSettings = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/configuracion');
            if (!response.ok) {
                throw new Error('No se pudo cargar la configuración.');
            }
            const settings = await response.json();
            
            // Llenar el formulario con los datos recibidos
            if (settings.nombre_tienda) {
                storeNameInput.value = settings.nombre_tienda;
            }
            if (settings.direccion) {
                storeAddressInput.value = settings.direccion;
            }

        } catch (error) {
            console.error('Error al cargar la configuración:', error);
            alert('No se pudo cargar la configuración actual desde el servidor.');
        }
    };

    // --- FUNCIÓN PARA GUARDAR LA CONFIGURACIÓN ---
    const handleSaveSettings = async (event) => {
        event.preventDefault();

        const newSettings = {
            nombre_tienda: storeNameInput.value,
            direccion: storeAddressInput.value,
        };

        try {
            const response = await fetch('http://localhost:3000/api/configuracion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error desconocido al guardar.');
            }

            alert('Configuración guardada exitosamente.');

        } catch (error) {
            console.error('Error al guardar la configuración:', error);
            alert(`Hubo un error al guardar los cambios: ${error.message}`);
        }
    };

    // --- ASIGNACIÓN DE EVENTOS ---
    settingsForm.addEventListener('submit', handleSaveSettings);

    // Carga inicial de la configuración
    loadSettings();
});

