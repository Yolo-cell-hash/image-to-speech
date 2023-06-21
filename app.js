const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const multer = require('multer');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const bucketName = 'file-store-bucket-for-image-text-app';
const bucketBackup = 'file-store-bucket-backup';
const audioBucket = 'audio-file-from-polly';
const accessKeyId = 'AKIAQHWFNWM36VAG4TOS';
const secretAccessKey = '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';

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

const upload = multer();

AWS.config.update({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
});

const s3 = new AWS.S3();

const waitForAudioFile = async (audioKey) => {
  const params = {
    Bucket: audioBucket,
    Prefix: audioKey,
  };

  while (true) {
    try {
      const data = await s3.listObjectsV2(params).promise();
      const audioFile = data.Contents.find(file => file.Key.endsWith('.mp3'));
      if (audioFile) {
        console.log('Audio file found!');
        return;
      }
    } catch (error) {
      console.log('Audio file not found yet...');
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};

app.get('/', function (req, res) {
  res.render('login');
});

app.post('/app', upload.single('imageFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const imageFile = req.file;

  const bucket1Params = {
    Bucket: bucketName,
    Key: `image_${uuidv4()}.png`,
    Body: imageFile.buffer,
    ACL: 'public-read',
    ContentType: 'image/png',
  };

  const bucket2Params = {
    Bucket: bucketBackup,
    Key: `image_${uuidv4()}.png`,
    Body: imageFile.buffer,
    ACL: 'public-read',
    ContentType: 'image/png',
  };

  const uploadToBucket = (params) => {
    return new Promise((resolve, reject) => {
      s3.upload(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          console.log('Image uploaded successfully!');
          resolve();
        }
      });
    });
  };

  try {
    await Promise.all([
      uploadToBucket(bucket1Params),
      uploadToBucket(bucket2Params),
    ]);

    const imageURL = `https://${bucketName}.s3.ap-south-1.amazonaws.com/${bucket1Params.Key}`;

    const imageKey = bucket1Params.Key.replace(/\.[^/.]+$/, '');
    const audioKey = imageKey;

    await waitForAudioFile(audioKey);

    const audioFileName = `${audioKey}_merged.mp3`;
    const audioURL = `https://${audioBucket}.s3.ap-south-1.amazonaws.com/${audioFileName}`;

    res.redirect(`/app?audioURL=${encodeURIComponent(audioURL)}&imageURL=${encodeURIComponent(imageURL)}`);
  } catch (err) {
    console.error('Failed to upload image or retrieve audio:', err);
    return res.status(500).json({ error: 'Failed to upload image or retrieve audio' });
  }
});

app.get('/app', function (req, res) {
  var audioURL = req.query.audioURL || '';
  var imageURL = req.query.imageURL || '';
  res.render('home', { audioURL, imageURL });
  audioURL = '';
  imageURL = '';
});

let port = process.env.PORT || 8080;
app.listen(port, function () {
  console.log('Server activated successfully');
});
