let exportData;
let counter;
let listDecrpytion = false;
let singleDecryption = false;
window.addEventListener("DOMContentLoaded", (event) => {
    const input = document.getElementById("csv-decrypt");
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
                decryptList(fileData);
            },
            false
        );

        reader.readAsText(event.target.files[0]);
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

const authorization = {
    "username" : "sana.kanwal@diehl.com",
    "password" : "Diehl2023.",
};

const MIUFlags = ["", "", "", "", "", "", "", "", "Extreme High Temp", "Extreme Low Temp", "",
    "Data Log Zeroed", "", "", "Meter ID Changed (Current) ", "Encoder Error (Current) ",
    "Disconnected Meter (Current)", "Meter ID Changed (Historical)", "Encoder Error (Historical) ",
    "Disconnected Meter (Historical) ", "Large Time Change", "MIU Parameter Changed",
    "Low Battery", "Reboot"];
function isValidEUI(MIU) {
    let MIU_regex = /94A40C0B[A-F0-9]{8}$/;
    let isValid = MIU_regex.test(MIU) && MIU.length == 16;
    if (!isValid) {
        console.log("Invalid MIU: " + MIU);
    }
    return isValid;
}

function logAdditionalMessage(id, message, log) {
    if(log) document.getElementById(id).innerText += message;
}

function timeConverter(UNIX_timestamp){
    return new Date(UNIX_timestamp).toLocaleString("en-US");
}

const base64ToHex = ( () => {
    // Lookup tables
    const values = [], output = [];

    // Main converter
    return function base64ToHex ( txt, sep = '' ) {
        if ( output.length <= 0 ) populateLookups();
        const result = [];
        let v1, v2, v3, v4;
        for ( let i = 0, len = txt.length ; i < len ; i += 4 ) {
            // Map four chars to values.
            v1 = values[ txt.charCodeAt( i   ) ];
            v2 = values[ txt.charCodeAt( i+1 ) ];
            v3 = values[ txt.charCodeAt( i+2 ) ];
            v4 = values[ txt.charCodeAt( i+3 ) ];
            // Split and merge bits, then map and push to output.
            result.push(
                output[ ( v1 << 2) | (v2 >> 4) ],
                output[ ((v2 & 15) << 4) | (v3 >> 2) ],
                output[ ((v3 &  3) << 6) |  v4 ]
            );
        }
        // Trim result if the last values are '='.
        if ( v4 === 64 ) result.splice( v3 === 64 ? -2 : -1 );
        return result.join( sep );
    };

    function populateLookups () {
        const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        for ( let i = 0 ; i < 256 ; i++ ) {
            output.push( ( '0' + i.toString( 16 ) ).slice( -2 ) );
            values.push( 0 );
        }
        for ( let i = 0 ; i <  65 ; i++ )
            values[ keys.charCodeAt( i ) ] = i;
    }
} )();

const fromHexString = (hexString) =>
    Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

function getBit(n, fromBase, bitPosition) {
    let binary = parseInt(n, fromBase).toString(2).padStart(8, '0');

    return binary.at(bitPosition - 1);
}

function hexToBin(n) {
    return parseInt(n, 16).toString(2).padStart(8, '0');
}

function getMIUAlarm(MIUStatus) {
    let alarms = [];

    for(let i = 0; i < MIUStatus.length; ++i) {
        if (MIUStatus.at(i) == "1") {
            alarms.push(MIUFlags[i]);
        }
    }

    return alarms;
}

async function retrieveToken() {
    let authorizationRequest = await fetch('https://portal.vxolympus.com/api/auth/login',
        {
            method: 'POST',
            body: JSON.stringify({
                username: authorization.username,
                password: authorization.password,
            }),
            headers : {
                "Content-Type" : "application/json",
                "Accept" : "application/json"
            },
        });

    let authorizationResponse = await authorizationRequest.json();

    if(authorizationRequest.status >= 200 && authorizationRequest.status < 300) {
        console.log("Athorization Succesful");
        return authorizationResponse["token"];
    } else {
        console.log("Authorization Unsuccesful");
        return ("");
    }

}

