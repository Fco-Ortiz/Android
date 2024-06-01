//Configurar express
require('dotenv').config(); //Para las variables de entorno
const express = require('express'); //Framework para crear la API y manejar las rutas y solicitudes
const admin = require('firebase-admin'); //SDK para interactuar con FB
const multer = require('multer'); //Middleware para manejar archivos
const { Storage } = require('@google-cloud/firestore'); //Firebase Storage
const jwt = require('jsonwebtoken'); // Para manejar los tokens JWT
const jwksClient = require('jwks-rsa'); // Para obtener la clave pública de Firebase

const app = express();
app.use(express.json()); //Middleware JSON de express
const PORT = process.env.PORT || 3000;  //Puerto definido

// Middleware para verificar el token JWT
async function verificarToken(req, res, next) {
    const token = await req.headers['authorization'];

    //verificamos si hay token
    if (!token) {
        console.log("Token no proporcionado.");
        return res.status(403).json({ mensaje: 'Token no proporcionado.' });
    }

    try{
        // Quitar el prefijo 'Bearer ' si está presente
        const tokenSinBearer = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
        console.log("Token recibido:", tokenSinBearer);

        // Obtener el ID de la clave de la cabecera del token JWT
        const kid = await jwt.decode(tokenSinBearer, { complete: true }).header.kid;

        // Obtener la clave pública de Firebase para verificar el token
        client.getSigningKey(kid, (err, key) => { 
            if (err) {
                console.error('Error al obtener la clave pública:', err);
                return res.status(500).json({ mensaje: 'Error interno del servidor.' });
            }

            // Verificar el token usando la clave pública
            jwt.verify(tokenSinBearer, key.getPublicKey(), (err, decoded) => {
                if (err) {
                    console.error("Error en el token:", err.message);
                    return res.status(401).json({ mensaje: 'Token invalido'});
                }

                req.userId = decoded.id;
                console.log("User Id: ", req.userId);
                next();
            });
        });
    }
    catch(error){
        console.error("Error al verificar el token:", error);
        res.status(401).json({ mensaje: 'Token inválido.' });    
    }
}

//configuramos Multer para manejar archivos
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // Limitar el tamaño del archivo a 5MB
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'video/mp4']; // Permitir formatos de archivo de imagen y video
        console.log(`Evaluando archivo: ${file.originalname} con tipo MIME: ${file.mimetype}`);
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato de archivo no admitido. Solo se permiten imágenes JPEG/PNG y videos MP4.'));
        }
    }
});

//Inicializamos Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: process.env.DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET // Agregar el bucket de Storage
})

const db = admin.firestore();   //Inicializamos Firestore
const bucket = admin.storage().bucket();    //Inicializamos el bucket de Storage

// Ruta para subir una imagen (Prueba)
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {    //verificamos que no venga vacio
            return res.status(400).json({ message: 'No se proporcionó ninguna imagen.' });
        }

        const blob = bucket.file(req.file.originalname);
        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: req.file.mimetype,
            },
        });

        blobStream.on('error', (err) => {
            res.status(500).json({ message: `Error al subir la imagen: ${err.message}` });
        });

        blobStream.on('finish', async () => {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            res.status(200).json({ message: 'Imagen subida correctamente.', url: publicUrl });
        });

        blobStream.end(req.file.buffer);
    } catch (error) {
        res.status(500).json({ message: `Error al procesar la solicitud: ${error.message}` });
    }
});

