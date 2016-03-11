var secret = 'pCgz53obuL0u7L8KbhNdjxEvxm5JwyK9t2yz2b5PDvs=';
var client_id = '98E8f616-065B-4C33-AD07-A7B17025127C';
var access_token;
var refresh_token;
var authorization_code;

function get(url) {
    return Promise.resolve(
        $.ajax({
            url: url,
            type: "GET"
        })
    );
}

function post(url, content) {
    return Promise.resolve(
        $.ajax({
            url: url,
            type: "POST"
        })
    );
}

function loginOAuth() {
    var redirectUrl = chrome.identity.getRedirectURL('oauth2');
    var auth_url = "https://oauth2.sky.blackbaud.com/authorization?"+
        "client_id="+ client_id +
        "&response_type=code"+
        "&redirect_uri="+redirectUrl+
        "&state=abcdefg"
    
    chrome.identity.launchWebAuthFlow({"url" : auth_url,"interactive": true}, function (responseUrl) {
        var search = responseurl.replace(redirectUrl+'?', '');
        var obj = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
        authorization_code = obj.code;
    });
}
