#!/usr/bin/env bash

trap "exit" INT TERM ERR
trap "kill 0" EXIT

NODE_PORT=3000

node ../dist/APIWebServer.js --port=${NODE_PORT}
