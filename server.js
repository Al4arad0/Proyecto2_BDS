const express = require('express');
const axios = require('axios');
const cors = require('cors');
const convert = require('xml-js');
const path = require('path');

const app = express();
const PORT = 3000;

// --- CONFIGURACIÓN ---
const existDbUrl = 'http://localhost:8088/exist/rest';
const existDbUser = 'admin';
const existDbPass = 'Alvaalex1003.@.'; // IMPORTANTE: Pon aquí tu contraseña correcta
const dbPath = '/db/miscelanea/pos_miscelanea.xml';

const existDbConfig = {
    auth: { username: existDbUser, password: existDbPass }
};
const xmlOptions = { compact: false, spaces: 4 };

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// --- RUTAS DE PÁGINAS HTML ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/inventario.html', (req, res) => res.sendFile(path.join(__dirname, 'inventario.html')));
app.get('/clientes.html', (req, res) => res.sendFile(path.join(__dirname, 'clientes.html')));
app.get('/proveedores.html', (req, res) => res.sendFile(path.join(__dirname, 'proveedores.html')));
app.get('/reportes.html', (req, res) => res.sendFile(path.join(__dirname, 'reportes.html')));
app.get('/configuracion.html', (req, res) => res.sendFile(path.join(__dirname, 'configuracion.html')));

// --- FUNCIÓN AUXILIAR PARA NODOS ---
const findNode = (elements, name) => elements.find(el => el.type === 'element' && el.name === name);

