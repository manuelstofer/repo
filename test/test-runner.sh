#!/bin/bash
echo start server
node test/server.js&
SERVER_PID=$!

sleep 3;

echo test in browser
./node_modules/mocha-phantomjs/bin/mocha-phantomjs http://localhost:2014/test/test-runner.html
TEST_RESULT=$?

echo shutdown server
kill ${SERVER_PID};

exit ${TEST_RESULT};
