'use strict';
const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment-timezone');
const timeFormat = 'DD-MM-YYYY hh:mm:ss';
const timezone = 'Asia/Kuala_Lumpur';

const db = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });

const devicesTable = process.env.DEVICES_TABLE;
const payloadsTable = process.env.PAYLOADS_TABLE;
const userTable = process.env.USER_TABLE;

var date = new Date();
function response(statusCode, message) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}

//post new user
module.exports.signupUser = (event, context, callback) => {
  let x = JSON.parse(event.body);
  let status = 200;
  let emailValid = true;
  let codeValid = false;
  const user = {
    id: uuid.v4(),
    createAt: moment(date.getTime()).tz(timezone).format(timeFormat),
    email: x.email,
    name: x.name,
    password: x.password,
    userCode: x.userCode,
    isAdmin: false,
  };

  db.scan({
    TableName: userTable
  })
  .promise()
  .then((res) => {
    if(res.Items) {
      new Promise((next) => {
          let item = {};
        for(let i=0; i< res.Items.length; i++) {
          if(res.Items[i].userCode == x.userCode) {
            codeValid = true;
            break;
          }
        }
        if(!codeValid) {
            item = { error: 'User Code does not exists'}
            status = 404;
        }
        if(x.userCode == null || x.userCode == '') {
          codeValid = true;
        }
        for(let i = 0; i < res.Items.length; i++) {
          if(res.Items[i].email == x.email) {
            item = { error: 'Email exists. Try using another one'};
            status = 409;
            emailValid = false;
            break;
          }
        }
        next(item);
      }).then((item) => {
          if(emailValid && codeValid) {
            return db.put({
              TableName: userTable,
              Item: user
            }).promise().then(() => {
              callback(null, response(201, user))
            })
              .catch(err => {
                response(err.statusCode, err)
              });
          } else {
            callback(null, response(status, item));
          }
        
      });
    } else {
      callback(null, response(404, { error: 'User not found'}));
    }
  })
  .catch((err) => callback(null, response(err.statusCode, err)));
}

//get user
module.exports.loginUser = (event, context, callback) => {

  return db.scan({
    TableName: userTable
  })
  .promise()
  .then((res) => {
    if(res.Items) {
      new Promise((next) => {
          let item = null;
        for(let i = 0; i < res.Items.length; i++) {
          if(res.Items[i].email == event.pathParameters.email && res.Items[i].password == event.pathParameters.password) {
            item = res.Items[i];
          }
        }
        next(item);
      }).then((item) => {
        if(item !=null)
          callback(null, response(200, item));
        else 
          callback(null, response(404, {error: 'User not found'}));
      });
     
    } else {
      
      callback(null, response(404, { error: 'User not found' + res.Items}));
    }
  })
  .catch((err) => callback(null, response(err.statusCode, err)));
};

//get users
module.exports.getUsers = (event, context, callback) => {

  return db.scan({
    TableName: userTable
  })
  .promise()
  .then((res) => {
    if(res.Items) {
      new Promise((next) => {
          let item = [];
        for(let i = 0; i < res.Items.length; i++) {
          if(res.Items[i].userCode == event.pathParameters.userCode) {
            item.push(res.Items[i]);
          }
        }
        next(item);
      }).then((item) => {
        callback(null, response(200, item));
      });
     
    } else {
      
      callback(null, response(404, { error: 'Devices not found' + res.Items}));
    }
  })
  .catch((err) => callback(null, response(err.statusCode, err)));
};

//update user
module.exports.updateUser = (event, context, callback) => {
  let status = 200;
  let codeValid = false;
  const id = event.pathParameters.id;
  const reqBody = JSON.parse(event.body);
  const { name, password, userCode, isAdmin } = reqBody;
  const params = {
    Key: {
      id: id
    },
    TableName: userTable,
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: 'SET #n=:nameValue, password=:passwordValue, userCode = :userCodeValue, isAdmin=:isAdminValue',
    ExpressionAttributeNames: {
      '#n': "name"
    },
    ExpressionAttributeValues: {
      ':nameValue': name,
      ':passwordValue': password,
      ':userCodeValue': userCode,
      ':isAdminValue': isAdmin
    },
    ReturnValues: 'ALL_NEW'
  };
  console.log('Updating');
  db.scan({
    TableName: userTable
  })
  .promise()
  .then((res) => {
    if(res.Items) {
      new Promise((next) => {
          let item = {};
        for(let i=0; i< res.Items.length; i++) {
          if(res.Items[i].userCode == userCode) {
            codeValid = true;
            break;
          }
        }
        if(!codeValid) {
            item = { error: 'User Code does not exists'}
            status = 404;
        }
        if(userCode == null || userCode == '') {
          codeValid = true;
        }
        next(item);
      }).then((item) => {
          if(codeValid) {
            return db
              .update(params)
              .promise()
              .then((res) => {
                console.log(res);
                callback(null, response(200, res.Attributes));
            })
            .catch((err) => callback(null, response(err.statusCode, err)));
          } else {
            callback(null, response(status, item));
          }
        
      });
    } else {
      callback(null, response(404, { error: 'User not found'}));
    }
  })
  .catch((err) => callback(null, response(err.statusCode, err)));
}

