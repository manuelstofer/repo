#!/bin/bash
echo start server
node test/server.js&

sleep 3;

echo test in browser
SERVER_PID=$! && \
./node_modules/mocha-phantomjs/bin/mocha-phantomjs http://localhost:2014/test/test-runner.html && \

echo shutdown server
kill ${SERVER_PID}

