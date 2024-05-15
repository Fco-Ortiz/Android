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

app.get('/peliculas', (req, res) => {
    res.json(peliculas);
});

app.get('/peliculas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const pelicula = peliculas.find(p => p.id === id);
    if(!peliculas){
        return res.status(404).json({ mensaje: 'Pelicula no encontrada' });
    }
    res.json(pelicula);
});

//Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutandose en puerto: ${PORT}`);
});