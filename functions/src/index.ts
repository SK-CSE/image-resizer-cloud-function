import * as functions from 'firebase-functions';
import * as Storage from '@google-cloud/storage';

const gcs = new Storage();

import { tmpdir } from 'os';
import { join, dirname } from 'path';
import * as sharp from 'sharp';
import * as fs from 'fs-extra';

export const generateThumbnails = functions.storage
.object()
.onFinalize(async object => {

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
    const bucketDir = dirname(filePath);
    console.log('bucketDir**', bucketDir);


    //create a new working directory in the temp directory called thumbs
    const workingDir = join(tmpdir(), 'thumbs');
    console.log('workingDir**', workingDir);
    

    // define path where we are going to download the source image
    const tempFilePath = join(workingDir, 'source');
    console.log('tempFilePath**', tempFilePath);


    if(fileName.includes('thumb@') || !object.contentType.includes('image')) {
        console.log('exiting function');
        return false;
    }

    // ensure thumbnail dir exist
    await fs.ensureDir(workingDir);

    //download source file
    await bucket.file(filePath).download({
        destination : tempFilePath
    })

    // resize the array and define an array of upload promise
    const sizes = [64, 128, 256];

    const uploadPromises = sizes.map(async size => {
        const thumbName = `thumb@${size}_${fileName}`;
        const thumbPath = join(workingDir, thumbName);

        await sharp(tempFilePath)
        .resize(size,size)
        .toFile(thumbPath);

        return bucket.upload(thumbPath, {
            destination : join(bucketDir,thumbName)
        })
    });

    // run the upload operations
    await Promise.all(uploadPromises);

    // remove tmp/thumbs from the filesyatem
    return fs.remove(workingDir);


})

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
