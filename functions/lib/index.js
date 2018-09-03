"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const Storage = require("@google-cloud/storage");
const gcs = new Storage();
const os_1 = require("os");
const path_1 = require("path");
const sharp = require("sharp");
const fs = require("fs-extra");
exports.generateThumbnails = functions.storage
    .object()
    .onFinalize((object) => __awaiter(this, void 0, void 0, function* () {
    // get bucket name
    const bucket = gcs.bucket(object.bucket);
    console.log('bucket**', bucket);
    // full path of the file
    const filePath = object.name;
    console.log('filePath**', filePath);
    // reference to that filename
    const fileName = filePath.split('/').pop();
    console.log('fileName**', fileName);
    // reference to the directory that this file came from
    const bucketDir = path_1.dirname(filePath);
    console.log('bucketDir**', bucketDir);
    //create a new working directory in the temp directory called thumbs
    const workingDir = path_1.join(os_1.tmpdir(), 'thumbs');
    console.log('workingDir**', workingDir);
    // define path where we are going to download the source image
    const tempFilePath = path_1.join(workingDir, 'source');
    console.log('tempFilePath**', tempFilePath);
    if (fileName.includes('thumb@') || !object.contentType.includes('image')) {
        console.log('exiting function');
        return false;
    }
    // ensure thumbnail dir exist
    yield fs.ensureDir(workingDir);
    //download source file
    yield bucket.file(filePath).download({
        destination: tempFilePath
    });
    // resize the array and define an array of upload promise
    const sizes = [64, 128, 256];
    const uploadPromises = sizes.map((size) => __awaiter(this, void 0, void 0, function* () {
        const thumbName = `thumb@${size}_${fileName}`;
        const thumbPath = path_1.join(workingDir, thumbName);
        yield sharp(tempFilePath)
            .resize(size, size)
            .toFile(thumbPath);
        return bucket.upload(thumbPath, {
            destination: path_1.join(bucketDir, thumbName)
        });
    }));
    // run the upload operations
    yield Promise.all(uploadPromises);
    // remove tmp/thumbs from the filesyatem
    return fs.remove(workingDir);
}));
// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
//# sourceMappingURL=index.js.map