// Electron JS
const { app, BrowserWindow, dialog } = require('electron');

// Modules de Node
const path = require("path");
const fs = require("fs");
const { URLSearchParams, URL } = require('url');

// axios
const axios = require('axios');

// Saved
const saved = require('../../modules/saved')

// UtilCode
const utilcode = require("../../modules/utilcodes")

// libraries
const lib = require("../../modules/util-libraries")

// UserData
const userdata = app.getPath("userData")

// package app
const package_app = require("./package.json")

// download yt
const { getVideoMP3Base64, getVideoMP3Binary } = require("yt-get");
const { getVideoTitle } = require("yt-get/src/metadata/getVideoTitle");

// download yt
const YtDownloader = require("./app/modules/ytdownmp4")
const ytdownloader = new YtDownloader();

// Crear carpetas
async function setFolders(raiz, ruta) {
    try {
        await utilcode.createFolderRecursive(raiz, ruta);
        return true;
    } catch (error) {
        return false;
    }
}

// Creator Folder App
async function folders_app() {
    await setFolders(userdata, `apps/${package_app.name}/json`);
    await setFolders(__dirname, `app/temp`);
}

// Config Default
async function app_default() {
    // Crear Carpetas
    await folders_app();
}

// Read Files Json
async function openFileJson(file, existfile = false, value = "") {
    try {
        if (existfile) {
            if (!fs.existsSync(file)) {
                await utilcode.fsWrite(file, JSON.stringify(value, null, 2));
            }
        }
        const filejsontext = await utilcode.fsRead(file)
        return utilcode.jsonParse(filejsontext);
    } catch (error) {
        return false;
    }
}

function normalizeTitle(title) {
    const normalized = title.replace(/[^a-zA-Z0-9\s]/g, '');
    return normalized;
}

// crear video compatible
async function convertMP4(video, audio) {
    let opt = saved.getSaved("progress_mp4");
    setTimeout(() => {
        convert(opt.title, video, audio, opt.save, (progreso, estado) => {
            if (estado == "finish") {
                saved.updateValue("progress_mp4", {
                    convert: {
                        progress: 100,
                        enddownload: true
                    },
                    enddownload: true
                });
            } else {
                saved.updateValue("progress_mp4", {
                    convert: {
                        progress: progreso
                    }
                });
            }
        }).then(response => {

        }).catch((error) => {
            saved.updateValue("progress_mp4", {
                errorall: error.message
            });
        });
    }, 1700);
}

// descargar autio
async function downloaderMp3(videoID, videoFile) {
    setTimeout(() => {
        downloadAudio(videoID, (progreso, estado) => {
            if (estado == "finish") {
                saved.updateValue("progress_mp4", {
                    mp3: {
                        progress: 100,
                        enddownload: true
                    }
                });
            } else {
                saved.updateValue("progress_mp4", {
                    mp3: {
                        progress: progreso
                    }
                });
            }
        }).then(response => {
            if (response.status == true) {
                convertMP4(videoFile, response.filePath);
            }
        }).catch((error) => {
            saved.updateValue("progress_mp4", {
                errorall: error.message
            });
        })
    }, 1700);
}

// video mp4


const routes = [
    {
        method: "get",
        path: "/",
        handler: async (req, res) => {
            // User Default
            await app_default();
            // Renderer
            res.render(path.join(__dirname, "app", "views", "tubedown"), {
                app_pack: package_app
            });
        },
    },
    {
        method: "get",
        path: "/mp4",
        handler: async (req, res) => {
            // Renderer
            res.render(path.join(__dirname, "app", "views", "mp4"), {
                app_pack: package_app
            });
        },
    },
    {
        method: "post",
        path: "/mp3",
        handler: async (req, res) => {
            let { link } = req.body;
            try {

                const title = await getVideoTitle(link);
                const binary = await getVideoMP3Binary(link);

                // save temp
                const temp_file = path.join(__dirname, "app", "temp", "file_music.mp3");
                if (fs.existsSync(temp_file)) {
                    await fs.promises.unlink(temp_file);
                }
                fs.writeFileSync(temp_file, binary.mp3);

                // send data
                res.send({
                    title: title,
                    size: (binary.mp3.length)
                });

            } catch (error) {
                res.send(error.message);
            }
        },
    },
    {
        method: "post",
        path: "/getmetadata",
        handler: async (req, res) => {
            let { link } = req.body;
            let dataVideo = await ytdownloader.addInfo(link);
            res.send(dataVideo);

        },
    },
    {
        method: "post",
        path: "/downloadvideo",
        handler: async (req, res) => {
            let video = req.body;
            ytdownloader.downloadVideo(video);
            res.end();
        },
    },
    {
        method: "post",
        path: "/getprogress",
        handler: async (req, res) => {
            res.send(ytdownloader.getData())
        },
    }
]

module.exports = [...lib, ...routes];