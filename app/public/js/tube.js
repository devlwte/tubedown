const { ipcRenderer, shell } = require('electron');
const fs = require('fs-extra');
const path = require('path');


// Función para enviar mensajes al proceso principal
async function sendMessage(ipc, ...message) {
    try {
        const reply = await ipcRenderer.invoke(ipc, ...message);
        return reply;
    } catch (error) {
        console.error(error);
        return false;
    }
}

// Ajax
function _ajax(url, method, data) {
    return new Promise((resolve, reject) => {
        kit.send({
            url: url,
            method: method,
            data,
            success: (respuesta) => {
                resolve(respuesta);
            },
            error: (codigo, respuesta) => {
                reject({ codigo, respuesta });
            }
        });
    });
}

function centerDivTopJq(elm) {
    const elms = $(".body");

    const alto = elms.height() / 2;
    const altoElm = $(elm).height() / 2;

    // Asegurarse de que el resultado no sea negativo
    const numb = Math.max(alto - altoElm, 0);

    return numb;
}

function update_center_div() {

    const elm = $(".elm_center_h");
    const num = centerDivTopJq(elm);

    elm.css({ marginTop: `${num}px` });

    if (elm.css("opacity") === "0") {
        elm.css({ opacity: 1 });
    }
}

async function copyFileWithProgress(src, dest, callback) {
    const fileSize = (await fs.stat(src)).size;
    let bytesRead = 0;

    const readStream = fs.createReadStream(src);
    const writeStream = fs.createWriteStream(dest);

    readStream.on('data', (chunk) => {
        bytesRead += chunk.length;
        const progress = Math.round((bytesRead / fileSize) * 100);
        if (callback) {
            callback(progress);
        }
    });

    return new Promise((resolve, reject) => {
        readStream
            .on('end', () => {
                if (callback) {
                    callback(100);
                }
                resolve(true);
            })
            .on('error', reject);

        writeStream.on('error', reject);

        readStream.pipe(writeStream);
    });
}

// function normalizeTitle(title) {
//     const normalized = title.replace(/[^a-zA-Z0-9\s]/g, '');
//     return normalized;
// }

