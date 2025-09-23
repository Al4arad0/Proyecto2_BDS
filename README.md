# Proyecto2_BDS
Implementación de punto de venta para miscelánea, desarrollado como aplicación web.

La conexión de la base de datos va así:
El transporte se hace con HTTPS usando axios (los get/push dentro de las apis)
Ocupa la URL de la base: http://localhost:8088/exist/rest/db/miscelanea/pos_miscelanea.xml **Para esto debemos tener iniciado el exist-db
En la configuración del axios, en el server.js, se hace la configuración y validación de las credenciales{auth: {username, password}}. Axios convierte eso en un header
authorization: basic <base64> de forma automática
Las operaciones que se usan son 
GET resource.xml  Esta operación devuelve el XML
PUT resource.xml con Content-Type: application/xml reemplaza el archivo en exist

En el dashboard de exist, debemos tener creada la colección /db/miscelanea y se debe encontrar el recurso pos_miscelanea.xml, el cual es como tal nuestro archivo
de la base de datos, puede subirse directamente o escribirlo desde cero en el editor de exist-db, en caso de no estar presente, GET mostrará el error 404
