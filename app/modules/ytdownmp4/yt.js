const ytdl = require('ytdl-core');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

// Utils
const Utils = require("./utils")
const utils = new Utils();

class YtDownloader {
    constructor() {
        // crear carpetas
        utils.createOutputFolder(path.join(__dirname, "temp"));
        utils.createOutputFolder(path.join(__dirname, "output"));
        
        // datos del video
        this.selectMp4 = {};
        // data video
        this.mp4 = {};
        // data music
        this.mp3 = {};
        // data convert
        this.convert = {};

        // save in
        this.save = false;

        // ruta save video
        this.saveVideo = false;

        // ruta save audio
        this.saveAudio = false;
    }

    async addInfo(videoURL) {
        // get data
        const datasl = await this.getInfo(videoURL);
        if (datasl) {
            this.selectMp4 = datasl;

            // reset
            this.mp4 = {};
            this.mp3 = {};
            this.convert = {};
            this.save = false;
            this.saveVideo = false;
            this.saveAudio = false;

            // response
            return this.selectMp4;
        } else {
            return false;
        }
    }

    async getInfo(videoURL) {
        try {
            // Obtener información del video
            const videoInfo = await ytdl.getInfo(videoURL);

            // Crear un nuevo array con los datos deseados
            let formats = videoInfo.formats.map(({ qualityLabel, fps, width, height, quality, container, mimeType, contentLength, codecs, hasVideo }) => ({
                mimeType,
                contentLength,
                qualityLabel,
                fps,
                width,
                height,
                quality,
                container,
                codecs,
                hasVideo
            }));

            return {
                title: videoInfo.videoDetails.title,
                author: videoInfo.videoDetails.author.name,
                views: videoInfo.videoDetails.viewCount,
                duration: videoInfo.videoDetails.lengthSeconds,
                baseUrl: videoInfo.videoDetails.video_url,
                formats
            }
        } catch (error) {
            console.error('Error al obtener información del video:', error.message);
            return false;
        }
    }

    async downloadVideo({ folder, select }) {
        try {
            // save folder
            this.save = folder;

            // iniciar descarga
            const info = await ytdl.getInfo(this.selectMp4.baseUrl);

            // seleccionar formato
            let getFormat = info.formats.find(item => item.contentLength == select.contentLength && item.quality == select.quality && item.codecs == select.codecs && item.container == select.container)

            // Si no se encuentra el formato según la preferencia, seleccionar el primero disponible
            if (!getFormat) {
                getFormat = info.formats.find(format => format.codecs.includes('avc1'));
            }

            let downloadAttempts = 0;
            let downloadSuccessful = false;

            while (downloadAttempts < 3 && !downloadSuccessful) {
                try {
                    const outputFilePath = path.join(__dirname, 'temp', `video.${getFormat.container}`);
                    const outputStream = fs.createWriteStream(outputFilePath);

                    let downloaded = 0;
                    let total = 0;

                    await new Promise((resolve, reject) => {
                        const videoStream = ytdl.downloadFromInfo(info, { format: getFormat, timeout: 60000 });

                        videoStream
                            .on('progress', (chunkLength, downloadedBytes, totalBytes) => {
                                downloaded += chunkLength;
                                total = totalBytes;
                                const percent = (downloaded / total) * 100;
                                const percent_progress = percent.toFixed(2);

                                // update data video
                                this.mp4 = {
                                    progress: percent_progress,
                                    done: false
                                }

                            })
                            .pipe(outputStream)
                            .on('finish', () => {
                                // Close the outputStream when the download finishes
                                outputStream.end();
                                resolve();
                            })
                            .on('error', (error) => {
                                // Close the outputStream on error and reject the promise
                                outputStream.end();
                                reject(error);
                            });
                    });

                    this.mp4 = {
                        progress: 100,
                        done: true
                    }

                    // save path video
                    this.saveVideo = outputFilePath;

                    downloadSuccessful = true;
                } catch (error) {
                    // Handle download failure
                    console.error(`Error en el intento ${downloadAttempts + 1} de descarga:`, error);
                    downloadAttempts++;
                }
            }

            if (!downloadSuccessful) {
                console.error('La descarga del video ha fallado después de múltiples intentos.');
                this.mp4 = {
                    progress: 0,
                    done: "error_download_mp4"
                }
            }

            setTimeout(() => {
                this.downloadAudio();
            }, 3000);
        } catch (error) {
            console.error('Error al descargar video:', error);
            this.mp4 = {
                progress: 0,
                done: "error_download_mp4"
            }
        }
    }


    async downloadAudio() {
        try {
            const info = await ytdl.getInfo(this.selectMp4.baseUrl);
            const audioFormat = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });

            let downloadAttempts = 0;
            let downloadSuccessful = false;

