/* copy-paste from https://developers.google.com/identity/oauth2/web/guides/migration-to-gis#gis-and-gapi */
    const gapiLoadPromise = new Promise((resolve, reject) => {
      gapiLoadOkay = resolve;
      gapiLoadFail = reject;
    });
    const gisLoadPromise = new Promise((resolve, reject) => {
      gisLoadOkay = resolve;
      gisLoadFail = reject;
    });

    var tokenClient;
    var addBothButton = document.getElementById('addBothBtn');
    var addStatus = document.getElementById('addStatus');
    var inpagelog = document.getElementById('inpagelog');   
    var timeWindow = {};

    (async () => {
      document.getElementById("addBothBtn").style.visibility="hidden";
      document.getElementById("revokeBtn").style.visibility="hidden";
      addBothButton.onclick = function(){
        let currentText = addBothButton.innerHTML;
        addBothButton.innerHTML = "wait please";
        addStatus.innerHTML = "";
        createTwoEvents();
        addBothButton.innerHTML = currentText;        
      };
      
      // First, load and initialize the gapi.client
      await gapiLoadPromise;
      await new Promise((resolve, reject) => {
        // NOTE: the 'auth2' module is no longer loaded.
        gapi.load('client', {callback: resolve, onerror: reject});
      });
      await gapi.client.init({
        // NOTE: OAuth2 'scope' and 'client_id' parameters have moved to initTokenClient().
        // ALSO, if you pop an invalid apiKey, then the "Add to Google Calendar" button definitely stops working and gets stuck at "waiting"
        // apiKey: 'AIzaSyBwrfTm8j1glmNnjQMk6LrSR02R5STl06I'
        // from quickstart project apiKey: 'AIzaSyCpUpPqikoXgz0uvMXncXLoJKAVg9j3jTc'
        // Nonetheless, the code still functions without an API Key
      })
      .then(function() {  // Load the Calendar API discovery document.
        gapi.client.load('calendar', 'v3');
      })

      // Now load the GIS client
      await gisLoadPromise;
        await new Promise((resolve, reject) => {
          try {
            tokenClient = google.accounts.oauth2.initTokenClient({
                // client_id: '874197785085-7dmuhb7o48i77kbajmfs7nr015sd07sf.apps.googleusercontent.com',
                client_id: '544929542748-dkgbk9a605lr9uj3l3puf2efcpqpc9p0.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/calendar.events.owned',
                /* is prompt=consent causing the extra check?  https://developers.google.com/identity/oauth2/web/guides/use-token-model

. By default, user consent is only necessary the first time a user visits your website and requests a new scope but may be requested on every page load using prompt=consent in Token Client config objects.
                  */

                // prompt: 'consent',
                callback: '',  // defined at request time in await/promise scope.
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        });

      addBothButton.style.visibility="visible";
      document.getElementById("revokeBtn").style.visibility="visible";

      // set date field to today as a default
      let now = new Date();
      // toISOString is in UTC, but we want to use local time
      // document.querySelector("#date").value = now.toISOString().slice(0,10);
      let lpad20s = (x) => {return String(x).padStart(2, "0")};
      document.querySelector("#date").value =
        [lpad20s(now.getFullYear()),
        lpad20s(now.getMonth() + 1),
        lpad20s(now.getDate())].join('-');
    })();

async function getToken(err) {

  if (err.result.error.code == 401 || (err.result.error.code == 403) &&
      (err.result.error.status == "PERMISSION_DENIED")) {

    // The access token is missing, invalid, or expired, prompt for user consent to obtain one.
    await new Promise((resolve, reject) => {
      try {
        // Settle this promise in the response callback for requestAccessToken()
        tokenClient.callback = (resp) => {
          if (resp.error !== undefined) {
            reject(resp);
          }
          // GIS has automatically updated gapi.client with the newly issued access token.
          inpagelog.innerHTML += `gapi.client access token: ${JSON.stringify(gapi.client.getToken().access_token)} <br>`; 
          resolve(resp);
        };
        tokenClient.requestAccessToken();
      } catch (err) {
        console.log(err)
      }
    });
  } else {
    // Errors unrelated to authorization: server errors, exceeding quota, bad requests, and so on.
    throw new Error(err);
  }
}

function revokeToken() {
  let cred = gapi.client.getToken();
  if (cred !== null) {
    google.accounts.oauth2.revoke(cred.access_token, () => { 
      inpagelog.innerHTML += `Revoked: ${cred.access_token} <br>`;
    });
    gapi.client.setToken('');
  }
}

function renderTag(inputStr){
  inpagelog.innerHTML += `Added etag = ${JSON.stringify(inputStr)}<br/>`;
  addStatus.innerHTML += `Added etag = ${JSON.stringify(inputStr)}<br/>`;  
}

function reqWretry(inpReq) {
    return(
      gapi.client.calendar.events.insert(inpReq)
      .then(calendarAPIResponse => renderTag(calendarAPIResponse.result.etag))
      .catch(err  => getToken(err)
        .then(succ => gapi.client.calendar.events.insert(inpReq))
             .then(calendarAPIResponse => renderTag(calendarAPIResponse.result.etag))
      ) // only retry insert on calling getToken
    );
  }

function createTwoEvents() {
  let dayStart = new Date(document.querySelector("#date").value);
  let dayEnd = new Date(document.querySelector("#date").value);
  dayEnd.setDate(dayEnd.getDate() + 5 - 1); // subtract 1 due to fencepost error

  let dayFar = new Date(document.querySelector("#date").value);
  dayFar.setDate(dayFar.getDate() + 26 - 1); // subtract 1 due to fencepost error

  inpagelog.innerHTML += `START createTwoEventsviaPromise: <br/>`;
  addStatus.innerHTML += `adding two events<br/>`;
  
  var event01 = {
    'calendarId': 'primary',
    'resource': {
      "summary": `days 1-5 of ${dayStart.toISOString()}`,
      "start": {
        "dateTime": dayStart.toISOString()
      },
       "end": {
        "dateTime": dayEnd.toISOString()
        }
      }
  };

  var event02 = {
    'calendarId': 'primary',
    'resource': {
      "summary": `day 26 of ${dayStart.toISOString()}`,
      "start": {
        "dateTime": dayFar.toISOString()
      },
       "end": {
        "dateTime": dayFar.toISOString()
        }
      }
  };
  
  reqWretry(event01)
    .then(succ => reqWretry(event02))
    .then(succ => inpagelog.innerHTML += `END createTwoEventsviaPromise: ${JSON.stringify(err)}<br/>`)
    .catch(err => inpagelog.innerHTML += `CATCH-END createTwoEventsviaPromise: ${JSON.stringify(err)}<br/>`);
}