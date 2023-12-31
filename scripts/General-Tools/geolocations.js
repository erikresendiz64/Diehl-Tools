window.addEventListener("DOMContentLoaded", (event) => {
  const input = document.getElementById("csv");
  if (input) {
    input.addEventListener("change", beginProcess);
  }
});

let locations = [];
let exportData = "";

function beginProcess(event) {
  const fileList = this.files;

  if (fileList.length > 0) {
    console.log("Found a file");

    const reader = new FileReader();
    let fileData;

    reader.addEventListener(
      "load",
      () => {
        fileData = reader.result;
        main(fileData);
      },
      false
    );

    reader.readAsText(event.target.files[0]);
  }
}

async function main(fileData) {
  document.getElementById("results_id").innerText = "";
  await processData(fileData);
  console.log("Writing CSV");
  await writeCSV();
  console.log("File is ready.");
  download("geolocation.csv");
}

async function processData(fileData) {
  const dataArray = fileData.split("\n");
  console.log(dataArray);
  for (let i = 1; i < dataArray.length - 1; ++i) {
    const location = dataArray[i].split(",");
    await getJSONResponse(location);
  }
}

function getJSONResponse(location) {
  return new Promise(async (resolve) => {
    let address = location[0];
    let city = location[1];
    let state = location[2];
    let postalCode = location[3];
    let apiKey = "b4315eb346bd4042b08e667728a4b656";
    document.getElementById('results_id').innerText += `Geolocating Address ${address}\n`;
    
    const response = await fetch(
        `https://api.geoapify.com/v1/geocode/search?street=${address}&city=${city}&state=${state}&postcode=${postalCode}&apiKey=${apiKey}&format=json`
    );
    
    const jsonData = await response.json();
    if (jsonData["results"] === undefined) {
      document.getElementById('results_id').innerText += `${address}  is invalid, or produced an error\n\n`;
      console.log(`${address} invalid, or produced an error. Skipping.`);
    } else {
      let closestDataPointMatch = jsonData;
      locations.push(closestDataPointMatch);
    }
    resolve();
  });
}

function download(fileName) {
  return new Promise(async (resolve) => {
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
    console.log("CSV Created.");
  });
}

function writeCSV() {
  return new Promise(async (resolve) => {
    exportData += "Address,City,State,Latitude,Longitude\n";
    console.log("Exporting Data...");
    for (let i = 0; i < locations.length; ++i) {
      try {
        let jsonResults = JSON.parse(locations[i]["results"][0]);

        let lat = jsonResults["lat"];
        let long = jsonResults["lon"];

        let street = locations[i]["query"]["street"];
        let queryCity = locations[i]["query"]["city"];
        let queryState = locations[i]["query"]["state"];
        console.log("On Address: " + street + " with (" + lat + "," + long + ")");

        let address = street === undefined ? "" : street;
        let latitude = lat === undefined ? "" : lat;
        let longitude = long === undefined ? "" : long;
        let city = queryCity === undefined ? "" : queryCity;
        let state = queryState === undefined ? "" : queryState;
        let content =
            `${address},` +
            `${city},` +
            `${state},` +
            `${latitude},` +
            `${longitude},\n`;
        exportData += content;
      } catch(e) {
        console.log(e);
      }
    }
    resolve();
  });
}

async function geolocateAddress(){
  document.getElementById("results_id").innerText = "";
  let userAddress = document.getElementById("address").value;
  await getJSONResponse(userAddress.split(","));

  let address = locations[0] === undefined ? "" : locations[0]["query"]["street"];
  let latitude = locations[0] === undefined ? "" : locations[0]["results"][0]["lat"];
  let longitude =
      locations[0] === undefined ? "" : locations[0]["results"][0]["lon"];
  let city = locations[0] === undefined ? "" : locations[0]["query"]["city"];
  let state = locations[0] === undefined ? "" : locations[0]["query"]["state"];
  document.getElementById("results_id").innerText +=
      `${address}, ${city}, ${state} has coordinates (${latitude},${longitude})\n\n`;

  document.getElementById("results_id").innerText += "Process Finished";
}