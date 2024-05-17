//Configurar express
const express = require('express'); //Framework para crear la API y manejar las rutas y solicitudes
const admin = require('firebase-admin'); //SDK para interactuar con FB
const serviceAccount = require('D:/UNI/SEMESTRE 10/02.Android/Proyecto/serviceAccountKey.json') //Credenciales FB

const app = express();
app.use(express.json()); //Middleware JSON de express

const PORT = 3000;  //Puerto definido

//Inicializamos Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://Proyecto-Android.firebaseio.com'
})

const db = admin.firestore(); //Inicializamos Firestore

//Agregar (Post -> FireStore)*
app.post('/peliculas', async (req,res) => {
    try {
        const pelicula = req.body;  //Obtenemos los datos del cuerpo del json
        //Verificamos si ya existe ese titulo
        const snapshot = await db.collection('Pelicula').where('Titulo2', '==', pelicula.Titulo2).get();
        if(!snapshot.empty){return res.status(409).send(`Ya exite una pelicula con el titulo: ${pelicula.Titulo1}`)}
        await db.collection('Pelicula').add(pelicula);  //Agregamos la plicula
        res.status(201).send(`Pelicula agregada: ${pelicula.Titulo1}`);   //Regresamos la pelicula agregada
    } catch (error) {
        res.status(400).send(`Error al agregar pelicula: ${error}`) //Manejo de error        
    }
})

//Cosultar (GET -> FireStore)*
app.get('/peliculas', async (req, res) => {
    try {
        const snapshot = await db.collection('Pelicula').get();
        if(snapshot.empty){res.status(404).send('No se encontraron Peliculas'); return;}    //validamos si esta vacia la coleccion
        let peliculas = [];
        snapshot.forEach(doc => {
            peliculas.push({ id: doc.id, ...doc.data() });//Operador de propagacion, sirve para combinar todos los datos
        })
        res.status(200).json(peliculas);
    } catch (error) {
        res.status(400).send(`Error al consultar peliculas: ${error}`);
    }
});

//Consultar:Titulo (GET:Titulo -> FireStore)*
app.get('/peliculas/:Titulo', async (req, res) => {
    try {
        const titulo = (req.params.Titulo).toLowerCase().replace(/\s+/g, '');//Minusculas y sin espacios
        const snapshot = await db.collection('Pelicula').where('Titulo2', '==', titulo).get();
        if(snapshot.empty){res.status(404).send('No se encontraron Peliculas'); return;}    //validamos si esta vacia la consulta
        let pelicula = [];
        snapshot.forEach(doc => {
            pelicula.push({ id: doc.id, ...doc.data() });
        })
        res.status(200).json(pelicula);
    } catch (error) {
        res.status(400).send(`Error al buscar la pelicula: ${error}`)
    }
});

//Editar (PUT -> FireStore)*
app.put('/peliculas/:Titulo', async (req, res) => {
    try {
        const titulo = (req.params.Titulo).toLowerCase().replace(/\s+/g, '');//Minusculas y sin espacios
        const newData = req.body;   //Guardamos los nuevos datos
        const snapshot = await db.collection('Pelicula').where('Titulo2', '==', titulo).get();  //Contiene los doc que cumplen el criterio
        if(snapshot.empty){res.status(404).send('No se encontro la Pelicula'); return;}    //validamos si esta vacia la consulta
        //Actualizar los datos
        await snapshot.docs[0].ref.update(newData); //Docs[0] trae el primer documento de la consulta (siempre debe de haber solo 1)
        res.status(200).send(`La pelicula "${titulo}", se actualizo`);
    } catch (error) {
        res.status(500).send(`Error al intentar actualizar: ${error}`);
    }
});

//Eliminar (DELETE -> FireStore)
app.delete('/peliculas/:Titulo', async (req,res) => {
    try {
        const titulo = (req.params.Titulo).toLowerCase().replace(/\s+/g, '');//Minusculas y sin espacios
        const snapshot = await db.collection('Pelicula').where('Titulo2', '==', titulo).get();
        if(snapshot.empty){res.status(404).send('No se encontraron Peliculas'); return;}   //validamos si esta vacia la consulta
        await snapshot.docs[0].ref.delete();    //Eliminamos la pelicula
        res.status(200).send(`Pelicula: ${titulo}, se elimino correctamente`);
    } catch (error) {
        res.status(500).send(`Error al intentar borrar la pelicula: ${error}`)       
    }
})

//Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutandose en puerto: ${PORT}`);
});