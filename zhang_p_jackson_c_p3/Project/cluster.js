"use strict";

var fs    = require('fs');
var zlib  = require('zlib');

var StreamClusterer = require('./lib/streamclusterer');
var JSONStream      = require('./lib/jsonstream');
var Lines           = require('./lib/lines');


var json = new JSONStream();
var clusterer = new StreamClusterer(json);

var files = process.argv.slice(2);

function processFile() {
  if (files.length == 0) {
    json.end();
    console.log("LE FIN");
    process.exit(0);
    return;
  }
  var file = fs.createReadStream(files.shift());
  var gz = zlib.createGunzip();
  file.pipe(gz).pipe(new Lines()).pipe(json, {end: false});
  file.on('end', function() {
    console.log("WUT");
    processFile();
  });
}

clusterer.on('cluster_added', function(cluster) {
  console.log("Added cluster " + cluster.id);
});
clusterer.on('cluster_updated', function(cluster) {
  console.log("Updated cluster " + cluster.id);
});
clusterer.on('cluster_deleted', function(cluster_id) {
  console.log("Deleted cluster " + cluster_id);
});

processFile();
