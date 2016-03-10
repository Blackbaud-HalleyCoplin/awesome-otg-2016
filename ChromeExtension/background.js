function beginOauth() {
    var client_id = '98E8f616-065B-4C33-AD07-A7B17025127C';
    var redirectUrl = chrome.identity.getRedirectURL('oauth2');
    var auth_url = "https://oauth2.sky.blackbaud.com/authorization?"+
        "client_id="+ client_id +
        "&response_type=code"+
        "&redirect_uri="+redirectUrl+
        "&state=abcdefg"
    
    chrome.identity.launchWebAuthFlow({"url" : auth_url,"interactive": true}, function (responseUrl) {
        // call for access token
        console.log(responseUrl);
    });
}
