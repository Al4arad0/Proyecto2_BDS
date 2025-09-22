document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const generateReportBtn = document.getElementById('generateReportBtn');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalSalesEl = document.getElementById('totalSales');
    const averageTicketEl = document.getElementById('averageTicket');
    const topProductsTableBody = document.getElementById('topProductsTableBody');
    const chartContainer = document.getElementById('salesChart');
    let salesChart = null; // Variable para mantener la instancia del gráfico

    /**
     * Dibuja el gráfico de ventas mensuales usando Chart.js
     * @param {Array} salesByMonth - Array de objetos, ej. [{ month: '2025-09', total: 500 }]
     */
    const renderSalesChart = (salesByMonth) => {
        const labels = salesByMonth.map(item => item.month);
        const data = salesByMonth.map(item => item.total);

        // Si ya existe un gráfico, lo destruye antes de crear uno nuevo
        if (salesChart) {
            salesChart.destroy();
        }

        const ctx = chartContainer.getContext('2d');
        salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas Totales por Mes ($)',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });
    };

    /**
     * Llena la tabla con los productos más vendidos
     * @param {Array} topProducts - Array de objetos, ej. [{ name: 'Coca-Cola', quantity: 10 }]
     */
    const renderTopProductsTable = (topProducts) => {
        topProductsTableBody.innerHTML = ''; // Limpiar tabla
        if (topProducts.length === 0) {
            topProductsTableBody.innerHTML = '<tr><td colspan="2">No hay datos de productos.</td></tr>';
            return;
        }
        topProducts.forEach(product => {
            const row = topProductsTableBody.insertRow();
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.quantity}</td>
            `;
        });
    };

    /**
     * Actualiza las tarjetas de resumen con los datos principales
     * @param {Object} summary - Objeto con { totalRevenue, totalSales, averageTicket }
     */
    const renderSummaryCards = (summary) => {
        totalRevenueEl.textContent = `$${summary.totalRevenue.toFixed(2)}`;
        totalSalesEl.textContent = summary.totalSales;
        averageTicketEl.textContent = `$${summary.averageTicket.toFixed(2)}`;
    };

    /**
     * Función principal para obtener y mostrar los datos del reporte
     */
    const fetchAndDisplayReport = async () => {
        try {
            const response = await fetch('/api/reportes/datos-ventas');
            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            const reportData = await response.json();

            // Renderizar todos los componentes de la página
            renderSummaryCards(reportData.summary);
            renderSalesChart(reportData.salesByMonth);
            renderTopProductsTable(reportData.topProducts);

        } catch (error) {
            console.error('Error al generar el reporte:', error);
            alert(`No se pudo generar el reporte: ${error.message}`);
        }
    };

    // Asignar el evento al botón
    generateReportBtn.addEventListener('click', fetchAndDisplayReport);
    
    // Generar un reporte inicial al cargar la página
    fetchAndDisplayReport();
});

