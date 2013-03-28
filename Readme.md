# Repo

[![Build Status](https://travis-ci.org/manuelstofer/repo.png?branch=master)](https://travis-ci.org/manuelstofer/repo)


`Experimental` real-time storage API for MongoDB over socket.io.

## Features

- MongoDB support
- Store and retrieve objects
- Subscribe to objects
- Subscribe to queries
- In-memory storage for development
- Complete mock for unit tests


## Implementation

![Diagram](resources/diagram.png)

### Client

The client provides the API to access the database.


### Transport

The client communicates with the storage over [socket.io](https://github.com/learnboost/socket.io/).
But any other `event emitter` providing `.emit`, `.on,` `.off` will work as transport layer as long as it
executes callbacks on the client side.


### Storage

The storage handles changes and manages subscriptions to objects and queries. It distributes
update notification to all connected clients. The database is accessed through a simple storage layer (backend).


### Backend

Repo provides a backend for MongoDB and one implementing an in-memory storage. The in-memory backend
can be used for development and as a mock for unit tests.

It assumes that only repo accesses the database. It won't provide real-time updates for
objects changed in other ways.



### Queries

Repo supports a subset of MongoDB queries.

It sends real-time notifications when new objects match a subscribed query and when objects
from the result set don't match the query anymore. This feature is implemented with
[qry](https://github.com/manuelstofer/qry) and works with both the MongoDB and the in-memory backend.

Please check qry for the supported query operators.


### Access / Authentication

Is planed but currently not supported.


### Testing

Repo is currently tested with Phantom.js only.

## Installation

Node (server side):

```
npm install repo
```

Browser:

```
component install manuelstofer/repo
```

## Client connection

Socket.io

```
var storage = require('repo'),
    client  = storage.client({
        socket: io.connect('http://localhost')
    });
````

Mock:

```
var storage = require('repo'),
    client  = storage.mock(),
````


## API

The client API provides following methods:

- get
- put
- del
- query


### get

The Example below retrieves the object with _id `10`, without following real-time notifications:

```
client.get(10, function (notification) {
    console.log(notification.data);
});
```

##### Update notifications

The callback can return a function to receive real-time updates. This requires
manual unsubscription. The callback gets an `unsub` function as second argument
for this purpose.

```
client.get(10, function (notification, unsub) {
    console.log(notification.data);

    return function (notification) {
        if (notification.event === 'change') {
            console.log('object changed:', notification.data);
        }

        if (notification.event === 'del') {
            unsub();
        }
    }
});
```

##### Callback objects

Its also supported to return an object with the events you are interested in as keys.

```
client.get(10, function (notification, unsub) {
    console.log(notification.data);

    return {
        change: function (notification) {
            console.log('changed to', notification.data);
        }

        del: function (notification) {
            console.log('object was deleted');
            unsub();
        }
    }
});
```


### put


Will update / insert an object. If the object has an `_id` attribute its treated as update.
Otherwise its an insert. The update notification works the same way as described for the get method.

```
var obj = {
    name: 'repo',
    version: 'experimental'
};

client.put(obj, function (notification, unsub) {
    console.log(notification.data);
    return {
        del: function (notification) {
            console.log('object deleted');
            unsub();
        }
    }
});
```


### del

Deletes an object

```
client.del(10, function (notification) {
    console.log('the object with id 10 was deleted');
});
```

### query

Repo can be queried with MongoDB queries. Please check the [MongoDB reference](http://docs.mongodb.org/manual/reference/operators/#query-selectors)
for the query format and [qry](https://github.com/manuelstofer/qry) for supported operators.

```
// query for objects with attribute tag equal to hello

client.query({tag: 'hello'}, function (notification, unsub) {

    console.log('results', notification.data);

    return {
        change: function (notification) {
            console.log('object in the result set changed', notification.data);
        },

        match: function (notification) {
            console.log('there is an new object with the tag "hello"', notification.data);
        },

        unmatch: function (notification) {
            console.log('an object does have the tag "hello" anymore or was deleted');
        }
    };
});
```

Queries need manual unsubscription as well.

### Server

Following example will create a server for Repo with Express, Socket.io and MongoDB

```
var express     = require('express'),
    app         = express(),
    http        = require('http'),
    server      = http.createServer(app),
    io          = require('socket.io').listen(server),

    repo        = require('repo'),
    storage     = repo.storage,
    mongo       = repo.backends.mongo,

    // @see mongodb-native driver reference
    options = {
        server: {
        	host: 'localhost',
        	options: {}
        },
        db: {
            name: 'test',
            options: {
                safe: true
            }
        },
        collection: 'test'
    };

// connect to mongo db
mongo(options, function (backend) {

    // create storage
    var storageApi = storage({
        backend: backend
    });

   	// add a new client
    io.sockets.on('connection', storageApi.addClient);
});

app.configure(function () {
    app.use(express.logger('dev'));
    app.use(express.static(__dirname + '/public'));
});

server.listen(2014);
```

The documentation for the MongoDB connection options can be found [here](http://mongodb.github.com/node-mongodb-native/driver-articles/mongoclient.html)



