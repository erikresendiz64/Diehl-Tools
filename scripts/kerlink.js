window.addEventListener("DOMContentLoaded", (event) => {
    const input = document.getElementById("csv");
    if (input) {
        input.addEventListener("change", beginProcess);
    }
});

const USER = "erik.resendiz@diehl.com";
const PASSWORD = "metering2023!";
const ROLE = "SUPER_ADMIN"

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
    let token = await retrieveToken();
    await processData(fileData, token);
    console.log("Process Finished")
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
    console.log(dataArray);
    for (let i = 1; i < dataArray.length - 1; ++i) {
        let euiID = dataArray[i].replace("\r", "");
        if (euiID) {
            let MIU = "94A40C0B0100" + euiID;
            if (isValidEUI(MIU)) {
                await removeEUI(MIU, token);
            } else {
                console.log(`Could not remove MIU ${MIU}`);
            }
        }
    }
}

async function removeEUI(MIU, token) {
    console.log(`Removing MIU ${MIU}`);

    let deleteRequest = await fetch ('https://nwm.izarplus.com/gms/application/endDevices/' + MIU,
        {
            method: 'DELETE',
            headers: {
                "Authorization" : token,
                "Accept" : "application/json",
            }
        });

    if(deleteRequest.status >= 200 && deleteRequest.status < 300) {
        console.log("Device Succesfully Deleted")
    }
}