            while (downloadAttempts < 3 && !downloadSuccessful) {
                try {
                    const outputFilePath = path.join(__dirname, 'temp', `audio.${audioFormat.container}`);
                    const outputStream = fs.createWriteStream(outputFilePath);

                    let downloaded = 0;
                    let total = 0;

                    await new Promise((resolve, reject) => {
                        const audioStream = ytdl.downloadFromInfo(info, { format: audioFormat });

                        audioStream
                            .on('progress', (chunkLength, downloadedBytes, totalBytes) => {
                                downloaded += chunkLength;
                                total = totalBytes;
                                const percent = (downloaded / total) * 100;
                                const percent_progress = percent.toFixed(2);

                                // update data video
                                this.mp3 = {
                                    progress: percent_progress,
                                    done: false
                                }

                            })
                            .pipe(outputStream)
                            .on('finish', () => {
                                // Close the outputStream when the download finishes
                                outputStream.end();
                                resolve();
                            })
                            .on('error', (error) => {
                                // Close the outputStream on error and reject the promise
                                outputStream.end();
                                reject(error);
                            });
                    });

                    this.mp3 = {
                        progress: 100,
                        done: true
                    }

                    // save path audio
                    this.saveAudio = outputFilePath;

                    downloadSuccessful = true;
                } catch (error) {
                    // Handle download failure
                    console.error(`Error en el intento ${downloadAttempts + 1} de descarga de audio:`, error);
                    downloadAttempts++;
                }
            }

            if (!downloadSuccessful) {
                console.error('La descarga de audio ha fallado después de múltiples intentos.');
                this.mp3 = {
                    progress: 0,
                    done: "error_download_mp3"
                }
            }

            setTimeout(() => {
                this.convertVideo();
            }, 3000);
        } catch (error) {
            console.error('Error al descargar audio:', error);
            this.mp3 = {
                progress: 0,
                done: "error_download_mp3"
            }
        }
    }


    async convertVideo() {
        const videoFilePath = this.saveVideo;
        const audioFilePath = this.saveAudio;

        let convertAttempts = 0;
        let convertSuccessful = false;

        while (convertAttempts < 3 && !convertSuccessful) {
            try {
                const videoExists = fs.existsSync(videoFilePath);
                const audioExists = fs.existsSync(audioFilePath);

                if (!videoExists || !audioExists) {
                    throw new Error('Los archivos de video y/o audio no existen.');
                }

                const outputFilePath = this.save ? path.join(this.save, `${this.normalizeTitle(this.selectMp4.title)}.mp4`) : path.join(__dirname, 'output', `${title}.mp4`);

                await new Promise((resolve, reject) => {
                    const command = ffmpeg()
                        .setFfmpegPath(path.join(__dirname, "../../../../../", "bin", "ffmpeg", "bin", "ffmpeg.exe"))
                        .input(videoFilePath)
                        .input(audioFilePath)
                        .output(outputFilePath)
                        .outputOptions(['-c:v', 'libx264', '-c:a', 'aac', '-strict', 'experimental'])
                        .on('progress', (progress) => {
                            const percent_progress = progress.percent.toFixed(2);
                            this.convert = {
                                progress: percent_progress,
                                done: false
                            }
                        })
                        .on('end', () => {
                            resolve();
                            convertSuccessful = true;
                        })
                        .on('error', (error) => {
                            reject(error);
                            convertAttempts++;
                        });

                    command.run();
                });

                // Limpia archivos temporales después de la conversión
                fs.unlinkSync(videoFilePath);
                fs.unlinkSync(audioFilePath);

                this.convert = {
                    progress: 100,
                    done: true
                }
            } catch (error) {
                console.error(`Error en el intento ${convertAttempts + 1} de conversión:`, error);
                convertAttempts++;
            }
        }

        if (!convertSuccessful) {
            console.error('La conversión ha fallado después de múltiples intentos.');
            this.convert = {
                progress: 100,
                done: "error_convert"
            }
        }
    }


    getData() {
        return {
            mp4: this.mp4,
            mp3: this.mp3,
            convert: this.convert
        }
    }

    normalizeTitle(input) {
        const diacriticsMap = {
            'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
            'ä': 'a', 'ë': 'e', 'ï': 'i', 'ö': 'o', 'ü': 'u',
            'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u',
            'â': 'a', 'ê': 'e', 'î': 'i', 'ô': 'o', 'û': 'u',
            'å': 'a'
        };

        // Reemplazar letras con diacríticos
        const replacedText = input.replace(/[áéíóúäëïöüàèìòùâêîôûå]/g, match => diacriticsMap[match] || match);

        // Eliminar caracteres especiales y diacríticos restantes
        const normalizedText = replacedText.normalize("NFD").replace(/[\u0300-\u036f]/g, '');

        // Eliminar otros caracteres especiales
        const cleanedText = normalizedText.replace(/[^\w\s]/gi, '');

        return cleanedText;
    }
}

module.exports = YtDownloader;