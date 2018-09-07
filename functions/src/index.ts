import * as functions from 'firebase-functions';
import * as Storage from '@google-cloud/storage';

const gcs = new Storage();

import { tmpdir } from 'os';
import { join, dirname } from 'path';
import * as sharp from 'sharp';
import * as fs from 'fs-extra';
import * as Busboy from 'busboy';

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
export const uploadFile = functions.https.onRequest((req, res) => {
//  response.send("Hello from Firebase!");
    if (req.method === 'POST') {
        const busboy = new Busboy({ headers: req.headers });

        busboy.on('file', (fieldname, file, filename) => {
            console.log(`Processed file ${filename}`);
            const filepath = join(tmpdir(), filename);
            const writeStream = fs.createWriteStream(filepath);
            file.pipe(writeStream);

            file.on('end', () => {
                writeStream.end();
              });
              writeStream.on('finish', ()=>{
                    const bucketName = 'abcx-1645e.appspot.com';

                    const bucket = gcs.bucket(bucketName);
                    bucket.upload(filepath)
                    .then(() => {
                        console.log(`${filepath} uploaded to ${bucketName}.`);
                    })
                    .catch(err => {
                        console.error('ERROR:', err);
                        return res.send();
                    });
              });
              writeStream.on('error',()=>{console.log('error')});
        });

        busboy.on('finish', () => {
            return res.status(200).jsonp({"msg": "success"});
        });
    }
});

/* exports.uploadFile = functions.https.onRequest((req, res) => {
    var form = new formidable.IncomingForm();
    return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if(err){
                console.log(err);
                reject(err);
                return;
          }
        var file = files.fileToUpload;

        console.log('fileName',file.name);
        console.log('filePath',file.path);
        if(!file){
          reject("no file to upload, please choose a file.");
          return;
        }
        console.info("about to upload file as a json: " + file.type);
        var filePath = file.path;
        console.log('File path: ' + filePath);
 
        var bucket = gcs.bucket('abcx-1645e.appspot.com');
        return bucket.upload(filePath, {
            destination: file.name
        }).then(() => {
          resolve();  // Whole thing completed successfully.
        }).catch((err) => {
          reject('Failed to upload: ' + JSON.stringify(err));
        });
      });
    }).then(() => {
      res.status(200).send('Yay!');
      return null
    }).catch(err => {
      console.error('Error while parsing form: ' + err);
      res.status(500).send('Error while parsing form: ' + err);
    });
  }); */