async function decryptList(fileData) {
    counter = 1;
    listDecrpytion = true;
    singleDecryption = false;
    exportData = "Radio Serial Number,Radio Battery,Number of Resets,Average SNR,Average RSSI,Average Tx Power,FW Version,Timestamp\n";
    document.getElementById("results_id_payload").innerText = "";
    let token = await retrieveToken();

    console.log("1. Beginning Data Processing Phase");
    await processData(fileData, token);

    console.log("2. Creating CSV");
    download("payloads.csv");
}

async function processData(fileData, token) {
    const dataArray = fileData.split("\n");
    console.log(dataArray);
    for(let i =1; i < dataArray.length; ++i, ++counter) {
        let decryptInfo = dataArray[i].replace('\r', "").split(",");
        console.log(decryptInfo + "\n");
        console.log("Getting JSON Response");
        let payloadInfo = await requestPayload(token, decryptInfo[0], `fPort${decryptInfo[1]}`);
        console.log("Writing Data")
        writeResult(payloadInfo);
    }
}

async function decryptEUI(){
    singleDecryption = true;
    listDecrpytion = false;
    document.getElementById("results_id_payload").innerText = "";
    let EUI = document.getElementById("text-EUI-payload").value;
    let selectFPort = document.getElementById("fports");
    let fPort = selectFPort.options[selectFPort.selectedIndex].text;

    let token = await retrieveToken();
    await requestPayload(token, EUI, fPort);
    document.getElementById("results_id_payload").innerText += "\nPayload Decryption Finished\n";
}

async function requestPayload(token, EUI, fPort) {
    logAdditionalMessage("results_id_payload", `(${counter}) Decrypting ${EUI} with ${fPort}.\n`, listDecrpytion);
    let MIU = "94A40C0B0100" + EUI;
    if(EUI.startsWith("94A4")) {
        MIU = EUI;
    }

    console.log("Creating Request for " + MIU + ", " + fPort + "\n");
    let fPortType = fPort.substring(fPort.length - 2, fPort.length)

    if(!isValidEUI(MIU)) {
        logAdditionalMessage("results_id_payload", "Incorrect Serial Number Format\n\n", singleDecryption);
        return;
    }

    const params = new URLSearchParams({
        search: JSON.stringify({
            "operator": "AND",
            "conditions": [
                {
                    "operation": "eq",
                    "operand": "endDevice.devEui",
                    "values": [
                        MIU
                    ]
                },
                {
                    "operation": "eq",
                    "operand": "fPort",
                    "values": [
                        fPortType
                    ]
                }
            ]
        })
    })

    let decryptRequest = await fetch (`https://nwm.izarplus.com/gms/application/dataUp?` + params.toString(),
        {
            method: 'GET',
            headers: {
                "Authorization": token
            }
        });

    if(decryptRequest.status >= 200 && decryptRequest.status < 300) {
        let decryptResponse = await decryptRequest.json();
        if(decryptResponse == undefined || decryptResponse["count"] == 0) {
            logAdditionalMessage("results_id_payload", `No Payload Found for MIU ${MIU} with fPort ${fPortType} \n\n`, singleDecryption);
            return;
        }
        console.log("Processing Payload\n")
        let payloadInfo = await processPayloadInformation(decryptResponse);
        if(listDecrpytion) {
            console.log("Retrieved Payload, adding radio key.\n")
            payloadInfo.radio = EUI;
            return payloadInfo;
        }
    } else {
        console.log("Unsuccesfull Request")
        return;
    }

}

