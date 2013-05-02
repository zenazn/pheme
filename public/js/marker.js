// TODO: this is silly.
define(['common/latlon'], function(LatLon) {
  function Marker(map, pos) {
    // Overplot protection
    var skew = function() {
      return (Math.random() - 0.5) / 2000;
    };
    var coord = new google.maps.LatLng(pos.lat(), pos.lon());

    var marker = new google.maps.Marker({
      map: map,
      draggable: false,
      flat: true,
      animation: google.maps.Animation.DROP,
      position: coord,
      icon: {
        fillColor: "blue",
        path: google.maps.SymbolPath.CIRCLE,
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: "black",
        scale: 4
      }
    });

    return marker;
  }

  return Marker;
});
