#!/bin/bash
newman run postman/trifusion-dynamics.postman_collection.json \
  -e postman/local.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export postman/results.json
