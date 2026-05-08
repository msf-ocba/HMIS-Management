const axios = require('axios');

// Configuración de DHIS2
const DHIS2_URL = 'https://your-dhis2-server.org/api'; // Reemplaza con tu URL
const USERNAME = 'admin'; // Reemplaza con tu usuario
const PASSWORD = 'admin'; // Reemplaza con tu contraseña

// Crear instancia de axios con autenticación básica
const dhis2Client = axios.create({
    baseURL: DHIS2_URL,
    auth: {
        username: USERNAME,
        password: PASSWORD
    }
});

/**
 * Listar todos los DataElements de DHIS2
 */
async function listDataElements() {
    try {
        console.log('Conectando a DHIS2...\n');

        // Obtener data elements con paginación
        const response = await dhis2Client.get('/dataElements', {
            params: {
                paging: true,
                pageSize: 50,
                fields: 'id,name,code,description,valueType,aggregationType,categoryCombo'
            }
        });

        const dataElements = response.data.dataElements;
        const pager = response.data.paging;

        console.log(`Total de DataElements: ${pager.total}\n`);
        console.log('='.repeat(100));
        console.log('ID                 | NOMBRE                          | CÓDIGO               | TIPO DE VALOR');
        console.log('='.repeat(100));

        // Mostrar cada data element
        dataElements.forEach(de => {
            console.log(`${de.id.padEnd(18)} | ${(de.name || '').substring(0, 30).padEnd(30)} | ${(de.code || '').padEnd(20)} | ${de.valueType || 'N/A'}`);
        });

        console.log('='.repeat(100));
        console.log(`\nShowing ${dataElements.length} of ${pager.total} data elements`);

    } catch (error) {
        if (error.response) {
            console.error(`Error: ${error.response.status} - ${error.response.statusText}`);
            console.error('Respuesta:', error.response.data);
        } else {
            console.error('Error de conexión:', error.message);
        }
    }
}

/**
 * Buscar un DataElement por nombre
 */
async function searchDataElement(name) {
    try {
        console.log(`Buscando DataElement: "${name}"\n`);

        const response = await dhis2Client.get('/dataElements', {
            params: {
                filter: `name:ilike:${name}`,
                fields: 'id,name,code,description,valueType,aggregationType'
            }
        });

        const dataElements = response.data.dataElements;

        if (dataElements.length === 0) {
            console.log('No se encontraron DataElements con ese nombre.');
            return;
        }

        console.log(`Se encontraron ${dataElements.length} resultado(s):\n`);

        dataElements.forEach(de => {
            console.log(`ID: ${de.id}`);
            console.log(`Nombre: ${de.name}`);
            console.log(`Código: ${de.code}`);
            console.log(`Descripción: ${de.description || 'N/A'}`);
            console.log(`Tipo de Valor: ${de.valueType}`);
            console.log(`Tipo de Agregación: ${de.aggregationType}`);
            console.log('-'.repeat(60));
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Obtener DataElement por ID
 */
async function getDataElementById(id) {
    try {
        console.log(`Obteniendo DataElement con ID: ${id}\n`);

        const response = await dhis2Client.get(`/dataElements/${id}`, {
            params: {
                fields: '*'
            }
        });

        const de = response.data;

        console.log('='.repeat(60));
        console.log(`ID: ${de.id}`);
        console.log(`Nombre: ${de.name}`);
        console.log(`Código: ${de.code}`);
        console.log(`Descripción: ${de.description || 'N/A'}`);
        console.log(`Tipo de Valor: ${de.valueType}`);
        console.log(`Tipo de Agregación: ${de.aggregationType}`);
        console.log(`Tipo de Dominio: ${de.domainType}`);
        console.log(`Categoría Combo: ${de.categoryCombo?.name || 'N/A'}`);
        console.log('='.repeat(60));

    } catch (error) {
        if (error.response?.status === 404) {
            console.error('DataElement no encontrado.');
        } else {
            console.error('Error:', error.message);
        }
    }
}

/**
 * Exportar DataElements a JSON
 */
async function exportDataElementsToJSON(filename) {
    try {
        console.log(`Exportando DataElements a ${filename}...\n`);

        const response = await dhis2Client.get('/dataElements', {
            params: {
                paging: false,
                fields: 'id,name,code,description,valueType,aggregationType,categoryCombo'
            }
        });

        const fs = require('fs');
        fs.writeFileSync(filename, JSON.stringify(response.data.dataElements, null, 2));

        console.log(`✓ Exportado exitosamente. Total: ${response.data.dataElements.length} DataElements`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Ejecutar según argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.length === 0) {
    // Por defecto, listar todos
    listDataElements();
} else if (args[0] === 'search' && args[1]) {
    searchDataElement(args[1]);
} else if (args[0] === 'get' && args[1]) {
    getDataElementById(args[1]);
} else if (args[0] === 'export' && args[1]) {
    exportDataElementsToJSON(args[1]);
} else {
    console.log(`
Uso:
  node listDataElements.js                    - Listar todos los DataElements
  node listDataElements.js search "nombre"    - Buscar DataElement por nombre
  node listDataElements.js get <id>           - Obtener DataElement específico
  node listDataElements.js export <archivo>   - Exportar a JSON
    `);
}
