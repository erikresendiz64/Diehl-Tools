let exportData;
let counter;
window.addEventListener("DOMContentLoaded", (event) => {
  const input = document.getElementById("csv");
  if (input) {
    input.addEventListener("change", loadData);
  }
});

function loadData(event) {
  const fileList = this.files;

  if (fileList.length > 0) {
    console.log("Found a file");
    const reader = new FileReader();
    let fileData;
    reader.addEventListener(
      "load",
      () => {
        fileData = reader.result;
        geocodeList(fileData);
      },
      false
    );

    reader.readAsText(event.target.files[0]);
  }
}

async function geolocateAddress(){
  document.getElementById("results_id").innerText = "";
  let userAddress = document.getElementById("address").value;
  let jsonResponse = await getJSONResponse(userAddress.split(","));

  if(jsonResponse === undefined || jsonResponse.summary.numResults === 0) {
    document.getElementById("results_id").innerText += "Invalid Address Produced an Error\n\n";
    return;
  }
  let jsonResult = jsonResponse.results[0];
  try {
    const latitude = jsonResult.position.lat;
    const longitude = jsonResult.position.lon;
    const address = jsonResult.address.streetNumber + " " + jsonResult.address.streetName;
    const city = jsonResult.address.municipality;
    const state = jsonResult.address.countrySubdivisionCode;

    document.getElementById("results_id").innerText +=
        `${address}, ${city}, ${state} has coordinates (${latitude},${longitude})\n\n`;

  } catch(e) {
    console.log(e);
  }

  document.getElementById("results_id").innerText += "Process Finished";
}

async function geocodeList(fileData) {
  counter = 1;
  exportData = "Address,City,State,Latitude,Longitude\n";
  document.getElementById("results_id").innerText = "";

  console.log("1. Beginning Data Processing Phase");
  await processData(fileData);

  console.log("2. Creating CSV");
  download("geolocation.csv");
}

async function processData(fileData) {
  const dataArray = fileData.split("\n");
  console.log(dataArray);
  for(let i = 1; i < dataArray.length - 1; ++i) {
    const location = dataArray[i].split(",");
        console.log("Getting JSON Response");
        let locationInfo = await getJSONResponse2(location);
        console.log("Writing Data")
        writeResult(locationInfo);
  }
  // if(dataArray.length > 5000) {
  //   for(let i = 1; i < 2500; ++i) {
  //     const location = dataArray[i].split(",");
  //     console.log("Getting JSON Response");
  //     let locationInfo = await getJSONResponse1(location);
  //     console.log("Writing Data")
  //     writeResult(locationInfo);
  //   }
  //   for(let i = 2500; i < dataArray.length - 1; ++i) {
  //     const location = dataArray[i].split(",");
  //     console.log("Getting JSON Response");
  //     let locationInfo = await getJSONResponse2(location);
  //     console.log("Writing Data");
  //     writeResult(locationInfo);
  //   }
  // } else {
  //   let eachService = dataArray.length / 2;
  //   for (let i = 1; i < eachService - 1; ++i) {
  //     const location = dataArray[i].split(",");
  //     console.log("Getting JSON Response");
  //     let locationInfo = await getJSONResponse1(location);
  //     console.log("Writing Data")
  //     writeResult(locationInfo);
  //   }
  //   for (let i = eachService; i < dataArray.length - 1; ++i) {
  //     const location = dataArray[i].split(",");
  //     console.log("Getting JSON Response");
  //     let locationInfo = await getJSONResponse2(location);
  //     console.log("Writing Data");
  //     writeResult(locationInfo);
  //   }
  // }
}

async function getJSONResponse1(location) {
  let address = location[0];
  let city = location[1];
  let state = location[2];
  let postalCode = location[3];


  let apiKey = "KAUp3OcalRvc4tZeIaKUkAiAuP8yMOb3";

  const response = await fetch(
      `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(`${address} ${city} ${state} ${postalCode}`)}.json?storeResult=false&limit=1&view=Unified&key=${apiKey}`
  );

  if(response.status >= 400) return;

  const jsonData = await response.json();

  if(jsonData.summary.numResults === 0) return;

  document.getElementById('results_id').innerText += `(${counter}) Geolocating Address ${address}\n`;
  ++counter;
  let jsonResult = jsonData.results[0];
  let locationInfo;
  try {
    locationInfo = {
      "latitude" : jsonResult.position.lat,
      "longitude" : jsonResult.position.lon,
      "address" : jsonResult.address.streetNumber + " " + jsonResult.address.streetName,
      "city" : jsonResult.address.municipality,
      "state" : jsonResult.address.countrySubdivisionCode,
    };
  } catch(e) {
    console.log(e);
  }

  return locationInfo;
}

async function getJSONResponse2(location) {
  let address = location[0];
  let city = location[1];
  let state = location[2];
  let postalCode = location[3];


  let apiKey = "b4315eb346bd4042b08e667728a4b656";

  document.getElementById('results_id').innerText += `(${counter}) Geolocating Address ${address}\n`;
  const response = await fetch(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(`${address} ${city} ${state} ${postalCode}`)}&format=json&apiKey=${apiKey}`
  );

  if(response.status >= 400) return;

  const jsonData = await response.json();

  ++counter;
  let jsonResult = jsonData.results[0];
  let locationInfo;
  try {
    locationInfo = {
      "latitude" : jsonResult.lat,
      "longitude" : jsonResult.lon,
      "address" : jsonResult.address_line1,
      "city" : jsonResult.city,
      "state" : jsonResult.state,
    };
  } catch(e) {
    console.log(e);
  }

  return locationInfo;
}

function writeResult(locationInfo) {
  if(locationInfo === undefined){
    return;
  }
  try {
    const address = locationInfo.address;
    const city = locationInfo.city;
    const state = locationInfo.state;
    const latitude = locationInfo.latitude;
    const longitude = locationInfo.longitude;

    let content =
        `${address},` +
        `${city},` +
        `${state},` +
        `${latitude},` +
        `${longitude}\n`;

    exportData += content;
  } catch(e) {
    console.log(e);
  }
}

function download(fileName) {
    const file = new Blob([exportData], {
      type: "text/plain;charset=utf-8",
    });
    if (window.navigator.msSaveOrOpenBlob)
        // IE10+
      window.navigator.msSaveOrOpenBlob(file, fileName);
    else {
      // Others
      let a = document.createElement("a"),
          url = URL.createObjectURL(file);
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 0);
    }
}


