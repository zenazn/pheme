Pheme
=====

Birds of a feather tweet together.

Installation
============
1. Install/update homebrew (http://mxcl.github.io/homebrew/).
2. Install/update yajl:
    brew install yajl

3. Install node.js:
    brew install node

4. Install required node.js packages
    npm install

5. Sign up for a Twitter API key, and copy the appropriate secrets into
   secrets.json (see secrets.json.example for an example). Our API secrets are
   availible upon request.

6. Start Pheme
    node server.js

7. Visit http://localhost:3000 in a browser

Since we rely on Twitter's live streaming API, we require the use of a server.
https://piazza.com/class#spring2013/cs171/511

If you have trouble running the above code, we can provide a server to connect
to that performs the required API translation and authentication.


Code Overview
=============

The server code lives in the `lib` folder. It is organized into a streaming JSON
parser, a "replay" agent (which replays pre-recorded tweet streams), and a live
"twitter" agent (which connects to Twitter's realtime stream).

The client code lives in the `public` folder. It is organized into a clustering
engine and the UI of the visualization.


Libraries
=========

We use the Google Maps API (for maps), jQuery (for easy DOM manipulation),
Twitter Bootstrap (for a couple UI elements), Handlebars (for templating), and
socket.io (for live streaming data), all of which are hosted on external CDNs.


Data
====

We use Twitter's "statuses/filter" streaming API, documentation for which can be
found here:

    https://dev.twitter.com/docs/api/1.1/post/statuses/filter
