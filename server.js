
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const convert = require('xml-js');
const path = require('path'); // Importar el módulo path

// Crea una instancia de Express
const app = express();
const PORT = 3000;

// Middleware

app.use(express.json()); // Permite a Express leer JSON en el cuerpo de las peticiones
app.use(cors()); // Habilita CORS para permitir peticiones desde tu front-end

// Sirve los archivos estáticos desde la carpeta actual
// Esto permitirá al navegador encontrar index.html, styles.css, etc.
app.use(express.static(path.join(__dirname, '/')));

// Sirve el archivo HTML principal para la ruta raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Sirve el archivo HTML para la ruta de inventario
app.get('/inventario.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'inventario.html'));
});

app.get('/clientes.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'clientes.html'));
});

app.get('/configuracion.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'configuracion.html'));
});

app.get('/reportes.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'reportes.html'));
});

// Configuración de la base de datos eXist-db
const existDbUrl = 'http://localhost:8088/exist/rest/db';
const existDbUser = 'admin';
const existDbPass = 'admin';

// Middleware de autenticación básica para eXist-db
const existDbConfig = {
    auth: {
        username: existDbUser,
        password: existDbPass
    }
};

// --- RUTAS DE LA APLICACIÓN ---
// ## Manejo de Productos ##

// Ruta para obtener todos los productos del inventario
app.get('/api/productos', async (req, res) => {
    try {
        // Consulta XQuery para seleccionar todos los productos del documento XML
        const xquery = `
            xquery version "3.1";
            let $doc := doc("pos_miscelanea.xml")/pos_miscelanea
            return $doc/inventario/producto
        `;

        // Realiza la petición a la API REST de eXist-db
        const response = await axios.post(
            `${existDbUrl}/consulta`,
            xquery,
            existDbConfig
        );
        // Envía los datos de los productos como respuesta
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para actualizar un producto.
app.put('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const productoActualizado = req.body;
        
        const xquery = `
            xquery version "3.1";
            let $producto := doc("pos_miscelanea.xml")/pos_miscelanea/inventario/producto[@id="${id}"]
            return (
                update replace $producto/nombre with <nombre>${productoActualizado.nombre}</nombre>,
                update replace $producto/codigo_barras with <codigo_barras>${productoActualizado.codigo_barras}</codigo_barras>,
                update replace $producto/precio_compra with <precio_compra>${productoActualizado.precio_compra}</precio_compra>,
                update replace $producto/precio_venta with <precio_venta>${productoActualizado.precio_venta}</precio_venta>,
                update replace $producto/stock with <stock>${productoActualizado.stock}</stock>,
                update replace $producto/unidad with <unidad>${productoActualizado.unidad}</unidad>,
                update replace $producto/proveedor_ref with <proveedor_ref>${productoActualizado.proveedor_ref}</proveedor_ref>
            )
        `;

        await axios.post(`${existDbUrl}/consulta`, xquery, existDbConfig);
        res.status(200).json({ mensaje: 'Producto actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para agregar un nuevo producto
app.post('/api/productos', async (req, res) => {
    try {
        const nuevoProducto = req.body;
        const nuevoId = `prod_${Math.floor(Math.random() * 10000)}`; // Genera un ID simple

        // Transacción XQuery para insertar un nuevo producto
        const xquery = `
            xquery version "3.1";
            update insert
                <producto id="${nuevoId}">
                    <nombre>${nuevoProducto.nombre}</nombre>
                    <codigo_barras>${nuevoProducto.codigo_barras}</codigo_barras>
                    <precio_compra>${nuevoProducto.precio_compra}</precio_compra>
                    <precio_venta>${nuevoProducto.precio_venta}</precio_venta>
                    <stock>${nuevoProducto.stock}</stock>
                    <unidad>${nuevoProducto.unidad}</unidad>
                    <proveedor>${nuevoProducto.proveedor}</proveedor>
                    <fecha_alta>${new Date().toISOString().slice(0, 10)}</fecha_alta>
                </producto>
            into doc("pos_miscelanea.xml")/pos_miscelanea/inventario
        `;

        await axios.post(
            `${existDbUrl}/consulta`,
            xquery,
            existDbConfig
        );



        res.status(201).json({ mensaje: 'Producto agregado exitosamente', id: nuevoId });
    } catch (error) {
        console.error('Error al agregar producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para eliminar un producto
app.delete('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const xquery = `
            xquery version "3.1";
            let $producto := doc("pos_miscelanea.xml")/pos_miscelanea/inventario/producto[@id="${id}"]
            return update delete $producto
        `;

        await axios.post(`${existDbUrl}/consulta`, xquery, existDbConfig);
        res.status(200).json({ mensaje: 'Producto eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ## Manejo de Ventas y Tickets ##

// Ruta para realizar una venta
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, tipo_pago, cliente_id } = req.body;
        const ventaId = `vent_${new Date().getTime()}`;
        let totalVenta = 0;
        const itemsXml = items.map(item => {
            totalVenta += item.precio * item.cantidad;
            return `<item producto_id="${item.id}" cantidad="${item.cantidad}"/>`;
        }).join('');

        // Transacción XQuery para insertar la venta y actualizar el stock
        // Usamos una secuencia para ejecutar múltiples actualizaciones
        const xquery = `
            xquery version "3.1";
            let $venta := <venta id="${ventaId}">
                <fecha>${new Date().toISOString().slice(0, 10)}</fecha>
                <hora>${new Date().toTimeString().slice(0, 8)}</hora>
                <total>${totalVenta}</total>
                <items>${itemsXml}</items>
                <tipo_pago>${tipo_pago}</tipo_pago>
            </venta>

           

            update insert $venta into doc("pos_miscelanea.xml")/pos_miscelanea/ventas;

            ${items.map(item => `
                let $producto := doc("pos_miscelanea.xml")/pos_miscelanea/inventario/producto[@id="${item.id}"]
                let $nuevoStock := xs:integer($producto/stock) - xs:integer(${item.cantidad})
                return update replace $producto/stock with <stock>{$nuevoStock}</stock>
            `).join(';')}
        `;

       

        await axios.post(
            `${existDbUrl}/consulta`,
            xquery,
            existDbConfig
        );
        // Lógica para crédito a clientes (si aplica)
        if (tipo_pago === 'credito' && cliente_id) {
            // Lógica para agregar la deuda a la cuenta del cliente
        }



        res.status(201).json({ mensaje: 'Venta realizada con éxito', total: totalVenta });
    } catch (error) {
        console.error('Error al realizar la venta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// ## Manejo de Clientes ##

// Ruta para obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
    try {
        const xquery = `
            xquery version "3.1";
            let $doc := doc("pos_miscelanea.xml")/pos_miscelanea
            return $doc/clientes/cliente
        `;
        const response = await axios.post(`${existDbUrl}/consulta`, xquery, existDbConfig);
        // Utiliza convert.xml2json para procesar la respuesta
        const clientesXml = response.data;
        const clientesJson = convert.xml2json(clientesXml, { compact: true, spaces: 4 });
        res.status(200).json(JSON.parse(clientesJson));
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para agregar un nuevo cliente
app.post('/api/clientes', async (req, res) => {
    try {
        const nuevoCliente = req.body;
        const nuevoId = `clt_${Math.floor(Math.random() * 10000)}`;

        const xquery = `
            xquery version "3.1";
            update insert
                <cliente id="${nuevoId}">
                    <nombre>${nuevoCliente.nombre}</nombre>
                    <telefono>${nuevoCliente.telefono}</telefono>
                    { if (string-length($nuevoCliente.deuda) > 0) then
                        <cuenta_credito><deuda>${nuevoCliente.deuda}</deuda></cuenta_credito>
                      else () }
                </cliente>
            into doc("pos_miscelanea.xml")/pos_miscelanea/clientes
        `;
        await axios.post(`${existDbUrl}/consulta`, xquery, existDbConfig);
        res.status(201).json({ mensaje: 'Cliente agregado exitosamente', id: nuevoId });
    } catch (error) {
        console.error('Error al agregar cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ## Manejo de Reportes (ejemplo: Ventas totales por mes) ##

app.get('/api/reportes/ventas-mensuales', async (req, res) => {
    try {
        const xquery = `
            xquery version "3.1";
            let $ventas := doc("pos_miscelanea.xml")/pos_miscelanea/ventas/venta
            let $meses := distinct-values(for $v in $ventas return substring($v/fecha/text(), 1, 7))
            return 
                <reporte>
                {
                    for $m in $meses
                    let $ventas-mes := $ventas[starts-with(fecha, $m)]
                    let $total := sum($ventas-mes/total)
                    return <mes id="{$m}"><total>{$total}</total></mes>
                }
                </reporte>
        `;
        const response = await axios.post(`${existDbUrl}/consulta`, xquery, existDbConfig);
        res.status(200).send(response.data);
    } catch (error) {
        console.error('Error al generar el reporte:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// ## Autenticación de Usuarios ##
app.post('/api/login', async (req, res) => {
    try {
        const { nombre_usuario, contrasena } = req.body;
        const xquery = `
            xquery version "3.1";
            let $usuario := doc("pos_miscelanea.xml")/pos_miscelanea/usuarios/usuario[nombre_usuario="${nombre_usuario}"]
            return if (count($usuario) > 0 and $usuario/contrasena/text() = "${contrasena}") then
                <respuesta>
                    <mensaje>Acceso concedido</mensaje>
                    <usuario_id>{$usuario/@id}</usuario_id>
                    <rol>{$usuario/rol/text()}</rol>
                </respuesta>
            else
                <respuesta>
                    <mensaje>Credenciales inválidas</mensaje>
                </respuesta>
        `;
        const response = await axios.post(
            `${existDbUrl}/consulta`,
            xquery,
            existDbConfig
        );

        // Analiza la respuesta de eXist-db
        const result = response.data;
        if (result.includes("Acceso concedido")) {
            // En un entorno real, enviarías un token JWT
            res.status(200).json({ mensaje: 'Login exitoso', rol: 'administrador' });
        } else {
            res.status(401).json({ mensaje: 'Credenciales inválidas' });
        }
    } catch (error) {
        console.error('Error en la autenticación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor de backend escuchando en http://localhost:${PORT}`);
});
