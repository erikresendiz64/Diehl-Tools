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
  exportData = "Address,City,State,Latitude,Longitude,Confidence\n";
  document.getElementById("results_id").innerText = "";

  console.log("1. Beginning Data Processing Phase");
  await processData(fileData);

  console.log("2. Creating CSV");
  download("geolocation.csv");
}

async function processData(fileData) {
  const dataArray = fileData.split("\n");
  console.log(dataArray);
  for (let i = 1; i < dataArray.length - 1; ++i) {
    const location = dataArray[i].split(",");
    console.log("Getting JSON Response");
    let jsonResponse = await getJSONResponse(location);
    console.log("Writing Data")
    writeResult(jsonResponse);
  }
}

async function getJSONResponse(location) {
  let address = location[0];

  /*
  * Need to Incorporate these into the query string for better accuracy
  let city = location[1];
  let state = location[2];
  let postalCode = location[3];
   */

  let apiKey = "KAUp3OcalRvc4tZeIaKUkAiAuP8yMOb3";

  document.getElementById('results_id').innerText += `(${counter}) Geolocating Address ${address}\n`;
  const response = await fetch(
      `https://api.tomtom.com/search/2/geocode/${JSON.stringify(address)}.json?storeResult=false&limit=1&view=Unified&key=${apiKey}`
  );
  const jsonData = await response.json();

  ++counter;
  return jsonData;
}

function writeResult(jsonResponse) {
  if(jsonResponse === undefined || jsonResponse.summary.numResults === 0) {
    return;
  }
  let jsonResult = jsonResponse.results[0];
  try {
    const latitude = jsonResult.position.lat;
    const longitude = jsonResult.position.lon;
    const address = jsonResult.address.streetNumber + " " + jsonResult.address.streetName;
    const city = jsonResult.address.municipality;
    const state = jsonResult.address.countrySubdivisionCode;
    const confidence = jsonResult.matchConfidence.score;

    let content =
        `${address},` +
        `${city},` +
        `${state},` +
        `${latitude},` +
        `${longitude},` +
        `${confidence}\n`;
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