// --- API PARA PRODUCTOS ---
app.get('/api/productos', async (req, res) => {
    try {
        const response = await axios.get(`${existDbUrl}${dbPath}`, existDbConfig);
        const jsData = convert.xml2js(response.data, xmlOptions);
        const posNode = findNode(jsData.elements, 'pos_miscelanea');
        const inventarioNode = findNode(posNode.elements, 'inventario');
        if (!inventarioNode || !inventarioNode.elements) return res.json([]);

        const cleanProducts = inventarioNode.elements
            .filter(el => el.type === 'element' && el.name === 'producto')
            .map(p => {
                const productData = { id: p.attributes.id };
                p.elements.forEach(field => {
                    const value = field.elements ? field.elements[0].text : '';
                    productData[field.name] = value;
                });
                productData.precio_venta = parseFloat(productData.precio_venta) || 0;
                productData.precio_compra = parseFloat(productData.precio_compra) || 0;
                productData.stock = parseInt(productData.stock, 10) || 0;
                return productData;
            });
        res.json(cleanProducts);
    } catch (error) {
        console.error("Error al obtener productos:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        const nuevoProductoData = req.body;
        const getResponse = await axios.get(`${existDbUrl}${dbPath}`, existDbConfig);
        const jsData = convert.xml2js(getResponse.data, xmlOptions);
        const posNode = findNode(jsData.elements, 'pos_miscelanea');
        const inventarioNode = findNode(posNode.elements, 'inventario');

        const nuevoProducto = {
            type: 'element', name: 'producto', attributes: { id: `prod_${Date.now()}` },
            elements: [
                { type: 'element', name: 'nombre', elements: [{ type: 'text', text: nuevoProductoData.nombre }] },
                { type: 'element', name: 'codigo_barras', elements: [{ type: 'text', text: nuevoProductoData.codigo_barras }] },
                { type: 'element', name: 'precio_compra', elements: [{ type: 'text', text: nuevoProductoData.precio_compra }] },
                { type: 'element', name: 'precio_venta', elements: [{ type: 'text', text: nuevoProductoData.precio_venta }] },
                { type: 'element', name: 'stock', elements: [{ type: 'text', text: nuevoProductoData.stock }] },
                { type: 'element', name: 'unidad', elements: [{ type: 'text', text: nuevoProductoData.unidad }] },
                { type: 'element', name: 'proveedor_ref', elements: [{ type: 'text', text: nuevoProductoData.proveedor_ref }] },
                { type: 'element', name: 'fecha_alta', elements: [{ type: 'text', text: new Date().toISOString().slice(0, 10) }] }
            ]
        };
        if(!inventarioNode.elements) inventarioNode.elements = [];
        inventarioNode.elements.push(nuevoProducto);

        const nuevoXmlData = convert.js2xml(jsData, { ...xmlOptions, declarationKey: 'declaration' });
        await axios.put(`${existDbUrl}${dbPath}`, nuevoXmlData, { ...existDbConfig, headers: { 'Content-Type': 'application/xml' } });
        res.status(201).json({ mensaje: 'Producto agregado exitosamente.' });
    } catch (error) {
        console.error("Error al agregar producto:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// --- API PARA VENTAS ---
app.post('/api/ventas', async (req, res) => {
    try {
        const { items } = req.body;
        const getResponse = await axios.get(`${existDbUrl}${dbPath}`, existDbConfig);
        const jsData = convert.xml2js(getResponse.data, xmlOptions);
        const posNode = findNode(jsData.elements, 'pos_miscelanea');

        const ventasNode = findNode(posNode.elements, 'ventas');
        const inventarioNode = findNode(posNode.elements, 'inventario');
        if (!ventasNode || !inventarioNode) throw new Error('Estructura XML inválida.');
        if (!ventasNode.elements) ventasNode.elements = [];

        const totalVenta = items.reduce((sum, item) => sum + item.precio_venta * item.quantity, 0);
        const nuevaVenta = {
            type: 'element', name: 'venta', attributes: { id: `vent_${Date.now()}` },
            elements: [
                { type: 'element', name: 'fecha', elements: [{ type: 'text', text: new Date().toISOString().slice(0, 10) }] },
                { type: 'element', name: 'hora', elements: [{ type: 'text', text: new Date().toTimeString().slice(0, 8) }] },
                { type: 'element', name: 'total', elements: [{ type: 'text', text: totalVenta.toFixed(2) }] },
                {
                    type: 'element', name: 'items',
                    elements: items.map(item => ({
                        type: 'element', name: 'item',
                        attributes: { producto_id: item.id, cantidad: item.quantity }
                    }))
                },
                { type: 'element', name: 'tipo_pago', elements: [{ type: 'text', text: 'Efectivo' }] }
            ]
        };
        ventasNode.elements.push(nuevaVenta);

        items.forEach(item => {
            const productoNode = inventarioNode.elements.find(p => p.attributes && p.attributes.id === item.id);
            if (productoNode) {
                const stockNode = findNode(productoNode.elements, 'stock');
                const stockActual = parseInt(stockNode.elements[0].text, 10);
                stockNode.elements[0].text = (stockActual - item.quantity).toString();
            }
        });

        const nuevoXmlData = convert.js2xml(jsData, { ...xmlOptions, declarationKey: 'declaration' });
        await axios.put(`${existDbUrl}${dbPath}`, nuevoXmlData, { ...existDbConfig, headers: { 'Content-Type': 'application/xml' } });
        res.status(201).json({ mensaje: 'Venta realizada con éxito.' });
    } catch (error) {
        console.error("Error al procesar venta:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// --- API PARA CLIENTES ---
app.get('/api/clientes', async (req, res) => {
    try {
        const response = await axios.get(`${existDbUrl}${dbPath}`, existDbConfig);
        const jsData = convert.xml2js(response.data, xmlOptions);
        const posNode = findNode(jsData.elements, 'pos_miscelanea');
        const clientesNode = findNode(posNode.elements, 'clientes');
        if (!clientesNode || !clientesNode.elements) return res.json([]);
        
        const cleanClients = clientesNode.elements
            .filter(el => el.type === 'element' && el.name === 'cliente')
            .map(p => {
                const clientData = { id: p.attributes.id };
                p.elements.forEach(field => {
                    if (field.name === 'nombre' || field.name === 'telefono') {
                        clientData[field.name] = field.elements ? field.elements[0].text : '';
                    }
                });
                return clientData;
            });
        res.json(cleanClients);
    } catch (error) {
        console.error("Error al obtener clientes:", error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const { nombre, telefono } = req.body;
        const getResponse = await axios.get(`${existDbUrl}${dbPath}`, existDbConfig);
        const jsData = convert.xml2js(getResponse.data, xmlOptions);
        const posNode = findNode(jsData.elements, 'pos_miscelanea');
        let clientesNode = findNode(posNode.elements, 'clientes');

        if (!clientesNode) {
            clientesNode = { type: 'element', name: 'clientes', elements: [] };
            posNode.elements.push(clientesNode);
        }
        if (!clientesNode.elements) clientesNode.elements = [];

        const nuevoCliente = {
            type: 'element', name: 'cliente', attributes: { id: `clt_${Date.now()}` },
            elements: [
                { type: 'element', name: 'nombre', elements: [{ type: 'text', text: nombre }] },
                { type: 'element', name: 'telefono', elements: [{ type: 'text', text: telefono || '' }] }
            ]
        };
        clientesNode.elements.push(nuevoCliente);

        const nuevoXmlData = convert.js2xml(jsData, { ...xmlOptions, declarationKey: 'declaration' });
        await axios.put(`${existDbUrl}${dbPath}`, nuevoXmlData, { ...existDbConfig, headers: { 'Content-Type': 'application/xml' } });
        res.status(201).json({ mensaje: 'Cliente agregado exitosamente.' });
    } catch (error) {
        console.error("Error al agregar cliente:", error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// --- API PARA REPORTES ---
app.get('/api/reportes/datos-ventas', async (req, res) => {
    try {
        const response = await axios.get(`${existDbUrl}${dbPath}`, existDbConfig);
        const jsData = convert.xml2js(response.data, xmlOptions);
        
        const posNode = findNode(jsData.elements, 'pos_miscelanea');
        const inventarioNode = findNode(posNode.elements, 'inventario');
        const ventasNode = findNode(posNode.elements, 'ventas');

        if (!ventasNode || !ventasNode.elements) {
            return res.json({
                summary: { totalRevenue: 0, totalSales: 0, averageTicket: 0 },
                salesByMonth: [],
                topProducts: []
            });
        }
        
        const ventas = ventasNode.elements.filter(el => el.type === 'element' && el.name === 'venta');
        
        const totalRevenue = ventas.reduce((sum, venta) => {
            const totalNode = findNode(venta.elements, 'total');
            return sum + (parseFloat(totalNode.elements[0].text) || 0);
        }, 0);
        const totalSales = ventas.length;
        const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

        const salesByMonthMap = {};
        ventas.forEach(venta => {
            const fechaNode = findNode(venta.elements, 'fecha');
            const totalNode = findNode(venta.elements, 'total');
            const month = fechaNode.elements[0].text.substring(0, 7);
            const total = parseFloat(totalNode.elements[0].text) || 0;
            salesByMonthMap[month] = (salesByMonthMap[month] || 0) + total;
        });
        const salesByMonth = Object.entries(salesByMonthMap).map(([month, total]) => ({ month, total })).sort((a,b) => a.month.localeCompare(b.month));

        const productSales = {};
        ventas.forEach(venta => {
            const itemsNode = findNode(venta.elements, 'items');
            if(itemsNode && itemsNode.elements) {
                itemsNode.elements.filter(el => el.name === 'item').forEach(item => {
                    const id = item.attributes.producto_id;
                    const qty = parseInt(item.attributes.cantidad, 10);
                    productSales[id] = (productSales[id] || 0) + qty;
                });
            }
        });

        const productMap = {};
        if (inventarioNode && inventarioNode.elements) {
            inventarioNode.elements.filter(el => el.name === 'producto').forEach(p => {
                productMap[p.attributes.id] = findNode(p.elements, 'nombre').elements[0].text;
            });
        }
        
        const topProducts = Object.entries(productSales)
            .sort(([,a],[,b]) => b - a)
            .slice(0, 5)
            .map(([id, quantity]) => ({
                name: productMap[id] || `ID: ${id} (no encontrado)`,
                quantity
            }));

        res.json({
            summary: { totalRevenue, totalSales, averageTicket },
            salesByMonth,
            topProducts
        });

    } catch (error) {
        console.error("Error al generar reporte:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error interno del servidor al generar reporte.' });
    }
});

// --- API PARA CONFIGURACIÓN ---
app.get('/api/configuracion', async (req, res) => {
    try {
        const response = await axios.get(`${existDbUrl}${dbPath}`, existDbConfig);
        const jsData = convert.xml2js(response.data, xmlOptions);
        const posNode = findNode(jsData.elements, 'pos_miscelanea');
        let configNode = findNode(posNode.elements, 'configuracion');

        if (!configNode || !configNode.elements) {
            return res.json({ nombre_tienda: '', direccion: '' });
        }

        const settings = {};
        configNode.elements.forEach(field => {
            if (field.name === 'nombre_tienda' || field.name === 'direccion') {
                settings[field.name] = field.elements ? field.elements[0].text : '';
            }
        });

        res.json(settings);
    } catch (error) {
        console.error("Error al obtener configuración:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.post('/api/configuracion', async (req, res) => {
    try {
        const { nombre_tienda, direccion } = req.body;
        const getResponse = await axios.get(`${existDbUrl}${dbPath}`, existDbConfig);
        const jsData = convert.xml2js(getResponse.data, xmlOptions);
        const posNode = findNode(jsData.elements, 'pos_miscelanea');
        let configNode = findNode(posNode.elements, 'configuracion');

        if (!configNode) {
            configNode = { type: 'element', name: 'configuracion', elements: [] };
            posNode.elements.unshift(configNode);
        }

        const updateField = (node, fieldName, value) => {
            let fieldNode = node.elements.find(el => el.name === fieldName);
            if (fieldNode) {
                if (fieldNode.elements && fieldNode.elements[0]) {
                    fieldNode.elements[0].text = value;
                } else {
                    fieldNode.elements = [{ type: 'text', text: value }];
                }
            } else {
                node.elements.push({ type: 'element', name: fieldName, elements: [{ type: 'text', text: value }] });
            }
        };

        updateField(configNode, 'nombre_tienda', nombre_tienda);
        updateField(configNode, 'direccion', direccion);

        const nuevoXmlData = convert.js2xml(jsData, { ...xmlOptions, declarationKey: 'declaration' });
        await axios.put(`${existDbUrl}${dbPath}`, nuevoXmlData, { ...existDbConfig, headers: { 'Content-Type': 'application/xml' } });

        res.status(200).json({ mensaje: 'Configuración guardada exitosamente.' });
    } catch (error) {
        console.error("Error al guardar configuración:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// --- API PARA PROVEEDORES ---
app.get('/api/proveedores', async (req, res) => {
    try {
        const response = await axios.get(`${existDbUrl}${dbPath}`, existDbConfig);
        const jsData = convert.xml2js(response.data, xmlOptions);
        const posNode = findNode(jsData.elements, 'pos_miscelanea');
        const proveedoresNode = findNode(posNode.elements, 'proveedores');
        if (!proveedoresNode || !proveedoresNode.elements) return res.json([]);
        
        const cleanSuppliers = proveedoresNode.elements
            .filter(el => el.type === 'element' && el.name === 'proveedor')
            .map(p => {
                const supplierData = { id: p.attributes.id };
                p.elements.forEach(field => {
                    if (field.name === 'nombre' || field.name === 'contacto') {
                        supplierData[field.name] = field.elements ? field.elements[0].text : '';
                    }
                });
                return supplierData;
            });
        res.json(cleanSuppliers);
    } catch (error) {
        console.error("Error al obtener proveedores:", error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.post('/api/proveedores', async (req, res) => {
    try {
        const { nombre, contacto } = req.body;
        const getResponse = await axios.get(`${existDbUrl}${dbPath}`, existDbConfig);
        const jsData = convert.xml2js(getResponse.data, xmlOptions);
        const posNode = findNode(jsData.elements, 'pos_miscelanea');
        let proveedoresNode = findNode(posNode.elements, 'proveedores');

        if (!proveedoresNode) {
            proveedoresNode = { type: 'element', name: 'proveedores', elements: [] };
            posNode.elements.push(proveedoresNode);
        }
        if (!proveedoresNode.elements) proveedoresNode.elements = [];

        const nuevoProveedor = {
            type: 'element', name: 'proveedor', attributes: { id: `prov_${Date.now()}` },
            elements: [
                { type: 'element', name: 'nombre', elements: [{ type: 'text', text: nombre }] },
                { type: 'element', name: 'contacto', elements: [{ type: 'text', text: contacto || '' }] }
            ]
        };
        proveedoresNode.elements.push(nuevoProveedor);

        const nuevoXmlData = convert.js2xml(jsData, { ...xmlOptions, declarationKey: 'declaration' });
        await axios.put(`${existDbUrl}${dbPath}`, nuevoXmlData, { ...existDbConfig, headers: { 'Content-Type': 'application/xml' } });
        res.status(201).json({ mensaje: 'Proveedor agregado exitosamente.' });
    } catch (error) {
        console.error("Error al agregar proveedor:", error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor de backend escuchando en http://localhost:${PORT}`);
});

