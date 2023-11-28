const authorizations = {
    USER : "erik.resendiz@diehl.com",
    PASSWORD : "metering2023!",
    ROLE : "SUPER_ADMIN"
};

let deletedDevices = 0;

function isValidEUI(MIU) {
    let MIU_regex = /94A40C0B[A-F0-9]{8}$/;
    let isValid = MIU_regex.test(MIU) && MIU.length == 16;
    if (!isValid) {
        console.log("Invalid MIU: " + MIU);
    }
    return isValid;
}

async function retrieveToken() {
    let authorizationRequest = await fetch('https://nwm.izarplus.com/gms/application/login',
        {
            method: 'POST',
            body: JSON.stringify({
                email: authorizations.USER,
                login: authorizations.USER,
                password: authorizations.PASSWORD,
                role: authorizations.ROLE,
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
window.addEventListener("DOMContentLoaded", (event) => {
    const input = document.getElementById("csv");
    if (input) {
        input.addEventListener("change", readFile);
    }
});

function readFile(event) {
    const fileList = this.files;

    if (fileList.length > 0) {
        console.log("Found a file");

        const reader = new FileReader();
        let fileData;

        reader.addEventListener(
            "load",
            () => {
                fileData = reader.result;
                removeEUIS(fileData);
            },
            false
        );

        reader.readAsText(event.target.files[0]);
    }
}

async function removeEUIS(fileData) {
    document.getElementById("results_id").innerText = "";
    let token = await retrieveToken();
    await processData(fileData, token);
    document.getElementById("results_id").innerText += "Process Finished. Successfully Deleted " + deletedDevices + " Device(s).";
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