//Agregar (Post -> FireStore)*
app.post('/peliculas', upload.fields([{ name: 'image', maxCount: 1}, {name: 'video', maxCount: 1}]), async (req,res) => {
    try {
        const pelicula = req.body;  //Obtenemos los datos del cuerpo del json
        
        console.log('Archivos recibidos:', req.files);

        if (!req.files || !req.files.image || !req.files.video)  //verificar que suba un file
            {return res.status(400).json({ mesage: 'No se proporciono ninguna imagen o video'})}


        console.log('Imagen recibida:', req.files.image[0]);
        console.log('Video recibido:', req.files.video[0]);

        //Verificamos si ya existe ese titulo
        const snapshot = await db.collection('Pelicula').where('Titulo2', '==', pelicula.Titulo2).get();
        if(!snapshot.empty)
            {return res.status(409).json({ message : `Ya exite una pelicula con el titulo: ${pelicula.Titulo1}`})}

        // Manejo de la imagen
        const imageFile = req.files.image[0];
        const imageBlob = bucket.file(`${pelicula.Titulo1}/${imageFile.originalname}`);
        const imageBlobStream = imageBlob.createWriteStream({
            metadata: {
                contentType: imageFile.mimetype,
            },
        });

        // Manejo del vieo
        const videoFile = req.files.video[0];
        const videoBlob = bucket.file(`${pelicula.Titulo1}/${videoFile.originalname}`);
        const videoBlobStream = videoBlob.createWriteStream({
            metadata: {
                contentType: videoFile.mimetype,
            },
        });

        //AGREGAMOS LA IMAGEN
        await new Promise((resolve, reject) => {
            imageBlobStream.on('error', (err) => {
                reject(new Error(`Error al subir la imagen: ${err.message}`));
            });

            imageBlobStream.on('finish', async () => {
                pelicula.ImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(imageBlob.name)}?alt=media`;
                resolve();
            });

            imageBlobStream.end(imageFile.buffer);
        });
        
        //AGREGAMOS EL VIDEO
        await new Promise((resolve, reject) => {
            videoBlobStream.on('error', (err) => {
                reject(new Error(`Error al subir el video: ${err.message}`));
            });

            videoBlobStream.on('finish', async () => {
                pelicula.VideoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(videoBlob.name)}?alt=media`;
                resolve();
            });

            videoBlobStream.end(videoFile.buffer);
        });

        await db.collection('Pelicula').add(pelicula);  //Agregamos la plicula
        res.status(201).json({ message : `Pelicula agregada: ${pelicula.Titulo1}`});   //Regresamos la pelicula agregada
    } catch (error) {
        res.status(400).json({ message : `Error al agregar pelicula: ${error}`}) //Manejo de error        
    }
})

//Cosultar (GET -> FireStore)*
app.get('/peliculas', verificarToken, async (req, res) => {
    try {
        const snapshot = await db.collection('Pelicula').get();
        
        if(snapshot.empty)
            {res.status(404).json({ message : 'No se encontraron Peliculas'}); return;}    //validamos si esta vacia la coleccion
        
        let peliculas = [];
        snapshot.forEach(doc => {
            peliculas.push({ id: doc.id, ...doc.data() });//Operador de propagacion, sirve para combinar todos los datos
        })
        res.status(200).json(peliculas);
    } catch (error) {
        res.status(400).json({ message : `Error al consultar peliculas: ${error}`});
    }
});

//Consultar:Titulo (GET:Titulo -> FireStore)*
app.get('/peliculas/:Titulo', async (req, res) => {
    try {
        const titulo = (req.params.Titulo).toLowerCase().replace(/\s+/g, '');//Minusculas y sin espacios
        
        const snapshot = await db.collection('Pelicula').where('Titulo2', '==', titulo).get();
        if(snapshot.empty)
            {res.status(404).json({ message : 'No se encontraron Peliculas'}); return;}    //validamos si esta vacia la consulta
        
        let pelicula = [];
        snapshot.forEach(doc => {
            pelicula.push({ id: doc.id, ...doc.data() });
        })
        res.status(200).json(pelicula);
    } catch (error) {
        res.status(400).json({ mesage : `Error al buscar la pelicula: ${error}`})
    }
});

