const express = require('express');
const ytdl = require('ytdl-core');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/descargar', async (req, res) => {
    try {
        const videoURL = req.query.videoURL;
        const format = req.query.format; // Obtenemos el formato deseado

        // Descargar información sobre el video
        const info = await ytdl.getInfo(videoURL);

        // Determinar si se debe descargar el audio o el video
        let stream;
        if (format === 'mp3') {
            const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
            stream = ytdl(videoURL, { format: audioFormat });
        } else {
            const formatoDeseado = ytdl.chooseFormat(info.formats, { quality: 'highest' });

            // Crear una carpeta 'videos' si no existe
            const videosFolder = path.join(__dirname, 'videos');
            if (!fs.existsSync(videosFolder)) {
                fs.mkdirSync(videosFolder);
            }

            // Modificar el nombre del archivo para eliminar caracteres no válidos
            const videoFileName = `${info.videoDetails.title.replace(/[/\\?%*:|"<>]/g, '')}.mp4`;
            const filePath = path.join(videosFolder, videoFileName);

            // Descargar el video utilizando axios
            const response = await axios({
                url: formatoDeseado.url,
                method: 'GET',
                responseType: 'stream',
            });

            const writer = fs.createWriteStream(filePath);

            response.data.pipe(writer);

            writer.on('finish', () => {
                console.log(`El video se ha descargado como "${filePath}"`);
                res.download(filePath, (err) => {
                    if (err) {
                        console.error('Error al enviar el archivo:', err);
                    } else {
                        // Eliminar el archivo después de descargarlo
                        fs.unlinkSync(filePath);
                    }
                });
            });
            return;
        }

        // Configurar la respuesta HTTP
        res.setHeader('Content-disposition', `attachment; filename="${info.videoDetails.title}.${format}"`);
        res.setHeader('Content-type', `audio/${format === 'mp3' ? 'mpeg' : 'mp4'}`);

        // Transmitir el contenido al cliente
        stream.pipe(res);
    } catch (error) {
        console.error('Error al descargar el audio o video:', error);
        res.status(500).send('Error al descargar el audio o video.');
    }
});

app.listen(port, () => {
    console.log(`Servidor Express escuchando en el puerto ${port}`);
});
