"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongodb_1 = require("mongodb");
var uri = process.env.MONGODB_URL;
if (!uri) {
    throw new Error('MONGODB_URL is not defined in environment variables');
}
var clientPromise;
if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
        var client = new mongodb_1.MongoClient(uri);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
}
else {
    var client = new mongodb_1.MongoClient(uri);
    clientPromise = client.connect();
}
exports.default = clientPromise;