async function processPayloadInformation(response) {
    let EUIInfo = response["list"];

    if(listDecrpytion) {
        let payload = EUIInfo[0]["payload"];
        let fPort = EUIInfo[0]["fPort"];
        let timestamp = EUIInfo[0]["recvTime"];

        console.log("Decrypting Payload " + payload + " with " + fPort + "\n")
        let payloadObject = await decryptPayload(payload, fPort);
        payloadObject.timestamp = (timestamp);
        return payloadObject;
    }

    let numMessages = response["count"];
    document.getElementById("results_id_payload").innerText = `${numMessages} Message(s) Found\n`;
    let iterMessages = 1;

    EUIInfo.forEach((message) => {
        let payload = message["payload"];
        let fPort = message["fPort"];
        let timestamp = message["recvTime"];
        document.getElementById("results_id_payload").innerText += `\n${iterMessages}.) Payload Found on: ${timeConverter(timestamp)}\n`;
        document.getElementById("results_id_payload").innerText += `Payload: ${payload}\nfPort: ${fPort}\n`;

        decryptPayload(payload, fPort)
        iterMessages ++;
    });

}

function decryptPayload(payload, fPort) {

    const hexPayload = base64ToHex(payload, '-');
    console.log("Seeking Payload Type\n");
    logAdditionalMessage("results_id_payload", `Payload [Hex] : ${hexPayload}\n\n`, singleDecryption);

    switch (fPort) {
        case 11:
            return decodePayload11(hexPayload);
            break;
        case 12:
            return decodePayload12(hexPayload);
            break;
        case 13:
            return decodePayload13(hexPayload);
            break;
        case 14:
            return decodePayload14(hexPayload);
            break;
        case 21:
            return decodePayload21(hexPayload);
            break;
        default:
            logAdditionalMessage("results_id_payload", `Error Occurred.\n`, singleDecryption);
            return;
    }

}

function decodePayload11(payload) {
    const alarmDataByte =  hexToBin(payload.substring(9,11)) + hexToBin(payload.substring(6,8)) + hexToBin(payload.substring(3,5)) + hexToBin(payload.substring(0,2));
    const meterStatusByte = hexToBin(payload.substring(21,23)) + hexToBin(payload.substring(18,20)) + hexToBin(payload.substring(15,17)) + hexToBin(payload.substring(12,14));
    const meterPortByte = payload.substring(24,26);

    //const alarmData =
    //const meterStatus =
    const meterPort = getBit(meterPortByte, 16, 8) > 0 ? 2 : 1;

    document.getElementById("results_id_payload").innerText += `Alarm Data: ${alarmDataByte}\n`
    document.getElementById("results_id_payload").innerText += `Meter Status: ${meterStatusByte}\n`
    document.getElementById("results_id_payload").innerText += `Meter Port: ${meterPort}\n`
}

function decodePayload12(payload) {
    const alarmDataByte =  hexToBin(payload.substring(0,2)) + hexToBin(payload.substring(3,5)) + hexToBin(payload.substring(6,8)) + hexToBin(payload.substring(9,11));
    const MIUStatusByte = hexToBin(payload.substring(21,23)) + hexToBin(payload.substring(18,20)) + hexToBin(payload.substring(15,17));
    const meterPortByte = payload.substring(24,26);

    //const alarmData =
    const MIUStatus = getMIUAlarm(MIUStatusByte);
    const meterPort = getBit(meterPortByte, 16, 8) > 0 ? 2 : 1;

    document.getElementById("results_id_payload").innerText += `Alarm Data: ${alarmDataByte}\n`
    document.getElementById("results_id_payload").innerText += `MIU Status Bits: ${MIUStatusByte}\n`
    document.getElementById("results_id_payload").innerText += `MIU Status: ${MIUStatus}\n`
    document.getElementById("results_id_payload").innerText += `Meter Port: ${meterPort}\n`
}

function decodePayload13(payload) {

    const meterSerialNumberByte =  payload.substring(9,11) + payload.substring(6,8) + payload.substring(3,5) + payload.substring(0,2);
    const meterPortByte = payload.substring(12,14);
    const meterBatteryByte = payload.substring(15,17);

    const meterSerialNumber = parseInt(meterSerialNumberByte, 16);
    const meterPort = getBit(meterPortByte, 16, 8) > 0 ? 2 : 1;
    const meterBattery = fromHexString(meterBatteryByte);
    const batteryDaysRemaining = Math.floor((meterBattery / 100) * 9999);

    document.getElementById("results_id_payload").innerText += `Meter Serial Number: ${meterSerialNumber}\n`
    document.getElementById("results_id_payload").innerText += `Meter Port: ${meterPort}\n`
    document.getElementById("results_id_payload").innerText += `Meter Battery [Days Remaining]: ${batteryDaysRemaining}\n`

}

