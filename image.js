'use strict';
const fileType = require('file-type');
const uuid = require('uuid');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

module.exports.uploadImage = async (event, context, callback) => {
  const body = JSON.parse(event.body);
  try {
    if (!body || !body.image) {
      console.log(body.image)
      return Responses._400({ message: 'incorrect body on request'});
    }

    let imageData = body.image;
    // if(body.image.substr(0,7) === 'base64,') {
    //   imageData = body.image.substr(7, body.image.length);
    // }

    const buffer = new Buffer.from(imageData, 'base64');
    const fileInfo = await fileType.fromBuffer(buffer);
    const detectedExt = fileInfo.ext;
    const detectedMime = fileInfo.mime;

    const name = uuid.v4();
    const key = `${name}.${detectedExt}`;

    console.log(`writing image to bucket called ${key}`);

    await s3
        .putObject({
            Body: buffer,
            Key: key,
            ContentType: detectedMime,
            Bucket: 'ee-fyp-image-bucket',
            ACL: 'public-read',
        })
        .promise();
    const url = `https://ee-fyp-image-bucket.s3-ap-southeast-1.amazonaws.com/${key}`;
    console.log(url);
    return Responses._200({
        imageURL: url,
    });
} catch (error) {
    console.log('error', error);
    return Responses._400({ message: error.message || 'failed to upload image' });
  }
}


const Responses = {
  _DefineResponse(statusCode = 502, data = {}) {
      return {
          headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Methods': '*',
              'Access-Control-Allow-Origin': '*',
          },
          statusCode,
          body: JSON.stringify(data),
      };
  },

  _200(data = {}) {
      return this._DefineResponse(200, data);
  },

  _204(data = {}) {
      return this._DefineResponse(204, data);
  },

  _400(data = {}) {
      return this._DefineResponse(400, data);
  },
  _404(data = {}) {
      return this._DefineResponse(404, data);
  },
};