//Editar (PUT -> FireStore)*
app.put('/peliculas/:Titulo', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
    try {
        const titulo = (req.params.Titulo).toLowerCase().replace(/\s+/g, '');//Minusculas y sin espacios
        const newData = req.body;   //Guardamos los nuevos datos

        //Buscamos la pelicula por titulo
        const snapshot = await db.collection('Pelicula').where('Titulo2', '==', titulo).get();
        if(snapshot.empty)
            {res.status(404).json({ message : 'No se encontro la Pelicula'}); return;}    //validamos si esta vacia la consulta
        
        const doc = snapshot.docs[0];
        const peliculaRef = doc.ref;

        const titulo1 = doc.data().Titulo1; //accedemos al titulo principal
        
        // Manejo de la imagen y el video
        let imageUrl = doc.data().ImageUrl; // Mantener la URL de la imagen actual por defecto
        let videoUrl = doc.data().VideoUrl; // Mantener la URL del video actual por defecto
        
        //verificamos si hay nueva imagen
        if (req.files['image']) {
            const imageFile = req.files['image'][0];
            const imageBlob = bucket.file(`${titulo1}/${imageFile.originalname}`);
            const imageBlobStream = imageBlob.createWriteStream({
                metadata: {
                    contentType: imageFile.mimetype,
                },
            });

            await new Promise((resolve, reject) => {
                imageBlobStream.on('error', (err) => {
                    reject(new Error(`Error al subir la imagen: ${err.message}`));
                });

                imageBlobStream.on('finish', () => {
                    imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(imageBlob.name)}?alt=media`;
                    resolve();
                });

                imageBlobStream.end(imageFile.buffer);
            });

            // Eliminar la imagen antigua si existe una nueva
            if (doc.data().ImageUrl) {
                const oldImagePath = decodeURIComponent(doc.data().ImageUrl.split(`${bucket.name}/o/`)[1].split('?alt=media')[0]);
                const oldImage = bucket.file(oldImagePath);
                await oldImage.delete();
            }
        }

        //verificamos si hay nuevo video
        if (req.files['video']) {
            const videoFile = req.files['video'][0];
            const videoBlob = bucket.file(`${titulo1}/${videoFile.originalname}`);
            const videoBlobStream = videoBlob.createWriteStream({
                metadata: {
                    contentType: videoFile.mimetype,
                },
            });

            await new Promise((resolve, reject) => {
                videoBlobStream.on('error', (err) => {
                    reject(new Error(`Error al subir el video: ${err.message}`));
                });

                videoBlobStream.on('finish', () => {
                    videoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(videoBlob.name)}?alt=media`;
                    resolve();
                });

                videoBlobStream.end(videoFile.buffer);
            });

            // Eliminar el video antiguo si existe uno nuevo
            if (doc.data().VideoUrl) {
                const oldVideoPath = decodeURIComponent(doc.data().VideoUrl.split(`${bucket.name}/o/`)[1].split('?alt=media')[0]);
                const oldVideo = bucket.file(oldVideoPath);
                await oldVideo.delete();
            }
        }

        //agregamos las direcciones
        newData.ImageUrl = imageUrl;
        newData.VideoUrl = videoUrl;

        //Actualizar los datos
        await peliculaRef.update(newData);
        res.status(200).json({ message : `La pelicula "${titulo1}", se actualizo`});
    } catch (error) {
        res.status(500).json({ message : `Error al intentar actualizar: ${error}`});
    }
});

//Eliminar (DELETE -> FireStore)
app.delete('/peliculas/:Titulo', async (req,res) => {
    try {
        const titulo = (req.params.Titulo).toLowerCase().replace(/\s+/g, '');//Minusculas y sin espacios

        //Buscamos la pelicula por el titulo
        const snapshot = await db.collection('Pelicula').where('Titulo2', '==', titulo).get();
        if(snapshot.empty)
            {res.status(404).json({ message : 'No se encontraron Peliculas'}); return;}   //validamos si esta vacia la consulta
        
        const doc = snapshot.docs[0];
        const peliculaRef = doc.ref;
        const titulo1 = doc.data().Titulo1; //accedemos al titulo principal

        // Eliminar todos los archivos en la carpeta de la película
        const [files] = await bucket.getFiles({ prefix: `${titulo1}/` });
        const deletePromises = files.map(file => file.delete());
        await Promise.all(deletePromises);

        // Eliminar la película en Firestore
        await peliculaRef.delete();

        res.status(200).json({ message : `Pelicula: ${titulo1}, se elimino correctamente`});
    } catch (error) {
        res.status(500).json({ message : `Error al intentar borrar la pelicula: ${error}`})       
    }
})

//Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutandose en puerto: ${PORT}`);
});