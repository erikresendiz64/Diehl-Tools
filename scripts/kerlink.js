window.addEventListener("DOMContentLoaded", (event) => {
    const input = document.getElementById("csv");
    if (input) {
        input.addEventListener("change", beginProcess);
    }
});

const USER = "erik.resendiz@diehl.com";
const PASSWORD = "metering2023!";
const ROLE = "SUPER_ADMIN"
var deletedDevices = 0;

function isValidEUI(MIU) {
    let MIU_regex = /94A40C0B[A-F0-9]{8}$/;
    let isValid = MIU_regex.test(MIU) && MIU.length == 16;
    if (!isValid) {
        console.log("Invalid MIU: " + MIU);
    }
    return isValid;
}

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
    let token = await retrieveToken();
    await processData(fileData, token);
    console.log("Process Finished")
    document.getElementById("results_id").innerText += "Process Finished. Successfully Deleted " + deletedDevices + " Device(s).";
}

async function retrieveToken() {
    let authorizationRequest = await fetch('https://nwm.izarplus.com/gms/application/login',
        {
            method: 'POST',
            body: JSON.stringify({
                email: USER,
                login: USER,
                password: PASSWORD,
                role: ROLE,
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

async function processData(fileData, token) {
    const dataArray = fileData.split("\n");
    document.getElementById('csv').value = null;
    console.log(dataArray);
    for (let i = 1; i < dataArray.length - 1; ++i) {
        let euiID = dataArray[i].replace("\r", "");
        if (euiID) {
            await removeEUI(euiID, token);
        }
    }
}

async function removeEUI(MIU, token) {
    document.getElementById("results_id").innerText += `Removing MIU ${MIU}\n`;

    if(!isValidEUI(MIU)){
        document.getElementById("results_id").innerText += "Incorrect Serial Number Format\n\n"
        return;
    }

    let deleteRequest = await fetch ('https://nwm.izarplus.com/gms/application/endDevices/' + MIU,
        {
            method: 'DELETE',
            headers: {
                "Authorization" : token,
                "Accept" : "application/json",
            }
        });

    if(deleteRequest.status >= 200 && deleteRequest.status < 300) {
        document.getElementById("results_id").innerText += `Device successfully deleted\n\n`;
        deletedDevices += 1;
    } else {
        document.getElementById("results_id").innerText += `Couldn't delete device\n\n`;
    }
}

async function removeSingleEUI() {
    document.getElementById("results_id").innerText = "";
    let token = await retrieveToken();
    let EUI = document.getElementById("text-EUI").value;
    let MIU = "94A40C0B0100" + EUI;
    await removeEUI(MIU, token);
    document.getElementById("results_id").innerText += "Process Finished";

}

async function decryptEUI(){
    let EUI = document.getElementById("text-EUI-payload").value;
    let token = await retrieveToken();
    await requestPayload(token, EUI);
    document.getElementById("results_id_payload").innerText += "\nProcess Finished\n";
}

async function requestPayload(token, EUI) {
    let MIU = "94A40C0B0100" + EUI;

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
                        "14"
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
        console.log("Succesful Request");
        let decryptResponse = await decryptRequest.json();
        if(decryptResponse == undefined || decryptResponse["count"] == 0) {
            document.getElementById("results_id_payload").innerText += "No Payload Found for MIU " + MIU + "\n\n";
            return;
        }

        const EUIInfo = decryptResponse["list"][0];
        let payload = EUIInfo["payload"];
        let fPort = EUIInfo["fPort"];
        document.getElementById("results_id_payload").innerText = `Payload Found with Value ${payload} and fPort ${fPort}\n\n`;
        document.getElementById("results_id_payload").innerText += "Decrypting Payload...\n"

        await decryptPayload(payload);

    } else {
        console.log("Unsuccesfull Request")
    }

}

function decryptPayload(payload) {

    const hexPayload = base64ToHex(payload, '-');

    document.getElementById("results_id_payload").innerText += `Payload [Hex] : ${hexPayload}\n\n`

    decodePayload(hexPayload);

}

function decodePayload(payload) {
    const fromHexString = (hexString) =>
        Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

    const batteryByte = payload.substring(0,2);
    const SNRByte = payload.substring(3,5);
    const RSSIByte = payload.substring(6,8);
    const txPowerByte = payload.substring(9,11);
    const resetsByte = payload.substring(12,14);
    const fwByte = payload.substring(15,17);

    const batteryPercentage = fromHexString(batteryByte);
    const averageSNR = parseInt(SNRByte, 16) > 127 ? parseInt(SNRByte, 16) - 256 : parseInt(SNRByte, 16);
    const averageRSSI = fromHexString(RSSIByte);
    const averageTxPower = fromHexString(txPowerByte);
    const numOfResets = parseInt(resetsByte, 16);
    const firmwareVersion = parseInt(fwByte, 16);

    document.getElementById("results_id_payload").innerText += `Battery Percentage : ${batteryPercentage}\n`
    document.getElementById("results_id_payload").innerText += `Average SNR : ${averageSNR}\n`
    document.getElementById("results_id_payload").innerText += `Average RSSI : ${averageRSSI}\n`
    document.getElementById("results_id_payload").innerText += `Average Tx Power : ${averageTxPower}\n`
    document.getElementById("results_id_payload").innerText += `Number of Resets : ${numOfResets}\n`
    document.getElementById("results_id_payload").innerText += `Firmware Version : 1.${firmwareVersion}\n`

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