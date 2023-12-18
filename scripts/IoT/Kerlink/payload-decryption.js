const authorization = {
    USER : "erik.resendiz@diehl.com",
    PASSWORD : "metering2023!",
    ROLE : "SUPER_ADMIN"
};

const MIUFlags = ["", "", "", "", "", "", "", "", "Extreme High Temp", "Extreme Low Temp", "",
                  "Data Log Zeroed", "", "", "Meter ID Changed (Current) ", "Encoder Error (Current) ",
                  "Disconnected Meter (Current) ", "Meter ID Changed (Historical) ", "Encoder Error (Historical) ",
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
    let authorizationRequest = await fetch('https://nwm.izarplus.com/gms/application/login',
        {
            method: 'POST',
            body: JSON.stringify({
                email: authorization.USER,
                login: authorization.USER,
                password: authorization.PASSWORD,
                role: authorization.ROLE,
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

async function decryptEUI(){
    document.getElementById("results_id_payload").innerText = "";
    let EUI = document.getElementById("text-EUI-payload").value;
    let selectFPort = document.getElementById("fports");
    let fPort = selectFPort.options[selectFPort.selectedIndex].text;

    let token = await retrieveToken();
    await requestPayload(token, EUI, fPort);
    document.getElementById("results_id_payload").innerText += "\nPayload Decryption Finished\n";
}

async function requestPayload(token, EUI, fPort) {
    let MIU = "94A40C0B0100" + EUI;
    let fPortType = fPort.substring(fPort.length - 2, fPort.length)

    if(!isValidEUI(MIU)) {
        document.getElementById("results_id_payload").innerText += "Incorrect Serial Number Format\n\n"
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
            document.getElementById("results_id_payload").innerText += `No Payload Found for MIU ${MIU} with fPort ${fPortType} \n\n`;
            return;
        }

        processPayloadInformation(decryptResponse);

    } else {
        console.log("Unsuccesfull Request")
    }

}

function processPayloadInformation(response) {
    let EUIInfo = response["list"];
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

    document.getElementById("results_id_payload").innerText += `Payload [Hex] : ${hexPayload}\n\n`

    switch (fPort) {
        case 11:
            decodePayload11(hexPayload);
            break;
        case 12:
            decodePayload12(hexPayload);
            break;
        case 13:
            decodePayload13(hexPayload);
            break;
        case 14:
            decodePayload14(hexPayload);
            break;
        case 21:
            decodePayload21(hexPayload);
            break;
        default:
            document.getElementById("results_id_payload").innerText += `Error Occurred.\n`
            return;
    }

}

function decodePayload11(payload) {
    const alarmDataByte =  hexToBin(payload.substring(0,2)) + hexToBin(payload.substring(3,5)) + hexToBin(payload.substring(6,8)) + hexToBin(payload.substring(9,11));
    const meterStatusByte = hexToBin(payload.substring(12,14)) + hexToBin(payload.substring(15,17)) + hexToBin(payload.substring(18,20)) + hexToBin(payload.substring(21,23));
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
    const MIUStatusByte = hexToBin(payload.substring(15,17)) + hexToBin(payload.substring(18,20)) + hexToBin(payload.substring(21,23));
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

    document.getElementById("results_id_payload").innerText += `Battery Percentage: ${batteryPercentage}%\n`
    document.getElementById("results_id_payload").innerText += `Average SNR: ${averageSNR}\n`
    document.getElementById("results_id_payload").innerText += `Average RSSI: ${averageRSSI}\n`
    document.getElementById("results_id_payload").innerText += `Average Tx Power: ${averageTxPower}\n`
    document.getElementById("results_id_payload").innerText += `Number of Resets: ${numOfResets}\n`
    document.getElementById("results_id_payload").innerText += `Firmware Version: 1.${firmwareVersion}\n`

}

function decodePayload21(payload) {
    const meterStatusByte =  hexToBin(payload.substring(0,2)) + hexToBin(payload.substring(3,5)) + hexToBin(payload.substring(6,8)) + hexToBin(payload.substring(9,11));
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