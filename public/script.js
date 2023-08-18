import heatmapData from "./data.js"

var userMarker = null
var North
var East
var South
var West
var directionsRenderer
var directionsService
var currentInfoWindow = null

function initMap() {
  directionsRenderer = new google.maps.DirectionsRenderer()
  directionsService = new google.maps.DirectionsService()
  var tempMarker
  var fallbackLatLng = { lat: 37.775, lng: -122.434 } // Fallback coordinate
  var map = new google.maps.Map(document.getElementById("map"), {
    zoom: 13,
    center: fallbackLatLng,
    mapTypeControlOptions: {
      mapTypeIds: [],
    },
    fullscreenControl: false,
    streetViewControl: false,
    zoomControl: false,
  })

  var heatmap = new google.maps.visualization.HeatmapLayer({
    data: heatmapData,
    radius: getHeatmapRadius(map),
    gradient: ["rgba(0, 255, 255, 0)", "rgba(255, 0, 0, 1)", "rgba(255, 255, 0, 1)", "rgba(0, 255, 0, 1)"],
    maxIntensity: 1,
    map: map,
  })

  // Create the search box and link it to the UI element
  var input = document.getElementById("search-input")
  var searchBox = new google.maps.places.SearchBox(input)

  // Create the clear button and link it to the UI element
  var clearButton = document.getElementById("clear-button")
  clearButton.addEventListener("click", function () {
    input.value = ""
    if (tempMarker) {
      tempMarker.setMap(null)
    }
    directionsRenderer.setMap(null)
    currentInfoWindow.close()
  })

  // Create the current location button and link it to the UI element
  var currentLocationButton = document.getElementById("current-location-button")
  currentLocationButton.addEventListener("click", function () {
    getCurrentLocation(map)
  })

  // Check if the browser supports Geolocation
  if (navigator.geolocation) {
    // Get the user's current position
    getCurrentLocation(map)
  } else {
    // If the browser doesn't support Geolocation, use the fallback coordinate
    map.setCenter(fallbackLatLng)
    map.setZoom(13) // Set initial zoom level
  }

  // Listen for the event when a place is selected
  searchBox.addListener("places_changed", function () {
    var places = searchBox.getPlaces()
    if (places.length === 0) {
      return
    }

    // Remove the temporary marker if it exists
    if (tempMarker) {
      tempMarker.setMap(null)
    }

    // Add the selected place to the map as a temporary marker
    var location = places[0].geometry.location
    tempMarker = new google.maps.Marker({
      position: location,
      map: map,
    })

    // Set the map viewport to the bounds of the selected place
    map.panTo(location)
    map.setZoom(14) // Set zoom level when location is searched
  })

  // Add event listener for zoom change
  google.maps.event.addListener(map, "zoom_changed", function () {
    heatmap.setOptions({ radius: getHeatmapRadius(map) }) // Update the heatmap radius
  })

  google.maps.event.addListener(map, "bounds_changed", function () {
    North = map.getBounds().getNorthEast().lat()
    East = map.getBounds().getNorthEast().lng()
    South = map.getBounds().getSouthWest().lat()
    West = map.getBounds().getSouthWest().lng()
  })
  var openWindowButton = document.getElementById("openNewWindow")
  openWindowButton.addEventListener("click", function () {
    if (typeof North !== "undefined" && typeof East !== "undefined" && typeof South !== "undefined" && typeof West !== "undefined") {
      openNewWindow(North, East, South, West)
    } else {
      console.log("Map bounds are not yet available.")
    }
  })

  // Add event listener for map click
  google.maps.event.addListener(map, "click", function (event) {
    // Check if a place has been searched
    var destination = input.value
    if (!destination) {
      alert("Please enter a destination before clicking on the map.")
      return
    }
    calculateDirections(event.latLng, destination, map, directionsService, directionsRenderer)
  })
}

