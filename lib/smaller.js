function smaller(tweet) {
  var fields = [
    'contributors', 'entities', 'favorite_count', 'favorited', 'filter_level',
    'geo', 'id', 'lang', 'place', 'possibly_sensitive', 'retweet_count',
    'retweeted', 'source', 'truncated'
  ];
  fields.forEach(function(field) {
    delete tweet[field];
  });
  for (var key in tweet) {
    if (key.indexOf("in_reply_to") == 0) {
      delete tweet[key];
    }
  }
  if (tweet.user) {
    var fields = [
      'contributors', 'contributors_enabled', 'created_at', 'description',
      'favorite_count', 'favourites_count', 'follow_request_sent',
      'followers_count', 'following', 'friends_count', 'geo_enabled', 'id',
      'is_translator', 'listed_count', 'location', 'notifications', 'place',
      'protected', 'retweet_count', 'statuses_count', 'url', 'verified',
      'utc_offset', 'time_zone', 'lang'
    ];
    fields.forEach(function(field) {
      delete tweet.user[field];
    });
    for (var key in tweet.user) {
      if (key.indexOf('profile_') == 0) {
        delete tweet.user[key];
      }
      if (key.indexOf('default_') == 0) {
        delete tweet.user[key];
      }
    }
  }
  if (tweet.coordinates) {
    delete tweet.coordinates.type;
    delete tweet.coordinates.place;
  }
}

module.exports = smaller;
