var secret = 'pCgz53obuL0u7L8KbhNdjxEvxm5JwyK9t2yz2b5PDvs=';
var client_id = '98E8f616-065B-4C33-AD07-A7B17025127C';
var api_key = 'f95e485fe5964affa0152d23be3aefe8';
var access_token;
var refresh_token;
var expires_in;
var tenant_id;
var tenant_name;
var expires_on;
var oauth_base_url = 'https://oauth2.sky.blackbaud.com/';
var oauth_token_url = oauth_base_url + 'token';
var oauth_authorize_url = oauth_base_url + 'authorization';
var auth_header = 'Basic ' + btoa(client_id + ':' + secret);

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.get) {
            get(get.url, get.params, get.headers).
            then(function(data) {
                sendResponse(data);
            });
        }
    }
)

function loginOAuth() {
    return new Promise(function(resolve) {
        var redirectUrl = chrome.identity.getRedirectURL('oauth2');
        var auth_url = oauth_authorize_url + '?' +
            "client_id="+ client_id +
            "&response_type=code"+
            "&redirect_uri="+redirectUrl+
            "&state=abcdefg"
        var authorization_code;
        
        chrome.identity.launchWebAuthFlow({"url" : auth_url,"interactive": true}, function (responseUrl) {
            var search = responseUrl.replace(redirectUrl+'?', '');
            var obj = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
            authorization_code = obj.code;
            
            $.ajax({
                url: oauth_token_url,
                type: 'POST',
                headers: {
                    Authorization: auth_header
                },
                data: {
                    grant_type: 'authorization_code',
                    code: authorization_code,
                    redirect_uri: redirectUrl
                }
            }).then(function(data) {
                access_token = data.access_token;
                expires_in = data.expires_in;
                refresh_token = data.refresh_token;
                tenant_id = data.tenant_id;
                tenant_name = data.tenant_name;
                expires_on = Date.now() + (expires_in * 1000);
                resolve();
            });
        });
    });
}

function refresh() {

    if(!access_token) {
        return loginOAuth();
    } else {
        return new Promise(function(resolve) {    
            var dtNow = new Date();
            
            if (dtNow >= expires_on) {
                // refresh token
                console.log('token expired');
                $.ajax({
                    url: oauth_token_url,
                    type: 'POST',
                    headers: {
                        Authorization: auth_header
                    },
                    data: {
                        grant_type: 'refresh_token',
                        refresh_token: refresh_token
                    }
                }).then(function (data) {
                    access_token = data.access_token;
                    expires_in = data.expires_in;
                    expires_on = Date.now() + (expires_in*1000);
                    refresh_token = data.refresh_token;
                    resolve();
                });
            }
            else {
                return resolve();
            }
        });
    }
}

function get(url, params, headers) {
    return refresh().then(
        $.ajax({
            url: url,
            type: "GET",
            data: params,
            headers: $.extend({
                Authorization: 'Bearer ' + access_token,
                'bb-api-subscription-key': api_key
            }, headers)
        })
    );
}