function normalizeTitle(input) {
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

function segundosAMinutos(segundos) {
    if (isNaN(segundos) || segundos < 0) {
        return "Entrada no válida";
    }

    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = segundos % 60;


    const formatoSegundos = segundosRestantes < 10 ? `0${segundosRestantes}` : segundosRestantes;

    if (minutos < 60) {
        return `${minutos}:${formatoSegundos}`;
    } else {
        const horas = Math.floor(minutos / 60);
        const minutosRestantes = minutos % 60;
        const formatoHoras = horas < 10 ? `${horas}` : horas;
        const formatoMinutosRestantes = minutosRestantes < 10 ? `0${minutosRestantes}` : minutosRestantes;
        return `${formatoHoras}:${formatoMinutosRestantes}:${formatoSegundos}`;
    }
}

function formatNumber(num) {
    if (num < 1000) {
        return num.toString();
    } else if (num < 1000000) {
        return (num / 1000).toFixed(1) + ' K';
    } else {
        return (num / 1000000).toFixed(1) + ' M';
    }
}

function getAvailableFormats(video) {
    const match = video.mimeType.match(/^([^;]+)/);
    return match ? match[1] : null;
}

function seleccionarFormato(formatos, criterios) {
    return formatos.find(formato => {
        return criterios.every((criterio, index) => formato[Object.keys(formato)[index]] === criterio);
    });
}

// Función auxiliar para actualizar el título según el progreso
function updateTitle($progressBar, progress, text) {
    const progressBarWidth = $progressBar.width();
    const parentWidth = $progressBar.parent().width();

    if (progressBarWidth < parentWidth && progress > 0) {
        $(".title_mp4_downloader").text(text);
    }
}

// Reiniciar
function reiniciarProgress() {
    $(".pr_mp4").css({ width: 0 + "%" });
    $(".pr_mp3").css({ width: 0 + "%" });
    $(".pr_convert").css({ width: 0 + "%" });

    // Cargado
    const $btn = $(".btn_converte");
    $btn.removeClass("disabled-all");
    // hide loading
    $btn.find(".preloader-wrapper").removeClass("active");

    // add icon
    $btn.addClass("icon-search");

    // clear input
    $("#getvideo").val("");

    // hide
    $(".progress_download_video").fadeOut("fast");
    $(".info_view").fadeOut("fast");

    // center form
    setTimeout(() => {
        update_center_div();
    }, 500);
}

// Descargar Audio
async function convertMP4() {
    // interval
    kit.createInterval("download_video", async () => {
        const data = await _ajax("/getprogress", "POST", {});
        if (data.convert && data.convert.progress) {
            // title
            $(".title_mp4_downloader").text("Convirtiendo Video");

            // progress
            $(".pr_convert").css({ width: data.convert.progress + "%" });

            if (data.convert.done === true) {
                kit.removeInterval("download_video");
                // reiniciar todo
                reiniciarProgress();
                console.log(data.convert);

                // reload
                // window.location.reload();
            }
        }
    }, 2000);
}

// Descargar Audio
async function downloadMP3() {
    // interval
    kit.createInterval("download_video", async () => {
        const data = await _ajax("/getprogress", "POST", {});
        if (data.mp3 && data.mp3.progress) {
            // title
            $(".title_mp4_downloader").text("Descargando Audio");

            // progress
            $(".pr_mp3").css({ width: data.mp3.progress + "%" });

            if (data.mp3.done === true) {
                kit.removeInterval("download_video");

                // iniciar conversion
                convertMP4();

            }
        }
    }, 2000);
}
// Descargar video
async function downloadMP4(contentLength, quality, codecs, container) {
    let folder = await sendMessage("open-folder");
    if (folder) {
        await _ajax("/downloadvideo", "POST", {
            folder,
            select: { contentLength, quality, codecs, container }
        });

        // Cargando
        const $btn = $(".btn_converte");
        $btn.addClass("disabled-all");
        // show loading
        $btn.find(".preloader-wrapper").addClass("active");

        // remove icon
        $btn.removeClass("icon-search");

        // title
        $(".title_mp4_downloader").text("Descargando Video");

        // show
        $(".progress_download_video").fadeIn("fast");


        // interval
        kit.createInterval("download_video", async () => {
            const data = await _ajax("/getprogress", "POST", {});
            if (data.mp4 && data.mp4.progress) {
                // progress
                $(".pr_mp4").css({ width: data.mp4.progress + "%" });

                console.log(data.mp4);

                if (data.mp4.done === true) {
                    kit.removeInterval("download_video");

                    // Iniciar descarga del audio
                    downloadMP3();
                }
            }
        }, 2000);


    }

}

function rendererMp4Show(items) {
    const template = (item) => {
        let { contentLength, quality, codecs, container } = item;
        const onclick = `onclick="downloadMP4('${contentLength}', '${quality}', '${codecs}', '${container}')"`;
        return `<div class="tbbody">
                    <a href="#" class="tbb" ${onclick}>${getAvailableFormats(item)}</a>
                    <a href="#" class="tbb" ${onclick}>${item.qualityLabel}</a>
                    <div class="tbb">${item.fps}</div>
                    <a href="#" class="tbb" ${onclick}>${kit.getSizeBytes(item.contentLength || 0)}</a>
                </div>`;
    }

    $(".mp4_add_items").empty();
    for (const item of items) {

        if (item.hasVideo) {
            const $tb_elm = $(template(item));
            $(".mp4_add_items").append($tb_elm);
        }

    }
}


kit.onDOMReady(async () => {
    console.log(getAvailableFormats({ mimeType: 'video/mp4; codecs="avc1.640028"' }));
    // center form
    update_center_div();

    // Menu Left
    kit.addEvent('.open-menu-left', 'click', (e) => {


        kit.qsSelector(false, e.target.dataset.menu, (e) => {
            const veryClass = kit.hasClass(".menu-left", "menu-left-active");

            if (!veryClass) {
                e.style.left = 0;
                e.classList.add("menu-left-active");
            } else {
                e.style.left = -e.offsetWidth + "px";
                e.classList.remove("menu-left-active");
            }

        });


    });


    kit.addEvent('.menu-left', 'click', (e) => {
        const menu = e.currentTarget;
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        const menuRect = menu.getBoundingClientRect();

        const clickX = e.clientX - menuRect.left;
        const clickY = e.clientY - menuRect.top;

        if (clickX >= 0 && clickX <= menuWidth && clickY >= 0 && clickY <= menuHeight) {
        } else {
            menu.classList.remove('menu-left-active');
            menu.style.left = -menuWidth + "px";
        }
    });

    // All folders
    const folders = await sendMessage("all-folders");
    saved.addSaved("folders", folders);

    // get video
    $(".btn_mp4").on("click", async function () {

        const $btn = $(".btn_mp4");

        // obtener datos
        const data = await _ajax("/getmetadata", "POST", {
            link: $("#getvideo").val()
        });
        if (data.title) {
            // show data
            $(".name_music").text(data.title);
            $(".author_music").text(data.author);
            $(".duration_music").text(segundosAMinutos(data.duration));
            $(".views_music").text(formatNumber(data.views));
            $(".url_music").text(data.baseUrl);

            // pagination
            let nuevosdatos = data.formats.filter(items => items.hasVideo === true);
            saved.addSaved("formatos", nuevosdatos);
            $('#pagination_mp4').pagination({
                dataSource: nuevosdatos,
                pageSize: 5,
                callback: function (data, pagination) {
                    rendererMp4Show(data);
                }
            })

            // show data
            $(".info_view").fadeIn("fast");

            // mensaje
            M.toast({ html: data.title, classes: 'rounded blue' });

            console.log(data);

            // center form
            update_center_div();
        }



    });

    // get video
    $(".btn_mp3").on("click", async function () {

        const $btn = $(".btn_mp3");
        $btn.addClass("disabled-all");
        // show loading
        $btn.find(".preloader-wrapper").addClass("active");

        if ($btn.attr("data-is") === "save") {
            $btn.removeClass("icon-save1");
            let folder = await sendMessage("open-folder");
            if (folder) {
                // data video
                let infoVideo = saved.getSaved("data_video");

                // copy
                try {
                    const file_temp = path.join(folders.appPath, "apps", "tubedown", "app", "temp", "file_music.mp3");
                    const copy_file = await copyFileWithProgress(file_temp, path.join(folder, `${normalizeTitle(infoVideo.title)}.mp3`), (progress) => {
                        $(".progress_input").css({ width: `calc(${progress}% - 80px)` });
                    });

                    if (copy_file) {
                        $btn.removeAttr("data-is");
                        $btn.addClass("icon-search");
                        $("#getvideo").val("");

                        setTimeout(() => {
                            $(".progress_input").css({ width: `0%` });
                            $(".info_view").fadeOut("fast");
                        }, 500);

                        // mensaje
                        M.toast({ html: `Descarga Completa`, classes: 'rounded green' });
                    } else {
                        M.toast({ html: `Algo salió mal`, classes: 'rounded orange darken-4' });
                    }

                } catch (error) {
                    console.log(error);
                    $btn.addClass("icon-save1");
                    M.toast({ html: `Algo salió mal`, classes: 'rounded orange darken-4' });
                }

            } else {
                // add icono
                $btn.addClass("icon-save1");
                M.toast({ html: `Búsqueda Cancelada`, classes: 'rounded orange darken-4' });
            }

            // ocultar carga
            $btn.find(".preloader-wrapper").removeClass("active");
            $btn.removeClass("disabled-all");
            return
        }

        $btn.removeClass("icon-search");

        const data = await _ajax("/mp3", "POST", {
            link: $("#getvideo").val()
        });

        if (data.title) {

            // save data
            if (saved.hasKey("data_video")) {
                saved.removeSaved("data_video");
            }
            saved.addSaved("data_video", data);
            // add icono
            $btn.addClass("icon-save1");
            $btn.removeClass("disabled-all");

            // attr
            $btn.attr("data-is", "save")

            // show data
            $(".name_music").text(data.title);
            $(".size_music").text(kit.getSizeBytes(data.size));
            $(".info_view").fadeIn("fast");

            // mensaje
            M.toast({ html: `Lista para guardar`, classes: 'rounded blue' });
        } else {
            $btn.addClass("icon-search");
            M.toast({ html: `Algo salió mal`, classes: 'rounded orange darken-4' });
        }

        // ocultar carga
        $btn.find(".preloader-wrapper").removeClass("active");
    });

})

// Windows Resize
$(window).on("resize", () => {
    update_center_div();
});

ipcRenderer.on('download-mp4', (event, ...args) => {
    console.log(args);
});