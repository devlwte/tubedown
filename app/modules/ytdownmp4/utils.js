const path = require('path');
const fs = require('fs');

class Utils {
    constructor() {

    }
    sanitizeFilename(filename) {
        const invalidCharsRegex = /[<>:"\/\\|?*\x00-\x1F]/g;
        const replacementChar = "_";
        return filename.replace(invalidCharsRegex, replacementChar);
    }

    createOutputFolder(folderName) {
        try {
            if (!fs.existsSync(folderName)) {
                fs.mkdirSync(folderName, { recursive: true });
            }
        } catch (error) {
            throw new Error("Failed to create output folder");
        }
    }
}

module.exports = Utils;