function decodePayload14(payload) {

    const batteryByte = payload.substring(0,2);
    const SNRByte = payload.substring(3,5);
    const RSSIByte = payload.substring(6,8);
    const txPowerByte = payload.substring(9,11);
    const resetsByte = payload.substring(12,14);
    const fwByte = payload.substring(15,17);

    const batteryPercentage = parseInt(batteryByte, 16);
    const averageSNR = parseInt(SNRByte, 16) > 127 ? parseInt(SNRByte, 16) - 256 : parseInt(SNRByte, 16);
    const averageRSSI = fromHexString(RSSIByte);
    const averageTxPower = fromHexString(txPowerByte);
    const numOfResets = fromHexString(resetsByte, 16);
    const firmwareVersion = fromHexString(fwByte, 16);

    console.log("Found payload, sending back data.\n");
    if(listDecrpytion) {
        return {
            "battery" : batteryPercentage,
            "snr" : averageSNR,
            "rssi" : averageRSSI,
            "txpower" : averageTxPower,
            "resets" : numOfResets,
            "fwversion" : firmwareVersion
        };
    }

    document.getElementById("results_id_payload").innerText += `Battery Percentage: ${batteryPercentage}%\n`
    document.getElementById("results_id_payload").innerText += `Average SNR: ${averageSNR}\n`
    document.getElementById("results_id_payload").innerText += `Average RSSI: ${averageRSSI}\n`
    document.getElementById("results_id_payload").innerText += `Average Tx Power: ${averageTxPower}\n`
    document.getElementById("results_id_payload").innerText += `Number of Resets: ${numOfResets}\n`
    document.getElementById("results_id_payload").innerText += `Firmware Version: 1.${firmwareVersion}\n`

}

function decodePayload21(payload) {
    const meterStatusByte =  hexToBin(payload.substring(9,11)) + hexToBin(payload.substring(6,8)) + hexToBin(payload.substring(3,5)) + hexToBin(payload.substring(0,2));
    const MIUStatusByte = hexToBin(payload.substring(18,20)) + hexToBin(payload.substring(15,17)) + hexToBin(payload.substring(12,14));
    const miscByte = payload.substring(21,23);

    //const meterStatus =
    const MIUStatus = getMIUAlarm(MIUStatusByte);
    const meterPort = getBit(miscByte, 16, 8) > 0 ? 2 : 1;

    document.getElementById("results_id_payload").innerText += `Meter Status: ${meterStatusByte}\n`
    document.getElementById("results_id_payload").innerText += `MIU Status Bits: ${MIUStatusByte}\n`
    document.getElementById("results_id_payload").innerText += `MIU Status: ${MIUStatus.toString()}\n`
    document.getElementById("results_id_payload").innerText += `Meter Port: ${meterPort}\n`
}

function writeResult(payloadInfo) {
    if(payloadInfo === undefined){
        return;
    }
    try {
        const radioSerial = payloadInfo.radio;
        const radioBattery = payloadInfo.battery;
        const numResets = payloadInfo.resets;
        const snr = payloadInfo.snr;
        const rssi = payloadInfo.rssi;
        const txPower = payloadInfo.txpower;
        const fw = payloadInfo.fwversion;
        const timestamp = payloadInfo.timestamp;

        let content =
            `${radioSerial},` +
            `${radioBattery},` +
            `${numResets},` +
            `${snr},` +
            `${rssi},` +
            `${txPower},` +
            `${fw},` +
            `${timestamp}\n`;

        exportData += content;
    } catch(e) {
        console.log(e);
    }
}