//update userCode
module.exports.updateUserCode = (event, context, callback) => {
  const id = event.pathParameters.id;
  const reqBody = JSON.parse(event.body);
  const { userCode, isAdmin } = reqBody;
  const params = {
    Key: {
      id: id
    },
    TableName: userTable,
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: 'SET userCode = :userCodeValue, isAdmin=:isAdminValue',

    ExpressionAttributeValues: {
      ':userCodeValue': userCode,
      ':isAdminValue': isAdmin
    },
    ReturnValues: 'ALL_NEW'
  };
  console.log('Updating');

  return db
    .update(params)
    .promise()
    .then((res) => {
      console.log(res);
      callback(null, response(200, res.Attributes));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//post new payload
module.exports.createPayload = (event, content, callback) => {
  let x = JSON.parse(event.body);
  const payload = {
    id: uuid.v4(),
    createAt: moment(date.getTime()).tz(timezone).format(timeFormat),
    hexVal: x.hexVal,
    name: x.name,
    decodeType: x.decodeType,
    frequency: x.frequency,
    rawlen: x.rawlen,
  }

  return db.put({
    TableName: payloadsTable,
    Item: payload
  }).promise().then(() => {
    callback(null, response(201, payload.id))
  }) 
    .catch(err => response(null, response(err.statusCode, err)));
}

//get payload
module.exports.getPayload = (event, context, callback) => {
  const params = {
    Key: {
      id: event.pathParameters.id
    },
    TableName: payloadsTable
  };
  
  return db
    .get(params)
    .promise()
    .then((res) => {
      if (res.Item) callback(null, response(200, res.Item));
      else callback(null, response(404, { error: 'Payload not found' + id }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//post new device
module.exports.createDevice = (event, context, callback) => {
  let x = JSON.parse(event.body);
  const device = {
    id: uuid.v4(),
    createAt: moment(date.getTime()).tz(timezone).format(timeFormat),
    name: x.name,
    topic: x.topic,
    payload: x.payload,
    imageUrl: x.imageUrl,
    userCode: x.userCode
  };

  return db.put({
    TableName: devicesTable,
    Item: device
  }).promise().then(() => {
    callback(null, response(201, device))
  })
    .catch(err => response(null, response(err.statusCode, err)));
}

//get device
// module.exports.getDevice = (event, context, callback) => {
//   const params = {
//     Key: {
//       id: event.pathParameters.id
//     },
//     TableName: devicesTable
//   };

//   return db
//     .get(params)
//     .promise()
//     .then((res) => {
//       if (res.Item) callback(null, response(200, res.Item));
//       else callback(null, response(404, { error: 'Device not found' + id }));
//     })
//     .catch((err) => callback(null, response(err.statusCode, err)));
// };

//get devices
module.exports.getDevices = (event, context, callback) => {

  return db.scan({
    TableName: devicesTable
  })
  .promise()
  .then((res) => {
    if(res.Items) {
      new Promise((next) => {
          let item = [];
        for(let i = 0; i < res.Items.length; i++) {
          if(res.Items[i].userCode == event.pathParameters.userCode) {
            item.push(res.Items[i]);
          }
        }
        next(item);
      }).then((item) => {
        callback(null, response(200, item));
      });
     
    } else {
      
      callback(null, response(404, { error: 'Devices not found' + res.Items}));
    }
  })
  .catch((err) => callback(null, response(err.statusCode, err)));
};

//get device-payload
module.exports.getDevicePayload = (event, context, callback) => {
  const params = {
    Key: {
      id: event.pathParameters.id
    },
    TableName: devicesTable
  };

  return db
    .get(params)
    .promise()
    .then((res) => {
      if(res.Item) {
      
        new Promise((next)=>{
          let result = res.Item.payload;
        for (let i = 0; i < res.Item.payload.length; i++) {
          if(res.Item.payload[i].name == event.pathParameters.name){
            result = res.Item.payload[i];
          }
        }
        next(result)
        }).then((result)=>{
          callback(null, response(200, result)); 
        })
        
      } else {
        callback(null, response(404, { error: 'Device not found' + id}));
      }
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//update device
module.exports.updateDevice = (event, context, callback) => {
  const id = event.pathParameters.id;
  const reqBody = JSON.parse(event.body);
  const { name, topic, payload, imageUrl } = reqBody;
  const params = {
    Key: {
      id: id
    },
    TableName: devicesTable,
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: 'SET #n=:nameValue, topic=:topicValue, payload=:payloadValue, imageUrl=:imageUrlValue',
    ExpressionAttributeNames: {
      '#n': "name"
    },
    ExpressionAttributeValues: {
      ':nameValue': name,
      ':topicValue': topic,
      ':payloadValue': payload,
      ':imageUrlValue': imageUrl
    },
    ReturnValues: 'ALL_NEW'
  };
  console.log(payload)
  console.log(id)
  console.log('Updating');

  return db
    .update(params)
    .promise()
    .then((res) => {
      console.log(res);
      callback(null, response(200, res.Attributes));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//delete device
module.exports.deleteDevice = (event, context, callback) => {
  const id = event.pathParameters.id;
  const params = {
    Key : {
      id : id
    },
    TableName: devicesTable
  };

  return db
    .delete(params)
    .promise()
    .then(() => 
    callback(null, response(200, {message: 'Device deleted successfully'}))
  )
  .catch((err) => callback(null, response(err.statusCode, err)));
}