// Calculates route
function calculateDirections(start, end, map, directionsService, directionsRenderer) {
  directionsRenderer.setMap(null)
  directionsService.route(
    {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING,
    },
    function (response, status) {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(response)
        directionsRenderer.setMap(map)

        if (currentInfoWindow) {
          currentInfoWindow.close()
        }
        // Extract distance and duration from the response
        var route = response.routes[0].legs[0]
        var distance = route.distance.text
        var duration = route.duration.text

        // Create a content string for the InfoWindow
        var contentString = "<div ><strong>Distance:</strong>" + distance + "</div><div><strong>Duration:</strong> " + duration + "</div>"
        var infoWindow = new google.maps.InfoWindow({
          content: contentString,
        })
        infoWindow.setPosition(route.steps[Math.floor(route.steps.length / 2)].end_location) // Position it near the middle of the route
        infoWindow.open(map)
        currentInfoWindow = infoWindow
      } else {
        console.error("Directions request failed due to " + status)
      }
    }
  )
}

//Opens Zillow at current map bounds
function openNewWindow(North, East, South, West) {
  var url = `https://www.zillow.com/homes/for_rent/?searchQueryState=%7B%22mapBounds%22%3A%7B%22north%22%3A${North}%2C%22east%22%3A${East}%2C%22south%22%3A${South}%2C%22west%22%3A${West}%7D%2C%22isMapVisible%22%3Atrue%2C%22filterState%22%3A%7B%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22ah%22%3A%7B%22value%22%3Atrue%7D%7D%2C%22isListVisible%22%3Atrue%2C%22mapZoom%22%3A12%7D`
  var newWindow = window.open(url, "_blank")

  if (newWindow) {
    console.log("New window opened successfully.")
  } else {
    console.log("New window opening was blocked by the browser or failed to open.")
  }
}

// Function to calculate the initial heatmap radius based on the current zoom level
function getHeatmapRadius(map) {
  var radiusPixels
  var zoom = map.getZoom()
  if (zoom >= 20) {
    radiusPixels = 1000
  } else if (zoom > 18 && zoom <= 19) {
    radiusPixels = 800
  } else if (zoom > 17 && zoom <= 18) {
    radiusPixels = 600
  } else if (zoom > 16 && zoom <= 17) {
    radiusPixels = 400
  } else if (zoom > 15 && zoom <= 16) {
    radiusPixels = 300
  } else if (zoom > 14 && zoom <= 15) {
    radiusPixels = 100
  } else if (zoom > 13 && zoom <= 14) {
    radiusPixels = 60
  } else if (zoom > 12 && zoom <= 13) {
    radiusPixels = 50
  } else if (zoom > 11 && zoom <= 12) {
    radiusPixels = 30
  } else if (zoom > 10 && zoom <= 11) {
    radiusPixels = 20
  } else if (zoom > 9 && zoom <= 10) {
    radiusPixels = 15
  } else if (zoom > 8 && zoom <= 9) {
    radiusPixels = 10
  } else if (zoom > 7 && zoom <= 8) {
    radiusPixels = 8
  } else if (zoom > 6 && zoom <= 7) {
    radiusPixels = 8
  } else if (zoom > 5 && zoom <= 6) {
    radiusPixels = 7
  } else if (zoom > 4 && zoom <= 5) {
    radiusPixels = 7
  } else if (zoom < 5) {
    radiusPixels = 3
  } else {
    radiusPixels = 10
  }

  return radiusPixels
}

// Get user's current location and center the map
function getCurrentLocation(map) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var userLatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        map.setCenter(userLatLng)
        map.setZoom(13) // Set initial zoom level

        if (userMarker) {
          userMarker.setMap(null)
        }
        // Create a current location blue dot
        var circleIcon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "blue",
          fillOpacity: 0.7,
          strokeColor: "white",
          strokeOpacity: 0.7,
          strokeWeight: 3,
          scale: 10,
        }

        // Add blue dot marker at user's location
        userMarker = new google.maps.Marker({
          position: userLatLng,
          map: map,
          icon: circleIcon,
        })
      },
      function () {
        alert("Unable to retrieve your location.")
      }
    )
  } else {
    alert("Geolocation is not supported by your browser.")
  }
}

initMap()
