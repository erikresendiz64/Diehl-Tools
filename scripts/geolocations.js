window.addEventListener("DOMContentLoaded", (event) => {
    const input = document.getElementById('csv');
    if (input) {
        input.addEventListener('change', beginProcess);
    }
});

var locations = [];
var exportData = "";

function beginProcess() {
    const fileList = this.files;

    if(fileList.length > 0) {
        console.log("Found a file");

        const reader = new FileReader();
        const file = fileList[0];
        var fileData;

        reader.addEventListener(
            "load",
            () => {
                fileData = reader.result;
                main(fileData);
            },
            false,
        );

        reader.readAsText(file);
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
    const dataArray = fileData.split("\r\n");
    console.log(dataArray);
    for(let i = 1; i < dataArray.length - 1; ++i) {
        const test = dataArray[i].split(",");
        console.log(test);
        const location = `${test[0]}, ${test[1]}`;
        console.log(`Geocoding ${location}...`);
        await getJSONResponse(location);
    }

}

function getJSONResponse(address) {
    return new Promise(async(resolve) => {
        var addressFormat = address.replaceAll(' ', '%20');
        const response = await fetch("http://api.positionstack.com/v1/forward" +
            "?access_key=95f8e61804aaf2dc976ba2894e297a02" +
            "&query=" + addressFormat
        );
        const jsonData = await response.json();
        if(jsonData['data'] === undefined){
            console.log(`${address} invalid, or produced an error. Skipping.`)
        } else {
            var closestDataPointMatch = jsonData['data'][0];
            console.log(closestDataPointMatch);
            locations.push(closestDataPointMatch);
        }
        resolve();
    })
}

function download(fileName) {
    return new Promise (async(resolve) => {
        const file = new Blob([exportData], {
            type : "text/plain;charset=utf-8",
        } );
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, fileName);
        else { // Others
            var a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
        console.log("CSV Created.");
    })
}

function writeCSV() {
    return new Promise (async(resolve) => {
        exportData += "Address,Latitude,Longitude,City,State\n";
        console.log("Exporting Data...");
        for(var i = 0; i < locations.length; ++i) {
            var address = locations[i] === undefined? "" : locations[i]['name'];
            var latitude = locations[i] === undefined? "" : locations[i]['latitude'];
            var longitude = locations[i] === undefined? "" : locations[i]['longitude'];
            var city = locations[i] === undefined? "" : locations[i]['locality'];
            var state = locations[i] === undefined? "" : locations[i]['region_code'];
            var content = `${address},`+
                `${latitude},` +
                `${longitude},` +
                `${city},` +
                `${state}\n`;
            console.log(content);
            exportData+=content;
        }
        resolve();
    })
}

