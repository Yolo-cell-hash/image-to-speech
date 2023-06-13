const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { Storage } = require('@google-cloud/storage');
const bucketName = 'image_to_speech_file_storage';

const app = express();
const storage = new Storage();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

const timestamp = Date.now();
const upload = multer({ dest: 'uploads/' });

app.get('/login', function (req, res) {
  res.render('login');
});


app.get('/logout', function (req, res) {
  res.render('logout');
});
















app.get('/', function (req, res) {
  res.render('home');
});

app.post('/', upload.single('imageFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const imageFile = req.file;
  const fileName = 'uploaded_image.png';
  const filePath = path.join(__dirname, 'uploads', fileName);
  let localFilePath = filePath;
  const fileExtension = path.extname(localFilePath);
  let destinationFileName = `image_${timestamp}${fileExtension}`;

  fs.rename(imageFile.path, filePath, async (err) => {
    if (err) {
      console.error('Error saving image file', err);
      return res.status(500).json({ error: 'Failed to save image' });
    }

    console.log('Image saved locally successfully');

    async function uploadImageToBucket(bucketName, localFilePath, destinationFileName) {
      try {
        const storage = new Storage();
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(destinationFileName);

        const readStream = fs.createReadStream(localFilePath);

        const uploadStream = file.createWriteStream({
          resumable: false,
          contentType: 'image/jpeg',
          predefinedAcl: 'publicRead', // Set the desired ACL for the uploaded file
        });

        readStream.pipe(uploadStream);

        return new Promise((resolve, reject) => {
          uploadStream.on('error', (err) => {
            console.error('Error uploading image:', err);
            reject(err);
          });

          uploadStream.on('finish', () => {
            console.log('Image uploaded successfully!');
            resolve(true);
            fs.unlink(localFilePath, (err) => {
              if (err) {
                console.error('Error deleting local image file:', err);
              } else {
                console.log('Local image file deleted successfully');
              }
            });
            res.redirect('/');
          });
        });
      } catch (err) {
        console.error('Error uploading image:', err);
        return false;
        res.redirect('/');
      }
    }

    uploadImageToBucket(bucketName, localFilePath, destinationFileName);
  });
});

let port = process.env.PORT || 8080;
app.listen(port, function () {
  console.log('Server activated at port successfully');
});
