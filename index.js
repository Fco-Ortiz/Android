//Configurar express
const express = require('express'); //Framework para crear la API
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

//Get trayendo todos los datos
app.get('/peliculas', (req, res) => {
    res.json(peliculas);
});

//Get por titulo especifico
app.get('/peliculas/:titulo', (req, res) => {
    const titulo = req.params.titulo;
    const pelicula = peliculas.find(p => p.titulo === titulo);
    if(!peliculas){
        return res.status(404).json({ mensaje: 'Pelicula no encontrada' });
    }
    res.json(pelicula);
});

//Agregar (Post -> FireStore)*
app.post('/peliculas', async (req,res) => {
    try {
        const pelicula = req.body;  //Obtenemos los datos del cuerpo del json
        const docFire = await db.collection('Pelicula').add(pelicula);  //Agregamos la plicula
        res.status(201).send(`Pelicula agregada: ${docFire.titulo}`);   //Regresamos la pelicula agregada
    } catch (error) {
        res.status(400).send(`Error al agregar pelicula: ${error}`) //Manejo de error        
    }
})

//Editar identificando por titulo
app.put('/peliculas/:titulo', (req, res) => {
    const titulo = req.params.titulo;
    const indice = peliculas.findIndex(p => p.titulo === titulo);
    if (indice === -1) {
        return res.status(404).json({ mensaje: 'Película no encontrada' });
    }
    const nuevaPelicula = req.body;
    peliculas[indice] = nuevaPelicula;
    res.status(200).json({ mensaje: 'Película actualizada correctamente' });
});

//Eliminar con metodo delete
app.delete('/peliculas/:titulo', (req,res) => {
    const titulo = req.params.titulo;
    const indice = peliculas.findIndex(p => p.titulo === titulo);
    if (indice === -1) {
        return res.status(404).json({ mensaje: 'Película no encontrada' });
    }
    peliculas.splice(indice, 1);
    res.status(200).json({ mensaje: 'Película eliminada correctamente' });
})

//Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutandose en puerto: ${PORT}`);
});