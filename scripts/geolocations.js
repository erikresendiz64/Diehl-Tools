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
    const address = `${location[0]}, ${location[1]}, ${location[2]}, ${location[3]}`;
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
    
    const response = await fetch(
        `https://api.geoapify.com/v1/geocode/search?street=${address}&city=${city}&state=${state}&postcode=${postalCode}&apiKey=${apiKey}&format=json`
    );
    
    const jsonData = await response.json();
    if (jsonData["results"] === undefined) {
      console.log(`${address} invalid, or produced an error. Skipping.`);
    } else {
      let closestDataPointMatch = jsonData["results"][0];
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
    exportData += "Address,Latitude,Longitude\n";
    console.log("Exporting Data...");
    for (let i = 0; i < locations.length; ++i) {
      let address = locations[i] === undefined ? "" : locations[i]["street"];
      let latitude = locations[i] === undefined ? "" : locations[i]["lat"];
      let longitude =
        locations[i] === undefined ? "" : locations[i]["lon"];
      let city = locations[i] === undefined ? "" : locations[i]["city"];
      let state = locations[i] === undefined ? "" : locations[i]["state"];
      let content =
        `${address},` +
        `${city},` +
        `${state},` +
        `${latitude},` +
        `${longitude},\n`;
      exportData += content;
    }
    resolve();
  });
}

function downloadTemplate(url) {
  const a = document.createElement("a");
  a.href = url;
  a.download = url.split("/").pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
