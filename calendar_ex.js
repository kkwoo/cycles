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
    var addDay1Button = document.getElementById('addDay1Btn');
    var addDay26Button = document.getElementById('addDay26Btn');
    var addStatus = document.getElementById('addStatus');
    var inpagelog = document.getElementById('inpagelog');   
    var timeWindow = {};

    (async () => {
      document.getElementById("addDay1Btn").style.visibility="hidden";
      document.getElementById("addDay26Btn").style.visibility="hidden";
      document.getElementById("revokeBtn").style.visibility="hidden";
      addDay1Button.onclick = function(){
        addDay1Button.innerHTML = "wait please";
        addStatus.innerHTML = "";
        createDay1Event();
        addDay1Button.innerHTML = "Set days 1-5 of a new cycle to JadeBit";        
      }
      addDay26Button.onclick = function(){
        addDay26Button.innerHTML = "wait please";
        addStatus.innerHTML = "";
        createDay26Event();
        addDay26Button.innerHTML = "Set day 26 of a new cycle to JadeBit";
      }
 
      
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
                client_id: '874197785085-7dmuhb7o48i77kbajmfs7nr015sd07sf.apps.googleusercontent.com',
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

      addDay1Button.style.visibility="visible";
      addDay26Button.style.visibility="visible";
      document.getElementById("revokeBtn").style.visibility="visible";
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


// Make an API call to create an event.  Give feedback to user.
function createDay1Event() {  
  let day1 = new Date();
  let day5 = new Date();

  day5.setDate(day5.getDate() + 5 - 1); // subtract 1 due to fencepost error

  inpagelog.innerHTML += `START createEvent: <br/>`;
  addStatus.innerHTML += `adding day1-5<br/>`;
  // 20210406: add .replace(/-/g, '/') for iphone compatibility
    var resource = {
        "summary": "days 1-5",
        "start": {
          "dateTime": day1.toISOString()
        },
         "end": {
          "dateTime": day5.toISOString()
          }
        };

      var request = gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': resource      })
      .then(calendarAPIResponse => {
        inpagelog.innerHTML += `Added etag = ${JSON.stringify(calendarAPIResponse.result.etag)}<br/>`;
        addStatus.innerHTML += `Added etag =  ${JSON.stringify(calendarAPIResponse.result.etag)}<br/>`;
      })
      .catch(err  => getToken(err) // only retry insert on calling getToken
        .then(retry => gapi.client.calendar.events.insert({ 'calendarId': 'primary',
                                                        'resource': resource }))
        .then(calendarAPIResponse => {
          inpagelog.innerHTML += `Added etag =  ${JSON.stringify(calendarAPIResponse.result.etag)}<br/>`;
          addStatus.innerHTML += `Added etag =  ${JSON.stringify(calendarAPIResponse.result.etag)}<br/>`;

        })
        .catch(err  => console.log(err)));  // for authorization errors obtain an access token

  inpagelog.innerHTML += `END createEvent: <br/>`;

}

// Make an API call to create an event.  Give feedback to user.
function createDay26Event() {  
  let day26 = new Date();

  day26.setDate(day26.getDate() + 26 - 1); // subtract 1 due to fencepost error

  inpagelog.innerHTML += `START createEvent: <br/>`;
  addStatus.innerHTML += `adding day26<br/>`;
  // 20210406: add .replace(/-/g, '/') for iphone compatibility
    var resource = {
        "summary": "day 26 estimate",
        "start": {
          "dateTime": day26.toISOString()
        },
         "end": {
          "dateTime": day26.toISOString()
          }
        };

      var request = gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': resource      })
      .then(calendarAPIResponse => {
        inpagelog.innerHTML += `Added etag = ${JSON.stringify(calendarAPIResponse.result.etag)}<br/>`;
        addStatus.innerHTML += `Added etag =  ${JSON.stringify(calendarAPIResponse.result.etag)}<br/>`;
      })
      .catch(err  => getToken(err) // only retry insert on calling getToken
        .then(retry => gapi.client.calendar.events.insert({ 'calendarId': 'primary',
                                                        'resource': resource }))
        .then(calendarAPIResponse => {
          inpagelog.innerHTML += `Added etag =  ${JSON.stringify(calendarAPIResponse.result.etag)}<br/>`;
          addStatus.innerHTML += `Added etag =  ${JSON.stringify(calendarAPIResponse.result.etag)}<br/>`;

        })
        .catch(err  => console.log(err)));  // for authorization errors obtain an access token

  inpagelog.innerHTML += `END createEvent: <br/>`;

}