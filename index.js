//Configurar express
const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

//Definir rutas de la API
let peliculas = [
    { id: 1, titulo: 'Pelicula 1', año: 2022 },
    { id: 2, titulo: 'Pelicula 2', año: 2023 },
    { id: 3, titulo: 'Pelicula 3', año: 2024 }
]

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

//Agregar con metodo post
app.post('/peliculas', (req,res) => {
    const nuevaPelicula = req.body
    peliculas.push(nuevaPelicula);
    res.status(201).json(nuevaPelicula);
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