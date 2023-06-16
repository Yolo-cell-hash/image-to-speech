const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const bucketName = process.env.bucketName;
const accessKeyId = process.env.accessKeyId;
const secretAccessKey = process.env.secretAccessKey;

const fileName = 'uploaded_image.png';

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

app.get('/', function (req, res) {
  res.render('login');
});

app.get('/app', function (req, res) {
  res.render('home');
});

app.post('/app', upload.single('imageFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const imageFile = req.file;
  const filePath = path.join(__dirname, 'uploads', fileName);

  fs.rename(imageFile.path, filePath, async (err) => {
    if (err) {
      console.error('Error saving image file', err);
      return res.status(500).json({ error: 'Failed to save image' });
    }

    console.log('Image saved locally successfully');

    AWS.config.update({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    });

    const s3 = new AWS.S3();

    const params = {
      Bucket: bucketName,
      Key: `image_${uuidv4()}.png`,
      Body: fs.createReadStream(filePath),
      ACL: 'public-read',
      ContentType: 'image/png',
    };

    s3.upload(params, async (err, data) => {
      if (err) {
        console.error('Error uploading image:', err);
        return res.status(500).json({ error: 'Failed to upload image' });
      }

      console.log('Image uploaded successfully!');
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting local image file:', err);
        } else {
          console.log('Local image file deleted successfully');
        }
      });
      res.redirect('/app');
    });
  });
});


let port = process.env.PORT || 8080;
app.listen(port, function () {
  console.log('Server activated at port successfully');
});
